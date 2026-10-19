import { Archive, ArchiveRestore, Eye, Pencil, Plus, Search, Send, Trash2 } from 'lucide-react'
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
  const { exercises, categories, repositoryMode, setExerciseStatus, deleteExercise } = useCatalog()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('updated')
  const [preview, setPreview] = useState<Exercise>()
  const [message, setMessage] = useState('')
  const filtered = useMemo(() => exercises.filter((item) => item.title.toLocaleLowerCase('da').includes(query.toLocaleLowerCase('da')) && (category === 'all' || item.categoryId === category) && (status === 'all' || status === item.status)).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'da') : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [exercises, query, category, status, sort])

  async function remove(item: Exercise) {
    if (!window.confirm(`Slet “${item.title}” permanent? Både metadata og HTML-filen fjernes. Handlingen kan ikke fortrydes.`)) return
    try {
      if (item.sourceType === 'upload' && repositoryMode === 'local') await exerciseFileRepository.remove(item.id).catch(() => undefined)
      await deleteExercise(item.id)
      setMessage('Øvelsen blev slettet permanent.')
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Øvelsen kunne ikke slettes.') }
  }
  async function changeStatus(item: Exercise, next: Exercise['status']) {
    try { await setExerciseStatus(item.id, next); setMessage(next === 'published' ? 'Øvelsen er udgivet.' : 'Øvelsen er arkiveret og skjult for elever.') } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Status kunne ikke ændres.') }
  }

  return <>
    <AdminPageHeader eyebrow="Indhold" title="Øvelser" description="Forbered kladder, udgiv til eleverne, og arkivér øvelser til senere genbrug uden at slette dem." action={<Link to="/admin/exercises/new" className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-bold text-white"><Plus className="size-4" />Ny øvelse</Link>} />
    {message && <div role="status" className="mb-5 rounded-2xl bg-periwinkle/30 p-4 text-sm font-bold text-navy">{message}</div>}
    <div className="grid gap-3 rounded-[24px] border border-navy/8 bg-white p-4 lg:grid-cols-[1fr_200px_170px_170px]"><label className="relative"><span className="sr-only">Søg efter titel</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Søg efter titel…" className="admin-input pl-10" /></label><Filter label="Kategori" value={category} onChange={setCategory}><option value="all">Alle kategorier</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Filter><Filter label="Status" value={status} onChange={setStatus}><option value="all">Alle statusser</option><option value="draft">Kladde</option><option value="published">Udgivet</option><option value="archived">Arkiveret</option></Filter><Filter label="Sortering" value={sort} onChange={setSort}><option value="updated">Senest ændret</option><option value="title">Titel A–Å</option></Filter></div>
    <p className="my-5 text-sm font-bold text-muted">{filtered.length} {filtered.length === 1 ? 'øvelse' : 'øvelser'}</p>
    <div className="overflow-hidden rounded-[28px] border border-navy/8 bg-white"><div className="hidden grid-cols-[minmax(220px,1.4fr)_1fr_110px_130px_210px] gap-4 border-b border-navy/8 bg-navy/[.025] px-5 py-3 text-xs font-black uppercase tracking-[.08em] text-muted md:grid"><span>Øvelse</span><span>Kategori</span><span>Status</span><span>Ændret</span><span className="text-right">Handlinger</span></div>{filtered.length ? <div className="divide-y divide-navy/8">{filtered.map((item) => <div key={item.id} className="grid gap-3 p-5 md:grid-cols-[minmax(220px,1.4fr)_1fr_110px_130px_210px] md:items-center"><div className="flex items-center gap-3"><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${item.status === 'published' ? 'bg-lime' : item.status === 'archived' ? 'bg-navy/10' : 'bg-coral/45'}`}><BookPreviewLetter title={item.title} /></span><div className="min-w-0"><p className="truncate font-bold text-navy">{item.title}</p><p className="truncate text-xs text-muted">{item.sourceType === 'upload' ? item.fileName : 'Klik & Lær demo'}</p></div></div><p className="text-sm text-muted">{categories.find((entry) => entry.id === item.categoryId)?.name ?? 'Ukendt'}</p><AdminStatusBadge status={item.status} /><p className="text-sm text-muted">{formatDate(item.updatedAt)}</p><div className="flex justify-start gap-1 md:justify-end"><IconButton label="Forhåndsvis" onClick={() => setPreview(item)} icon={<Eye />} /><Link className="grid size-9 place-items-center rounded-xl text-navy hover:bg-periwinkle/30" aria-label={`Redigér ${item.title}`} to={`/admin/exercises/${item.id}/edit`}><Pencil className="size-4" /></Link>{item.status === 'published' ? <IconButton label="Fjern udgivelse og arkivér" onClick={() => void changeStatus(item, 'archived')} icon={<Archive />} /> : <IconButton label={item.status === 'archived' ? 'Genudgiv' : 'Udgiv'} onClick={() => void changeStatus(item, 'published')} icon={item.status === 'archived' ? <ArchiveRestore /> : <Send />} />}<IconButton label="Slet permanent" onClick={() => void remove(item)} icon={<Trash2 />} danger /></div></div>)}</div> : <div className="p-12 text-center"><p className="font-display text-xl font-bold text-navy">Ingen øvelser matcher</p><p className="mt-2 text-sm text-muted">Prøv at ændre søgning eller filtre.</p></div>}</div>
    {preview && <Modal title={`Forhåndsvisning: ${preview.title}`} onClose={() => setPreview(undefined)} wide>{preview.sourceType === 'upload' ? <UploadedExerciseFrame exerciseId={preview.id} fileId={preview.fileId} title={preview.title} /> : <DemoExerciseRenderer exercise={preview} onAnswersChange={() => undefined} onCheck={() => undefined} />}</Modal>}
  </>
}

function Filter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <label><span className="sr-only">{label}</span><select className="admin-input" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label> }
function IconButton({ label, onClick, icon, danger = false }: { label: string; onClick: () => void; icon: React.ReactNode; danger?: boolean }) { return <button type="button" onClick={onClick} className={`grid size-9 place-items-center rounded-xl hover:bg-periwinkle/30 [&>svg]:size-4 ${danger ? 'text-danger' : 'text-navy'}`} aria-label={label} title={label}>{icon}</button> }
function BookPreviewLetter({ title }: { title: string }) { return <span className="font-display text-sm font-black text-navy" aria-hidden="true">{title.slice(0, 1).toLocaleUpperCase('da')}</span> }
