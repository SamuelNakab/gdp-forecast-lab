// Descripciones de cada modelo (ES / EN)
export const FAMILIES = [
  { id: 'baseline', name: { es: 'Líneas base', en: 'Baselines' },
    blurb: { es: 'Reglas simples sin aprendizaje. Si un modelo complejo no les gana, no sirve.', en: 'Simple rules with no learning. If a complex model cannot beat them, it is not useful.' } },
  { id: 'stat', name: { es: 'Estadísticos clásicos', en: 'Classical statistics' },
    blurb: { es: 'Modelan cada país por separado, solo con su propia historia.', en: 'Each country is modelled on its own, using only its own history.' } },
  { id: 'prob', name: { es: 'Probabilísticos / bayesianos', en: 'Probabilistic / Bayesian' },
    blurb: { es: 'Tratan la tendencia como algo incierto que se actualiza con cada dato nuevo.', en: 'They treat the trend as an uncertain quantity that is updated with each new data point.' } },
  { id: 'ml', name: { es: 'Machine learning global', en: 'Global machine learning' },
    blurb: { es: 'Un solo modelo aprende de los 179 países a la vez, a partir de features construidas a mano.', en: 'A single model learns from all 179 countries at once, using hand-built features.' } },
  { id: 'dl', name: { es: 'Deep learning', en: 'Deep learning' },
    blurb: { es: 'Una red neuronal recurrente que lee la secuencia de crecimientos directamente.', en: 'A recurrent neural network that reads the growth sequence directly.' } },
  { id: 'combo', name: { es: 'Combinación', en: 'Combination' },
    blurb: { es: 'Promediar modelos distintos suele ser más estable que cualquiera solo.', en: 'Averaging different models is usually more stable than any single one.' } },
]

