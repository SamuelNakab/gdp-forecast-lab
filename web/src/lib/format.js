const loc = (lang) => (lang === 'es' ? 'es-AR' : 'en-US')

/** valor en MILLONES de USD -> "US$ 633 mil M" / "$633B" */
export function money(millions, lang) {
  if (millions == null) return '—'
  const v = millions * 1e6
  const s = new Intl.NumberFormat(loc(lang), { notation: 'compact', maximumSignificantDigits: 3 }).format(v)
  return lang === 'es' ? `US$ ${s}` : `$${s}`
}

export function usd(v, lang, digits = 0) {
  if (v == null) return '—'
  return new Intl.NumberFormat(loc(lang), { style: 'currency', currency: 'USD', maximumFractionDigits: digits }).format(v)
}

export function num(v, lang, digits = 0) {
  if (v == null) return '—'
  return new Intl.NumberFormat(loc(lang), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v)
}

export function compact(v, lang) {
  if (v == null) return '—'
  return new Intl.NumberFormat(loc(lang), { notation: 'compact', maximumSignificantDigits: 3 }).format(v)
}

export function pct(v, lang, digits = 1, sign = false) {
  if (v == null) return '—'
  const s = num(Math.abs(v), lang, digits)
  const pre = v < 0 ? '−' : sign && v > 0 ? '+' : ''
  return `${pre}${s} %`
}

/** Para ejes: sin prefijo de moneda, corto. */
export function axisMoney(millions, lang) {
  if (millions == null) return ''
  return new Intl.NumberFormat(loc(lang), { notation: 'compact', maximumSignificantDigits: 3 }).format(millions * 1e6)
}
