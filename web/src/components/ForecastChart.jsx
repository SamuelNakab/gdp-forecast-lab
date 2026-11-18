import { useMemo, useEffect, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { useLang, useL } from '../i18n'
import { money, axisMoney } from '../lib/format'
import { ACTUAL_COLOR, MODEL_ORDER, MUTED_LINE, SLOT_COLORS, labelPlacer } from '../lib/data'
import { modelShort } from '../content/models'

/**
 * mode: 'future' | 'backtest' | 'real'
 * selected: ids de modelos (máx. 3) -> colores fijos por posición
 */
export default function ForecastChart({ detail, mode = 'future', selected = [], showAll = false, log = false,
  fromYear = 1995, height = 420, compactAxis = false }) {
  const { lang } = useLang()
  const L = useL()
  const block = detail[mode] || {}
  const origin = mode === 'backtest' ? 2016 : mode === 'real' ? 2021 : detail.history.at(-1).y
  const histEnd = mode === 'future' ? origin : Math.max(...detail.history.map((h) => h.y))
  const actualAtOrigin = detail.history.find((h) => h.y === origin)?.gdp

  const { data, others } = useMemo(() => {
    const byYear = new Map()
    const row = (y) => { if (!byYear.has(y)) byYear.set(y, { year: y }); return byYear.get(y) }
    for (const h of detail.history) {
      if (h.y < fromYear || h.y > histEnd) continue
      const r = row(h.y)
      if (h.wb) r.actualWB = h.gdp
      else r.actual = h.gdp
      if (h.y === 2021 && detail.history.some((x) => x.wb)) r.actualWB = h.gdp // empalme visual
    }
    const ids = MODEL_ORDER.filter((m) => block[m])
    for (const m of ids) {
      if (actualAtOrigin != null) row(origin)[m] = actualAtOrigin
      for (const [y, v, lo, hi] of block[m]) {
        const r = row(y)
        r[m] = v
        if (m === selected[0]) r.band = [lo, hi]
      }
    }
    if (selected[0] && actualAtOrigin != null) row(origin).band = [actualAtOrigin, actualAtOrigin]
    return {
      data: [...byYear.values()].sort((a, b) => a.year - b.year),
      others: ids.filter((m) => !selected.includes(m)),
    }
  }, [detail, block, selected, fromYear, histEnd, origin, actualAtOrigin])

  const fmt = (v) => axisMoney(v, lang)
  const narrow = useNarrow()
  if (narrow) compactAxis = compactAxis || 'narrow'
  const place = labelPlacer()
  const tick = { fill: '#a89b9d', fontSize: 12, fontFamily: 'var(--font-display)' }

  return (
    <div className="chart" role="img" aria-label={L({ es: 'Gráfico de PBI histórico y pronosticado', en: 'Historical and forecast GDP chart' })}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 12, right: compactAxis === true ? 8 : narrow ? 58 : 72, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#3d4036" vertical={false} />
          <XAxis dataKey="year" type="number" domain={['dataMin', 'dataMax']} tick={tick} tickLine={false}
            axisLine={{ stroke: '#575a4b' }} allowDecimals={false} tickCount={8} />
          <YAxis scale={log ? 'log' : 'auto'} domain={log ? ['auto', 'auto'] : [0, 'auto']} tickFormatter={fmt}
            tick={tick} tickLine={false} axisLine={false} width={narrow ? 48 : 64} allowDataOverflow={false} />
          <ReferenceLine x={origin} stroke="#816c61" strokeDasharray="3 4"
            label={narrow ? undefined : { value: L({ es: 'origen del pronóstico', en: 'forecast origin' }), position: 'insideTopLeft', fill: '#a89b9d', fontSize: 12 }} />
          {selected[0] && (
            <Area dataKey="band" stroke="none" fill={SLOT_COLORS[0]} fillOpacity={0.2} isAnimationActive={false}
              connectNulls activeDot={false} legendType="none" />
          )}
          {showAll && others.map((m) => (
            <Line key={m} dataKey={m} stroke={MUTED_LINE} strokeWidth={1} dot={false} isAnimationActive={false}
              connectNulls activeDot={false} />
          ))}
          <Line dataKey="actual" stroke={ACTUAL_COLOR} strokeWidth={2} dot={false} isAnimationActive={false}
            connectNulls activeDot={{ r: 4, stroke: '#2a2c24', strokeWidth: 2 }} />
          <Line dataKey="actualWB" stroke={ACTUAL_COLOR} strokeWidth={2} strokeDasharray="2 3" isAnimationActive={false}
            dot={{ r: 4, fill: ACTUAL_COLOR, stroke: '#2a2c24', strokeWidth: 2 }} connectNulls />
          {selected.map((m, i) => (
            <Line key={m} dataKey={m} stroke={SLOT_COLORS[i]} strokeWidth={2} isAnimationActive={false} connectNulls
              dot={false} activeDot={{ r: 4, stroke: '#2a2c24', strokeWidth: 2 }}
              label={compactAxis === true ? false : (p) => endLabel(p, data, m, modelShort(m, lang), place)} />
          ))}
          <Tooltip content={<ChartTooltip selected={selected} lang={lang} L={L} />} cursor={{ stroke: '#816c61' }} />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="chart-unit">{L({ es: 'PBI en dólares estadounidenses corrientes.', en: 'GDP in current US dollars.' })}{' '}
        {L({ es: 'Línea punteada: datos del Banco Mundial 2022–2023.', en: 'Dotted line: World Bank data 2022–2023.' })}</p>
    </div>
  )
}

function useNarrow() {
  const q = '(max-width: 640px)'
  const [n, setN] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const f = () => setN(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return n
}

function endLabel({ x, y, index }, data, key, text, place) {
  let last = -1
  data.forEach((d, i) => { if (d[key] != null) last = i })
  if (index !== last) return null
  return <text x={x + 6} y={place(y)} dy={4} fill="#cfcfea" fontSize={12} fontFamily="var(--font-display)">{text}</text>
}

function ChartTooltip({ active, payload, label, selected, lang, L }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const real = row.actual ?? row.actualWB
  return (
    <div className="tip">
      <div className="tip-year">{label}</div>
      {real != null && (
        <div className="tip-row"><span className="sw" style={{ background: ACTUAL_COLOR }} />
          {row.actualWB != null && row.actual == null ? L({ es: 'Real (Banco Mundial)', en: 'Actual (World Bank)' }) : L({ es: 'Real', en: 'Actual' })}
          <b>{money(real, lang)}</b></div>
      )}
      {selected.map((m, i) => row[m] != null && (
        <div className="tip-row" key={m}><span className="sw" style={{ background: SLOT_COLORS[i] }} />
          {modelShort(m, lang)}<b>{money(row[m], lang)}</b></div>
      ))}
      {row.band && row.band[0] !== row.band[1] && (
        <div className="tip-note">{L({ es: 'Intervalo 80 %', en: '80% interval' })} {modelShort(selected[0], lang)}: {money(row.band[0], lang)} – {money(row.band[1], lang)}</div>
      )}
    </div>
  )
}
