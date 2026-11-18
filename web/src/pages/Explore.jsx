import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useLang, useL, countryName } from '../i18n'
import { useJSON, MODEL_ORDER, ACTUAL_COLOR } from '../lib/data'
import { money, pct, usd, compact, num } from '../lib/format'
import ForecastChart from '../components/ForecastChart'
import ModelPicker from '../components/ModelPicker'
import { MODELS, modelShort } from '../content/models'

const TABS = [
  ['future', { es: 'Pronóstico 2030', en: '2030 forecast' }],
  ['backtest', { es: 'Backtest 2017–2021', en: 'Backtest 2017–2021' }],
  ['real', { es: 'Prueba real 2022–2023', en: 'Real test 2022–2023' }],
  ['people', { es: 'Per cápita y población', en: 'Per capita and population' }],
  ['structure', { es: 'Estructura productiva', en: 'Economic structure' }],
]

export default function Explore() {
  const { id = 'ARG' } = useParams()
  const { lang } = useLang()
  const L = useL()
  const nav = useNavigate()
  const { data: index } = useJSON('index.json')
  const { data: detail, error } = useJSON(`c/${id}.json`)
  const [tab, setTab] = useState('future')
  const [selected, setSelected] = useState(['ensemble', 'theta', 'lstm'])
  const [showAll, setShowAll] = useState(false)
  const [log, setLog] = useState(false)
  const [from, setFrom] = useState(1995)
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    if (!index) return []
    const norm = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    const nq = norm(q)
    return index.countries
      .map((c) => ({ ...c, label: countryName(c, lang) }))
      .filter((c) => !nq || norm(c.label).includes(nq) || norm(c.name_en).includes(nq))
      .sort((a, b) => a.label.localeCompare(b.label, lang))
  }, [index, q, lang])

  const summary = index?.countries.find((c) => c.id === id)
  const name = summary ? countryName(summary, lang) : detail ? countryName(detail, lang) : ''

  return (
    <div className="explore">
      <aside className="country-list">
        <label htmlFor="q" className="field-label">{L({ es: 'Buscar país', en: 'Search country' })}</label>
        <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={L({ es: 'Ej.: Uruguay', en: 'e.g. Uruguay' })} autoComplete="off" />
        <ul>
          {list.map((c) => (
            <li key={c.id}><button type="button" className={c.id === id ? 'cur' : ''} aria-current={c.id === id}
              onClick={() => nav(`/explorar/${c.id}`)}>{c.label}</button></li>
          ))}
          {index && list.length === 0 && <li className="muted">{L({ es: 'Ningún país coincide. Probá con el nombre en inglés.', en: 'No country matches. Try another spelling.' })}</li>}
        </ul>
      </aside>

      <section className="country">
        {error && <p className="error">{L({ es: 'No hay datos para ese país. Elegí otro de la lista.', en: 'No data for that country. Pick another from the list.' })}</p>}
        {summary && (
          <header className="country-head">
            <h1>{name}</h1>
            <dl className="stats">
              <div><dt>{L({ es: `PBI ${summary.last_year}`, en: `GDP ${summary.last_year}` })}</dt><dd>{money(summary.gdp, lang)}</dd></div>
              <div><dt>{L({ es: 'Por persona', en: 'Per person' })}</dt><dd>{usd(summary.pc, lang)}</dd></div>
              <div><dt>{L({ es: 'Población', en: 'Population' })}</dt><dd>{compact(summary.pop, lang)}</dd></div>
              <div><dt>{L({ es: 'Crecimiento anual, últimos 10 años', en: 'Annual growth, last 10 years' })}</dt><dd>{pct(summary.cagr_hist, lang, 1, true)}</dd></div>
              <div><dt>{L({ es: `Proyección anual hasta 2030`, en: 'Projected annual growth to 2030' })}</dt><dd>{pct(summary.cagr_fc, lang, 1, true)}</dd></div>
            </dl>
          </header>
        )}

        <div className="tabs" role="tablist">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}
              disabled={k === 'real' && detail && !detail.extended}>{L(label)}</button>
          ))}
        </div>

        {!detail && !error && <div className="chart-skeleton" style={{ height: 420 }} />}
        {detail && (tab === 'future' || tab === 'backtest' || tab === 'real') && (
          <>
            <TabIntro tab={tab} L={L} detail={detail} />
            <ModelPicker selected={selected} onChange={setSelected} />
            <div className="chart-controls">
              <label><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> {L({ es: 'Mostrar el resto de los modelos en gris', en: 'Show the other models in grey' })}</label>
              <label><input type="checkbox" checked={log} onChange={(e) => setLog(e.target.checked)} /> {L({ es: 'Escala logarítmica', en: 'Log scale' })}</label>
              {tab === 'future' && (
                <label>{L({ es: 'Desde', en: 'From' })}{' '}
                  <select value={from} onChange={(e) => setFrom(+e.target.value)}>
                    {[1970, 1990, 1995, 2005, 2012].map((y) => <option key={y}>{y}</option>)}
                  </select></label>
              )}
            </div>
            <ForecastChart detail={detail} mode={tab} selected={selected} showAll={showAll} log={log}
              fromYear={tab === 'future' ? from : tab === 'backtest' ? 2000 : 2008} />
            <ErrorTable detail={detail} L={L} lang={lang} />
          </>
        )}
        {detail && tab === 'people' && <People detail={detail} L={L} lang={lang} />}
        {detail && tab === 'structure' && <Structure detail={detail} L={L} lang={lang} />}
      </section>
    </div>
  )
}

