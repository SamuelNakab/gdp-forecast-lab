import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useLang, useL } from '../i18n'

export const REPO_URL = 'https://github.com/SamuelNakab/gdp-forecast-lab'

export default function Layout() {
  const { lang, setLang } = useLang()
  const L = useL()
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  const links = [
    ['/explorar', { es: 'Explorar países', en: 'Explore countries' }],
    ['/modelos', { es: 'Modelos', en: 'Models' }],
    ['/panorama', { es: 'Panorama', en: 'Overview' }],
    ['/metodologia', { es: 'Metodología', en: 'Methodology' }],
  ]
  return (
    <>
      <a className="skip" href="#main">{L({ es: 'Saltar al contenido', en: 'Skip to content' })}</a>
      <header className="top">
        <Link to="/" className="brand">{L({ es: 'Laboratorio de PBI', en: 'GDP Lab' })}</Link>
        <nav aria-label={L({ es: 'Principal', en: 'Main' })}>
          {links.map(([to, label]) => <NavLink key={to} to={to}>{L(label)}</NavLink>)}
        </nav>
        <div className="lang" role="group" aria-label={L({ es: 'Idioma', en: 'Language' })}>
          <button type="button" aria-pressed={lang === 'es'} onClick={() => setLang('es')}>ES</button>
          <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
        </div>
      </header>
      <main id="main"><Outlet /></main>
      <footer className="foot">
        <p>
          {L({ es: 'Hecho por Samuel Nakab Mollo. Datos: UN Statistics Division (1970–2021) y Banco Mundial (2022–2023).',
            en: 'Built by Samuel Nakab Mollo. Data: UN Statistics Division (1970–2021) and World Bank (2022–2023).' })}
        </p>
        <p><a href={REPO_URL}>{L({ es: 'Código en GitHub', en: 'Code on GitHub' })}</a></p>
      </footer>
    </>
  )
}
