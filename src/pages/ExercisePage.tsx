import { CheckCircle2, ChevronLeft, Clock3, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/navigation/Breadcrumbs'
import { useCatalog } from '../features/catalog/CatalogContext'
import { UploadedExerciseFrame } from '../features/exercises/UploadedExerciseFrame'
import { ExerciseResultDebugPanel } from '../features/exercises/ExerciseResultDebugPanel'
import type { ExerciseResultMessage } from '../features/exercises/exerciseResultProtocol.mjs'
import { DemoExerciseRenderer } from '../features/exercises/DemoExerciseRenderer'
import { useContent } from '../features/content/ContentContext'
import { useStudentClass } from '../features/student/StudentClassContext'
import { appwriteConfig } from '../lib/appwrite'
import { useStudentProgress } from '../features/progress/StudentProgressContext'

export function ExercisePage() {
  const [debugResults, setDebugResults] = useState<ExerciseResultMessage[]>([])
  const recordDebugResult = useCallback((result: ExerciseResultMessage) => setDebugResults((current) => [...current, result]), [])
  const { exerciseId = '', classId } = useParams()
  useEffect(() => setDebugResults([]), [exerciseId])
  const catalog = useCatalog()
  const exercise = catalog.exercises.find((item) => item.id === exerciseId && item.isPublished)
  const category = exercise ? catalog.categories.find((item) => item.id === exercise.categoryId && item.isPublished) : undefined
  const { selectedClass } = useStudentClass()
  const progress = useStudentProgress()
  const effectiveClassId = classId || (progress.enabled ? progress.identity?.classId : appwriteConfig.features.publicClassNavigation ? selectedClass?.id : undefined)
  const schoolClass = effectiveClassId ? catalog.classes.find((item) => item.id === effectiveClassId && item.status === 'active') : undefined
  const useClassRoutes = Boolean(classId && appwriteConfig.features.publicClassNavigation)
  const assigned = effectiveClassId ? catalog.exerciseClassAssignments.some((item) => item.classId === effectiveClassId && item.exerciseId === exerciseId && item.isPublished) : true
  const { content } = useContent()
  const copy = content.exercises
  const handleResult = useCallback((result: ExerciseResultMessage) => {
    if (import.meta.env.DEV) recordDebugResult(result)
    void progress.recordResult(result)
  }, [progress.recordResult, recordDebugResult])
  const resultBridgeEnabled = import.meta.env.DEV || (progress.enabled && progress.status === 'ready')
  const completed = progress.isCompleted(exerciseId)

  if (!exercise || !category || (effectiveClassId && (!schoolClass || !assigned))) return <Navigate to="/404" replace />
  return <div className="page-shell py-10 sm:py-14">
    <Breadcrumbs items={useClassRoutes && schoolClass ? [{ label: 'Klasser', to: '/classes' }, { label: schoolClass.name, to: `/classes/${schoolClass.id}` }, { label: category.name, to: `/classes/${schoolClass.id}/categories/${category.slug}` }, { label: exercise.title }] : [{ label: content.categories.breadcrumbLabel, to: '/exercises' }, { label: category.name, to: `/categories/${category.slug}` }, { label: exercise.title }]} />
    <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-10">
      <div className="min-w-0">
        <div className="mb-8"><div className="mb-4 flex flex-wrap items-center gap-3"><span className="text-xs font-black uppercase tracking-[.16em] text-navy/70">{category.name}</span></div><h1 className="display text-4xl font-bold tracking-[-.04em] text-forest-950 sm:text-6xl">{exercise.title}</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-muted">{exercise.description}</p></div>
        {exercise.sourceType === 'upload' ? <><UploadedExerciseFrame exerciseId={exercise.id} fileId={exercise.fileId} title={exercise.title} enableResultBridge={resultBridgeEnabled} onResult={resultBridgeEnabled ? handleResult : undefined} />{progress.enabled && <div aria-live="polite" className={`mt-4 flex min-h-12 items-center gap-3 rounded-2xl p-4 text-sm font-bold ${completed ? 'bg-lime/55 text-forest-950' : progress.submissionStatus === 'error' ? 'bg-coral/25 text-danger' : 'bg-white/60 text-muted'}`}>{completed ? <><CheckCircle2 className="size-5" />Gennemført · resultatet er gemt</> : progress.submissionStatus === 'saving' ? <><LoaderCircle className="size-5 animate-spin" />Gemmer gennemførelse…</> : progress.submissionStatus === 'error' ? progress.error : 'Du gennemfører øvelsen ved mindst 80% og alle særlige krav.'}</div>}{import.meta.env.DEV && <ExerciseResultDebugPanel results={debugResults} onClear={() => setDebugResults([])} />}</> : <DemoExerciseRenderer exercise={exercise} onAnswersChange={() => undefined} onCheck={() => undefined} />}
      </div>
      <aside className="h-fit rounded-[28px] border border-forest-900/8 bg-white/55 p-5 sm:p-6 xl:sticky xl:top-6">
        <p className="text-xs font-black uppercase tracking-[.15em] text-muted">{copy.sessionHeading}</p><div className="mt-5 flex items-center gap-3 rounded-2xl bg-lime/45 p-4 text-sm text-navy"><Clock3 className="size-5" /><span>ca. {exercise.duration} min.</span></div><p className="mt-4 text-sm leading-6 text-muted">{copy.sessionNote}</p>
        <Link to={useClassRoutes && schoolClass ? `/classes/${schoolClass.id}/categories/${category.slug}` : `/categories/${category.slug}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-base font-bold text-muted hover:text-forest-900"><ChevronLeft className="size-4" />{copy.backCategoryButton}</Link>
      </aside>
    </div>
  </div>
}
