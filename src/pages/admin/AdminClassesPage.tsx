import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Pencil, Plus, Save, UsersRound, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { appwriteConfig } from '../../lib/appwrite'
import { useCatalog } from '../../features/catalog/CatalogContext'
import type { SchoolClass } from '../../types'

export function AdminClassesPage() {
  const { classes, exercises, exerciseClassAssignments, createClass, updateClass, moveClass, setClassStatus } = useCatalog()
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const publishedIds = useMemo(() => new Set(exercises.filter((item) => item.status === 'published').map((item) => item.id)), [exercises])
  const assignedPublishedIds = useMemo(() => new Set(exerciseClassAssignments.filter((item) => publishedIds.has(item.exerciseId)).map((item) => item.exerciseId)), [exerciseClassAssignments, publishedIds])
  const unassignedPublished = exercises.filter((item) => item.status === 'published' && !assignedPublishedIds.has(item.id)).length
  const active = classes.filter((item) => item.status === 'active')
  const archived = classes.filter((item) => item.status === 'archived')

  async function create() {
    if (!name.trim()) { setMessage('Skriv et navn til klassen.'); inputRef.current?.focus(); return }
    setSaving(true)
    try {
      await createClass(name)
      setName('')
      setShowNew(false)
      setMessage('Klassen blev oprettet.')
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Klassen kunne ikke oprettes.') }
    finally { setSaving(false) }
  }

  async function changeStatus(schoolClass: SchoolClass) {
    const next = schoolClass.status === 'active' ? 'archived' : 'active'
    try {
      await setClassStatus(schoolClass.id, next)
      setMessage(next === 'active' ? 'Klassen blev gendannet.' : 'Klassen blev arkiveret. Øvelser og kategorier er bevaret.')
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Klassestatus kunne ikke ændres.') }
  }

  return <>
    <AdminPageHeader
      eyebrow="Struktur"
      title="Klasser"
      description="Opret og organiser dine klasser. Brug derefter Øvelser til at tildele indhold enkeltvis eller i større grupper."
      action={<button type="button" onClick={() => { setShowNew(true); requestAnimationFrame(() => inputRef.current?.focus()) }} className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-bold text-white"><Plus className="size-4" />Ny klasse</button>}
    />
    {message && <div role="status" className="mb-5 rounded-2xl bg-periwinkle/30 p-4 text-sm font-bold text-navy">{message}</div>}

    <section aria-labelledby="migration-readiness" className="mb-6 rounded-[24px] border border-navy/8 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.14em] text-muted">Sikker overgang</p><h2 id="migration-readiness" className="font-display mt-1 text-xl font-bold text-navy">Offentlig klassenavigation er {appwriteConfig.features.publicClassNavigation ? 'slået til' : 'slået fra'}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{unassignedPublished ? `${unassignedPublished} udgivne ${unassignedPublished === 1 ? 'øvelse mangler' : 'øvelser mangler'} stadig en klasse.` : 'Alle udgivne øvelser er tildelt mindst én klasse.'} Den nuværende elevside fortsætter uændret, indtil feature-flaget aktiveres ved en senere deployment.</p></div>
        <Link to="/admin/exercises" className="inline-flex shrink-0 items-center justify-center rounded-full bg-lime px-5 py-3 text-sm font-bold text-navy">Tildel øvelser</Link>
      </div>
    </section>

    {showNew && <section className="mb-6 rounded-[28px] border border-navy/8 bg-white p-5 sm:p-7" aria-labelledby="new-class-heading"><div className="mb-4 flex items-center justify-between"><h2 id="new-class-heading" className="font-display text-2xl font-bold text-navy">Opret klasse</h2><button type="button" onClick={() => setShowNew(false)} className="admin-icon-button" aria-label="Luk formular"><X /></button></div><label><span className="admin-label">Klassenavn</span><input ref={inputRef} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void create() } }} className="admin-input" maxLength={128} placeholder="Fx 8.A eller Dansk valgfag" /></label><div className="mt-4 flex justify-end"><button disabled={saving} type="button" onClick={() => void create()} className="rounded-full bg-navy px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Opretter…' : 'Opret klasse'}</button></div></section>}

    <ClassGroup title="Aktive klasser" items={active} assignments={exerciseClassAssignments} publishedIds={publishedIds} onMove={moveClass} onUpdate={updateClass} onStatus={changeStatus} onMessage={setMessage} />
    {archived.length > 0 && <div className="mt-8"><ClassGroup title="Arkiverede klasser" items={archived} assignments={exerciseClassAssignments} publishedIds={publishedIds} onMove={moveClass} onUpdate={updateClass} onStatus={changeStatus} onMessage={setMessage} /></div>}
    {!classes.length && !showNew && <div className="rounded-[28px] border border-dashed border-navy/20 bg-white/60 p-12 text-center"><UsersRound className="mx-auto size-10 text-muted" /><h2 className="font-display mt-4 text-2xl font-bold text-navy">Ingen klasser endnu</h2><p className="mt-2 text-sm text-muted">Opret den første klasse. Eksisterende øvelser ændres ikke automatisk.</p></div>}
  </>
}

function ClassGroup({ title, items, assignments, publishedIds, onMove, onUpdate, onStatus, onMessage }: { title: string; items: SchoolClass[]; assignments: ReturnType<typeof useCatalog>['exerciseClassAssignments']; publishedIds: Set<string>; onMove: (id: string, direction: -1 | 1) => Promise<void>; onUpdate: (id: string, name: string) => Promise<void>; onStatus: (item: SchoolClass) => Promise<void>; onMessage: (message: string) => void }) {
  return <section aria-label={title}><h2 className="font-display mb-4 text-2xl font-bold text-navy">{title}</h2><div className="space-y-3">{items.map((item, index) => <ClassRow key={item.id} item={item} count={new Set(assignments.filter((assignment) => assignment.classId === item.id && publishedIds.has(assignment.exerciseId)).map((assignment) => assignment.exerciseId)).size} first={index === 0} last={index === items.length - 1} onMove={onMove} onUpdate={onUpdate} onStatus={onStatus} onMessage={onMessage} />)}</div></section>
}

function ClassRow({ item, count, first, last, onMove, onUpdate, onStatus, onMessage }: { item: SchoolClass; count: number; first: boolean; last: boolean; onMove: (id: string, direction: -1 | 1) => Promise<void>; onUpdate: (id: string, name: string) => Promise<void>; onStatus: (item: SchoolClass) => Promise<void>; onMessage: (message: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  async function save() {
    try { await onUpdate(item.id, name); setEditing(false); onMessage('Klassen blev omdøbt.') }
    catch (reason) { onMessage(reason instanceof Error ? reason.message : 'Klassen kunne ikke omdøbes.') }
  }
  return <article className="rounded-[24px] border border-navy/8 bg-white p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${item.status === 'active' ? 'bg-lime' : 'bg-navy/10'}`}><UsersRound className="size-5" /></span>{editing ? <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row"><label className="flex-1"><span className="sr-only">Nyt navn til {item.name}</span><input autoFocus className="admin-input" value={name} maxLength={128} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void save() } if (event.key === 'Escape') setEditing(false) }} /></label><button type="button" onClick={() => void save()} className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-bold text-white"><Save className="size-4" />Gem</button><button type="button" onClick={() => setEditing(false)} className="rounded-full px-4 py-2 text-sm font-bold text-navy">Annullér</button></div> : <><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-navy">{item.name}</h3>{item.status === 'archived' && <span className="rounded-full bg-navy/8 px-2.5 py-1 text-xs font-bold text-muted">Arkiveret</span>}</div><p className="mt-1 text-sm text-muted">{count} udgivne {count === 1 ? 'øvelse' : 'øvelser'}</p></div><div className="flex gap-1"><button disabled={first || item.status === 'archived'} type="button" onClick={() => void onMove(item.id, -1)} className="admin-icon-button" aria-label={`Flyt ${item.name} op`}><ArrowUp /></button><button disabled={last || item.status === 'archived'} type="button" onClick={() => void onMove(item.id, 1)} className="admin-icon-button" aria-label={`Flyt ${item.name} ned`}><ArrowDown /></button><button type="button" onClick={() => { setName(item.name); setEditing(true) }} className="admin-icon-button" aria-label={`Omdøb ${item.name}`}><Pencil /></button><button type="button" onClick={() => void onStatus(item)} className="admin-icon-button" aria-label={item.status === 'active' ? `Arkivér ${item.name}` : `Gendan ${item.name}`}>{item.status === 'active' ? <Archive /> : <ArchiveRestore />}</button></div></>}</div></article>
}
