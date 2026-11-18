import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLang, useL, countryName } from '../i18n'
import { useJSON, MODEL_ORDER } from '../lib/data'
import { money, pct } from '../lib/format'
import ForecastChart from '../components/ForecastChart'
import { CONCEPTS } from '../content/concepts'
import { MODELS, modelShort } from '../content/models'

export default function Home() {
  const { lang } = useLang()
  const L = useL()
  const nav = useNavigate()
  const [cid, setCid] = useState('ARG')
  const { data: index } = useJSON('index.json')
  const { data: detail } = useJSON(`c/${cid}.json`)
  const { data: lb } = useJSON('leaderboard.json')

  const sorted = useMemo(() => index?.countries.slice()
    .sort((a, b) => countryName(a, lang).localeCompare(countryName(b, lang), lang)), [index, lang])

  const range2030 = useMemo(() => {
    if (!detail) return null
    const v = MODEL_ORDER.filter((m) => m !== 'naive').map((m) => detail.future[m]?.find((r) => r[0] === 2030)?.[1]).filter(Boolean)
    return { min: Math.min(...v), max: Math.max(...v), ens: detail.future.ensemble?.find((r) => r[0] === 2030)?.[1] }
  }, [detail])

  const country = index?.countries.find((c) => c.id === cid)

  return (
    <>
      <section className="hero">
        <h1 className="hero-title">
          <span>{L({ es: 'El PBI de', en: 'The GDP of' })}</span>{' '}
          <label className="inline-select">
            <span className="sr-only">{L({ es: 'Elegir país', en: 'Choose country' })}</span>
            <span className="shown" aria-hidden="true">{country ? countryName(country, lang) : 'Argentina'}</span>
            <select value={cid} onChange={(e) => setCid(e.target.value)}>
              {sorted?.map((c) => <option key={c.id} value={c.id}>{countryName(c, lang)}</option>)}
              {!sorted && <option value="ARG">Argentina</option>}
            </select>
          </label>{' '}
          <span>{L({ es: 'en 2030, según once modelos', en: 'in 2030, according to eleven models' })}</span>
        </h1>
        <div className="hero-body">
          <p className="hero-lede">
            {range2030 && country ? L({
              es: <>Los modelos lo ubican entre <b>{money(range2030.min, lang)}</b> y <b>{money(range2030.max, lang)}</b>. El ensamble dice <b>{money(range2030.ens, lang)}</b>, frente a {money(country.gdp, lang)} en {country.last_year}. Cada línea gris es un modelo distinto: cuanto más se abren, más incierto es el futuro.</>,
              en: <>The models place it between <b>{money(range2030.min, lang)}</b> and <b>{money(range2030.max, lang)}</b>. The ensemble says <b>{money(range2030.ens, lang)}</b>, versus {money(country.gdp, lang)} in {country.last_year}. Each grey line is a different model: the wider they fan out, the more uncertain the future.</>,
            }) : L({ es: 'Cargando pronósticos…', en: 'Loading forecasts…' })}
          </p>
          <Link className="btn" to={`/explorar/${cid}`}>{L({ es: 'Ver este país en detalle', en: 'See this country in detail' })}</Link>
        </div>
        <div className="hero-chart">
          {detail ? <ForecastChart detail={detail} mode="future" selected={['ensemble']} showAll fromYear={1990} height={440} />
            : <div className="chart-skeleton" style={{ height: 440 }} />}
        </div>
      </section>

      <section className="band">
        <div className="col-head"><h2>{L({ es: 'Qué hay en esta web', en: 'What is in this site' })}</h2></div>
        <div className="col-body">
          <p className="lead">{L({
            es: 'Un proyecto de análisis de datos y series temporales: tomé un notebook de Colab que predecía el PBI de algunos países, corregí sus errores y lo convertí en una comparación rigurosa de once modelos para 179 países.',
            en: 'A data analysis and time-series project: I took a Colab notebook that forecast GDP for a few countries, fixed its errors and turned it into a rigorous comparison of eleven models across 179 countries.' })}</p>
          <dl className="routes">
            <div><dt><Link to="/explorar">{L({ es: 'Explorar países', en: 'Explore countries' })}</Link></dt>
              <dd>{L({ es: 'Pronóstico a 2030, cómo le fue a cada modelo con ese país, PBI per cápita, población y estructura productiva.', en: 'Forecast to 2030, how each model did for that country, GDP per capita, population and economic structure.' })}</dd></div>
            <div><dt><Link to="/modelos">{L({ es: 'Modelos', en: 'Models' })}</Link></dt>
              <dd>{L({ es: 'Qué hace cada modelo, cuál se equivoca menos y cuál es honesto con su incertidumbre.', en: 'What each model does, which errs least and which is honest about its uncertainty.' })}</dd></div>
            <div><dt><Link to="/panorama">{L({ es: 'Panorama', en: 'Overview' })}</Link></dt>
              <dd>{L({ es: 'Los 179 países en una tabla: tamaño, ingreso por persona, crecimiento pasado y proyectado.', en: 'All 179 countries in one table: size, income per person, past and projected growth.' })}</dd></div>
            <div><dt><Link to="/metodologia">{L({ es: 'Metodología', en: 'Methodology' })}</Link></dt>
              <dd>{L({ es: 'Los errores del notebook original, cómo se corrigieron y las limitaciones del enfoque.', en: 'The original notebook\'s errors, how they were fixed and the limits of the approach.' })}</dd></div>
          </dl>
        </div>
      </section>

      <section className="band">
        <div className="col-head"><h2>{L({ es: 'Los datos', en: 'The data' })}</h2></div>
        <div className="col-body">
          <p>{L({
            es: 'La base es el dataset Global Economy Indicators de la División de Estadística de la ONU: 220 países con 26 indicadores anuales de 1970 a 2021. Me quedé con los 179 que tienen los 52 años completos y les agregué 2022 y 2023 del Banco Mundial, empalmados por tasa de variación para que las dos fuentes encajen.',
            en: 'The base is the UN Statistics Division\'s Global Economy Indicators dataset: 220 countries with 26 annual indicators from 1970 to 2021. I kept the 179 with all 52 years and added 2022 and 2023 from the World Bank, spliced by growth rate so both sources line up.' })}</p>
          <dl className="glossary">
            <div><dt>{L({ es: 'PBI', en: 'GDP' })}</dt><dd>{L({ es: 'Valor de todo lo que produce un país en un año, en dólares corrientes. Es lo que pronostican los modelos.', en: 'Value of everything a country produces in a year, in current dollars. It is what the models forecast.' })}</dd></div>
            <div><dt>{L({ es: 'Población', en: 'Population' })}</dt><dd>{L({ es: 'Habitantes a mitad de año. Sirve para pasar de tamaño de la economía a nivel de vida.', en: 'Mid-year inhabitants. It turns economy size into living standards.' })}</dd></div>
            <div><dt>{L({ es: 'PBI per cápita', en: 'GDP per capita' })}</dt><dd>{L({ es: 'PBI dividido población. Una economía puede crecer solo porque tiene más gente; el per cápita lo distingue.', en: 'GDP divided by population. An economy can grow just because it has more people; per capita tells them apart.' })}</dd></div>
            <div><dt>{L({ es: 'Estructura productiva', en: 'Economic structure' })}</dt><dd>{L({ es: 'Qué parte del valor agregado viene del agro, la industria, la construcción, el comercio, el transporte y los demás servicios (clasificación ISIC). Muestra cómo cambia una economía al desarrollarse.', en: 'Which share of value added comes from agriculture, industry, construction, trade, transport and other services (ISIC classification). It shows how an economy changes as it develops.' })}</dd></div>
          </dl>
          <p className="note">{L({
            es: 'Por qué importa que sea en dólares corrientes: el número mezcla crecimiento real, inflación y tipo de cambio. Ningún modelo puede anticipar una devaluación, y eso pone un límite a lo que se puede predecir.',
            en: 'Why current dollars matter: the figure mixes real growth, inflation and the exchange rate. No model can anticipate a devaluation, and that caps what can be predicted.' })}</p>
        </div>
      </section>

      <section className="band">
        <div className="col-head"><h2>{L({ es: 'Cómo se puso a prueba cada modelo', en: 'How each model was tested' })}</h2></div>
        <div className="col-body">
          <Timeline L={L} />
          <ol className="steps">
            <li><b>{L({ es: 'Backtest en tres momentos.', en: 'Backtest at three moments.' })}</b> {L({ es: 'Cada modelo se entrenó con datos hasta 2006, 2011 y 2016, y pronosticó los cinco años siguientes, que ya sabemos cómo terminaron.', en: 'Each model was trained on data up to 2006, 2011 and 2016 and forecast the next five years, whose outcome we already know.' })}</li>
            <li><b>{L({ es: 'Prueba real.', en: 'Real test.' })}</b> {L({ es: 'Entrenados solo con el dataset original (hasta 2021), pronosticaron 2022 y 2023, y se compararon con los datos del Banco Mundial.', en: 'Trained only on the original dataset (to 2021), they forecast 2022 and 2023, then were compared with World Bank data.' })}</li>
            <li><b>{L({ es: 'Pronóstico.', en: 'Forecast.' })}</b> {L({ es: 'Con todos los datos disponibles, cada modelo proyecta hasta 2030 con un intervalo del 80 %.', en: 'With all available data, each model projects to 2030 with an 80% interval.' })}</li>
          </ol>
        </div>
      </section>

      {lb && <Findings lb={lb} L={L} lang={lang} />}

      <section className="band">
        <div className="col-head"><h2>{L({ es: 'Conceptos que vas a ver', en: 'Concepts you will see' })}</h2>
          <p className="muted">{L({ es: 'Ideas de análisis de datos y series temporales aplicadas en el proyecto.', en: 'Data analysis and time-series ideas applied in the project.' })}</p></div>
        <div className="col-body">
          <dl className="concepts">
            {CONCEPTS.map((c) => <div key={c.id}><dt>{L(c.term)}</dt><dd>{L(c.def)}</dd></div>)}
          </dl>
        </div>
      </section>

      <section className="band closing">
        <p>{L({ es: '¿Querés ver un país en particular?', en: 'Want to look at a specific country?' })}</p>
        <button className="btn" type="button" onClick={() => nav('/explorar')}>{L({ es: 'Explorar los 179 países', en: 'Explore all 179 countries' })}</button>
      </section>
    </>
  )
}

