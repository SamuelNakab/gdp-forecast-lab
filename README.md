# Laboratorio de PBI — GDP Lab

Pronóstico del PBI de **179 países** con **11 modelos**: líneas base, estadísticos clásicos (ARIMA, ETS, Theta), probabilísticos (filtro de Kalman, Prophet), machine learning global (Random Forest, LightGBM), deep learning (LSTM) y un ensamble. Todos se evalúan igual: backtest con tres orígenes y una **prueba real** contra datos 2022–2023 del Banco Mundial que ningún modelo vio.

**Web:** https://gdp-forecast-lab.vercel.app

> *English:* GDP forecasts for 179 countries with 11 statistical, ML and deep-learning models, evaluated with rolling-origin backtests and a true out-of-sample test against 2022–2023 World Bank data. Bilingual web app (ES/EN) built with React + Vite.

## Resultados

Error porcentual mediano (MdAPE) y cobertura del intervalo del 80 %:

| Modelo | Backtest (2006/2011/2016, 5 años) | Prueba real 2022–2023 | Cobertura 80 % (backtest) |
|---|---|---|---|
| LSTM global | **10,3 %** | 8,6 % | 72 % |
| ETS | 10,7 % | 7,7 % | 83 % |
| Ensamble | 10,8 % | 8,0 % | 83 % |
| Theta | 11,3 % | **7,1 %** | 80 % |
| ARIMA | 11,9 % | 9,6 % | 84 % |
| Kalman (espacio de estados) | 12,0 % | 7,8 % | 87 % |
| LightGBM global | 12,6 % | 7,7 % | 70 % |
| Random Forest global | 13,1 % | 8,3 % | 71 % |
| Paseo aleatorio con deriva | 13,3 % | 7,9 % | 79 % |
| Ingenuo | 13,9 % | 9,4 % | 82 % |
| Prophet | 19,4 % | 9,2 % | 40 % |

Lo que muestran:
- Los modelos simples y bien elegidos (ETS, Theta) compiten de igual a igual con redes neuronales en series anuales cortas.
- Prophet, el modelo del notebook original, es el que más se equivoca y su intervalo del 80 % solo acierta el 40 % de las veces.
- Los modelos de ML global empezaron peor que el ingenuo. Con **validación cruzada temporal anidada** (elegir features con orígenes internos, sin mirar el test) LightGBM pasó de 16,1 % a 12,6 %.

## Estructura

```
data/raw/                 dataset original (ONU) + Banco Mundial
pipeline/
  01_prepare_data.py      limpieza, 179 países, empalme 2022–2023
  models.py               los 11 modelos con interfaz común
  02_train_models.py      backtests, prueba real y pronóstico a 2030
  03_export_json.py       resultados -> JSON para la web
notebooks/
  original/               el notebook de Colab tal como estaba
  gdp_predictor_corregido.ipynb   versión corregida y ejecutada
web/                      app React + Vite (bilingüe)
```

## Correcciones al notebook original

El notebook original tenía errores de ejecución y, más importante, errores metodológicos que inflaban los resultados:

- **Fuga de datos:** el Random Forest predecía el PBI usando GNI, valor agregado, consumo, inversión, exportaciones e importaciones *del mismo año* (PBI = C + I + G + X − M). El R² de 0,98 venía de ahí.
- **Split por país, no por tiempo:** `shuffle=False` sobre datos ordenados alfabéticamente entrenaba con Afganistán…Polonia y testeaba con Portugal…Zimbabue.
- LSTM con `input_shape` hardcodeado, early stopping comentado y PBI en dólares escalado entre países.
- Prophet con `freq='Y'` deprecado y el primer punto del pronóstico sobrescrito a mano.

El detalle completo está en la página de Metodología y en el notebook corregido.

## Cómo correrlo

```bash
pip install -r requirements.txt
python pipeline/01_prepare_data.py
python pipeline/02_train_models.py   # ~8 min en 2 núcleos
python pipeline/03_export_json.py

cd web && npm install && npm run dev
```

## Datos

- UN Statistics Division, *National Accounts Main Aggregates* (dataset Global Economy Indicators, 1970–2021).
- World Bank, *World Development Indicators*: NY.GDP.MKTP.CD y SP.POP.TOTL (vía [github.com/datasets](https://github.com/datasets)).

Hecho por **Samuel Nakab Mollo**.
