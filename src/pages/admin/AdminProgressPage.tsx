import { CheckCircle2, LoaderCircle, Pencil, Save, Trash2, UsersRound, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { useCatalog } from '../../features/catalog/CatalogContext'
import { appwriteConfig } from '../../lib/appwrite'
import { executeContentManager } from '../../lib/appwriteFunctions'

interface ProgressStudent {
  id: string
  idSuffix: string
  displayName: string
  status: 'active' | 'revoked' | 'archived'
  classId: string
  createdAt: string
}

interface ProgressCompletion {
  studentId: string
  exerciseId: string
  completedAt: string
  evidenceType: 'client-reported'
}

interface ClassProgress {
  class: { id: string; name: string; status: string }
  students: ProgressStudent[]
  completions: ProgressCompletion[]
}

export function AdminProgressPage() {
  const { classes, exercises, exerciseClassAssignments } = useCatalog()
  const [classId, setClassId] = useState('')
  const [data, setData] = useState<ClassProgress | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const ownedClasses = useMemo(() => [...classes].sort((a, b) => a.displayOrder - b.displayOrder), [classes])

  useEffect(() => {
    if (!classId && ownedClasses[0]) setClassId(ownedClasses[0].id)
    if (classId && !ownedClasses.some((item) => item.id === classId)) setClassId(ownedClasses[0]?.id ?? '')
  }, [classId, ownedClasses])

  const load = useCallback(async () => {
    if (!appwriteConfig.features.studentProgress || !classId) { setData(null); return }
    setLoading(true)
    setError('')
    try { setData(await executeContentManager<ClassProgress>({ action: 'progress.listClass', classId })) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Fremskridt kunne ikke hentes.') }
    finally { setLoading(false) }
  }, [classId])

  useEffect(() => { void load() }, [load])

  const assignedExerciseIds = useMemo(() => new Set(exerciseClassAssignments.filter((row) => row.classId === classId).map((row) => row.exerciseId)), [classId, exerciseClassAssignments])
  const exerciseNames = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise.title])), [exercises])
  const publishedAssignedCount = exercises.filter((exercise) => exercise.status === 'published' && assignedExerciseIds.has(exercise.id)).length

  async function mutate(payload: Record<string, unknown>, success: string) {
    setError('')
    setMessage('')
    try { await executeContentManager(payload); setMessage(success); await load(); return true }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Ændringen kunne ikke gemmes.'); return false }
  }

  if (!appwriteConfig.features.studentProgress) return <>
    <AdminPageHeader eyebrow="Elever" title="Fremskridt" description="Se gennemførte øvelser for eleverne i dine klasser." />
    <div role="note" className="rounded-[28px] border border-navy/10 bg-white p-7"><h2 className="font-display text-2xl font-bold text-navy">Elevfremskridt er slået fra</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Siden bliver aktiv, når de private tabeller og begge Functions er verificeret, og <code>VITE_STUDENT_PROGRESS_ENABLED=true</code> sættes i Deploy Preview.</p></div>
  </>

  return <>
    <AdminPageHeader eyebrow="Elever" title="Fremskridt" description="Se gennemførte øvelser pr. klasse. Resultaterne er indberettet af elevens browser og er ikke uafhængigt verificeret." />
    <section className="mb-6 rounded-[28px] border border-navy/8 bg-white p-5 sm:p-7">
      <label className="block max-w-md"><span className="admin-label">Vælg klasse</span><select className="admin-input min-h-12" value={classId} onChange={(event) => setClassId(event.target.value)}>{ownedClasses.map((item) => <option key={item.id} value={item.id}>{item.name}{item.status === 'archived' ? ' (arkiveret)' : ''}</option>)}</select></label>
      {data && <div className="mt-5 grid gap-3 sm:grid-cols-3"><Summary label="Elever" value={data.students.length} /><Summary label="Gennemførelser" value={data.completions.length} /><Summary label="Tildelte øvelser" value={publishedAssignedCount} /></div>}
    </section>
    {message && <p role="status" className="mb-5 rounded-2xl bg-lime/45 p-4 text-sm font-bold text-navy">{message}</p>}
    {error && <p role="alert" className="mb-5 rounded-2xl bg-coral/25 p-4 text-sm font-bold text-danger">{error}</p>}
    {loading ? <div className="flex min-h-48 items-center justify-center gap-3 text-muted"><LoaderCircle className="size-5 animate-spin" />Henter fremskridt…</div> : !classId ? <Empty text="Opret en klasse, før du kan se elevfremskridt." /> : data?.students.length ? <div className="space-y-4">{data.students.map((student) => <StudentProgressCard key={student.id} student={student} completions={data.completions.filter((row) => row.studentId === student.id)} exerciseNames={exerciseNames} classes={ownedClasses} onRename={(displayName) => mutate({ action: 'student.rename', studentId: student.id, displayName }, 'Elevens navn blev rettet.')} onMove={(targetClassId) => mutate({ action: 'student.moveClass', studentId: student.id, classId: targetClassId }, 'Eleven blev flyttet. Tidligere gennemførelser er bevaret.')} onDelete={() => mutate({ action: 'student.delete', studentId: student.id }, 'Eleven og elevens gennemførelser blev slettet.')} />)}</div> : <Empty text="Der er endnu ingen registrerede elever i denne klasse." />}
  </>
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-ivory p-4"><p className="text-xs font-black uppercase tracking-[.12em] text-muted">{label}</p><p className="font-display mt-1 text-3xl font-bold text-navy">{value}</p></div>
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-[28px] border border-dashed border-navy/20 bg-white/60 p-10 text-center"><UsersRound className="mx-auto size-10 text-muted" /><p className="mt-4 font-bold text-navy">{text}</p></div>
}