function Findings({ lb, L, lang }) {
  const bt = lb.groups.backtest.overall
  const rl = lb.groups.real.overall
  const ids = Object.keys(bt)
  const bestBt = ids.reduce((a, b) => (bt[a].mdape < bt[b].mdape ? a : b))
  const bestRl = ids.reduce((a, b) => (rl[a].mdape < rl[b].mdape ? a : b))
  const name = (m) => L(MODELS[m].name)
  return (
    <section className="band findings">
      <div className="col-head"><h2>{L({ es: 'Lo que salió', en: 'What came out' })}</h2></div>
      <div className="col-body">
        <ul className="facts">
          <li><span className="fact-num">{pct(bt[bestBt].mdape, lang)}</span>
            <span>{L({ es: <>de error mediano a cinco años: el mejor en el backtest fue <b>{name(bestBt)}</b>. El ingenuo comete {pct(bt.naive.mdape, lang)}.</>,
              en: <>median five-year error: the best in the backtest was <b>{name(bestBt)}</b>. The naive model makes {pct(bt.naive.mdape, lang)}.</> })}</span></li>
          <li><span className="fact-num">{pct(rl[bestRl].mdape, lang)}</span>
            <span>{L({ es: <>de error en la prueba real 2022–2023, con <b>{name(bestRl)}</b> al frente. Los modelos simples siguen siendo difíciles de superar.</>,
              en: <>error in the real 2022–2023 test, with <b>{name(bestRl)}</b> in front. Simple models remain hard to beat.</> })}</span></li>
          <li><span className="fact-num">{pct(bt.prophet.coverage, lang, 0)}</span>
            <span>{L({ es: <>de cobertura del intervalo de Prophet, cuando debería ser 80 %. El modelo del notebook original es demasiado confiado.</>,
              en: <>coverage for Prophet's interval, when it should be 80%. The original notebook's model is overconfident.</> })}</span></li>
        </ul>
        <Link to="/modelos" className="text-link">{L({ es: 'Ver la comparación completa', en: 'See the full comparison' })}</Link>
      </div>
    </section>
  )
}

