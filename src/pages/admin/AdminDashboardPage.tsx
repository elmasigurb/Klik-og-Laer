import { Archive, ArrowRight, BookOpen, CheckCircle2, FileEdit, FolderKanban, PlusCircle, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { AdminStatusBadge } from '../../components/admin/AdminStatusBadge'
import { formatDate } from '../../features/admin/format'
import { useCatalog } from '../../features/catalog/CatalogContext'

export function AdminDashboardPage() {
  const { exercises, categories } = useCatalog()
  const published = exercises.filter((item) => item.status === 'published').length
  const drafts = exercises.filter((item) => item.status === 'draft').length
  const archived = exercises.filter((item) => item.status === 'archived').length
  const recent = [...exercises].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5)
  const cards = [
    { label: 'Alle øvelser', value: exercises.length, icon: BookOpen, tone: 'bg-periwinkle' },
    { label: 'Udgivet', value: published, icon: CheckCircle2, tone: 'bg-lime' },
    { label: 'Kladder', value: drafts, icon: FileEdit, tone: 'bg-coral' },
    { label: 'Arkiveret', value: archived, icon: Archive, tone: 'bg-navy/10' },
    { label: 'Kategorier', value: categories.length, icon: FolderKanban, tone: 'bg-periwinkle/65' },
  ]
  return <>
    <AdminPageHeader eyebrow="Overblik" title="Velkommen tilbage" description="Her kan du se indholdet på Klik & Lær og hurtigt fortsætte dit arbejde." />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Nøgletal">{cards.map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-[24px] border border-navy/8 bg-white p-5"><span className={`grid size-10 place-items-center rounded-2xl text-navy ${tone}`}><Icon className="size-5" /></span><p className="font-display mt-6 text-3xl font-extrabold text-navy">{value}</p><p className="mt-1 text-sm font-semibold text-muted">{label}</p></div>)}</section>

    <section className="mt-8 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <div className="rounded-[28px] border border-navy/8 bg-white p-5 sm:p-7"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.14em] text-muted">Seneste aktivitet</p><h2 className="font-display mt-1 text-2xl font-bold text-navy">Seneste øvelser</h2></div><Link to="/admin/exercises" className="text-sm font-bold text-navy hover:underline">Se alle</Link></div><div className="divide-y divide-navy/8">{recent.map((exercise) => { const category = categories.find((item) => item.id === exercise.categoryId); return <div key={exercise.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="truncate font-bold text-navy">{exercise.title}</p><p className="mt-1 text-xs text-muted">{category?.name ?? 'Ukendt kategori'} · Ændret {formatDate(exercise.updatedAt)}</p></div><AdminStatusBadge status={exercise.status} /><Link to={`/admin/exercises/${exercise.id}/edit`} className="text-sm font-bold text-navy hover:underline">Redigér</Link></div>})}</div></div>
      <div className="rounded-[28px] bg-navy p-6 text-white sm:p-7"><p className="text-xs font-black uppercase tracking-[.14em] text-periwinkle">Kom hurtigt i gang</p><h2 className="font-display mt-2 text-2xl font-bold">Hvad vil du gøre?</h2><div className="mt-6 space-y-2"><QuickLink to="/admin/exercises/new" icon={<Upload />} label="Upload ny øvelse" /><QuickLink to="/admin/categories" icon={<PlusCircle />} label="Opret kategori" /><QuickLink to="/admin/exercises" icon={<Archive />} label="Genbrug arkiveret øvelse" /></div></div>
    </section>

    <section className="mt-8 rounded-[28px] border border-navy/8 bg-white p-5 sm:p-7"><div className="mb-6"><p className="text-xs font-black uppercase tracking-[.14em] text-muted">Indholdsfordeling</p><h2 className="font-display mt-1 text-2xl font-bold text-navy">Kategorier</h2></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{categories.map((category) => { const count = exercises.filter((exercise) => exercise.categoryId === category.id).length; return <Link key={category.id} to="/admin/categories" className="group flex items-center justify-between rounded-2xl bg-ivory p-4 hover:bg-periwinkle/25"><div><p className="font-bold text-navy">{category.name}</p><p className="mt-1 text-xs text-muted">{count} {count === 1 ? 'øvelse' : 'øvelser'}</p></div><ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-1" /></Link>})}</div></section>
  </>
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) { return <Link to={to} className="flex items-center gap-3 rounded-2xl bg-white/8 p-4 text-sm font-bold hover:bg-white/14"><span className="[&>svg]:size-5">{icon}</span><span className="flex-1">{label}</span><ArrowRight className="size-4" /></Link> }
