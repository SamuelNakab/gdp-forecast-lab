import { useLang, useL } from '../i18n'
import { MODEL_ORDER, SLOT_COLORS } from '../lib/data'
import { modelShort } from '../content/models'

/** Hasta 3 modelos seleccionados. El primero dibuja su intervalo. */
export default function ModelPicker({ selected, onChange, available = MODEL_ORDER }) {
  const { lang } = useLang()
  const L = useL()
  const toggle = (m) => {
    if (selected.includes(m)) {
      if (selected.length > 1) onChange(selected.filter((x) => x !== m))
    } else {
      onChange(selected.length >= 3 ? [...selected.slice(1), m] : [...selected, m])
    }
  }
  return (
    <fieldset className="picker">
      <legend>{L({ es: 'Modelos a comparar (hasta 3; el primero muestra su intervalo de 80 %)', en: 'Models to compare (up to 3; the first shows its 80% interval)' })}</legend>
      <div className="picker-row">
        {available.map((m) => {
          const i = selected.indexOf(m)
          return (
            <button key={m} type="button" className={`chip ${i >= 0 ? 'on' : ''}`} aria-pressed={i >= 0}
              onClick={() => toggle(m)} style={i >= 0 ? { '--c': SLOT_COLORS[i] } : undefined}>
              {i >= 0 && <span className="chip-dot" aria-hidden="true" />}
              {modelShort(m, lang)}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
