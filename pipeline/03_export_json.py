"""
03_export_json.py — convierte los resultados en JSON livianos para la web.

web/public/data/index.json        lista de países + resumen
web/public/data/leaderboard.json  métricas de todos los modelos
web/public/data/c/<ID>.json       detalle por país (histórico, sectores, pronósticos)
"""
from pathlib import Path
import json
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "data" / "processed"
OUT = ROOT / "web" / "public" / "data"
(OUT / "c").mkdir(parents=True, exist_ok=True)

panel = pd.read_parquet(P / "panel.parquet")
FC = pd.read_parquet(P / "forecasts.parquet")
SC = pd.read_parquet(P / "scored.parquet")
meta = {m["name_un"]: m for m in json.load(open(P / "countries.json"))}

MODELS = ["naive", "drift", "arima", "ets", "theta", "statespace", "prophet", "rf", "lightgbm", "lstm", "ensemble"]
SECTORS = ["agriculture", "industry", "manufacturing", "construction", "trade", "transport", "other_services"]


def mill(x):
    return None if pd.isna(x) else round(float(x) / 1e6, 2)


def r(x, n=4):
    return None if x is None or pd.isna(x) else round(float(x), n)


# ------------------------------------------------------------------ leaderboard
SC["group"] = np.where(SC["experiment"].str.startswith("backtest"), "backtest", "real")


def metrics(d):
    return {"mape": r(d["ape"].mean() * 100, 2), "mdape": r(d["ape"].median() * 100, 2),
            "mase": r(d["ase"].mean(), 3), "coverage": r(d["covered"].mean() * 100, 1),
            "bias": r(d["err_log"].mean() * 100, 2), "n": int(len(d))}


lb = {"models": MODELS, "groups": {}}
for grp, d in SC.groupby("group"):
    per_model = {m: metrics(d[d["model"] == m]) for m in MODELS}
    # % de países donde cada modelo fue el mejor (menor error medio)
    best = d.groupby(["country", "model"])["ape"].mean().unstack()[MODELS].idxmin(axis=1)
    wins = best.value_counts(normalize=True).mul(100).round(1).to_dict()
    for m in MODELS:
        per_model[m]["wins"] = wins.get(m, 0.0)
        # ¿le gana al naive? % de países con menor error que el paseo aleatorio
        e = d.groupby(["country", "model"])["ape"].mean().unstack()
        per_model[m]["beats_naive"] = r((e[m] < e["naive"]).mean() * 100, 1) if m != "naive" else None
    entry = {"overall": per_model}
    if grp == "backtest":
        entry["by_horizon"] = {m: [r(d[(d.model == m) & (d.h == h)]["ape"].median() * 100, 2) for h in range(1, 6)]
                               for m in MODELS}
        entry["by_origin"] = {exp: {m: r(g[g.model == m]["ape"].median() * 100, 2) for m in MODELS}
                              for exp, g in d.groupby("experiment")}
    lb["groups"][grp] = entry
json.dump(lb, open(OUT / "leaderboard.json", "w"))

# ------------------------------------------------------------------ por país
def pack(df):
    """{modelo: [[año, yhat, lo, hi], ...]} en millones de USD."""
    out = {}
    for m, g in df.groupby("model"):
        g = g.sort_values("year")
        out[m] = [[int(y), mill(np.exp(a)), mill(np.exp(b)), mill(np.exp(c))]
                  for y, a, b, c in zip(g["year"], g["yhat"], g["lo"], g["hi"])]
    return out


index = []
FCi = FC.set_index("country")
for country, g in panel.groupby("Country"):
    m = meta[country]
    cid = m["id"]
    g = g.sort_values("Year")
    hist = [{"y": int(row.Year), "gdp": mill(row.gdp), "pop": None if pd.isna(row.population) else int(row.population),
             "pc": r(row.gdp_pc, 1), "wb": row.source != "UN Statistics"} for row in g.itertuples()]
    sec = []
    for row in g[g["source"] == "UN Statistics"].itertuples():
        tva = row.total_va
        if pd.isna(tva) or tva <= 0:
            continue
        sec.append({"y": int(row.Year), **{s: r(getattr(row, s) / tva * 100, 2) for s in SECTORS}})
    f = FCi.loc[[country]].reset_index()
    sc = SC[SC["country"] == country]
    bt = sc[sc["group"] == "backtest"].groupby("model")["ape"].mean() * 100
    rl = sc[sc["group"] == "real"].groupby("model")["ape"].mean() * 100
    country_metrics = {mo: {"backtest": r(bt.get(mo), 2), "real": r(rl.get(mo), 2)} for mo in MODELS}

    fut = f[f["experiment"] == "future"]
    detail = {
        "id": cid, "iso2": m["iso2"], "name_en": m["name_en"], "name_es": m["name_es"],
        "extended": m["extended"], "history": hist, "sectors": sec,
        "backtest": pack(f[f["experiment"] == "backtest_2016"]),
        "real": pack(f[f["experiment"] == "real_2021"]),
        "future": pack(fut),
        "metrics": country_metrics,
    }
    json.dump(detail, open(OUT / "c" / f"{cid}.json", "w"), separators=(",", ":"))

    last = g.iloc[-1]
    ens = fut[(fut["model"] == "ensemble") & (fut["year"] == 2030)]
    yrs = 2030 - int(last.Year)
    cagr_fc = (np.exp(ens["yhat"].iloc[0] - np.log(last.gdp)) ** (1 / yrs) - 1) * 100 if len(ens) else None
    g10 = g[g["Year"] >= last.Year - 10]
    cagr_hist = ((g10.gdp.iloc[-1] / g10.gdp.iloc[0]) ** (1 / 10) - 1) * 100
    index.append({
        "id": cid, "iso2": m["iso2"], "name_en": m["name_en"], "name_es": m["name_es"],
        "extended": m["extended"], "last_year": int(last.Year), "gdp": mill(last.gdp),
        "pc": r(last.gdp_pc, 0), "pop": None if pd.isna(last.population) else int(last.population),
        "cagr_hist": r(cagr_hist, 2), "cagr_fc": r(cagr_fc, 2),
        "gdp_2030": mill(np.exp(ens["yhat"].iloc[0])) if len(ens) else None,
        "best_bt": bt.idxmin() if len(bt) else None,
        "best_real": rl.idxmin() if len(rl) else None,
    })

json.dump({"countries": sorted(index, key=lambda x: -x["gdp"]),
           "generated": pd.Timestamp.now().strftime("%Y-%m-%d")},
          open(OUT / "index.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("exportados", len(index), "países")
size = sum(p.stat().st_size for p in (OUT / "c").glob("*.json")) / 1e6
print(f"tamaño total por país: {size:.1f} MB")
