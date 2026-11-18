import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { useLang, useL, countryName } from '../i18n'
import { useJSON } from '../lib/data'
import { money, usd, pct } from '../lib/format'
import { modelShort } from '../content/models'

const COLS = [
  ['name', { es: 'País', en: 'Country' }],
  ['gdp', { es: 'PBI (último año)', en: 'GDP (latest)' }],
  ['pc', { es: 'Por persona', en: 'Per person' }],
  ['cagr_hist', { es: 'Crec. anual 10 años', en: '10-yr annual growth' }],
  ['cagr_fc', { es: 'Crec. anual proyectado', en: 'Projected annual growth' }],
  ['gdp_2030', { es: 'PBI 2030 (ensamble)', en: 'GDP 2030 (ensemble)' }],
  ['best_bt', { es: 'Mejor modelo', en: 'Best model' }],
]

export default function Panorama() {
  const { lang } = useLang()
  const L = useL()
  const { data } = useJSON('index.json')
  const [sort, setSort] = useState({ k: 'gdp', dir: -1 })
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    if (!data) return []
    const norm = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    return data.countries.map((c) => ({ ...c, name: countryName(c, lang) }))
      .filter((c) => !q || norm(c.name).includes(norm(q)))
      .sort((a, b) => {
        const va = a[sort.k]; const vb = b[sort.k]
        if (typeof va === 'string') return va.localeCompare(vb, lang) * sort.dir
        return ((va ?? -Infinity) - (vb ?? -Infinity)) * sort.dir
      })
  }, [data, sort, q, lang])

  const scatter = useMemo(() => data?.countries.filter((c) => c.cagr_hist != null && c.cagr_fc != null)
    .map((c) => ({ x: c.cagr_hist, y: c.cagr_fc, name: countryName(c, lang), id: c.id })), [data, lang])

  const th = (k, label) => (
    <th scope="col" key={k} aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => setSort((s) => ({ k, dir: s.k === k ? -s.dir : k === 'name' ? 1 : -1 }))}>
        {L(label)}{sort.k === k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  )
  const tick = { fill: '#a89b9d', fontSize: 12, fontFamily: 'var(--font-display)' }

  return (
    <div className="page">
      <header className="page-head">
        <h1>{L({ es: 'Los 179 países de un vistazo', en: 'All 179 countries at a glance' })}</h1>
        <p className="lead">{L({ es: 'Tamaño de cada economía, ingreso por persona, cómo creció la última década y cuánto proyecta el ensamble de modelos hasta 2030. Todo en dólares corrientes.', en: 'Each economy\'s size, income per person, how it grew over the last decade and what the model ensemble projects to 2030. All in current dollars.' })}</p>
      </header>

      {scatter && (
        <section className="band tight">
          <div className="col-head">
            <h2>{L({ es: '¿El pasado predice el futuro?', en: 'Does the past predict the future?' })}</h2>
            <p className="muted">{L({ es: 'Cada punto es un país. Si los modelos solo repitieran la última década, los puntos caerían sobre la diagonal. Que se aplanen hacia el centro es "reversión a la media": los modelos esperan que los extremos se moderen.', en: 'Each dot is a country. If the models just repeated the last decade, dots would sit on the diagonal. Flattening toward the middle is "mean reversion": the models expect extremes to moderate.' })}</p>
          </div>
          <div className="col-body">
            <ResponsiveContainer width="100%" height={380}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                <CartesianGrid stroke="#3d4036" />
                <XAxis type="number" dataKey="x" domain={[-8, 16]} ticks={[-8, -4, 0, 4, 8, 12, 16]} allowDataOverflow tick={tick} tickFormatter={(v) => `${v} %`}
                  label={{ value: L({ es: 'Crecimiento anual últimos 10 años', en: 'Annual growth, last 10 years' }), position: 'bottom', fill: '#a89b9d', fontSize: 12 }} />
                <YAxis type="number" dataKey="y" domain={[-8, 16]} ticks={[-8, -4, 0, 4, 8, 12, 16]} allowDataOverflow tick={tick} tickFormatter={(v) => `${v} %`}
                  label={{ value: L({ es: 'Proyectado a 2030', en: 'Projected to 2030' }), angle: -90, position: 'insideLeft', fill: '#a89b9d', fontSize: 12 }} />
                <ReferenceLine segment={[{ x: -8, y: -8 }, { x: 16, y: 16 }]} stroke="#816c61" strokeDasharray="4 4" />
                <Tooltip cursor={false} content={({ active, payload }) => active && payload?.length ? (
                  <div className="tip"><div className="tip-year">{payload[0].payload.name}</div>
                    <div className="tip-row">{L({ es: 'Últimos 10 años', en: 'Last 10 years' })}<b>{pct(payload[0].payload.x, lang)}</b></div>
                    <div className="tip-row">{L({ es: 'Proyectado', en: 'Projected' })}<b>{pct(payload[0].payload.y, lang)}</b></div></div>) : null} />
                <Scatter data={scatter} fill="#cfcfea" fillOpacity={0.75} stroke="#2a2c24" strokeWidth={1.5} isAnimationActive={false} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="band tight wide">
        <div className="col-head table-head">
          <h2>{L({ es: 'Tabla', en: 'Table' })}</h2>
          <label className="field-label" htmlFor="pq">{L({ es: 'Filtrar', en: 'Filter' })}</label>
          <input id="pq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L({ es: 'Nombre del país', en: 'Country name' })} />
        </div>
        <div className="col-body table-scroll">
          <table className="full panorama">
            <thead><tr>{COLS.map(([k, l]) => th(k, l))}</tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <th scope="row"><Link to={`/explorar/${c.id}`}>{c.name}</Link></th>
                  <td>{money(c.gdp, lang)} <span className="muted small">{c.last_year}</span></td>
                  <td>{usd(c.pc, lang)}</td>
                  <td>{pct(c.cagr_hist, lang, 1, true)}</td>
                  <td>{pct(c.cagr_fc, lang, 1, true)}</td>
                  <td>{money(c.gdp_2030, lang)}</td>
                  <td>{c.best_bt ? modelShort(c.best_bt, lang) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
