"""
models.py — todos los modelos de pronóstico con una interfaz común.

Cada función recibe `series`: dict {pais: pd.Series(log_gdp, index=año)} con los
datos HASTA el origen del pronóstico (nada del futuro), y un horizonte H.
Devuelve un DataFrame largo: country, year, h, model, yhat, lo, hi  (en log).
Intervalos: 80 % en todos los modelos.
"""
import os
import warnings
import logging
import numpy as np
import pandas as pd
from joblib import Parallel, delayed

warnings.filterwarnings("ignore")
logging.getLogger("prophet").setLevel(logging.ERROR)
logging.getLogger("cmdstanpy").disabled = True
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

LEVEL = 80
Z80 = 1.2815515655446004


def _frame(country, last_year, model, yhat, lo, hi):
    H = len(yhat)
    return pd.DataFrame({
        "country": country, "h": np.arange(1, H + 1),
        "year": last_year + np.arange(1, H + 1), "model": model,
        "yhat": np.asarray(yhat, float), "lo": np.asarray(lo, float), "hi": np.asarray(hi, float),
    })


# ============================================================ estadísticos (statsforecast)
def statsforecast_models(series, H):
    from statsforecast import StatsForecast
    from statsforecast.models import Naive, RandomWalkWithDrift, AutoARIMA, AutoETS, AutoTheta

    # statsforecast necesita fechas: usamos 1 de enero de cada año, frecuencia anual
    rows = []
    for c, s in series.items():
        rows.append(pd.DataFrame({"unique_id": c, "ds": pd.to_datetime(s.index.astype(str) + "-01-01"), "y": s.values}))
    df = pd.concat(rows, ignore_index=True)
    models = [
        Naive(alias="naive"),
        RandomWalkWithDrift(alias="drift"),
        AutoARIMA(season_length=1, alias="arima"),
        AutoETS(season_length=1, model="ZZN", alias="ets"),
        AutoTheta(season_length=1, alias="theta"),
    ]
    sf = StatsForecast(models=models, freq="YS", n_jobs=-1)
    fc = sf.forecast(df=df, h=H, level=[LEVEL])
    if "unique_id" not in fc.columns:
        fc = fc.reset_index()
    out = []
    for c, g in fc.groupby("unique_id"):
        g = g.sort_values("ds")
        last = int(series[c].index.max())
        for m in ["naive", "drift", "arima", "ets", "theta"]:
            out.append(_frame(c, last, m, g[m], g[f"{m}-lo-{LEVEL}"], g[f"{m}-hi-{LEVEL}"]))
    return pd.concat(out, ignore_index=True)


# ============================================================ Prophet
def _prophet_one(c, s, H):
    from prophet import Prophet
    import logging as _l
    _l.getLogger("cmdstanpy").disabled = True
    d = pd.DataFrame({"ds": pd.to_datetime(s.index.astype(str) + "-01-01"), "y": s.values})
    m = Prophet(interval_width=LEVEL / 100, yearly_seasonality=False, weekly_seasonality=False,
                daily_seasonality=False, changepoint_prior_scale=0.1, uncertainty_samples=300)
    m.fit(d)
    fut = pd.DataFrame({"ds": pd.to_datetime([f"{int(s.index.max()) + i}-01-01" for i in range(1, H + 1)])})
    f = m.predict(fut)
    return _frame(c, int(s.index.max()), "prophet", f["yhat"], f["yhat_lower"], f["yhat_upper"])


def prophet_model(series, H):
    res = Parallel(n_jobs=-1)(delayed(_prophet_one)(c, s, H) for c, s in series.items())
    return pd.concat(res, ignore_index=True)


# ============================================================ espacio de estados (Kalman)
def _uc_one(c, s, H):
    import statsmodels.api as sm
    y = s.values
    for spec in ["local linear trend", "smooth trend"]:
        try:
            mod = sm.tsa.UnobservedComponents(y, level=spec)
            res = mod.fit(disp=False, maxiter=200)
            f = res.get_forecast(H)
            ci = f.conf_int(alpha=1 - LEVEL / 100)
            return _frame(c, int(s.index.max()), "statespace", f.predicted_mean, ci[:, 0], ci[:, 1])
        except Exception:
            continue
    last = y[-1]
    return _frame(c, int(s.index.max()), "statespace", [last] * H, [last] * H, [last] * H)


