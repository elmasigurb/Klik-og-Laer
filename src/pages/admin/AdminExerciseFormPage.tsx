import { AlertCircle, ArrowLeft, Eye, FileCode2, Maximize2, Trash2, UploadCloud } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { Modal } from '../../components/ui/Modal'
import { formatFileSize } from '../../features/admin/format'
import { useCatalog } from '../../features/catalog/CatalogContext'
import { DemoExerciseRenderer } from '../../features/exercises/DemoExerciseRenderer'
import { exerciseFileRepository } from '../../features/exercises/exerciseFileRepository'
import { UploadedExerciseFrame } from '../../features/exercises/UploadedExerciseFrame'
import type { CategoryTone, ExerciseStatus } from '../../types'

const MAX_SIZE = 2 * 1024 * 1024

export function AdminExerciseFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { exercises, categories, repositoryMode, createExercise, updateExercise, createCategory } = useCatalog()
  const existing = id ? exercises.find((item) => item.id === id) : undefined
  const editing = Boolean(id)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories[0]?.id ?? '')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [fileName, setFileName] = useState(existing?.fileName ?? '')
  const [fileSize, setFileSize] = useState(existing?.fileSize ?? 0)
  const [html, setHtml] = useState<string>()
  const [currentFileAvailable, setCurrentFileAvailable] = useState(existing?.sourceType === 'upload')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [largePreview, setLargePreview] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!existing || existing.sourceType !== 'upload') return
    if (repositoryMode === 'appwrite') { setCurrentFileAvailable(Boolean(existing.fileId)); return }
    exerciseFileRepository.get(existing.id).then((value) => setCurrentFileAvailable(Boolean(value))).catch(() => setCurrentFileAvailable(false))
  }, [existing, repositoryMode])

  if (editing && !existing) return <Navigate to="/admin/exercises" replace />

  async function acceptFile(file?: File) {
    setError('')
    if (!file) return
    if (!file.name.toLocaleLowerCase('da').endsWith('.html') && file.type !== 'text/html') { setError('Vælg en gyldig .html-fil.'); return }
    if (file.size > MAX_SIZE) { setError('Filen er for stor. Den må højst fylde 2 MB i denne demo.'); return }
    try { setHtml(await file.text()); setFileName(file.name); setFileSize(file.size); setCurrentFileAvailable(true) } catch { setError('Filen kunne ikke læses. Prøv en anden fil.') }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); void acceptFile(event.dataTransfer.files[0]) }

  async function save(status: ExerciseStatus) {
    setError('')
    if (!title.trim()) { setError('Skriv en titel til øvelsen.'); return }
    if (!description.trim()) { setError('Skriv en kort beskrivelse.'); return }
    if (!categoryId) { setError('Vælg en kategori.'); return }
    if (!editing && !html) { setError('Vælg en HTML-fil, før øvelsen gemmes.'); return }
    setSaving(true)
    try {
      let resolvedCategory = categoryId
      if (categoryId === '__new__') {
        if (!newCategoryName.trim()) throw new Error('Skriv et navn til den nye kategori.')
        resolvedCategory = (await createCategory({ name: newCategoryName.trim(), description: 'Ny kategori — tilføj en beskrivelse under Kategorier.', tone: 'sky' as CategoryTone, isPublished: true })).id
      }
      const exerciseId = existing?.id ?? crypto.randomUUID()
      const selectedFile = html ? new File([html], fileName || `${exerciseId}.html`, { type: 'text/html' }) : undefined
      if (html && repositoryMode === 'local') await exerciseFileRepository.save(exerciseId, html)
      const changes = { title: title.trim(), description: description.trim(), categoryId: resolvedCategory, status, isPublished: status === 'published', fileName: fileName || existing?.fileName, fileSize: fileSize || existing?.fileSize, sourceType: html ? 'upload' as const : existing?.sourceType ?? 'upload' as const, kind: html ? 'upload' as const : existing?.kind ?? 'upload' as const }
      if (existing) await updateExercise(existing.id, changes, repositoryMode === 'appwrite' ? selectedFile : undefined)
      else await createExercise({ id: exerciseId, ...changes, duration: 10, difficulty: 'Mellem', accent: 'blue' }, repositoryMode === 'appwrite' ? selectedFile : undefined)
      navigate('/admin/exercises', { replace: true })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Øvelsen kunne ikke gemmes. Browserens lager kan være fyldt.'); setSaving(false) }
  }

  const preview = html ? <UploadedExerciseFrame exerciseId={existing?.id ?? 'new-preview'} title={title || 'Forhåndsvisning'} html={html} /> : existing?.sourceType === 'upload' && currentFileAvailable ? <UploadedExerciseFrame exerciseId={existing.id} fileId={existing.fileId} title={existing.title} /> : existing?.sourceType === 'demo' ? <DemoExerciseRenderer exercise={existing} onAnswersChange={() => undefined} onCheck={() => undefined} /> : null

  return <>
    <AdminPageHeader eyebrow={editing ? 'Redigér indhold' : 'Nyt indhold'} title={editing ? 'Redigér øvelse' : 'Upload en øvelse'} description="Udfyld oplysningerne, kontrollér øvelsen i det isolerede vindue, og vælg derefter kladde eller udgivelse." action={<Link to="/admin/exercises" className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-5 py-3 text-sm font-bold text-navy"><ArrowLeft className="size-4" />Annullér</Link>} />
    {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-coral bg-coral/20 p-4 text-sm font-bold text-danger"><AlertCircle className="mt-0.5 size-5 shrink-0" />{error}</div>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,.8fr)]">
      <form className="space-y-6 rounded-[28px] border border-navy/8 bg-white p-5 sm:p-7" onSubmit={(event) => event.preventDefault()}>
        <Field label="Øvelsens titel" required><input value={title} onChange={(event) => setTitle(event.target.value)} className="admin-input" placeholder="Fx Nutid og datid – Øvelse 1" /></Field>
        <Field label="Beskrivelse" required hint="Kort tekst, som eleverne ser på øvelseskortet."><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="admin-input min-h-28 resize-y" placeholder="Hvad skal eleven øve?" /></Field>
        <Field label="Kategori" required><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="admin-input"><option value="" disabled>Vælg kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}<option value="__new__">＋ Opret ny kategori</option></select>{categoryId === '__new__' && <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} className="admin-input mt-3" placeholder="Navn på ny kategori" aria-label="Navn på ny kategori" />}</Field>
        <Field label={editing ? 'HTML-fil · erstat eksisterende fil' : 'HTML-fil'} required={!editing} hint={editing ? 'Vælg kun en fil, hvis den nuværende HTML skal erstattes. Øvelsens ID, kategori og status bevares, indtil du gemmer.' : 'Én selvstændig HTML-fil med indlejret CSS og JavaScript. Maks. 2 MB.'}><div onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop} className={`rounded-3xl border-2 border-dashed p-7 text-center transition-colors ${dragging ? 'border-navy bg-periwinkle/30' : 'border-navy/20 bg-ivory'}`}><input ref={fileInput} type="file" accept=".html,text/html" className="sr-only" onChange={(event) => void acceptFile(event.target.files?.[0])} /><UploadCloud className="mx-auto size-8 text-navy" /><p className="mt-3 font-bold text-navy">{editing ? 'Træk en rettet HTML-fil hertil' : 'Træk HTML-filen hertil'}</p><p className="mt-1 text-sm text-muted">eller</p><button type="button" onClick={() => fileInput.current?.click()} className="mt-3 rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white">{editing ? 'Vælg erstatningsfil' : 'Vælg fil'}</button></div>
          {fileName && <div className="mt-3 flex items-center gap-3 rounded-2xl bg-lime/55 p-4"><FileCode2 className="size-5 text-navy" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-navy">{fileName}</p><p className="text-xs text-muted">{formatFileSize(fileSize)}</p></div><button type="button" onClick={() => { setHtml(undefined); setFileName(''); setFileSize(0); setCurrentFileAvailable(false); if (fileInput.current) fileInput.current.value = '' }} className="grid size-9 place-items-center rounded-xl text-danger hover:bg-white" aria-label="Fjern valgt fil"><Trash2 className="size-4" /></button></div>}
        </Field>
        <div className="rounded-2xl bg-periwinkle/25 p-4 text-sm leading-6 text-navy"><strong>Om sikkerhed:</strong> Forhåndsvisningen kører i en sandbox uden adgang til Klik & Lærs lager eller app-kontekst. Udgivelse skal synkronisere metadata og filrettigheder gennem den betroede Appwrite-operation.</div>
        <div className="flex flex-col-reverse gap-3 border-t border-navy/8 pt-6 sm:flex-row sm:justify-end"><button disabled={saving} type="button" onClick={() => void save(existing?.status === 'archived' ? 'archived' : 'draft')} className="rounded-full border border-navy/15 px-6 py-3 text-sm font-bold text-navy disabled:opacity-50">{saving ? 'Gemmer…' : existing?.status === 'archived' ? 'Gem som arkiveret' : 'Gem som kladde'}</button><button disabled={saving} type="button" onClick={() => void save('published')} className="rounded-full bg-navy px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Gemmer…' : existing?.status === 'archived' ? 'Genudgiv øvelse' : 'Udgiv øvelse'}</button></div>
      </form>
      <aside className="h-fit rounded-[28px] border border-navy/8 bg-white p-5 sm:p-7 xl:sticky xl:top-26"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.14em] text-muted">Sikker forhåndsvisning</p><h2 className="font-display mt-1 text-xl font-bold text-navy">Øvelsen</h2></div>{preview && <button type="button" onClick={() => setLargePreview(true)} className="inline-flex items-center gap-2 rounded-full bg-periwinkle/35 px-4 py-2 text-xs font-bold text-navy"><Maximize2 className="size-4" />Større</button>}</div>{preview ?? <div className="grid min-h-72 place-items-center rounded-3xl border-2 border-dashed border-navy/12 bg-ivory p-8 text-center"><div><Eye className="mx-auto size-8 text-muted" /><p className="mt-3 text-sm font-bold text-navy">Forhåndsvisningen vises her</p><p className="mt-1 text-xs leading-5 text-muted">Vælg en HTML-fil for at kontrollere indholdet.</p></div></div>}</aside>
    </div>
    {largePreview && preview && <Modal title={title || 'Forhåndsvisning'} onClose={() => setLargePreview(false)} wide>{html ? <UploadedExerciseFrame exerciseId={existing?.id ?? 'new-preview'} title={title} html={html} large /> : existing?.sourceType === 'upload' ? <UploadedExerciseFrame exerciseId={existing.id} fileId={existing.fileId} title={existing.title} large /> : existing ? <DemoExerciseRenderer exercise={existing} onAnswersChange={() => undefined} onCheck={() => undefined} /> : null}</Modal>}
  </>
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-bold text-navy">{label}{required && <span className="text-danger"> *</span>}</span>{children}{hint && <span className="mt-2 block text-xs leading-5 text-muted">{hint}</span>}</label> }
