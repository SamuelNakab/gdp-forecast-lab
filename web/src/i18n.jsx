import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const LangCtx = createContext({ lang: 'es', setLang: () => {} })

function initialLang() {
  try {
    const saved = localStorage.getItem('lang')
    if (saved === 'es' || saved === 'en') return saved
  } catch { /* storage puede no estar disponible */ }
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang)
  const setLang = useCallback((l) => {
    setLangState(l)
    try { localStorage.setItem('lang', l) } catch { /* noop */ }
  }, [])
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>
}

export const useLang = () => useContext(LangCtx)

/** Elige el texto del idioma actual: L({es:'…', en:'…'}) */
export function useL() {
  const { lang } = useLang()
  return useCallback((obj) => (obj == null ? '' : typeof obj === 'string' ? obj : obj[lang] ?? obj.es), [lang])
}

const regionNames = {}
export function countryName(c, lang) {
  if (!c) return ''
  if (c.iso2) {
    try {
      regionNames[lang] ??= new Intl.DisplayNames([lang === 'es' ? 'es-AR' : 'en'], { type: 'region' })
      const n = regionNames[lang].of(c.iso2)
      if (n && n !== c.iso2) return n
    } catch { /* fallback */ }
  }
  return lang === 'es' ? c.name_es || c.name_en : c.name_en
}
