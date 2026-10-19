import { ChevronLeft, Clock3 } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/navigation/Breadcrumbs'
import { useCatalog } from '../features/catalog/CatalogContext'
import { UploadedExerciseFrame } from '../features/exercises/UploadedExerciseFrame'
import { DemoExerciseRenderer } from '../features/exercises/DemoExerciseRenderer'
import { useContent } from '../features/content/ContentContext'

export function ExercisePage() {
  const { exerciseId = '' } = useParams()
  const catalog = useCatalog()
  const exercise = catalog.exercises.find((item) => item.id === exerciseId && item.isPublished)
  const category = exercise ? catalog.categories.find((item) => item.id === exercise.categoryId && item.isPublished) : undefined
  const { content } = useContent()
  const copy = content.exercises

  if (!exercise || !category) return <Navigate to="/404" replace />
  return <div className="page-shell py-10 sm:py-14">
    <Breadcrumbs items={[{ label: content.categories.breadcrumbLabel, to: '/exercises' }, { label: category.name, to: `/categories/${category.slug}` }, { label: exercise.title }]} />
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_290px]">
      <div>
        <div className="mb-8"><div className="mb-4 flex flex-wrap items-center gap-3"><span className="text-xs font-black uppercase tracking-[.16em] text-navy/70">{category.name}</span></div><h1 className="display text-4xl font-bold tracking-[-.04em] text-forest-950 sm:text-6xl">{exercise.title}</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-muted">{exercise.description}</p></div>
        {exercise.sourceType === 'upload' ? <UploadedExerciseFrame exerciseId={exercise.id} fileId={exercise.fileId} title={exercise.title} /> : <DemoExerciseRenderer exercise={exercise} onAnswersChange={() => undefined} onCheck={() => undefined} />}
      </div>
      <aside className="h-fit rounded-[28px] border border-forest-900/8 bg-white/55 p-6 lg:sticky lg:top-28">
        <p className="text-xs font-black uppercase tracking-[.15em] text-muted">{copy.sessionHeading}</p><div className="mt-5 flex items-center gap-3 rounded-2xl bg-lime/45 p-4 text-sm text-navy"><Clock3 className="size-5" /><span>ca. {exercise.duration} min.</span></div><p className="mt-4 text-sm leading-6 text-muted">{copy.sessionNote}</p>
        <Link to={`/categories/${category.slug}`} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-muted hover:text-forest-900"><ChevronLeft className="size-4" />{copy.backCategoryButton}</Link>
      </aside>
    </div>
  </div>
}
