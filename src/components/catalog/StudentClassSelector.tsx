import { ChevronDown, School } from 'lucide-react'
import { useCatalog } from '../../features/catalog/CatalogContext'
import { useStudentClass } from '../../features/student/StudentClassContext'

export function StudentClassSelector() {
  const { loading } = useCatalog()
  const { activeClasses, selectedClass, selectClass } = useStudentClass()

  return <section className="border-b border-forest-900/8 bg-periwinkle/35" aria-labelledby="student-class-label">
    <div className="page-shell flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-navy shadow-sm" aria-hidden="true"><School className="size-5" /></span>
        <div><p id="student-class-label" className="font-display text-lg font-extrabold text-navy">Vælg klasse</p><p className="text-sm text-muted">Du behøver ikke logge ind.</p></div>
      </div>
      <label className="relative block w-full sm:max-w-sm">
        <span className="sr-only">Vælg din klasse</span>
        <select value={selectedClass?.id ?? ''} onChange={(event) => selectClass(event.target.value)} disabled={loading || !activeClasses.length} className="min-h-13 w-full appearance-none rounded-2xl border border-navy/15 bg-white py-3 pl-4 pr-12 text-base font-bold text-navy shadow-sm outline-none focus:border-navy focus:ring-4 focus:ring-periwinkle disabled:cursor-not-allowed disabled:opacity-65">
          <option value="">{loading ? 'Henter klasser…' : activeClasses.length ? 'Vælg en klasse' : 'Ingen aktive klasser endnu'}</option>
          {activeClasses.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-navy" />
      </label>
    </div>
  </section>
}
