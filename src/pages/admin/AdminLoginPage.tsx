import { AlertCircle, ArrowLeft, Eye, EyeOff, LoaderCircle, LockKeyhole, LogOut } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { readableAuthError, useAuth } from '../../features/auth/AuthContext'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { status, user, isTeacher, teacherAuthorizationConfigured, signIn, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (status === 'authenticated' && isTeacher) return <Navigate to="/admin" replace />

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn(email.trim(), password)
      if (!result.isTeacher) {
        await signOut()
        setError('Kontoen er gyldig, men den er ikke medlem af det godkendte lærerteam.')
        return
      }
      const destination = (location.state as { from?: string } | null)?.from ?? '/admin'
      navigate(destination, { replace: true })
    } catch (caught) {
      setError(readableAuthError(caught))
    } finally {
      setLoading(false)
    }
  }

  return <main className="grid min-h-screen bg-ivory lg:grid-cols-[1fr_1fr]">
    <section className="hidden flex-col justify-between bg-navy p-12 text-white lg:flex"><Link to="/" className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-coral text-sm font-black text-navy">k&l</span><span className="font-display text-2xl font-extrabold lowercase">klik & lær<span className="text-coral">.</span></span></Link><div className="max-w-lg"><p className="text-xs font-black uppercase tracking-[.18em] text-periwinkle">Læreradministration</p><h1 className="font-display mt-4 text-6xl font-extrabold leading-[1.02] tracking-[-.05em]">Gør læring let at finde.</h1><p className="mt-6 max-w-md text-lg leading-8 text-white/65">Saml øvelser, skab overblik og giv eleverne et roligt sted at øve sig.</p></div><p className="text-sm text-white/45">Klik & Lær · Copenhagen Studio</p></section>
    <section className="grid place-items-center p-5 sm:p-10"><div className="w-full max-w-md"><Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-navy"><ArrowLeft className="size-4" />Tilbage til hjemmesiden</Link><div className="mb-8"><span className="grid size-14 place-items-center rounded-2xl bg-periwinkle text-navy lg:hidden"><LockKeyhole /></span><p className="mt-6 text-xs font-black uppercase tracking-[.16em] text-navy/65">Appwrite-konto</p><h1 className="font-display mt-2 text-4xl font-extrabold tracking-[-.04em] text-navy">Log ind som lærer</h1><p className="mt-3 text-sm leading-6 text-muted">Kun eksisterende Appwrite-konti i det godkendte lærerteam kan åbne administrationen.</p></div>
      {!teacherAuthorizationConfigured && <div role="alert" className="mb-6 rounded-2xl bg-coral/25 p-4 text-sm leading-6 text-navy"><strong>Konfiguration mangler:</strong> Tilføj <code>VITE_APPWRITE_TEACHERS_TEAM_ID</code> efter at lærerteamet er oprettet i Appwrite Console.</div>}
      {status === 'authenticated' && user && !isTeacher ? <div className="rounded-2xl border border-coral bg-coral/20 p-5"><p className="font-bold text-navy">Logget ind som {user.name || user.email}</p><p className="mt-2 text-sm leading-6 text-muted">Denne konto har ikke læreradgang. Log ud, hvis du vil bruge en anden konto.</p><button type="button" onClick={() => void signOut()} className="mt-4 inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white"><LogOut className="size-4" />Log ud</button></div> : <>{error && <div role="alert" className="mb-4 flex gap-2 text-sm font-bold text-danger"><AlertCircle className="size-5 shrink-0" />{error}</div>}<form onSubmit={submit} className="space-y-5"><label><span className="admin-label">E-mail</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="admin-input" placeholder="laerer@skole.dk" /></label><label><span className="admin-label">Adgangskode</span><span className="relative block"><input required minLength={8} type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="admin-input pr-12" /><button type="button" onClick={() => setVisible((value) => !value)} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-muted hover:bg-periwinkle/25" aria-label={visible ? 'Skjul adgangskode' : 'Vis adgangskode'}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></label><button disabled={loading || status === 'loading' || !teacherAuthorizationConfigured} className="flex w-full items-center justify-center gap-2 rounded-full bg-navy px-6 py-3.5 text-sm font-bold text-white disabled:opacity-60">{loading && <LoaderCircle className="size-4 animate-spin" />}{loading ? 'Kontrollerer adgang…' : 'Log ind som lærer'}</button></form></>}</div></section>
  </main>
}
