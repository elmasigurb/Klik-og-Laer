import { useId } from 'react'
import {
  CategoryIcon,
  categoryIconOptions,
  getCategoryIconLabel,
  type CategoryIconName,
} from '../ui/Icons'

export function CategoryIconPicker({ value, onChange }: { value: string; onChange: (icon: CategoryIconName) => void }) {
  const groupName = useId()

  return (
    <fieldset>
      <legend className="admin-label">Ikon</legend>
      <div className="mb-3 flex items-center gap-3 rounded-2xl bg-ivory p-3" aria-live="polite">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-navy shadow-sm">
          <CategoryIcon name={value} />
        </span>
        <span>
          <span className="block text-xs font-bold text-muted">Valgt ikon</span>
          <span className="block text-sm font-bold text-navy">{getCategoryIconLabel(value)}</span>
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-9" role="radiogroup" aria-label="Vælg kategoriikon">
        {categoryIconOptions.map(({ name, label }) => (
          <label key={name} className="group relative cursor-pointer">
            <input
              className="peer sr-only"
              type="radio"
              name={groupName}
              value={name}
              checked={value === name}
              onChange={() => onChange(name)}
            />
            <span
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-navy/10 bg-white p-2 text-center text-navy transition hover:border-navy/30 hover:bg-periwinkle/15 peer-checked:border-navy peer-checked:bg-periwinkle/35 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy"
              title={label}
            >
              <CategoryIcon name={name} className="size-5" />
              <span className="w-full truncate text-[10px] font-bold leading-tight">{label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