def statespace_model(series, H):
    res = Parallel(n_jobs=-1)(delayed(_uc_one)(c, s, H) for c, s in series.items())
    return pd.concat(res, ignore_index=True)


# ============================================================ features para ML global
N_LAGS = 5


def _growth_panel(series):
    """Tabla año x país con la tasa de crecimiento logarítmica g_t = log y_t - log y_{t-1}."""
    lv = pd.DataFrame(series)            # index año, columnas país
    return lv, lv.diff()


def build_features(series):
    """
    Para cada (país, año t) construye features usando SOLO información hasta t.
    Estrategia directa: el target para el horizonte h es log y_{t+h} - log y_t
    (un modelo por horizonte, sin recursión -> no acumula errores propios).
    """
    lv, g = _growth_panel(series)
    world = g.mean(axis=1)               # ciclo económico global (promedio entre países)
    feats = []
    for c in lv.columns:
        d = pd.DataFrame(index=lv.index)
        for k in range(N_LAGS):
            d[f"g_lag{k}"] = g[c].shift(k)
        d["g_mean10"] = g[c].rolling(10, min_periods=5).mean()
        d["g_std10"] = g[c].rolling(10, min_periods=5).std()
        d["g_mean3"] = g[c].rolling(3).mean()
        d["log_level"] = lv[c]
        d["world_g0"] = world
        d["world_g1"] = world.shift(1)
        d["world_mean5"] = world.rolling(5).mean()
        d["country"] = c
        d["year"] = d.index
        d["valid"] = lv[c].notna()
        feats.append(d)
    F = pd.concat(feats, ignore_index=True)
    return F, lv


FEATURES = [*(f"g_lag{k}" for k in range(N_LAGS)), "g_mean10", "g_std10", "g_mean3",
            "log_level", "world_g0", "world_g1", "world_mean5"]


def _targets(F, lv, h):
    y = []
    for c, yr in zip(F["country"], F["year"]):
        s = lv[c]
        y.append(s.get(yr + h, np.nan) - s.get(yr, np.nan))
    return np.array(y)


LOCAL_FEATURES = [*(f"g_lag{k}" for k in range(N_LAGS)), "g_mean10", "g_std10", "g_mean3"]
NOLEVEL_FEATURES = [f for f in FEATURES if f != "log_level"]
CANDIDATES = [  # (nombre, features, min_child_samples)
    ("full", FEATURES, 30), ("full", FEATURES, 80),
    ("no_level", NOLEVEL_FEATURES, 30), ("no_level", NOLEVEL_FEATURES, 80),
    ("local", LOCAL_FEATURES, 30), ("local", LOCAL_FEATURES, 80),
]


def _lgb_params(leaf, seed):
    return dict(n_estimators=400, learning_rate=0.03, num_leaves=7, min_child_samples=leaf,
                subsample=0.8, subsample_freq=1, colsample_bytree=0.8, reg_lambda=5.0,
                random_state=seed, verbose=-1)


def _winsor(y):
    lo, hi = np.quantile(y, [0.02, 0.98])
    return np.clip(y, lo, hi)


def select_config(F, lv, series, H, seed=42, log=None):
    """
    Validación cruzada temporal ANIDADA: con datos <= origen, simula pronósticos
    desde dos orígenes internos (origen-10 y origen-5) y elige la configuración
    con menor error. Así la selección nunca ve el período de test.
    """
    import lightgbm as lgb
    origin = max(int(s.index.max()) for s in series.values())
    inner = [origin - 10, origin - 5]
    scores = []
    for name, feats, leaf in CANDIDATES:
        apes = []
        for I in inner:
            for h in range(1, min(H, 5) + 1):
                y = _targets(F, lv, h)
                ok = F[feats].notna().all(axis=1).values & ~np.isnan(y)
                tr = ok & (F["year"].values + h <= I)
                te = ok & (F["year"].values == I)
                if tr.sum() < 200 or te.sum() == 0:
                    continue
                mdl = lgb.LGBMRegressor(objective="l2", **_lgb_params(leaf, seed))
                mdl.fit(F.loc[tr, feats].values, _winsor(y[tr]))
                pred = mdl.predict(F.loc[te, feats].values)
                apes += list(np.abs(np.exp(pred - y[te]) - 1))
        scores.append((np.median(apes) if apes else np.inf, name, feats, leaf))
    best = min(scores, key=lambda x: x[0])
    if log:
        log(f"      config ML elegida: {best[1]} / min_child_samples={best[3]} (MdAPE interno {best[0]*100:.2f} %)")
    return best[1], best[2], best[3]