function TabIntro({ tab, L, detail }) {
  const txt = {
    future: { es: 'Cada modelo proyecta el PBI desde el último dato disponible hasta 2030. La banda es el intervalo del 80 % del primer modelo elegido: hay 8 chances en 10 de que el valor real caiga adentro, si el modelo está bien calibrado.',
      en: 'Each model projects GDP from the last available data point to 2030. The band is the 80% interval of the first chosen model: an 8-in-10 chance the real value falls inside, if the model is well calibrated.' },
    backtest: { es: 'Los modelos se entrenaron solo con datos hasta 2016 y pronosticaron 2017–2021, que incluye la pandemia. La línea lavanda es lo que pasó de verdad.',
      en: 'Models were trained only on data up to 2016 and forecast 2017–2021, which includes the pandemic. The lavender line is what actually happened.' },
    real: { es: 'Entrenados con el dataset original (hasta 2021), los modelos pronosticaron 2022–2023. Los puntos son los datos reales del Banco Mundial, que ningún modelo vio.',
      en: 'Trained on the original dataset (to 2021), the models forecast 2022–2023. The dots are real World Bank data that no model saw.' },
  }
  return <p className="tab-intro">{L(txt[tab])}{tab === 'future' && !detail.extended && <> {L({ es: 'Para este país el Banco Mundial no publica 2022–2023, así que el pronóstico arranca en 2021.', en: 'The World Bank does not publish 2022–2023 for this country, so the forecast starts in 2021.' })}</>}</p>
}

