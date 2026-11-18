"""
02_train_models.py
------------------
Corre todos los modelos en 3 tipos de experimento:

  backtest_<año>  origen 2006, 2011 y 2016, horizonte 5 años (validación con el
                  propio dataset; promediar 3 orígenes evita conclusiones por suerte)
  real_2021       origen 2021 -> 2022-2023: predicción fuera de muestra REAL
                  comparada con datos del Banco Mundial que el modelo nunca vio
  future          con todos los datos disponibles -> pronóstico hasta 2030

Todo se modela en log(PBI): convierte crecimiento exponencial en tendencia
lineal y hace que los errores sean relativos (%), comparables entre países.
"""
from pathlib import Path
import sys
import time
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from models import run_all  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "data" / "processed"
panel = pd.read_parquet(P / "panel.parquet")
panel["log_gdp"] = np.log(panel["gdp"])
LAST_FUTURE_YEAR = 2030


def series_until(year=None, only_original=False):
    out = {}
    for c, g in panel.groupby("Country"):
        g = g.set_index("Year")
        if only_original:
            g = g[g["source"] == "UN Statistics"]
        if year is not None:
            g = g[g.index <= year]
        out[c] = g["log_gdp"].astype(float)
    return out


def score(fc, train_series):
    """Une pronósticos con valores reales y calcula errores por fila."""
    act = panel[["Country", "Year", "log_gdp", "gdp"]].rename(columns={"Country": "country", "Year": "year"})
    d = fc.merge(act, on=["country", "year"], how="inner")
    d["ape"] = np.abs(np.exp(d["yhat"] - d["log_gdp"]) - 1)               # error % absoluto
    d["err_log"] = d["yhat"] - d["log_gdp"]
    d["covered"] = (d["log_gdp"] >= d["lo"]) & (d["log_gdp"] <= d["hi"])  # dentro del intervalo 80 %
    scale = {c: np.mean(np.abs(np.diff(np.exp(s.values)))) for c, s in train_series.items()}
    d["ase"] = np.abs(np.exp(d["yhat"]) - d["gdp"]) / d["country"].map(scale)  # para MASE
    return d


all_fc, all_scored = [], []
t_start = time.time()

for origin in [2006, 2011, 2016]:
    exp = f"backtest_{origin}"
    print(f"\n== {exp}")
    s = series_until(origin)
    fc = run_all(s, H=5).assign(experiment=exp)
    all_fc.append(fc)
    all_scored.append(score(fc, s).assign(experiment=exp))

print("\n== real_2021 (2022-2023 vs Banco Mundial)")
s = series_until(2021, only_original=True)
fc = run_all(s, H=2).assign(experiment="real_2021")
all_fc.append(fc)
sc = score(fc, s)
sc = sc[sc["year"] > 2021]
all_scored.append(sc.assign(experiment="real_2021"))

print("\n== future (hasta 2030)")
s = series_until(None)
fc = run_all(s, H=LAST_FUTURE_YEAR - 2021).assign(experiment="future")
fc = fc[fc["year"] <= LAST_FUTURE_YEAR]
all_fc.append(fc)

FC = pd.concat(all_fc, ignore_index=True)
SC = pd.concat(all_scored, ignore_index=True)
FC.to_parquet(P / "forecasts.parquet", index=False)
SC.to_parquet(P / "scored.parquet", index=False)

# ------------------------------------------------------------------ resumen
def summary(d):
    return pd.Series({
        "MAPE": d["ape"].mean() * 100, "MdAPE": d["ape"].median() * 100,
        "MASE": d["ase"].mean(), "coverage80": d["covered"].mean() * 100,
        "bias": d["err_log"].mean() * 100, "n": len(d),
    })

SC["group"] = np.where(SC["experiment"].str.startswith("backtest"), "backtest", "real_2021")
tab = SC.groupby(["group", "model"]).apply(summary).round(2)
print("\n", tab.sort_values(["group", "MdAPE"]).to_string())
print(f"\nTiempo total: {(time.time() - t_start) / 60:.1f} min")
