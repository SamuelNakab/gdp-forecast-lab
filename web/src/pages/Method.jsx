import { useL } from '../i18n'
import { NOTEBOOK_FIXES } from '../content/concepts'
import { REPO_URL } from '../components/Layout'

function Code({ text }) {
  // convierte `código` en <code>
  return text.split(/(`[^`]+`)/g).map((p, i) => (p.startsWith('`') ? <code key={i}>{p.slice(1, -1)}</code> : p))
}

export default function Method() {
  const L = useL()
  return (
    <div className="page">
      <header className="page-head">
        <h1>{L({ es: 'Metodología', en: 'Methodology' })}</h1>
        <p className="lead">{L({
          es: 'De dónde salen los datos, qué estaba mal en el notebook original y qué límites tiene cualquier pronóstico del PBI.',
          en: 'Where the data comes from, what was wrong with the original notebook and the limits of any GDP forecast.' })}</p>
      </header>

      <section className="band">
        <div className="col-head"><h2>{L({ es: 'Correcciones al notebook original', en: 'Fixes to the original notebook' })}</h2>
          <p className="muted">{L({ es: 'Los errores marcados como metodológicos no rompían el código, pero hacían que los resultados parecieran mejores de lo que eran. Son los más importantes.', en: 'Errors marked as methodological did not break the code, but made results look better than they were. They are the most important ones.' })}</p></div>
        <div className="col-body">
          <ol className="fixes">
            {NOTEBOOK_FIXES.map((f, i) => (
              <li key={i}>
                <span className={`tag ${f.kind}`}>{f.kind === 'bug' ? L({ es: 'Error de código', en: 'Code bug' }) : L({ es: 'Metodológico', en: 'Methodological' })}</span>
                <p><Code text={L(f.problem)} /></p>
                <p className="fix"><Code text={L(f.fix)} /></p>
              </li>
            ))}
          </ol>
          <p><a className="text-link" href={`${REPO_URL}/blob/main/notebooks/gdp_predictor_corregido.ipynb`}>{L({ es: 'Ver el notebook corregido', en: 'See the corrected notebook' })}</a></p>
        </div>
      </section>

      <section className="band">
        <div className="col-head"><h2>{L({ es: 'El pipeline', en: 'The pipeline' })}</h2></div>
        <div className="col-body">
          <ol className="steps">
            <li><b>{L({ es: 'Preparación.', en: 'Preparation.' })}</b> {L({ es: 'Limpieza del CSV, filtro de 179 países con 52 años completos, cruce con códigos ISO a partir del código M49 de la ONU y empalme de 2022–2023 del Banco Mundial por tasa de variación. Antes de empalmar se verificó que ambas fuentes coincidan: la correlación mediana de los crecimientos 2015–2021 es 0,998.', en: 'CSV cleaning, filter to 179 countries with all 52 years, ISO code matching from UN M49 codes, and splicing of 2022–2023 World Bank data by growth rate. Before splicing, both sources were checked to agree: the median correlation of 2015–2021 growth is 0.998.' })}</li>
            <li><b>{L({ es: 'Modelado.', en: 'Modelling.' })}</b> {L({ es: 'Todo se modela sobre el logaritmo del PBI. Los modelos estadísticos usan statsforecast, statsmodels y Prophet; los de ML, scikit-learn y LightGBM; la LSTM, TensorFlow/Keras.', en: 'Everything is modelled on log GDP. Statistical models use statsforecast, statsmodels and Prophet; ML uses scikit-learn and LightGBM; the LSTM uses TensorFlow/Keras.' })}</li>
            <li><b>{L({ es: 'Evaluación.', en: 'Evaluation.' })}</b> {L({ es: 'Backtest con orígenes 2006, 2011 y 2016 (horizonte de 5 años) y prueba real 2022–2023. Métricas: MAPE, MdAPE, MASE, cobertura del intervalo del 80 % y sesgo.', en: 'Backtest from origins 2006, 2011 and 2016 (5-year horizon) and a real 2022–2023 test. Metrics: MAPE, MdAPE, MASE, 80% interval coverage and bias.' })}</li>
            <li><b>{L({ es: 'Exportación.', en: 'Export.' })}</b> {L({ es: 'Los resultados se guardan como archivos JSON livianos. La web los lee directamente, sin servidor: carga rápido y no depende de que un modelo corra en vivo.', en: 'Results are saved as small JSON files. The site reads them directly, with no server: it loads fast and does not depend on a model running live.' })}</li>
          </ol>
        </div>
      </section>

      <section className="band">
        <div className="col-head"><h2>{L({ es: 'Limitaciones', en: 'Limitations' })}</h2></div>
        <div className="col-body">
          <ul className="plain">
            <li>{L({ es: 'Dólares corrientes: el PBI mezcla crecimiento real, inflación en dólares y tipo de cambio. Un pronóstico de PBI real en moneda local sería más predecible, pero el dataset no lo trae.', en: 'Current dollars: GDP mixes real growth, dollar inflation and exchange rates. Real GDP in local currency would be more predictable, but the dataset does not include it.' })}</li>
            <li>{L({ es: 'Sin variables externas: los modelos no saben de elecciones, guerras, precios de commodities ni pandemias. Solo ven la historia del PBI.', en: 'No external variables: the models know nothing about elections, wars, commodity prices or pandemics. They only see GDP history.' })}</li>
            <li>{L({ es: 'Series cortas: 52 puntos anuales por país. Por eso los modelos simples compiten tan bien con los complejos.', en: 'Short series: 52 annual points per country. That is why simple models compete so well with complex ones.' })}</li>
            <li>{L({ es: 'Empalme de fuentes: 2022–2023 vienen del Banco Mundial y se encadenan al nivel de la ONU. Para 22 países el Banco Mundial no publica esos años y el pronóstico arranca en 2021.', en: 'Source splicing: 2022–2023 come from the World Bank and are chained to the UN level. For 22 countries the World Bank does not publish those years and the forecast starts in 2021.' })}</li>
          </ul>
        </div>
      </section>

      <section className="band">
        <div className="col-head"><h2>{L({ es: 'Fuentes', en: 'Sources' })}</h2></div>
        <div className="col-body">
          <ul className="plain">
            <li>UN Statistics Division — National Accounts Main Aggregates (Global Economy Indicators, 1970–2021).</li>
            <li>World Bank — World Development Indicators: NY.GDP.MKTP.CD, SP.POP.TOTL ({L({ es: 'vía', en: 'via' })} github.com/datasets).</li>
            <li><a className="text-link" href={REPO_URL}>{L({ es: 'Código fuente completo en GitHub', en: 'Full source code on GitHub' })}</a></li>
          </ul>
        </div>
      </section>
    </div>
  )
}
