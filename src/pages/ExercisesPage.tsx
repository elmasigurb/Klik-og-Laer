import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ExerciseCard } from '../components/catalog/ExerciseCard'
import { useCatalog } from '../features/catalog/CatalogContext'
import { useContent } from '../features/content/ContentContext'

export function ExercisesPage() {
  const { content } = useContent()
  const copy = content.exercises
  const catalog = useCatalog()
  const categories = catalog.categories.filter((category) => category.isPublished)
  const exercises = catalog.exercises.filter((exercise) => exercise.isPublished && categories.some((category) => category.id === exercise.categoryId))
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const filtered = useMemo(() => exercises.filter((exercise) => {
    const matchesText = `${exercise.title} ${exercise.description}`.toLowerCase().includes(query.toLowerCase())
    return matchesText && (categoryId === 'all' || exercise.categoryId === categoryId)
  }), [query, categoryId])

  return <div className="page-shell py-12 sm:py-16">
    <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.18em] text-navy/70">{copy.libraryEyebrow}</p><h1 className="display mt-3 text-5xl font-bold tracking-[-.04em] text-forest-950 sm:text-6xl">{copy.libraryHeading}</h1><p className="mt-5 text-lg leading-8 text-muted">{copy.libraryDescription}</p></div>
    <div className="mt-10 flex flex-col gap-3 rounded-3xl border border-forest-900/8 bg-white/55 p-4 sm:flex-row">
      <label className="relative flex-1"><span className="sr-only">{copy.searchPlaceholder}</span><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} className="h-12 w-full rounded-2xl border border-forest-900/10 bg-cream-50 pl-12 pr-4 text-sm outline-none focus:border-forest-700" /></label>
      <label><span className="sr-only">{copy.allCategoriesLabel}</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-12 w-full rounded-2xl border border-forest-900/10 bg-cream-50 px-4 text-sm font-bold outline-none focus:border-forest-700 sm:w-56"><option value="all">{copy.allCategoriesLabel}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    </div>
    <p className="mt-8 text-sm font-bold text-muted">{filtered.length} {filtered.length === 1 ? content.categories.exerciseSingular : content.categories.exercisePlural}</p>
    {filtered.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} />)}</div> : <div className="mt-5 rounded-3xl border border-dashed border-forest-900/20 bg-white/50 p-12 text-center"><h2 className="display text-2xl font-bold">{copy.noResultsHeading}</h2><p className="mt-2 text-muted">{copy.noResultsBody}</p></div>}
  </div>
}
