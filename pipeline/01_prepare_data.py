"""
01_prepare_data.py
------------------
Limpia el dataset original (UN, 1970-2021), se queda con los países que tienen
los 52 años completos y le empalma (splice) datos reales 2022-2023 del Banco
Mundial para poder evaluar las predicciones contra lo que pasó de verdad.

Salida: data/processed/panel.parquet  (país x año, con PBI, población y sectores)
        data/processed/countries.json (metadatos: ISO3, nombre ES/EN, región)
"""
from pathlib import Path
import json
import numpy as np
import pandas as pd
import pycountry

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------- 1. dataset original
df = pd.read_csv(RAW / "global_economy_indicators.csv")
# Las columnas y los países vienen con espacios alrededor: ' Country ' -> 'Country'
df.columns = [c.strip() for c in df.columns]
for c in ["Country", "Currency"]:
    df[c] = df[c].astype(str).str.strip()

RENAME = {
    "Gross Domestic Product (GDP)": "gdp",
    "Population": "population",
    "Per capita GNI": "gni_pc",
    "Agriculture, hunting, forestry, fishing (ISIC A-B)": "agriculture",
    "Mining, Manufacturing, Utilities (ISIC C-E)": "industry",
    "Manufacturing (ISIC D)": "manufacturing",
    "Construction (ISIC F)": "construction",
    "Wholesale, retail trade, restaurants and hotels (ISIC G-H)": "trade",
    "Transport, storage and communication (ISIC I)": "transport",
    "Other Activities (ISIC J-P)": "other_services",
    "Total Value Added": "total_va",
    "IMF based exchange rate": "fx",
}
df = df.rename(columns=RENAME)
keep = ["CountryID", "Country", "Year", *RENAME.values()]
df = df[keep].sort_values(["Country", "Year"]).reset_index(drop=True)

counts = df.groupby("Country")["Year"].nunique()
complete = counts[counts == 52].index
df = df[df["Country"].isin(complete)]
# además exigimos PBI positivo y sin huecos en los 52 años
ok = df.groupby("Country")["gdp"].apply(lambda s: s.notna().all() and (s > 0).all())
df = df[df["Country"].isin(ok[ok].index)].copy()

# ---------------------------------------------------------------- 2. código ISO3
# CountryID es el código numérico M49 de la ONU == ISO 3166 numérico
MANUAL_ISO = {
    "Sudan (Former)": "SDN", "U.R. of Tanzania: Mainland": "TZA", "Zanzibar": None,
    "Kosovo": "XKX", "Netherlands Antilles (Former)": None,
}
def to_iso3(row):
    name = row["Country"]
    if name in MANUAL_ISO:
        return MANUAL_ISO[name]
    c = pycountry.countries.get(numeric=f"{int(row['CountryID']):03d}")
    return c.alpha_3 if c else None

iso = df.drop_duplicates("Country")[["Country", "CountryID"]].copy()
iso["iso3"] = iso.apply(to_iso3, axis=1)
df = df.merge(iso[["Country", "iso3"]], on="Country", how="left")

# ---------------------------------------------------------------- 3. Banco Mundial
wb_gdp = pd.read_csv(RAW / "wb_gdp.csv").rename(columns={"Country Code": "iso3", "Value": "gdp_wb"})
wb_pop = pd.read_csv(RAW / "wb_pop.csv").rename(columns={"Country Code": "iso3", "Value": "pop_wb"})
wb = wb_gdp[["iso3", "Year", "gdp_wb"]].merge(wb_pop[["iso3", "Year", "pop_wb"]], on=["iso3", "Year"], how="outer")

EXT_YEARS = [2022, 2023]
rows = []
splice_info = {}
for country, g in df.groupby("Country"):
    code = g["iso3"].iloc[0]
    w = wb[wb["iso3"] == code].set_index("Year") if code else pd.DataFrame()
    g = g.set_index("Year")
    info = {"extended": False}
    if code and len(w) and 2021 in w.index and pd.notna(w.loc[2021, "gdp_wb"]):
        base_un, base_wb = g.loc[2021, "gdp"], w.loc[2021, "gdp_wb"]
        # chequeo de consistencia: ¿las dos fuentes crecen parecido en 2015-2021?
        yrs = [y for y in range(2015, 2022) if y in w.index and pd.notna(w.loc[y, "gdp_wb"])]
        if len(yrs) >= 4:
            gr_un = np.diff(np.log(g.loc[yrs, "gdp"].values))
            gr_wb = np.diff(np.log(w.loc[yrs, "gdp_wb"].values.astype(float)))
            info["growth_corr_2015_21"] = float(np.corrcoef(gr_un, gr_wb)[0, 1]) if len(gr_un) > 2 else None
        info["level_ratio_2021"] = float(base_wb / base_un)
        ext = []
        for y in EXT_YEARS:
            if y in w.index and pd.notna(w.loc[y, "gdp_wb"]):
                gdp = base_un * w.loc[y, "gdp_wb"] / base_wb      # empalme por tasa de variación
                pop = g.loc[2021, "population"] * (w.loc[y, "pop_wb"] / w.loc[2021, "pop_wb"]) \
                    if pd.notna(w.loc[y, "pop_wb"]) and pd.notna(w.loc[2021, "pop_wb"]) else np.nan
                ext.append({"Year": y, "gdp": gdp, "population": pop})
        if len(ext) == len(EXT_YEARS):
            info["extended"] = True
            e = pd.DataFrame(ext).set_index("Year")
            e["Country"], e["iso3"], e["source"] = country, code, "World Bank (empalmado)"
            g = pd.concat([g.assign(source="UN Statistics"), e])
    if not info["extended"]:
        g = g.assign(source="UN Statistics")
    splice_info[country] = info
    rows.append(g.reset_index())

panel = pd.concat(rows, ignore_index=True).sort_values(["Country", "Year"])
panel["gdp_pc"] = panel["gdp"] / panel["population"]
panel.to_parquet(OUT / "panel.parquet", index=False)

# ---------------------------------------------------------------- 4. metadatos
try:
    import gettext
    es = gettext.translation("iso3166-1", pycountry.LOCALES_DIR, languages=["es"])
    tr_es = es.gettext
except Exception:  # pragma: no cover
    tr_es = lambda s: s

wb_meta_regions = {}  # región simple por continente (pycountry no trae región)
meta = []
for country, g in panel.groupby("Country"):
    code = g["iso3"].iloc[0]
    c = pycountry.countries.get(alpha_3=code) if code else None
    name_en = country
    name_es = tr_es(c.name) if c else country
    meta.append({
        "id": (code or country.replace(" ", "_")).upper(),
        "iso3": code, "iso2": c.alpha_2 if c else None,
        "name_en": getattr(c, "common_name", None) or (c.name if c else name_en) if c else name_en,
        "name_un": name_en, "name_es": name_es,
        "extended": splice_info[country]["extended"],
        "level_ratio_2021": splice_info[country].get("level_ratio_2021"),
        "growth_corr": splice_info[country].get("growth_corr_2015_21"),
    })
json.dump(meta, open(OUT / "countries.json", "w"), ensure_ascii=False, indent=1)

n_ext = sum(m["extended"] for m in meta)
print(f"países: {len(meta)} | extendidos a 2023: {n_ext}")
print("sin extender:", [m["name_en"] for m in meta if not m["extended"]])
corrs = [m["growth_corr"] for m in meta if m["growth_corr"] is not None]
print("corr. mediana de crecimiento UN vs WB 2015-21:", np.nanmedian(corrs))
