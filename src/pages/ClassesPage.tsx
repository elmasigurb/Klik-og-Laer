import { FolderOpen } from 'lucide-react'
import { ClassCard } from '../components/catalog/ClassCard'
import { useCatalog } from '../features/catalog/CatalogContext'

export function ClassesPage() {
  const { classes, exercises, exerciseClassAssignments } = useCatalog()
  const published = new Set(exercises.filter((item) => item.isPublished).map((item) => item.id))
  const active = classes.filter((item) => item.status === 'active').sort((a, b) => a.displayOrder - b.displayOrder)
  return <div className="page-shell py-12 sm:py-16"><div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.18em] text-navy/70">Vælg din klasse</p><h1 className="display mt-3 text-5xl font-bold tracking-[-.04em] text-forest-950 sm:text-6xl">Klasser</h1><p className="mt-5 text-lg leading-8 text-muted">Find din klasse, og vælg derefter det emne, du vil arbejde med.</p></div>{active.length ? <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{active.map((item) => <ClassCard key={item.id} schoolClass={item} exerciseCount={new Set(exerciseClassAssignments.filter((assignment) => assignment.classId === item.id && assignment.isPublished && published.has(assignment.exerciseId)).map((assignment) => assignment.exerciseId)).size} />)}</div> : <div className="mt-10 rounded-[28px] border border-dashed border-forest-900/20 bg-white/55 p-12 text-center"><FolderOpen className="mx-auto size-10 text-forest-700" /><h2 className="display mt-4 text-2xl font-bold">Ingen klasser er klar endnu</h2><p className="mx-auto mt-2 max-w-md text-muted">Din lærer er ved at organisere øvelserne. Prøv igen senere.</p></div>}</div>
}