export const MODELS = {
  naive: {
    family: 'baseline', name: { es: 'Ingenuo (paseo aleatorio)', en: 'Naive (random walk)' }, short: 'Naive',
    what: { es: 'El PBI de los próximos años es igual al último dato conocido.', en: 'GDP in the coming years equals the last known value.' },
    how: { es: 'No estima nada. Su intervalo crece con la raíz del horizonte, según la volatilidad histórica.', en: 'It estimates nothing. Its interval widens with the square root of the horizon, based on historical volatility.' },
    pros: { es: 'Imposible de sobreajustar. Es la vara mínima.', en: 'Impossible to overfit. It is the minimum bar.' },
    cons: { es: 'Ignora que las economías suelen crecer.', en: 'Ignores the fact that economies usually grow.' },
  },
  drift: {
    family: 'baseline', name: { es: 'Paseo aleatorio con deriva', en: 'Random walk with drift' }, short: 'Drift',
    what: { es: 'Extiende la línea entre el primer y el último dato: crecimiento promedio histórico constante.', en: 'Extends the line between the first and last point: constant historical average growth.' },
    how: { es: 'Una sola cifra: la tasa media de crecimiento desde 1970.', en: 'A single number: the average growth rate since 1970.' },
    pros: { es: 'Sorprendentemente difícil de superar en series económicas.', en: 'Surprisingly hard to beat on economic series.' },
    cons: { es: 'Le da el mismo peso a 1975 que a 2020.', en: 'Gives 1975 the same weight as 2020.' },
  },
  arima: {
    family: 'stat', name: { es: 'ARIMA (auto)', en: 'ARIMA (auto)' }, short: 'ARIMA',
    what: { es: 'Modela el crecimiento como una combinación de sus valores pasados (AR) y de errores pasados (MA), después de diferenciar la serie (I).', en: 'Models growth as a combination of its past values (AR) and past errors (MA), after differencing the series (I).' },
    how: { es: 'Auto-ARIMA prueba órdenes (p, d, q) y elige el de menor AIC: el criterio que premia el ajuste y castiga la complejidad. ¿Y SARIMA? La S agrega estacionalidad (patrones que se repiten cada 12 meses o cada 4 trimestres). Con datos anuales no hay estacionalidad, así que SARIMA se reduce exactamente a ARIMA.', en: 'Auto-ARIMA tries (p, d, q) orders and keeps the lowest AIC, which rewards fit and penalises complexity. What about SARIMA? The S adds seasonality (patterns repeating every 12 months or 4 quarters). Annual data has no seasonality, so SARIMA reduces exactly to ARIMA.' },
    pros: { es: 'Fundamento estadístico sólido, intervalos con teoría detrás.', en: 'Solid statistical grounding, theory-backed intervals.' },
    cons: { es: 'Con solo 40–50 puntos por país, elegir órdenes es ruidoso.', en: 'With only 40–50 points per country, order selection is noisy.' },
  },
  ets: {
    family: 'stat', name: { es: 'ETS (suavizado exponencial)', en: 'ETS (exponential smoothing)' }, short: 'ETS',
    what: { es: 'Promedia el pasado dando más peso a lo reciente. Separa nivel y tendencia, y puede amortiguar la tendencia para que no se dispare.', en: 'Averages the past giving more weight to recent data. Separates level and trend, and can damp the trend so it does not explode.' },
    how: { es: 'Elige automáticamente entre errores aditivos o multiplicativos y tendencia normal o amortiguada, por máxima verosimilitud.', en: 'Automatically chooses additive or multiplicative errors and plain or damped trend, by maximum likelihood.' },
    pros: { es: 'Robusto, rápido y muy competitivo en pronóstico.', en: 'Robust, fast and very competitive.' },
    cons: { es: 'No aprende nada de otros países.', en: 'Learns nothing from other countries.' },
  },
  theta: {
    family: 'stat', name: { es: 'Theta', en: 'Theta' }, short: 'Theta',
    what: { es: 'Descompone la serie en una recta de largo plazo y una versión "amplificada" de las curvas de corto plazo, pronostica cada una y las combina.', en: 'Splits the series into a long-run straight line and an "amplified" version of short-run curvature, forecasts each and combines them.' },
    how: { es: 'Ganó la competencia de pronóstico M3 (3.003 series). Equivale a un suavizado exponencial con deriva.', en: 'Won the M3 forecasting competition (3,003 series). It is equivalent to exponential smoothing with drift.' },
    pros: { es: 'Simple y muy difícil de superar.', en: 'Simple and very hard to beat.' },
    cons: { es: 'Poca flexibilidad ante quiebres de régimen.', en: 'Little flexibility under regime breaks.' },
  },
  statespace: {
    family: 'prob', name: { es: 'Modelo estructural (filtro de Kalman)', en: 'Structural model (Kalman filter)' }, short: 'Kalman',
    what: { es: 'Supone que hay un nivel y una tendencia "ocultos" que cambian de a poco, y que lo que observamos es eso más ruido.', en: 'Assumes a hidden level and trend that drift slowly, and that what we observe is that plus noise.' },
    how: { es: 'El filtro de Kalman actualiza la creencia sobre la tendencia año a año, como un razonamiento bayesiano: creencia previa + dato nuevo = creencia actualizada.', en: 'The Kalman filter updates the belief about the trend year by year, like Bayesian reasoning: prior belief + new data = updated belief.' },
    pros: { es: 'Incertidumbre bien calibrada, interpretable.', en: 'Well-calibrated uncertainty, interpretable.' },
    cons: { es: 'Puede reaccionar de más a los últimos años.', en: 'May overreact to the latest years.' },
  },
  prophet: {
    family: 'prob', name: { es: 'Prophet (Meta)', en: 'Prophet (Meta)' }, short: 'Prophet',
    what: { es: 'Ajusta una tendencia lineal por tramos, con "puntos de cambio" donde la pendiente puede quebrarse. Es el modelo del notebook original.', en: 'Fits a piecewise-linear trend with "changepoints" where the slope can break. It is the model from the original notebook.' },
    how: { es: 'Modelo bayesiano pensado para datos diarios de negocio con estacionalidades. El intervalo simula futuros puntos de cambio.', en: 'A Bayesian model designed for daily business data with seasonalities. The interval simulates future changepoints.' },
    pros: { es: 'Fácil de usar, maneja datos faltantes.', en: 'Easy to use, handles missing data.' },
    cons: { es: 'Pensado para otra cosa: con series anuales cortas tiende a sobreajustar quiebres y sus intervalos quedan demasiado angostos.', en: 'Built for something else: with short annual series it overfits breaks and its intervals are far too narrow.' },
  },
  rf: {
    family: 'ml', name: { es: 'Random Forest global', en: 'Global Random Forest' }, short: 'RF',
    what: { es: 'Cientos de árboles de decisión, cada uno entrenado con una muestra distinta, que votan el crecimiento futuro.', en: 'Hundreds of decision trees, each trained on a different sample, that vote on future growth.' },
    how: { es: 'Features: crecimientos de los últimos 5 años, media y volatilidad de 10 años, nivel y ciclo mundial. Un modelo por horizonte (estrategia directa). Las features se eligen con validación cruzada temporal anidada. Intervalo: cuantiles de los errores out-of-bag.', en: 'Features: growth over the last 5 years, 10-year mean and volatility, level and the world cycle. One model per horizon (direct strategy). Features are chosen with nested time-series cross-validation. Interval: quantiles of out-of-bag errors.' },
    pros: { es: 'Aprende patrones compartidos entre países, captura no linealidades.', en: 'Learns patterns shared across countries, captures non-linearities.' },
    cons: { es: 'Los árboles no extrapolan: solo repiten rangos que ya vieron. Si el régimen cambia, falla.', en: 'Trees cannot extrapolate: they only repeat ranges they have seen. If the regime changes, they fail.' },
  },
  lightgbm: {
    family: 'ml', name: { es: 'LightGBM (gradient boosting)', en: 'LightGBM (gradient boosting)' }, short: 'LightGBM',
    what: { es: 'Árboles construidos en secuencia, donde cada uno corrige los errores del anterior.', en: 'Trees built in sequence, each correcting the errors of the previous one.' },
    how: { es: 'Mismas features que el Random Forest. Para el intervalo entrena dos modelos extra con regresión por cuantiles (percentiles 10 y 90).', en: 'Same features as the Random Forest. For the interval it trains two extra models with quantile regression (10th and 90th percentiles).' },
    pros: { es: 'Estado del arte en datos tabulares.', en: 'State of the art on tabular data.' },
    cons: { es: 'Con pocos datos por país, el ruido pesa mucho; la regresión por cuantiles subestima la incertidumbre.', en: 'With little data per country, noise dominates; quantile regression underestimates uncertainty.' },
  },
  lstm: {
    family: 'dl', name: { es: 'LSTM global', en: 'Global LSTM' }, short: 'LSTM',
    what: { es: 'Red neuronal recurrente con "memoria" que lee los últimos 10 años de crecimiento del país y del mundo, y predice los próximos años de una sola vez.', en: 'A recurrent neural network with "memory" that reads the last 10 years of country and world growth and predicts the next years in one go.' },
    how: { es: 'Dos capas LSTM (32 y 16 unidades), dropout, pérdida de Huber y early stopping con validación temporal. Incertidumbre: MC Dropout (100 pasadas con neuronas apagadas al azar) más los residuos de validación.', en: 'Two LSTM layers (32 and 16 units), dropout, Huber loss and early stopping on a temporal validation set. Uncertainty: MC Dropout (100 passes with random neurons switched off) plus validation residuals.' },
    pros: { es: 'Aprende la forma de las trayectorias, no solo promedios.', en: 'Learns trajectory shapes, not just averages.' },
    cons: { es: 'Caja negra, sensible a la semilla aleatoria, más lenta de entrenar.', en: 'A black box, sensitive to the random seed, slower to train.' },
  },
  ensemble: {
    family: 'combo', name: { es: 'Ensamble', en: 'Ensemble' }, short: 'Ensamble',
    what: { es: 'Promedio simple de ARIMA, ETS, Theta y LightGBM.', en: 'Simple average of ARIMA, ETS, Theta and LightGBM.' },
    how: { es: 'Los integrantes se fijaron antes de ver los resultados de test, para no elegir con el diario del lunes.', en: 'Members were fixed before seeing test results, to avoid choosing with hindsight.' },
    pros: { es: 'Los errores de modelos distintos se cancelan en parte: suele ser lo más estable.', en: 'Errors of different models partly cancel out: usually the most stable option.' },
    cons: { es: 'Si un integrante falla mucho, arrastra al promedio.', en: 'If one member fails badly, it drags the average down.' },
  },
}

export const modelLabel = (id, L) => (MODELS[id] ? L(MODELS[id].name) : id)
export const modelShort = (id, lang) => (id === 'ensemble' && lang === 'en' ? 'Ensemble' : MODELS[id]?.short ?? id)
