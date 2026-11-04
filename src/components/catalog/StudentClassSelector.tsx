import { ChevronDown } from 'lucide-react'
import { useCatalog } from '../../features/catalog/CatalogContext'
import { useStudentClass } from '../../features/student/StudentClassContext'

export function StudentClassSelector({ mobile = false, onSelect }: { mobile?: boolean; onSelect?: () => void }) {
  const { loading } = useCatalog()
  const { activeClasses, selectedClass, selectClass } = useStudentClass()

  return <label className={`relative flex min-h-11 items-center gap-2 rounded-full text-ink transition-colors focus-within:bg-white/80 ${selectedClass ? 'bg-periwinkle/45' : 'hover:bg-white/70'} ${mobile ? 'w-full px-4' : 'max-w-[15rem] pl-4 pr-2'}`}>
    <span className="shrink-0 text-base font-semibold">Klasse</span>
    <span className="sr-only">Vælg klasse. Nuværende valg:</span>
    <select aria-label="Klasse" aria-busy={loading} value={selectedClass?.id ?? ''} onChange={(event) => { selectClass(event.target.value); onSelect?.() }} className={`min-h-11 min-w-0 appearance-none bg-transparent py-2 pl-1 pr-7 text-base font-bold text-navy outline-none ${mobile ? 'flex-1' : 'max-w-36'}`}>
      <option value="">Alle klasser</option>
      {activeClasses.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
    </select>
    <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 size-4 text-navy" />
  </label>
}