function Timeline({ L }) {
  const x = (y) => 20 + ((y - 1970) / 60) * 760
  const marks = [
    { y: 2006, t: { es: 'origen 1', en: 'origin 1' } }, { y: 2011, t: { es: 'origen 2', en: 'origin 2' } },
    { y: 2016, t: { es: 'origen 3', en: 'origin 3' } }, { y: 2021, t: { es: 'fin del dataset', en: 'dataset ends' } },
  ]
  return (
    <svg className="timeline" viewBox="0 0 800 120" role="img" aria-label={L({ es: 'Línea de tiempo de los experimentos, de 1970 a 2030', en: 'Experiment timeline, 1970 to 2030' })}>
      <rect x={x(1970)} y={52} width={x(2021) - x(1970)} height={8} rx={4} fill="#575a4b" />
      <rect x={x(2021)} y={52} width={x(2023) - x(2021)} height={8} fill="#816c61" />
      <rect x={x(2023)} y={52} width={x(2030) - x(2023)} height={8} rx={4} fill="none" stroke="#a89b9d" strokeDasharray="3 3" />
      {marks.map((m) => (
        <g key={m.y}>
          <line x1={x(m.y)} x2={x(m.y)} y1={40} y2={72} stroke="#cfcfea" strokeWidth={2} />
          <text x={x(m.y)} y={30} textAnchor="middle" fill="#cfcfea" fontSize={13}>{m.y}</text>
          <text x={x(m.y)} y={92} textAnchor="middle" fill="#a89b9d" fontSize={12}>{L(m.t)}</text>
        </g>
      ))}
      <text x={x(1970)} y={30} fill="#a89b9d" fontSize={13}>1970</text>
      <text x={x(2022)} y={112} textAnchor="middle" fill="#a89b9d" fontSize={12}>{L({ es: 'Banco Mundial', en: 'World Bank' })}</text>
      <text x={x(2030)} y={30} textAnchor="end" fill="#a89b9d" fontSize={13}>2030</text>
      <text x={x(2027)} y={92} textAnchor="middle" fill="#a89b9d" fontSize={12}>{L({ es: 'pronóstico', en: 'forecast' })}</text>
    </svg>
  )
}
