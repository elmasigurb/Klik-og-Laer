import { useState } from 'react'
import { AlertTriangle, BarChart3, BookOpen, ChevronLeft, FileText, FolderKanban, LogOut, Menu, PlusCircle, Settings, X } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'

const items = [
  { to: '/admin', label: 'Overblik', icon: BarChart3, end: true },
  { to: '/admin/exercises', label: 'Øvelser', icon: BookOpen },
  { to: '/admin/categories', label: 'Kategorier', icon: FolderKanban },
  { to: '/admin/content', label: 'Websiteindhold', icon: FileText },
  { to: '/admin/exercises/new', label: 'Upload øvelse', icon: PlusCircle },
  { to: '/admin/settings', label: 'Indstillinger', icon: Settings },
]

export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  async function logOut() { await signOut(); navigate('/admin/login', { replace: true }) }
  const initials = (user?.name || user?.email || 'Lærer').split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const nav = <>{items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${isActive ? 'bg-periwinkle text-navy' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}><Icon className="size-5" />{label}</NavLink>)}<div className="my-3 border-t border-white/10" /><NavLink to="/" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white"><ChevronLeft className="size-5" />Tilbage til hjemmesiden</NavLink></>

  return <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[270px_1fr]">
    <aside className="hidden min-h-screen flex-col bg-navy p-5 lg:sticky lg:top-0 lg:flex lg:h-screen"><NavLink to="/admin" className="mb-8 flex items-center gap-3 px-2"><span className="grid size-10 place-items-center rounded-[14px] bg-coral text-sm font-black text-navy">k&l</span><span className="font-display text-xl font-extrabold lowercase tracking-[-.04em] text-white">klik & lær<span className="text-coral">.</span></span></NavLink><nav className="flex flex-col gap-1" aria-label="Administration">{nav}</nav><div className="mt-auto space-y-2"><div className="rounded-2xl bg-white/8 p-4 text-xs leading-5 text-white/60"><strong className="block text-white">Appwrite-session</strong>Adgang er verificeret mod lærerteamet. Datakilden vises under Indstillinger, hvor lokal demo-data kan importeres sikkert.</div><button type="button" onClick={() => void logOut()} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white"><LogOut className="size-5" />Log ud</button></div></aside>
    <div className="min-w-0">
      <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-navy/8 bg-ivory/90 px-4 backdrop-blur-xl sm:px-8"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-muted">Læreradministration · Appwrite</p><p className="font-display font-bold text-navy">God arbejdslyst, {user?.name || 'lærer'}</p></div><button type="button" onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-full bg-navy text-white lg:hidden" aria-label="Åbn administrationsmenu"><Menu /></button><div className="hidden items-center gap-3 lg:flex"><span className="grid size-9 place-items-center rounded-full bg-lime text-sm font-black text-navy">{initials}</span><span className="text-sm font-bold text-navy">{user?.email}</span></div></header>
      <main className="p-4 sm:p-8 lg:p-10"><div role="note" className="mb-6 flex items-start gap-3 rounded-2xl border border-coral bg-coral/20 p-4 text-sm leading-6 text-navy"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><p><strong>Sikker læreradgang.</strong> Login og teammedlemskab kontrolleres af Appwrite. Offentlig adgang må kun gives til udgivne rækker og HTML-filer; den endelige Function-baserede udgivelsesoperation skal testes før produktion.</p></div><Outlet /></main>
    </div>
    {open && <div className="fixed inset-0 z-50 bg-navy/40 lg:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}><aside className="flex h-full w-[min(86vw,320px)] flex-col bg-navy p-5 shadow-2xl"><div className="mb-7 flex items-center justify-between"><span className="font-display text-xl font-extrabold lowercase text-white">klik & lær.</span><button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full bg-white/10 text-white" aria-label="Luk menu"><X /></button></div><nav className="flex flex-col gap-1" aria-label="Mobil administration">{nav}</nav><button type="button" onClick={() => void logOut()} className="mt-auto flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white/75 hover:bg-white/10"><LogOut className="size-5" />Log ud</button></aside></div>}
  </div>
}
