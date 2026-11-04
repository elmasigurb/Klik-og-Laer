import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useContent } from '../../features/content/ContentContext'
import { appwriteConfig } from '../../lib/appwrite'
import { StudentClassSelector } from '../catalog/StudentClassSelector'
import { StudentClassProvider } from '../../features/student/StudentClassContext'
import { PublicScrollManager } from '../navigation/PublicScrollManager'

export function AppLayout() {
  return <StudentClassProvider><StudentAppLayout /></StudentClassProvider>
}

function StudentAppLayout() {
  const [open, setOpen] = useState(false)
  const { content } = useContent()
  const copy = content.navigation
  const navItems = [
    { to: '/', label: copy.homeLabel, end: true },
    { to: '/exercises', label: copy.exercisesLabel },
  ]
  const navClass = ({ isActive }: { isActive: boolean }) => `inline-flex min-h-11 items-center rounded-full px-4 py-2 text-base font-semibold transition-colors ${isActive ? 'bg-forest-900 text-white' : 'text-ink hover:bg-white/70'}`

  return (
    <div className="student-app min-h-screen bg-cream-100">
      <PublicScrollManager />
      <header className="relative z-40 border-b border-forest-900/8 bg-cream-100">
        <div className="page-shell flex h-20 items-center justify-between gap-4">
          <NavLink to="/" className="group flex items-center gap-3" aria-label={copy.logoAriaLabel}>
            <span className="grid size-10 place-items-center rounded-[14px] bg-coral text-sm font-black text-navy transition-transform group-hover:-rotate-3">k&l</span>
            <span className="font-display text-xl font-extrabold lowercase tracking-[-0.045em] text-navy">klik & lær<span className="text-coral">.</span></span>
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex" aria-label={copy.primaryAriaLabel}>
            {navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>{item.label}</NavLink>)}
            {appwriteConfig.features.publicClassNavigation && <StudentClassSelector />}
          </nav>
          <button className="grid size-11 place-items-center rounded-full bg-white md:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? copy.closeMenuLabel : copy.openMenuLabel}>{open ? <X /> : <Menu />}</button>
        </div>
        {open && (
          <nav id="mobile-menu" className="page-shell flex flex-col gap-2 border-t border-forest-900/8 py-4 md:hidden" aria-label={copy.mobileAriaLabel}>
            {navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)} className={navClass}>{item.label}</NavLink>)}
            {appwriteConfig.features.publicClassNavigation && <StudentClassSelector mobile onSelect={() => setOpen(false)} />}
          </nav>
        )}
      </header>
      <main><Outlet /></main>
      <footer className="mt-24 border-t border-forest-900/10 py-10">
        <div className="page-shell flex flex-col justify-between gap-4 text-sm text-muted sm:flex-row"><p><strong className="font-display lowercase text-navy">klik & lær.</strong> · {content.footer.tagline}</p><p>{content.footer.publicNote}</p></div>
      </footer>
    </div>
  )
}
