import { Database, Save, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { useAuth } from '../../features/auth/AuthContext'
import { useCatalog } from '../../features/catalog/CatalogContext'
import { useContent } from '../../features/content/ContentContext'
import { hasTrustedContentManager } from '../../lib/appwriteFunctions'
import { settingsRepository } from '../../features/settings/settingsRepository'

export function AdminSettingsPage() {
  const [settings, setSettings] = useState(() => settingsRepository.get())
  const [saved, setSaved] = useState(false)
  const { user } = useAuth()
  const catalog = useCatalog()
  const websiteContent = useContent()
  const [migrationMessage, setMigrationMessage] = useState('')
  const [migrating, setMigrating] = useState<'catalog' | 'content' | null>(null)
  const trustedFunctionConfigured = hasTrustedContentManager()
  const initials = (user?.name || user?.email || 'Lærer').split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  function save() { try { settingsRepository.save(settings); setSaved(true); window.setTimeout(() => setSaved(false), 2500) } catch { setSaved(false) } }
  async function migrate(kind: 'catalog' | 'content') {
    const label = kind === 'catalog' ? 'kategorier, øvelser og HTML-filer' : 'websiteindhold og udkast'
    if (!window.confirm(`Importér lokale ${label} til Appwrite? Lokale data bevares som sikkerhedskopi.`)) return
    setMigrating(kind); setMigrationMessage('')
    try {
      if (kind === 'catalog') await catalog.importLocalData()
      else await websiteContent.importLocalContent()
      setMigrationMessage(`Lokale ${label} er kopieret til Appwrite. Den lokale sikkerhedskopi er bevaret.`)
    } catch (reason) {
      setMigrationMessage(reason instanceof Error ? reason.message : 'Importen kunne ikke gennemføres.')
    } finally { setMigrating(null) }
  }
  return <>
    <AdminPageHeader eyebrow="Platform" title="Indstillinger" description="Enkle lokale præferencer for denne Klik & Lær-demo. Følsomme kontoindstillinger kommer senere." />
    {saved && <div role="status" className="mb-5 rounded-2xl bg-lime/60 p-4 text-sm font-bold text-navy">Indstillingerne er gemt på denne enhed.</div>}
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]"><form onSubmit={(event) => { event.preventDefault(); save() }} className="space-y-5 rounded-[28px] border border-navy/8 bg-white p-5 sm:p-7"><label><span className="admin-label">Website-navn</span><input className="admin-input" value={settings.siteName} onChange={(event) => setSettings({ ...settings, siteName: event.target.value })} /></label><label><span className="admin-label">Beskrivelse</span><textarea className="admin-input min-h-28" value={settings.description} onChange={(event) => setSettings({ ...settings, description: event.target.value })} /></label><label><span className="admin-label">Standardsprog</span><select className="admin-input" value={settings.defaultLanguage} onChange={(event) => setSettings({ ...settings, defaultLanguage: event.target.value })}><option value="da">Dansk</option><option value="en" disabled>Engelsk (kommer senere)</option></select></label><label className="flex items-start gap-3 rounded-2xl bg-ivory p-4"><input type="checkbox" className="mt-1 accent-navy" checked={settings.compactTables} onChange={(event) => setSettings({ ...settings, compactTables: event.target.checked })} /><span><strong className="block text-sm text-navy">Kompakte tabeller</strong><span className="mt-1 block text-xs text-muted">Gem visningspræferencen lokalt til senere brug.</span></span></label><button className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white"><Save className="size-4" />Gem indstillinger</button></form><aside className="h-fit rounded-[28px] bg-periwinkle/45 p-6"><span className="grid size-14 place-items-center rounded-full bg-white font-display font-black text-navy">{initials}</span><h2 className="font-display mt-5 text-xl font-bold text-navy">{user?.name || 'Lærerkonto'}</h2><p className="mt-1 break-all text-sm text-muted">{user?.email}</p><p className="mt-5 text-sm leading-6 text-navy/75">Identitet og læreradgang administreres i Appwrite. Teammedlemskab kan ikke ændres fra denne klient.</p></aside></div>
    <section className="mt-6 rounded-[28px] border border-navy/8 bg-white p-5 sm:p-7"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-lime"><Database className="size-5 text-navy" /></span><div><h2 className="font-display text-xl font-bold text-navy">Appwrite-data</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted">Import er bevidst manuel. Den starter kun, når den tilsvarende Appwrite-tabel er tom, og sletter aldrig din lokale kopi.</p></div></div><div className={`mt-5 rounded-2xl p-4 text-sm font-bold ${trustedFunctionConfigured ? 'bg-lime/55 text-navy' : 'bg-coral/30 text-danger'}`}>{trustedFunctionConfigured ? 'Den betroede Content Manager Function er konfigureret.' : 'Content Manager Function mangler. Udgivelse, arkivering, filudskiftning, permanent sletning og import til Appwrite er blokeret.'}</div>{migrationMessage && <div role="status" className="mt-5 rounded-2xl bg-periwinkle/30 p-4 text-sm font-bold text-navy">{migrationMessage}</div>}<div className="mt-5 grid gap-4 md:grid-cols-2"><MigrationCard title="Katalog og HTML" status={catalog.repositoryMode} detail={`${catalog.categories.length} kategorier · ${catalog.exercises.length} øvelser`} disabled={!trustedFunctionConfigured || catalog.repositoryMode === 'appwrite' || Boolean(migrating)} onClick={() => void migrate('catalog')} busy={migrating === 'catalog'} /><MigrationCard title="Websiteindhold" status={websiteContent.repositoryMode} detail={`${websiteContent.history.length} versioner`} disabled={!trustedFunctionConfigured || websiteContent.repositoryMode === 'appwrite' || Boolean(migrating)} onClick={() => void migrate('content')} busy={migrating === 'content'} /></div></section>
  </>
}

function MigrationCard({ title, status, detail, disabled, busy, onClick }: { title: string; status: 'local' | 'appwrite'; detail: string; disabled: boolean; busy: boolean; onClick: () => void }) {
  return <div className="rounded-2xl bg-ivory p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-display font-bold text-navy">{title}</h3><span className={`rounded-full px-3 py-1 text-xs font-bold ${status === 'appwrite' ? 'bg-lime' : 'bg-coral/40'} text-navy`}>{status === 'appwrite' ? 'Appwrite aktiv' : 'Lokal demo'}</span></div><p className="mt-2 text-sm text-muted">{detail}</p><button type="button" disabled={disabled} onClick={onClick} className="mt-4 inline-flex items-center gap-2 rounded-full border border-navy/15 px-4 py-2 text-sm font-bold text-navy disabled:cursor-not-allowed disabled:opacity-40"><UploadCloud className="size-4" />{busy ? 'Importerer…' : status === 'appwrite' ? 'Allerede forbundet' : 'Importér til Appwrite'}</button></div>
}
