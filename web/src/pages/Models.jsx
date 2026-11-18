import { useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useLang, useL } from '../i18n'
import { useJSON, SLOT_COLORS, MODEL_ORDER, labelPlacer } from '../lib/data'
import { pct, num } from '../lib/format'
import ModelPicker from '../components/ModelPicker'
import { FAMILIES, MODELS, modelShort } from '../content/models'

export default function Models() {
  const { lang } = useLang()
  const L = useL()
  const { data: lb } = useJSON('leaderboard.json')
  const [sel, setSel] = useState(['theta', 'lstm', 'lightgbm'])
  const [grp, setGrp] = useState('backtest')

  return (
    <div className="page">
      <header className="page-head">
        <h1>{L({ es: 'Once modelos, la misma pregunta', en: 'Eleven models, one question' })}</h1>
        <p className="lead">{L({
          es: 'Todos los modelos recibieron exactamente los mismos datos y se evaluaron de la misma forma. Así se puede ver qué aporta cada enfoque, desde reglas de una línea hasta redes neuronales.',
          en: 'Every model got exactly the same data and was scored the same way. That shows what each approach adds, from one-line rules to neural networks.' })}</p>
      </header>

      {!lb && <div className="chart-skeleton" style={{ height: 360 }} />}
      {lb && (
        <>
          <section className="band tight">
            <div className="col-head">
              <h2>{L({ es: '¿Quién se equivoca menos?', en: 'Who errs least?' })}</h2>
              <p className="muted">{L({ es: 'Error porcentual mediano (MdAPE). La línea marca al modelo ingenuo: todo lo que queda a su derecha es peor que suponer que el PBI no cambia.', en: 'Median absolute percentage error (MdAPE). The line marks the naive model: anything to its right is worse than assuming GDP stays flat.' })}</p>
            </div>
            <div className="col-body two">
              <Bars title={L({ es: 'Backtest (3 orígenes, 5 años)', en: 'Backtest (3 origins, 5 years)' })} metrics={lb.groups.backtest.overall} k="mdape" lang={lang} />
              <Bars title={L({ es: 'Prueba real 2022–2023', en: 'Real test 2022–2023' })} metrics={lb.groups.real.overall} k="mdape" lang={lang} />
            </div>
          </section>

          <section className="band tight">
            <div className="col-head">
              <h2>{L({ es: '¿Quién es honesto con su incertidumbre?', en: 'Who is honest about uncertainty?' })}</h2>
              <p className="muted">{L({ es: 'Porcentaje de veces que el valor real cayó dentro del intervalo del 80 %. Lo ideal es estar cerca de 80: menos es exceso de confianza, más es un intervalo inútilmente ancho.', en: 'Share of times the real value fell inside the 80% interval. Ideally close to 80: less is overconfidence, more is a uselessly wide interval.' })}</p>
            </div>
            <div className="col-body"><Coverage lb={lb} lang={lang} L={L} /></div>
          </section>

          <section className="band tight">
            <div className="col-head">
              <h2>{L({ es: 'El error crece con el horizonte', en: 'Error grows with the horizon' })}</h2>
              <p className="muted">{L({ es: 'Error mediano según cuántos años hacia adelante se pronostica (backtest).', en: 'Median error by how many years ahead the forecast goes (backtest).' })}</p>
            </div>
            <div className="col-body">
              <ModelPicker selected={sel} onChange={setSel} />
              <Horizon lb={lb} sel={sel} lang={lang} L={L} />
            </div>
          </section>

          <section className="band tight">
            <div className="col-head">
              <h2>{L({ es: 'Tabla completa', en: 'Full table' })}</h2>
              <div className="seg" role="group" aria-label={L({ es: 'Experimento', en: 'Experiment' })}>
                <button type="button" aria-pressed={grp === 'backtest'} onClick={() => setGrp('backtest')}>Backtest</button>
                <button type="button" aria-pressed={grp === 'real'} onClick={() => setGrp('real')}>{L({ es: 'Prueba real', en: 'Real test' })}</button>
              </div>
            </div>
            <div className="col-body"><FullTable m={lb.groups[grp].overall} lang={lang} L={L} /></div>
          </section>
        </>
      )}

      <section className="band">
        <div className="col-head"><h2>{L({ es: 'Cómo funciona cada uno', en: 'How each one works' })}</h2></div>
        <div className="col-body">
          {FAMILIES.map((f) => (
            <div className="family" key={f.id}>
              <h3>{L(f.name)}</h3>
              <p className="muted">{L(f.blurb)}</p>
              {MODEL_ORDER.filter((m) => MODELS[m].family === f.id).map((m) => (
                <article className="model" key={m} id={m}>
                  <h4>{L(MODELS[m].name)}</h4>
                  <p>{L(MODELS[m].what)}</p>
                  <p>{L(MODELS[m].how)}</p>
                  <dl className="proscons">
                    <div><dt>{L({ es: 'A favor', en: 'Strength' })}</dt><dd>{L(MODELS[m].pros)}</dd></div>
                    <div><dt>{L({ es: 'En contra', en: 'Weakness' })}</dt><dd>{L(MODELS[m].cons)}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Bars({ title, metrics, k, lang }) {
  const rows = MODEL_ORDER.map((m) => ({ m, v: metrics[m][k] })).sort((a, b) => a.v - b.v)
  const max = Math.max(...rows.map((r) => r.v)) * 1.08
  const naive = metrics.naive[k]
  return (
    <figure className="bars">
      <figcaption>{title}</figcaption>
      <div className="bars-body" style={{ '--naive-frac': naive / max }}>
        {rows.map((r) => (
          <div className={`bar-row ${r.m === 'naive' ? 'is-naive' : ''}`} key={r.m}>
            <span className="bar-name">{modelShort(r.m, lang)}</span>
            <span className="bar-track"><span className="bar-fill" style={{ width: `${(r.v / max) * 100}%` }} /></span>
            <span className="bar-val">{pct(r.v, lang)}</span>
          </div>
        ))}
        <span className="naive-line" aria-hidden="true" />
      </div>
    </figure>
  )
}

function Coverage({ lb, lang, L }) {
  const rows = MODEL_ORDER.filter((m) => m !== 'naive' || true).map((m) => ({
    m, bt: lb.groups.backtest.overall[m].coverage, rl: lb.groups.real.overall[m].coverage,
  }))
  const x = (v) => `${v}%`
  return (
    <div className="coverage">
      <div className="cov-legend">
        <span><i className="dot hollow" /> Backtest</span>
        <span><i className="dot" /> {L({ es: 'Prueba real', en: 'Real test' })}</span>
      </div>
      <div className="cov-axis" aria-hidden="true">
        {[0, 20, 40, 60, 80, 100].map((t) => <span key={t} style={{ left: x(t) }}>{t} %</span>)}
      </div>
      {rows.map((r) => (
        <div className="cov-row" key={r.m}>
          <span className="cov-name">{modelShort(r.m, lang)}</span>
          <span className="cov-track">
            <span className="cov-target" style={{ left: '80%' }} />
            <span className="cov-link" style={{ left: x(Math.min(r.bt, r.rl)), width: x(Math.abs(r.bt - r.rl)) }} />
            <span className="dot hollow" style={{ left: x(r.bt) }} title={`Backtest ${pct(r.bt, lang, 0)}`} />
            <span className="dot" style={{ left: x(r.rl) }} title={`${L({ es: 'Prueba real', en: 'Real test' })} ${pct(r.rl, lang, 0)}`} />
          </span>
          <span className="cov-val">{pct(r.bt, lang, 0)} / {pct(r.rl, lang, 0)}</span>
        </div>
      ))}
    </div>
  )
}

function Horizon({ lb, sel, lang, L }) {
  const bh = lb.groups.backtest.by_horizon
  const data = [1, 2, 3, 4, 5].map((h) => ({ h, naive: bh.naive[h - 1], ...Object.fromEntries(sel.map((m) => [m, bh[m][h - 1]])) }))
  const tick = { fill: '#a89b9d', fontSize: 12, fontFamily: 'var(--font-display)' }
  const place = labelPlacer()
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 80, left: 0, bottom: 10 }}>
        <CartesianGrid stroke="#3d4036" vertical={false} />
        <XAxis dataKey="h" tick={tick} tickLine={false} axisLine={{ stroke: '#575a4b' }}
          tickFormatter={(h) => L({ es: `${h} ${h === 1 ? 'año' : 'años'}`, en: `${h} yr` })} />
        <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} %`} width={52} domain={[0, 'auto']} />
        <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
          <div className="tip"><div className="tip-year">{L({ es: `Horizonte: ${label} años`, en: `Horizon: ${label} yr` })}</div>
            {payload.map((p) => <div className="tip-row" key={p.dataKey}><span className="sw" style={{ background: p.stroke }} />{modelShort(p.dataKey, lang)}<b>{pct(p.value, lang)}</b></div>)}
          </div>) : null} />
        <Line dataKey="naive" stroke="#816c61" strokeDasharray="4 4" strokeWidth={2} dot={false} isAnimationActive={false}
          label={({ x, y, index }) => index === 4 ? <text x={x + 6} y={place(y)} dy={4} fill="#a89b9d" fontSize={12}>Naive</text> : null} />
        {sel.map((m, i) => (
          <Line key={m} dataKey={m} stroke={SLOT_COLORS[i]} strokeWidth={2} isAnimationActive={false}
            dot={{ r: 4, fill: SLOT_COLORS[i], stroke: '#2a2c24', strokeWidth: 2 }}
            label={({ x, y, index }) => index === 4 ? <text x={x + 8} y={place(y)} dy={4} fill="#cfcfea" fontSize={12}>{modelShort(m, lang)}</text> : null} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

function FullTable({ m, lang, L }) {
  const rows = MODEL_ORDER.map((id) => ({ id, ...m[id] })).sort((a, b) => a.mdape - b.mdape)
  return (
    <div className="table-scroll">
      <table className="full">
        <thead><tr>
          <th scope="col">{L({ es: 'Modelo', en: 'Model' })}</th><th scope="col">MdAPE</th><th scope="col">MAPE</th><th scope="col">MASE</th>
          <th scope="col">{L({ es: 'Cobertura 80 %', en: '80% coverage' })}</th><th scope="col">{L({ es: 'Sesgo', en: 'Bias' })}</th>
          <th scope="col">{L({ es: 'Gana en % de países', en: 'Best in % of countries' })}</th><th scope="col">{L({ es: 'Le gana al ingenuo', en: 'Beats naive' })}</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">{modelShort(r.id, lang)}</th>
              <td>{pct(r.mdape, lang)}</td><td>{pct(r.mape, lang)}</td><td>{num(r.mase, lang, 2)}</td>
              <td>{pct(r.coverage, lang, 0)}</td><td>{pct(r.bias, lang, 1, true)}</td>
              <td>{pct(r.wins, lang, 0)}</td><td>{r.beats_naive == null ? '—' : pct(r.beats_naive, lang, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">{L({ es: 'Sesgo positivo: el modelo sobreestima el PBI en promedio. "Le gana al ingenuo": porcentaje de países donde su error medio fue menor que el del paseo aleatorio.', en: 'Positive bias: the model overestimates GDP on average. "Beats naive": share of countries where its mean error was below the random walk\'s.' })}</p>
    </div>
  )
}
