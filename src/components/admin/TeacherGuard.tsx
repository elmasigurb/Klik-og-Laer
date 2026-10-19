import type { ReactNode } from 'react'
import { LoaderCircle, LockKeyhole, LogOut } from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'

export function TeacherGuard({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { status, isTeacher, teacherAuthorizationConfigured, signOut } = useAuth()

  if (status === 'loading') {
    return <main className="grid min-h-screen place-items-center bg-ivory text-navy"><div className="flex items-center gap-3 font-bold"><LoaderCircle className="size-5 animate-spin" />Kontrollerer adgang…</div></main>
  }

  if (status === 'guest') {
    return <Navigate to="/admin/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  if (!isTeacher) {
    return <main className="grid min-h-screen place-items-center bg-ivory p-5"><section className="w-full max-w-lg rounded-[34px] border border-navy/10 bg-white p-8 text-center shadow-soft sm:p-12"><span className="mx-auto grid size-16 place-items-center rounded-3xl bg-coral/45 text-navy"><LockKeyhole /></span><p className="mt-7 text-xs font-black uppercase tracking-[.16em] text-navy/65">Læreradgang kræves</p><h1 className="font-display mt-2 text-4xl font-extrabold tracking-[-.04em] text-navy">Denne konto er ikke lærer</h1><p className="mt-4 leading-7 text-muted">{teacherAuthorizationConfigured ? 'Kontoen er logget ind, men er ikke medlem af det godkendte lærerteam i Appwrite.' : 'Lærerteamets ID mangler i miljøkonfigurationen. Opret teamet i Appwrite Console og tilføj ID’et.'}</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/" className="rounded-full border border-navy/15 px-6 py-3 text-sm font-bold text-navy">Til forsiden</Link><button type="button" onClick={() => void signOut()} className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white"><LogOut className="size-4" />Log ud</button></div></section></main>
  }

  return children
}