function StudentProgressCard({ student, completions, exerciseNames, classes, onRename, onMove, onDelete }: { student: ProgressStudent; completions: ProgressCompletion[]; exerciseNames: Map<string, string>; classes: Array<{ id: string; name: string; status: string }>; onRename: (name: string) => Promise<boolean>; onMove: (classId: string) => Promise<boolean>; onDelete: () => Promise<boolean> }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(student.displayName)
  return <article className="rounded-[28px] border border-navy/8 bg-white p-5 sm:p-7">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">{editing ? <div className="flex max-w-xl flex-col gap-2 sm:flex-row"><input aria-label="Elevens navn" className="admin-input" value={name} maxLength={128} onChange={(event) => setName(event.target.value)} /><button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-navy px-4 text-sm font-bold text-white" onClick={() => void onRename(name).then((saved) => { if (saved) setEditing(false) })}><Save className="size-4" />Gem</button><button type="button" className="admin-icon-button" onClick={() => { setName(student.displayName); setEditing(false) }} aria-label="Annullér"><X /></button></div> : <div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-2xl font-bold text-navy">{student.displayName}</h2><span className="rounded-full bg-navy/8 px-3 py-1 text-xs font-bold text-muted" title="Teknisk identifikation ved ens navne">ID · {student.idSuffix}</span><button type="button" className="admin-icon-button" onClick={() => setEditing(true)} aria-label={`Ret navn for ${student.displayName}`}><Pencil /></button></div>}
        <p className="mt-2 text-sm text-muted">{completions.length} gennemførte {completions.length === 1 ? 'øvelse' : 'øvelser'} · klientindberettet</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row"><label><span className="sr-only">Flyt elev til klasse</span><select className="admin-input min-h-11" value={student.classId} onChange={(event) => { if (event.target.value !== student.classId) void onMove(event.target.value) }}>{classes.map((item) => <option key={item.id} value={item.id} disabled={item.status !== 'active'}>{item.name}{item.status !== 'active' ? ' (arkiveret)' : ''}</option>)}</select></label><button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold text-danger hover:bg-coral/20" onClick={() => { if (window.confirm(`Slet ${student.displayName} og alle elevens gennemførelser? Handlingen kan ikke fortrydes.`)) void onDelete() }}><Trash2 className="size-4" />Slet elev</button></div>
    </div>
    {completions.length > 0 && <ul className="mt-5 grid gap-2 md:grid-cols-2">{[...completions].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).map((row) => <li key={row.exerciseId} className="flex items-start gap-3 rounded-2xl bg-lime/25 p-4"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-forest-800" /><div><p className="font-bold text-navy">{exerciseNames.get(row.exerciseId) ?? `Øvelse · ${row.exerciseId.slice(-6)}`}</p><p className="mt-1 text-xs text-muted">Gennemført {formatDate(row.completedAt)} · klientindberettet</p></div></li>)}</ul>}
  </article>
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('da-DK', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
