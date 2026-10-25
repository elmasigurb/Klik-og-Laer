import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { CategoryIconPicker } from '../../components/admin/CategoryIconPicker'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { CategoryIcon, DEFAULT_CATEGORY_ICON, type CategoryIconName } from '../../components/ui/Icons'
import { useCatalog } from '../../features/catalog/CatalogContext'
import type { Category, CategoryTone } from '../../types'

const tones: Array<{ value: CategoryTone; label: string; color: string }> = [
  { value: 'sage', label: 'Lime', color: 'bg-lime' }, { value: 'apricot', label: 'Koral', color: 'bg-coral' }, { value: 'sky', label: 'Periwinkle', color: 'bg-periwinkle' }, { value: 'lavender', label: 'Blå + koral', color: 'bg-periwinkle/70' }, { value: 'rose', label: 'Lys koral', color: 'bg-coral/50' }, { value: 'sand', label: 'Lys lime', color: 'bg-lime/60' },
]

export function AdminCategoriesPage() {
  const { categories, exercises, createCategory, updateCategory, deleteCategory, moveCategory } = useCatalog()
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tone, setTone] = useState<CategoryTone>('sky')
  const [icon, setIcon] = useState<CategoryIconName>(DEFAULT_CATEGORY_ICON)
  const [message, setMessage] = useState('')

  async function create() {
    if (!name.trim()) { setMessage('Skriv et navn til kategorien.'); return }
    try {
      await createCategory({ name: name.trim(), description: description.trim() || 'Tilføj en beskrivelse til kategorien.', tone, icon, isPublished: true })
      setName(''); setDescription(''); setTone('sky'); setIcon(DEFAULT_CATEGORY_ICON); setShowNew(false); setMessage('Kategorien blev oprettet.')
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Kategorien kunne ikke oprettes.') }
  }
  async function remove(category: Category) {
    const count = exercises.filter((item) => item.categoryId === category.id).length
    if (count) { setMessage(`“${category.name}” indeholder ${count} ${count === 1 ? 'øvelse' : 'øvelser'}. Flyt eller slet dem først.`); return }
    if (window.confirm(`Slet kategorien “${category.name}”?`)) {
      try { await deleteCategory(category.id); setMessage('Kategorien blev slettet.') } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Kategorien kunne ikke slettes.') }
    }
  }
  async function update(id: string, changes: Partial<Category>) { try { await updateCategory(id, changes); setMessage('Kategorien blev opdateret.') } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Kategorien kunne ikke opdateres.'); throw reason } }
  async function move(id: string, direction: -1 | 1) { try { await moveCategory(id, direction) } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Rækkefølgen kunne ikke gemmes.') } }

  return <>
    <AdminPageHeader eyebrow="Struktur" title="Kategorier" description="Saml øvelser i tydelige læringsområder, vælg farver og styr rækkefølgen på elevsiden." action={<button type="button" onClick={() => setShowNew((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-bold text-white"><Plus className="size-4" />Ny kategori</button>} />
    {message && <div role="status" className="mb-5 rounded-2xl bg-periwinkle/30 p-4 text-sm font-bold text-navy">{message}</div>}
    {showNew && <section className="mb-6 rounded-[28px] border border-navy/8 bg-white p-5 sm:p-7"><div className="mb-5 flex items-center justify-between"><h2 className="font-display text-2xl font-bold text-navy">Opret kategori</h2><button onClick={() => setShowNew(false)} type="button" className="grid size-9 place-items-center rounded-full hover:bg-ivory" aria-label="Luk formular"><X className="size-4" /></button></div><div className="grid gap-4 lg:grid-cols-2"><label><span className="admin-label">Navn</span><input className="admin-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Fx Mundtlig dansk" /></label><label><span className="admin-label">Farve</span><select className="admin-input" value={tone} onChange={(event) => setTone(event.target.value as CategoryTone)}>{tones.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="lg:col-span-2"><span className="admin-label">Beskrivelse</span><textarea className="admin-input min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} /></label><div className="lg:col-span-2"><CategoryIconPicker value={icon} onChange={setIcon} /></div></div><div className="mt-5 flex justify-end"><button type="button" onClick={() => void create()} className="rounded-full bg-navy px-6 py-3 text-sm font-bold text-white">Opret kategori</button></div></section>}
    <div className="space-y-3">{categories.map((category, index) => <CategoryRow key={category.id} category={category} count={exercises.filter((item) => item.categoryId === category.id).length} first={index === 0} last={index === categories.length - 1} onMove={move} onUpdate={update} onDelete={() => { void remove(category) }} />)}</div>
  </>
}

function CategoryRow({ category, count, first, last, onMove, onUpdate, onDelete }: { category: Category; count: number; first: boolean; last: boolean; onMove: (id: string, direction: -1 | 1) => Promise<void>; onUpdate: (id: string, changes: Partial<Category>) => Promise<void>; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [description, setDescription] = useState(category.description)
  const [tone, setTone] = useState(category.tone)
  const [icon, setIcon] = useState(category.icon)
  const toneClass = tones.find((item) => item.value === category.tone)?.color ?? 'bg-periwinkle'
  function startEditing() {
    setName(category.name)
    setDescription(category.description)
    setTone(category.tone)
    setIcon(category.icon)
    setEditing(true)
  }
  async function save() {
    if (!name.trim()) return
    try {
      await onUpdate(category.id, { name: name.trim(), description: description.trim(), tone, icon })
      setEditing(false)
    } catch { /* The parent displays the repository error. */ }
  }

  if (editing) {
    return <article className="rounded-[24px] border border-navy/8 bg-white p-4 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_1.5fr_180px]">
        <label><span className="admin-label">Navn</span><input className="admin-input" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label><span className="admin-label">Beskrivelse</span><input className="admin-input" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label><span className="admin-label">Farve</span><select className="admin-input" value={tone} onChange={(event) => setTone(event.target.value as CategoryTone)}>{tones.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      </div>
      <div className="mt-4"><CategoryIconPicker value={icon} onChange={setIcon} /></div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={() => void save()} className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white"><Save className="size-4" />Gem</button>
        <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-navy hover:bg-ivory"><X className="size-4" />Annullér</button>
      </div>
    </article>
  }

  return <article className="rounded-[24px] border border-navy/8 bg-white p-4 sm:p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <span className={`grid size-12 shrink-0 place-items-center rounded-2xl text-navy ${toneClass}`}><CategoryIcon name={category.icon} /></span>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-navy">{category.name}</h2><span className="rounded-full bg-ivory px-2.5 py-1 text-xs font-bold text-muted">{count} {count === 1 ? 'øvelse' : 'øvelser'}</span>{!category.isPublished && <span className="rounded-full bg-coral/35 px-2.5 py-1 text-xs font-bold text-navy">Skjult</span>}</div><p className="mt-1 truncate text-sm text-muted">{category.description}</p></div>
      <div className="flex gap-1"><button disabled={first} type="button" onClick={() => void onMove(category.id, -1)} className="admin-icon-button" aria-label="Flyt op"><ArrowUp /></button><button disabled={last} type="button" onClick={() => void onMove(category.id, 1)} className="admin-icon-button" aria-label="Flyt ned"><ArrowDown /></button><button type="button" onClick={() => void onUpdate(category.id, { isPublished: !category.isPublished }).catch(() => undefined)} className="admin-icon-button" aria-label={category.isPublished ? 'Skjul kategori' : 'Vis kategori'}>{category.isPublished ? <Eye /> : <EyeOff />}</button><button type="button" onClick={startEditing} className="admin-icon-button" aria-label="Redigér kategori"><Pencil /></button><button type="button" onClick={onDelete} className="admin-icon-button text-danger" aria-label="Slet kategori"><Trash2 /></button></div>
    </div>
  </article>
}
