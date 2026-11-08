import { AlertTriangle, LoaderCircle, LogOut, UserRound, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { useStudentClass } from '../student/StudentClassContext'
import { useStudentProgress } from './StudentProgressContext'

export function StudentRegistrationGate() {
  const { enabled, status, identity, error, registrationPromptOpen, register, continueWithoutRegistration, retryValidation } = useStudentProgress()
  const { activeClasses } = useStudentClass()
  const [displayName, setDisplayName] = useState('')
  const [classId, setClassId] = useState('')
  const [formError, setFormError] = useState('')

  if (!enabled || status === 'ready' || (!identity && !registrationPromptOpen)) return null

  async function submit(event: FormEvent) {
    event.preventDefault()
    setFormError('')
    try { await register(displayName, classId) }
    catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Elevprofilen kunne ikke oprettes.') }
  }

  return <div className="fixed inset-0 z-[70] grid place-items-center overflow-auto bg-navy/70 p-4" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="student-registration-title" className="relative w-full max-w-xl rounded-[30px] bg-ivory p-6 shadow-2xl sm:p-9">
      {!identity && <button type="button" onClick={continueWithoutRegistration} aria-label="Fortsæt uden at gemme" className="absolute right-4 top-4 grid size-11 place-items-center rounded-full text-navy transition-colors hover:bg-navy/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy sm:right-6 sm:top-6"><X aria-hidden="true" className="size-6" /></button>}
      {status === 'loading' ? <div className="grid min-h-64 place-items-center text-center"><div><LoaderCircle className="mx-auto size-9 animate-spin text-navy" /><h1 id="student-registration-title" className="display mt-5 text-3xl font-bold text-navy">Finder din elevprofil</h1><p className="mt-2 text-muted">Et øjeblik…</p></div></div> : status === 'error' && identity ? <div className="text-center"><AlertTriangle className="mx-auto size-10 text-danger" /><h1 id="student-registration-title" className="display mt-4 text-3xl font-bold text-navy">Forbindelsen kunne ikke kontrolleres</h1><p className="mt-3 leading-7 text-muted">Din gemte elevprofil er bevaret på denne iPad. Prøv igen, når forbindelsen virker.</p><p role="alert" className="mt-3 text-sm font-bold text-danger">{error}</p><button type="button" onClick={() => void retryValidation()} className="mt-6 min-h-12 rounded-full bg-navy px-7 py-3 font-bold text-white">Prøv igen</button></div> : <form onSubmit={(event) => void submit(event)}>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-periwinkle/60 text-navy"><UserRound className="size-7" /></span>
        <h1 id="student-registration-title" className="display mt-5 text-center text-3xl font-bold text-navy sm:text-4xl">Hvem arbejder på denne iPad?</h1>
        <p className="mx-auto mt-3 max-w-md text-center leading-7 text-muted">Du kan lave alle øvelser uden at skrive dit navn. Hvis du vil gemme dine fremskridt, kan du oprette en profil.</p>
        <label className="mt-7 block"><span className="mb-2 block text-sm font-bold text-navy">Dit navn</span><input autoFocus required autoComplete="name" maxLength={128} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="min-h-12 w-full rounded-2xl border border-navy/15 bg-white px-4 text-base outline-none focus:border-navy" placeholder="Fx Anna" /></label>
        <label className="mt-4 block"><span className="mb-2 block text-sm font-bold text-navy">Din klasse</span><select required value={classId} onChange={(event) => setClassId(event.target.value)} className="min-h-12 w-full rounded-2xl border border-navy/15 bg-white px-4 text-base font-bold outline-none focus:border-navy"><option value="">Vælg klasse</option>{activeClasses.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}</select></label>
        {!activeClasses.length && <p role="status" className="mt-3 rounded-2xl bg-coral/20 p-4 text-sm text-navy">Der er ingen aktive klasser endnu. Bed læreren om at oprette og aktivere en klasse.</p>}
        {(formError || error) && <p role="alert" className="mt-4 text-sm font-bold text-danger">{formError || error}</p>}
        <button disabled={!activeClasses.length} type="submit" className="mt-6 min-h-12 w-full rounded-full bg-navy px-6 py-3 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Gem dine fremskridt</button>
        <button type="button" onClick={continueWithoutRegistration} className="mt-3 min-h-12 w-full rounded-full px-6 py-3 text-base font-bold text-navy hover:bg-navy/5">Fortsæt uden at gemme</button>
        <p className="mt-3 text-center text-xs leading-5 text-muted">Kun gennemførelser efter oprettelsen bliver gemt. Øvelser, du allerede har lavet uden en profil, bliver ikke tilføjet bagefter.</p>
        <p className="mt-4 text-center text-xs leading-5 text-muted">Navn og klasse giver ikke adgang til en eksisterende profil. Hvis browserdata slettes, oprettes en ny profil.</p>
      </form>}
    </section>
  </div>
}

export function StudentIdentityControl({ mobile = false }: { mobile?: boolean }) {
  const { enabled, status, identity, openRegistration, switchStudent } = useStudentProgress()
  const { activeClasses } = useStudentClass()
  const [confirming, setConfirming] = useState(false)
  if (!enabled) return null
  if (status === 'guest' && !identity) return <button type="button" onClick={openRegistration} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-periwinkle/35 px-4 py-2 text-sm font-bold text-navy hover:bg-periwinkle/55 ${mobile ? 'w-full' : ''}`}><UserRound className="size-4" />Gem dine fremskridt</button>
  if (status !== 'ready' || !identity) return null
  const className = activeClasses.find((item) => item.id === identity.classId)?.name ?? 'Klasse'
  return <>
    <button type="button" onClick={() => setConfirming(true)} className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-periwinkle/35 px-4 py-2 text-left text-sm font-bold text-navy hover:bg-periwinkle/55 ${mobile ? 'w-full' : ''}`}><UserRound className="size-4 shrink-0" /><span className="min-w-0"><span className="block truncate">{identity.displayName}</span><span className="block text-xs font-medium text-muted">{className} · Skift elev</span></span></button>
    {confirming && <Modal title="Skift elev?" onClose={() => setConfirming(false)}><div className="flex gap-3 rounded-2xl bg-coral/20 p-4 text-sm leading-6 text-navy"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><p>Denne iPad glemmer den aktive elev. Elevens gemte gennemførelser bliver i Appwrite, men kan ikke gendannes med navn og klasse alene.</p></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setConfirming(false)} className="min-h-11 rounded-full px-5 py-2 font-bold text-navy">Annuller</button><button type="button" onClick={() => { switchStudent(); setConfirming(false) }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-danger px-5 py-2 font-bold text-white"><LogOut className="size-4" />Skift elev</button></div></Modal>}
  </>
}
