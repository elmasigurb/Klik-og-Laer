import { FolderOpen } from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import { CategoryCard } from '../components/catalog/CategoryCard'
import { Breadcrumbs } from '../components/navigation/Breadcrumbs'
import { useCatalog } from '../features/catalog/CatalogContext'

export function ClassPage() {
  const { classId = '' } = useParams()
  const { classes, categories, exercises, exerciseClassAssignments } = useCatalog()
  const schoolClass = classes.find((item) => item.id === classId && item.status === 'active')
  if (!schoolClass) return <Navigate to="/404" replace />
  const assignedIds = new Set(exerciseClassAssignments.filter((item) => item.classId === classId && item.isPublished).map((item) => item.exerciseId))
  const availableExercises = exercises.filter((item) => item.isPublished && assignedIds.has(item.id))
  const availableCategories = categories.filter((category) => category.isPublished && availableExercises.some((exercise) => exercise.categoryId === category.id))
  return <div className="page-shell py-10 sm:py-14"><Breadcrumbs items={[{ label: 'Klasser', to: '/classes' }, { label: schoolClass.name }]} /><section className="mt-8 rounded-[32px] bg-forest-900 p-7 text-white sm:p-10"><p className="text-xs font-black uppercase tracking-[.16em] text-periwinkle">Klasse</p><h1 className="display mt-3 text-4xl font-bold tracking-[-.03em] sm:text-6xl">{schoolClass.name}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-white/70">Vælg en kategori for at se klassens tilgængelige øvelser.</p></section><div className="mb-6 mt-12"><h2 className="display text-3xl font-bold text-forest-950">Kategorier</h2><p className="mt-1 text-sm text-muted">Kun kategorier med udgivne øvelser vises.</p></div>{availableCategories.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{availableCategories.map((category) => <CategoryCard key={category.id} category={category} to={`/classes/${classId}/categories/${category.slug}`} count={availableExercises.filter((exercise) => exercise.categoryId === category.id).length} />)}</div> : <div className="rounded-[28px] border border-dashed border-forest-900/20 bg-white/55 p-12 text-center"><FolderOpen className="mx-auto size-10 text-forest-700" /><h2 className="display mt-4 text-2xl font-bold">Ingen udgivne øvelser endnu</h2><p className="mx-auto mt-2 max-w-md text-muted">Der er ikke lagt øvelser ind i denne klasse endnu.</p></div>}</div>
}
