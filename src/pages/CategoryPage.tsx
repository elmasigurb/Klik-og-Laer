import { FolderOpen } from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import { ExerciseCard } from '../components/catalog/ExerciseCard'
import { Breadcrumbs } from '../components/navigation/Breadcrumbs'
import { CategoryIcon } from '../components/ui/Icons'
import { useCatalog } from '../features/catalog/CatalogContext'
import { useContent } from '../features/content/ContentContext'

export function CategoryPage() {
  const { slug = '' } = useParams()
  const catalog = useCatalog()
  const category = catalog.categories.find((item) => item.slug === slug && item.isPublished)
  const { content } = useContent()
  const copy = content.categories
  if (!category) return <Navigate to="/404" replace />
  const items = catalog.exercises.filter((exercise) => exercise.categoryId === category.id && exercise.isPublished)

  return <div className="page-shell py-10 sm:py-14">
    <Breadcrumbs items={[{ label: copy.breadcrumbLabel, to: '/exercises' }, { label: category.name }]} />
    <section className="mt-8 rounded-[32px] bg-forest-900 p-7 text-white sm:p-10">
      <div><span className="mb-6 grid size-14 place-items-center rounded-2xl bg-white/10 text-lime"><CategoryIcon name={category.icon} /></span><p className="text-xs font-black uppercase tracking-[.16em] text-periwinkle">{category.eyebrow}</p><h1 className="display mt-3 text-4xl font-bold tracking-[-.03em] sm:text-6xl">{category.name}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-white/70">{category.description}</p></div>
    </section>
    <div className="mb-6 mt-12 flex items-end justify-between"><div><h2 className="display text-3xl font-bold text-forest-950">{copy.exercisesHeading}</h2><p className="mt-1 text-sm text-muted">{items.length} {items.length === 1 ? copy.exerciseSingular : copy.exercisePlural} i kategorien</p></div></div>
    {items.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} />)}</div> : <div className="rounded-[28px] border border-dashed border-forest-900/20 bg-white/55 p-12 text-center"><FolderOpen className="mx-auto size-10 text-forest-700" /><h2 className="display mt-4 text-2xl font-bold">{copy.emptyHeading}</h2><p className="mx-auto mt-2 max-w-md text-muted">{copy.emptyBody}</p></div>}
  </div>
}
