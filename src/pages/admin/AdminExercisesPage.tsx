import { Archive, ArchiveRestore, Eye, Pencil, Plus, Search, Send, Trash2, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { AdminStatusBadge } from '../../components/admin/AdminStatusBadge'
import { Modal } from '../../components/ui/Modal'
import { formatDate } from '../../features/admin/format'
import { useCatalog } from '../../features/catalog/CatalogContext'
import { DemoExerciseRenderer } from '../../features/exercises/DemoExerciseRenderer'
import { exerciseFileRepository } from '../../features/exercises/exerciseFileRepository'
import { UploadedExerciseFrame } from '../../features/exercises/UploadedExerciseFrame'
import type { Exercise } from '../../types'

export function AdminExercisesPage() {
  const { exercises, categories, classes, exerciseClassAssignments, repositoryMode, setExerciseStatus, deleteExercise, assignExerciseClasses } = useCatalog()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [sort, setSort] = useState('updated')
  const [preview, setPreview] = useState<Exercise>()
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkClasses, setBulkClasses] = useState<Set<string>>(new Set())
  const [bulkSaving, setBulkSaving] = useState(false)
  const activeClasses = classes.filter((item) => item.status === 'active')
  const assignmentsByExercise = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const assignment of exerciseClassAssignments) map.set(assignment.exerciseId, [...(map.get(assignment.exerciseId) ?? []), assignment.classId])
    return map
  }, [exerciseClassAssignments])
  const filtered = useMemo(() => exercises.filter((item) => {
    const assigned = assignmentsByExercise.get(item.id) ?? []
    const matchesClass = classFilter === 'all' || (classFilter === 'unassigned' ? !assigned.length : assigned.includes(classFilter))
    return item.title.toLocaleLowerCase('da').includes(query.toLocaleLowerCase('da')) && (category === 'all' || item.categoryId === category) && (status === 'all' || status === item.status) && matchesClass
  }).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'da') : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [assignmentsByExercise, category, classFilter, exercises, query, sort, status])
  const allFilteredSelected = filtered.length > 0 && filtered.every((item) => selected.has(item.id))

  async function remove(item: Exercise) {
    if (!window.confirm(`Slet “${item.title}” permanent? Både metadata og HTML-filen fjernes. Handlingen kan ikke fortrydes.`)) return
    try {
      if (item.sourceType === 'upload' && repositoryMode === 'local') await exerciseFileRepository.remove(item.id).catch(() => undefined)
      await deleteExercise(item.id)
      setSelected((current) => { const next = new Set(current); next.delete(item.id); return next })
      setMessage('Øvelsen blev slettet permanent.')
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Øvelsen kunne ikke slettes.') }
  }

  async function changeStatus(item: Exercise, next: Exercise['status']) {
    try { await setExerciseStatus(item.id, next); setMessage(next === 'published' ? 'Øvelsen er udgivet.' : 'Øvelsen er arkiveret og skjult for elever.') }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Status kunne ikke ændres.') }
  }

  async function applyBulk(mode: 'add' | 'remove') {
    if (!selected.size) { setMessage('Vælg mindst én øvelse.'); return }
    if (!bulkClasses.size) { setMessage('Vælg mindst én klasse.'); return }
    setBulkSaving(true)
    try {
      const result = await assignExerciseClasses([...selected], [...bulkClasses], mode)
      setMessage(mode === 'add' ? `${result.created} nye klassetilknytninger blev oprettet.` : `${result.removed} klassetilknytninger blev fjernet.`)
      setBulkClasses(new Set())
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Klassetilknytningerne kunne ikke gemmes.') }
    finally { setBulkSaving(false) }
  }

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current)
      if (allFilteredSelected) filtered.forEach((item) => next.delete(item.id))
      else filtered.forEach((item) => next.add(item.id))
      return next
    })
  }

  return <>
    <AdminPageHeader eyebrow="Indhold" title="Øvelser" description="Forbered kladder, udgiv til eleverne, og tildel én eller flere klasser uden at duplikere øvelsen eller HTML-filen." action={<Link to="/admin/exercises/new" className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-bold text-white"><Plus className="size-4" />Ny øvelse</Link>} />
    {message && <div role="status" className="mb-5 rounded-2xl bg-periwinkle/30 p-4 text-sm font-bold text-navy">{message}</div>}
    <div className="grid gap-3 rounded-[24px] border border-navy/8 bg-white p-4 xl:grid-cols-[1fr_180px_160px_180px_150px]"><label className="relative"><span className="sr-only">Søg efter titel</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Søg efter titel…" className="admin-input pl-10" /></label><Filter label="Kategori" value={category} onChange={setCategory}><option value="all">Alle kategorier</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Filter><Filter label="Status" value={status} onChange={setStatus}><option value="all">Alle statusser</option><option value="draft">Kladde</option><option value="published">Udgivet</option><option value="archived">Arkiveret</option></Filter><Filter label="Klasse" value={classFilter} onChange={setClassFilter}><option value="all">Alle klasser</option><option value="unassigned">Uden klasse</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.status === 'archived' ? ' (arkiveret)' : ''}</option>)}</Filter><Filter label="Sortering" value={sort} onChange={setSort}><option value="updated">Senest ændret</option><option value="title">Titel A–Å</option></Filter></div>
    <section aria-labelledby="bulk-assignment-heading" className="mt-4 rounded-[24px] border border-navy/8 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2"><UsersRound className="size-5 text-navy" /><h2 id="bulk-assignment-heading" className="font-display text-lg font-bold text-navy">Tildel klasser samlet</h2></div><p className="mt-1 text-sm text-muted">{selected.size} {selected.size === 1 ? 'øvelse valgt' : 'øvelser valgt'}. Tilføjelse bevarer eksisterende klasser; fjernelse påvirker kun de valgte klasser.</p></div><button type="button" onClick={toggleAll} className="self-start rounded-full border border-navy/15 px-4 py-2 text-sm font-bold text-navy">{allFilteredSelected ? 'Fravælg viste' : 'Vælg alle viste'}</button></div>
      {activeClasses.length ? <fieldset className="mt-4"><legend className="sr-only">Vælg klasser til massehandling</legend><div className="flex flex-wrap gap-2">{activeClasses.map((item) => <label key={item.id} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${bulkClasses.has(item.id) ? 'border-navy bg-periwinkle/45 text-navy' : 'border-navy/12 bg-ivory text-muted'}`}><input type="checkbox" className="size-4 accent-navy" checked={bulkClasses.has(item.id)} onChange={() => setBulkClasses((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next })} />{item.name}</label>)}</div><div className="mt-4 flex flex-wrap gap-2"><button disabled={bulkSaving || !selected.size || !bulkClasses.size} type="button" onClick={() => void applyBulk('add')} className="rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">Tilføj til valgte klasser</button><button disabled={bulkSaving || !selected.size || !bulkClasses.size} type="button" onClick={() => void applyBulk('remove')} className="rounded-full border border-navy/15 px-5 py-2.5 text-sm font-bold text-navy disabled:opacity-40">Fjern fra valgte klasser</button></div></fieldset> : <p className="mt-4 text-sm text-muted">Opret en aktiv klasse under <Link className="font-bold text-navy underline" to="/admin/classes">Klasser</Link>, før du tildeler øvelser.</p>}
    </section>
    <p className="my-5 text-sm font-bold text-muted">{filtered.length} {filtered.length === 1 ? 'øvelse' : 'øvelser'}</p>
    <div className="overflow-hidden rounded-[28px] border border-navy/8 bg-white"><div className="hidden grid-cols-[36px_minmax(220px,1.4fr)_1fr_110px_130px_210px] gap-4 border-b border-navy/8 bg-navy/[.025] px-5 py-3 text-xs font-black uppercase tracking-[.08em] text-muted md:grid"><span className="sr-only">Vælg</span><span>Øvelse</span><span>Kategori</span><span>Status</span><span>Ændret</span><span className="text-right">Handlinger</span></div>{filtered.length ? <div className="divide-y divide-navy/8">{filtered.map((item) => { const assignedClasses = (assignmentsByExercise.get(item.id) ?? []).map((id) => classes.find((entry) => entry.id === id)).filter(Boolean); return <div key={item.id} className="grid gap-3 p-5 md:grid-cols-[36px_minmax(220px,1.4fr)_1fr_110px_130px_210px] md:items-center"><label className="flex items-center"><span className="sr-only">Vælg {item.title}</span><input type="checkbox" className="size-4 accent-navy" checked={selected.has(item.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next })} /></label><div className="flex min-w-0 items-center gap-3"><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${item.status === 'published' ? 'bg-lime' : item.status === 'archived' ? 'bg-navy/10' : 'bg-coral/45'}`}><BookPreviewLetter title={item.title} /></span><div className="min-w-0"><p className="truncate font-bold text-navy">{item.title}</p><p className="truncate text-xs text-muted">{item.sourceType === 'upload' ? item.fileName : 'Klik & Lær demo'}</p><div className="mt-1 flex flex-wrap gap-1">{assignedClasses.length ? assignedClasses.map((schoolClass) => schoolClass && <span key={schoolClass.id} className="rounded-full bg-periwinkle/30 px-2 py-0.5 text-[11px] font-bold text-navy">{schoolClass.name}</span>) : <span className="text-[11px] font-bold text-danger">Ingen klasse</span>}</div></div></div><p className="text-sm text-muted">{categories.find((entry) => entry.id === item.categoryId)?.name ?? 'Ukendt'}</p><AdminStatusBadge status={item.status} /><p className="text-sm text-muted">{formatDate(item.updatedAt)}</p><div className="flex justify-start gap-1 md:justify-end"><IconButton label="Forhåndsvis" onClick={() => setPreview(item)} icon={<Eye />} /><Link className="grid size-9 place-items-center rounded-xl text-navy hover:bg-periwinkle/30" aria-label={`Redigér ${item.title}`} to={`/admin/exercises/${item.id}/edit`}><Pencil className="size-4" /></Link>{item.status === 'published' ? <IconButton label="Fjern udgivelse og arkivér" onClick={() => void changeStatus(item, 'archived')} icon={<Archive />} /> : <IconButton label={item.status === 'archived' ? 'Genudgiv' : 'Udgiv'} onClick={() => void changeStatus(item, 'published')} icon={item.status === 'archived' ? <ArchiveRestore /> : <Send />} />}<IconButton label="Slet permanent" onClick={() => void remove(item)} icon={<Trash2 />} danger /></div></div> })}</div> : <div className="p-12 text-center"><p className="font-display text-xl font-bold text-navy">Ingen øvelser matcher</p><p className="mt-2 text-sm text-muted">Prøv at ændre søgning eller filtre.</p></div>}</div>
    {preview && <Modal title={`Forhåndsvisning: ${preview.title}`} onClose={() => setPreview(undefined)} wide>{preview.sourceType === 'upload' ? <UploadedExerciseFrame exerciseId={preview.id} fileId={preview.fileId} title={preview.title} /> : <DemoExerciseRenderer exercise={preview} onAnswersChange={() => undefined} onCheck={() => undefined} />}</Modal>}
  </>
}

function Filter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <label><span className="sr-only">{label}</span><select className="admin-input" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label> }
function IconButton({ label, onClick, icon, danger = false }: { label: string; onClick: () => void; icon: React.ReactNode; danger?: boolean }) { return <button type="button" onClick={onClick} className={`grid size-9 place-items-center rounded-xl hover:bg-periwinkle/30 [&>svg]:size-4 ${danger ? 'text-danger' : 'text-navy'}`} aria-label={label} title={label}>{icon}</button> }
function BookPreviewLetter({ title }: { title: string }) { return <span className="font-display text-sm font-black text-navy" aria-hidden="true">{title.slice(0, 1).toLocaleUpperCase('da')}</span> }
