import { useEffect, useState } from 'react'

const cache = new Map()

export function fetchJSON(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(`/data/${path}`).then((r) => {
      if (!r.ok) throw new Error(`No se pudo cargar ${path}`)
      return r.json()
    }).catch((e) => { cache.delete(path); throw e }))
  }
  return cache.get(path)
}

export function useJSON(path) {
  const [state, setState] = useState({ data: null, error: null })
  useEffect(() => {
    if (!path) return
    let alive = true
    setState((s) => ({ data: s.data, error: null }))
    fetchJSON(path).then(
      (data) => alive && setState({ data, error: null }),
      (error) => alive && setState({ data: null, error }),
    )
    return () => { alive = false }
  }, [path])
  return state
}

export const MODEL_ORDER = ['naive', 'drift', 'arima', 'ets', 'theta', 'statespace', 'prophet', 'rf', 'lightgbm', 'lstm', 'ensemble']

/** Tres colores para los modelos elegidos (validados contra el fondo oliva para daltonismo). */
export const SLOT_COLORS = ['#c08236', '#4290d6', '#c65e9e']
export const ACTUAL_COLOR = '#cfcfea'
export const MUTED_LINE = '#6d705f'

/** Evita que las etiquetas al final de las líneas se pisen: cada nueva etiqueta se corre si choca. */
export function labelPlacer(gap = 14) {
  const placed = []
  return (y) => {
    let yy = y
    for (let i = 0; i < 12 && placed.some((p) => Math.abs(p - yy) < gap); i++) {
      const clash = placed.find((p) => Math.abs(p - yy) < gap)
      yy = yy >= clash ? clash + gap : clash - gap
    }
    placed.push(yy)
    return yy
  }
}