def ml_global_models(series, H, seed=42, log=print):
    """Random Forest y LightGBM globales: un único modelo entrenado con TODOS los países."""
    from sklearn.ensemble import RandomForestRegressor
    import lightgbm as lgb

    F, lv = build_features(series)
    cfg_name, feats, leaf = select_config(F, lv, series, H, seed, log)
    last_years = {c: int(s.index.max()) for c, s in series.items()}
    F_last = F[F.apply(lambda r: r["year"] == last_years[r["country"]], axis=1)].set_index("country")
    names = list(series.keys())
    out = []
    for h in range(1, H + 1):
        y = _targets(F, lv, h)
        m = F[feats].notna().all(axis=1).values & ~np.isnan(y)
        X, yy = F.loc[m, feats].values, _winsor(y[m])
        Xp = F_last.loc[names, feats].fillna(0).values

        rf = RandomForestRegressor(n_estimators=400, min_samples_leaf=max(5, leaf // 6), max_features=0.5,
                                   oob_score=True, n_jobs=-1, random_state=seed)
        rf.fit(X, yy)
        res = yy - rf.oob_prediction_
        q_lo, q_hi = np.quantile(res, [0.1, 0.9])         # intervalo empírico con residuos OOB
        p = rf.predict(Xp)
        out.append(pd.DataFrame({"country": names, "h": h, "model": "rf",
                                 "d": p, "dlo": p + q_lo, "dhi": p + q_hi}))

        params = _lgb_params(leaf, seed)
        pm = lgb.LGBMRegressor(objective="l2", **params).fit(X, yy)
        plo = lgb.LGBMRegressor(objective="quantile", alpha=0.1, **params).fit(X, yy)
        phi = lgb.LGBMRegressor(objective="quantile", alpha=0.9, **params).fit(X, yy)
        p2 = pm.predict(Xp)
        lo2, hi2 = np.minimum(plo.predict(Xp), p2), np.maximum(phi.predict(Xp), p2)
        out.append(pd.DataFrame({"country": names, "h": h, "model": "lightgbm",
                                 "d": p2, "dlo": lo2, "dhi": hi2}))
    D = pd.concat(out, ignore_index=True)
    base = pd.Series({c: s.iloc[-1] for c, s in series.items()})
    D["yhat"] = D["country"].map(base) + D["d"]
    D["lo"] = D["country"].map(base) + D["dlo"]
    D["hi"] = D["country"].map(base) + D["dhi"]
    D["year"] = D["country"].map(last_years) + D["h"]
    D.attrs["config"] = cfg_name
    return D[["country", "year", "h", "model", "yhat", "lo", "hi"]]


# ============================================================ LSTM global
def lstm_global_model(series, H, window=10, seed=42, mc_samples=100):
    """
    LSTM entrenada con ventanas de todos los países. Entrada: últimas `window`
    tasas de crecimiento (del país y del mundo). Salida: crecimiento acumulado
    para h = 1..H (salida multi-horizonte directa). Incertidumbre: MC Dropout.
    """
    import tensorflow as tf
    from tensorflow import keras
    tf.keras.utils.set_random_seed(seed)

    lv, g = _growth_panel(series)
    world = g.mean(axis=1)
    last_years = {c: int(s.index.max()) for c, s in series.items()}

    Xs, Ys, T = [], [], []
    for c in lv.columns:
        gc, lvc = g[c], lv[c]
        years = gc.dropna().index
        for t in years:
            if t - window + 1 < years.min() or t + H > last_years[c]:
                continue
            seq_g = gc.loc[t - window + 1:t].values
            seq_w = world.loc[t - window + 1:t].values
            if np.isnan(seq_g).any() or np.isnan(seq_w).any():
                continue
            Xs.append(np.stack([seq_g, seq_w], axis=1))
            Ys.append([lvc[t + k] - lvc[t] for k in range(1, H + 1)])
            T.append(t)
    X, Y, T = np.array(Xs, np.float32), np.array(Ys, np.float32), np.array(T)

    # escalado con estadísticas del TRAIN únicamente
    mu, sd = X.reshape(-1, 2).mean(0), X.reshape(-1, 2).std(0) + 1e-8
    ymu, ysd = Y.mean(0), Y.std(0) + 1e-8
    Xn, Yn = (X - mu) / sd, (Y - ymu) / ysd

    # validación temporal: los últimos 4 años de orígenes disponibles
    cut = T.max() - 4
    tr, va = T <= cut, T > cut

    inp = keras.Input((window, 2))
    x = keras.layers.LSTM(32, return_sequences=True)(inp)
    x = keras.layers.Dropout(0.2)(x)
    x = keras.layers.LSTM(16)(x)
    x = keras.layers.Dropout(0.2)(x)
    x = keras.layers.Dense(16, activation="relu")(x)
    outp = keras.layers.Dense(H)(x)
    model = keras.Model(inp, outp)
    model.compile(optimizer=keras.optimizers.Adam(1e-3), loss=keras.losses.Huber(delta=1.0))
    es = keras.callbacks.EarlyStopping(monitor="val_loss", patience=15, restore_best_weights=True)
    model.fit(Xn[tr], Yn[tr], validation_data=(Xn[va], Yn[va]), epochs=300, batch_size=64,
              callbacks=[es], verbose=0)

    # predicción desde el último año de cada país
    names, Xp = [], []
    for c in lv.columns:
        t = last_years[c]
        seq_g = g[c].loc[t - window + 1:t].values
        seq_w = world.loc[t - window + 1:t].values
        names.append(c)
        Xp.append(np.stack([seq_g, seq_w], axis=1))
    Xp = ((np.array(Xp, np.float32) - mu) / sd)
    Xp = np.nan_to_num(Xp)
    sims = np.stack([model(Xp, training=True).numpy() for _ in range(mc_samples)])  # MC Dropout
    sims = sims * ysd + ymu
    point = (model(Xp, training=False).numpy()) * ysd + ymu
    mc_lo, mc_hi = np.quantile(sims, [0.1, 0.9], axis=0)
    # MC Dropout solo mide la incertidumbre del MODELO (epistémica) y suele dar
    # bandas demasiado finas; le sumamos el ruido de los datos (aleatorio)
    # estimado con los residuos del set de validación.
    res = Y[va] - (model(Xn[va], training=False).numpy() * ysd + ymu)
    r_lo, r_hi = np.quantile(res, [0.1, 0.9], axis=0)
    lo = point - np.sqrt((point - mc_lo) ** 2 + r_lo ** 2)
    hi = point + np.sqrt((mc_hi - point) ** 2 + r_hi ** 2)
    out = []
    for i, c in enumerate(names):
        base = series[c].iloc[-1]
        out.append(_frame(c, last_years[c], "lstm", base + point[i], base + lo[i], base + hi[i]))
    tf.keras.backend.clear_session()
    return pd.concat(out, ignore_index=True)


# ============================================================ ensamble
ENSEMBLE_MEMBERS = ["arima", "ets", "theta", "lightgbm"]


def ensemble(fc):
    e = fc[fc["model"].isin(ENSEMBLE_MEMBERS)].groupby(["country", "year", "h"], as_index=False)[["yhat", "lo", "hi"]].mean()
    e["model"] = "ensemble"
    return e


def run_all(series, H, log=print):
    import time
    parts = []
    for name, fn in [("statsforecast", statsforecast_models), ("prophet", prophet_model),
                     ("statespace", statespace_model), ("ml", ml_global_models), ("lstm", lstm_global_model)]:
        t0 = time.time()
        parts.append(fn(series, H))
        log(f"   {name:<14} {time.time() - t0:6.1f}s")
    fc = pd.concat(parts, ignore_index=True)
    fc = pd.concat([fc, ensemble(fc)], ignore_index=True)
    return fc