function ErrorTable({ detail, L, lang }) {
  const rows = MODEL_ORDER.map((m) => ({ m, ...detail.metrics[m] }))
  const best = (k) => rows.filter((r) => r[k] != null).reduce((a, b) => (a[k] < b[k] ? a : b), { [k]: Infinity }).m
  const bB = best('backtest'); const bR = best('real')
  const max = Math.max(...rows.map((r) => Math.max(r.backtest ?? 0, r.real ?? 0)))
  const bar = (v) => v == null ? null : <span className="bar" style={{ width: `${Math.max(2, (v / max) * 100)}%` }} />
  return (
    <div className="table-wrap">
      <h2 className="h3">{L({ es: '¿Qué modelo acertó mejor con este país?', en: 'Which model got this country right?' })}</h2>
      <p className="muted">{L({ es: 'Error porcentual medio. Backtest: promedio de los orígenes 2006, 2011 y 2016 (5 años cada uno). Prueba real: 2022–2023.', en: 'Mean percentage error. Backtest: average of origins 2006, 2011 and 2016 (5 years each). Real test: 2022–2023.' })}</p>
      <table className="errors">
        <thead><tr><th scope="col">{L({ es: 'Modelo', en: 'Model' })}</th><th scope="col">Backtest</th><th scope="col">{L({ es: 'Prueba real', en: 'Real test' })}</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.m}>
              <th scope="row">{modelShort(r.m, lang)}</th>
              <td><div className="cell-bar">{bar(r.backtest)}<span>{pct(r.backtest, lang)}</span>{r.m === bB && <em>{L({ es: 'el mejor', en: 'best' })}</em>}</div></td>
              <td><div className="cell-bar">{bar(r.real)}<span>{r.real == null ? L({ es: 'sin datos', en: 'no data' }) : pct(r.real, lang)}</span>{r.m === bR && <em>{L({ es: 'el mejor', en: 'best' })}</em>}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const tick = { fill: '#a89b9d', fontSize: 12, fontFamily: 'var(--font-display)' }

function MiniLine({ data, dataKey, fmt, label, L, lang, color = ACTUAL_COLOR, domain }) {
  return (
    <figure className="mini">
      <figcaption>{label}</figcaption>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#3d4036" vertical={false} />
          <XAxis dataKey="y" tick={tick} tickLine={false} axisLine={{ stroke: '#575a4b' }} minTickGap={24} />
          <YAxis tickFormatter={fmt} tick={tick} tickLine={false} axisLine={false} width={64} domain={domain} />
          <Tooltip content={({ active, payload, label: yr }) => active && payload?.length ? (
            <div className="tip"><div className="tip-year">{yr}</div><div className="tip-row"><b>{fmt(payload[0].value)}</b></div></div>) : null} />
          <Line dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  )
}

function People({ detail, L, lang }) {
  const h = detail.history
  const growth = h.map((r, i) => ({ y: r.y, g: i && h[i - 1].pc ? (r.pc / h[i - 1].pc - 1) * 100 : null })).slice(1)
  const first = h[0]; const last = h.at(-1)
  const pcMult = last.pc / first.pc; const popMult = last.pop / first.pop
  return (
    <>
      <p className="tab-intro">{L({
        es: `Desde ${first.y}, la población se multiplicó por ${num(popMult, lang, 1)} y el PBI por persona (en dólares corrientes) por ${num(pcMult, lang, 1)}. El PBI total crece por las dos cosas; el per cápita aísla la mejora en nivel de vida medida en dólares.`,
        en: `Since ${first.y}, population grew ${num(popMult, lang, 1)}× and GDP per person (in current dollars) ${num(pcMult, lang, 1)}×. Total GDP grows for both reasons; per capita isolates the change in living standards measured in dollars.` })}</p>
      <div className="minis">
        <MiniLine data={h} dataKey="pc" fmt={(v) => usd(v, lang)} label={L({ es: 'PBI per cápita (USD corrientes)', en: 'GDP per capita (current USD)' })} L={L} lang={lang} />
        <MiniLine data={h} dataKey="pop" fmt={(v) => compact(v, lang)} label={L({ es: 'Población', en: 'Population' })} L={L} lang={lang} />
        <MiniLine data={growth} dataKey="g" fmt={(v) => pct(v, lang, 0)} label={L({ es: 'Variación anual del PBI per cápita en dólares', en: 'Annual change in GDP per capita in dollars' })} L={L} lang={lang} color="#a89b9d" />
      </div>
    </>
  )
}

const SECTORS = [
  ['agriculture', { es: 'Agro, caza, silvicultura y pesca', en: 'Agriculture, forestry and fishing' }],
  ['industry', { es: 'Minería, industria y servicios públicos', en: 'Mining, manufacturing and utilities' }],
  ['manufacturing', { es: 'Industria manufacturera (parte de la anterior)', en: 'Manufacturing (part of the above)' }],
  ['construction', { es: 'Construcción', en: 'Construction' }],
  ['trade', { es: 'Comercio, restaurantes y hoteles', en: 'Trade, restaurants and hotels' }],
  ['transport', { es: 'Transporte y comunicaciones', en: 'Transport and communications' }],
  ['other_services', { es: 'Otros servicios (finanzas, Estado, educación, salud…)', en: 'Other services (finance, government, education, health…)' }],
]

function Structure({ detail, L, lang }) {
  const s = detail.sectors
  if (!s.length) return <p className="tab-intro">{L({ es: 'No hay datos sectoriales para este país.', en: 'No sector data for this country.' })}</p>
  const a = s[0]; const b = s.at(-1)
  const moves = SECTORS.filter(([k]) => k !== 'manufacturing').map(([k, lab]) => ({ k, lab, d: (b[k] ?? 0) - (a[k] ?? 0) }))
    .sort((x, y) => Math.abs(y.d) - Math.abs(x.d))
  const top = moves[0]
  return (
    <>
      <p className="tab-intro">{L({
        es: <>Porcentaje del valor agregado total que aporta cada sector. Entre {a.y} y {b.y}, el cambio más grande fue en <b>{L(top.lab).toLowerCase()}</b>: {pct(top.d, lang, 1, true).replace('%', 'puntos')}. Cuando un país se desarrolla, el agro suele perder peso a favor de la industria primero y de los servicios después.</>,
        en: <>Share of total value added from each sector. Between {a.y} and {b.y}, the biggest change was in <b>{L(top.lab).toLowerCase()}</b>: {pct(top.d, lang, 1, true).replace('%', 'points')}. As countries develop, agriculture usually loses weight to industry first and services later.</> })}</p>
      <div className="minis sectors">
        {SECTORS.map(([k, lab]) => (
          <MiniLine key={k} data={s} dataKey={k} fmt={(v) => `${num(v, lang, 0)} %`} label={L(lab)} L={L} lang={lang}
            domain={[0, (max) => Math.max(10, Math.ceil(max / 10) * 10)]} color={k === 'manufacturing' ? '#a89b9d' : ACTUAL_COLOR} />
        ))}
      </div>
      <p className="muted">{L({ es: 'Fuente: ONU, clasificación ISIC Rev. 3. Datos hasta 2021.', en: 'Source: UN, ISIC Rev. 3 classification. Data to 2021.' })} <Link to="/metodologia" className="text-link">{L({ es: 'Más sobre los datos', en: 'More on the data' })}</Link></p>
    </>
  )
}
