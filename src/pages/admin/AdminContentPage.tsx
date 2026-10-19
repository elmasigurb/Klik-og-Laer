import { Clock3, Eye, FileText, History, RotateCcw, Save, Send } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { formatDate } from '../../features/admin/format'
import { useContent } from '../../features/content/ContentContext'
import { contentPageDefinitions, type ContentPageId, type SiteContent } from '../../features/content/contentSchema'

function clone(content: SiteContent): SiteContent { return JSON.parse(JSON.stringify(content)) as SiteContent }

export function AdminContentPage() {
  const { content, draft, history, repositoryMode, loading, error, saveDraft, publish, discardDraft, restore } = useContent()
  const [selectedPage, setSelectedPage] = useState<ContentPageId>('homepage')
  const [working, setWorking] = useState<SiteContent>(() => clone(draft ?? content))
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const definition = contentPageDefinitions.find((page) => page.id === selectedPage) ?? contentPageDefinitions[0]
  const hasUnsavedChanges = useMemo(() => JSON.stringify(working) !== JSON.stringify(draft ?? content), [working, draft, content])
  const hasDraft = Boolean(draft)

  useEffect(() => { setWorking(clone(draft ?? content)) }, [content, draft])

  function update(key: string, value: string) {
    setWorking((current) => ({ ...current, [selectedPage]: { ...current[selectedPage], [key]: value } }) as SiteContent)
    setMessage('')
  }
  async function run(action: () => Promise<void>, success: string) {
    setBusy(true); setMessage('')
    try { await action(); setMessage(success) } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Handlingen kunne ikke gennemføres.') } finally { setBusy(false) }
  }
  function save() { void run(() => saveDraft(clone(working)), `Udkastet er gemt i ${repositoryMode === 'appwrite' ? 'Appwrite' : 'den lokale demo'} og er ikke synligt for eleverne.`) }
  function publishChanges() { void run(() => publish(clone(working)), 'Indholdet er udgivet på elevsiderne.') }
  function discard() {
    if (!window.confirm('Kassér alle ikke-udgivne ændringer?')) return
    void run(discardDraft, 'Udkastet er kasseret.')
  }
  function restoreVersion(version: (typeof history)[number]) {
    if (!window.confirm(`Gendan versionen fra ${formatDate(version.publishedAt)}? Den bliver straks udgivet.`)) return
    void run(() => restore(version), 'Den valgte version er gendannet og udgivet.')
  }

  return <>
    <AdminPageHeader eyebrow="Website" title="Websiteindhold" description="Redigér tekster uden at ændre kildekoden. Udkast påvirker ikke elevsiderne, før du vælger Udgiv." />
    {loading && <div role="status" className="mb-5 rounded-2xl bg-periwinkle/30 p-4 text-sm font-bold text-navy">Henter websiteindhold…</div>}
    {error && <div role="alert" className="mb-5 rounded-2xl bg-coral/35 p-4 text-sm font-bold text-navy">Appwrite kunne ikke hentes. Den lokale kopi vises. {error}</div>}
    {message && <div role="status" className="mb-5 rounded-2xl bg-lime/55 p-4 text-sm font-bold text-navy">{message}</div>}
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-navy/8 bg-white p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${hasDraft ? 'bg-coral/45 text-navy' : 'bg-lime text-navy'}`}>{hasDraft ? 'Udkast gemt' : 'Alt udgivet'}</span><span className="text-xs font-bold text-muted">{repositoryMode === 'appwrite' ? 'Appwrite' : 'Lokal demo'}</span>{hasUnsavedChanges && <span className="text-xs font-bold text-danger">Ikke-gemte ændringer</span>}<div className="ml-auto flex flex-wrap gap-2"><button type="button" disabled={busy || (!hasDraft && !hasUnsavedChanges)} onClick={discard} className="rounded-full px-4 py-2 text-sm font-bold text-muted hover:bg-ivory disabled:opacity-40">Kassér udkast</button><button type="button" disabled={busy} onClick={save} className="inline-flex items-center gap-2 rounded-full border border-navy/15 px-4 py-2 text-sm font-bold text-navy disabled:opacity-40"><Save className="size-4" />Gem udkast</button><button type="button" disabled={busy} onClick={publishChanges} className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><Send className="size-4" />Udgiv ændringer</button></div></div>

    <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_minmax(340px,.75fr)]">
      <nav aria-label="Indholdssider" className="h-fit rounded-[24px] border border-navy/8 bg-white p-2 xl:sticky xl:top-26">{contentPageDefinitions.map((page) => <button type="button" key={page.id} onClick={() => setSelectedPage(page.id)} className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition-colors ${page.id === selectedPage ? 'bg-periwinkle text-navy' : 'text-muted hover:bg-ivory hover:text-navy'}`}>{page.label}</button>)}</nav>
      <section className="rounded-[28px] border border-navy/8 bg-white p-5 sm:p-7"><div className="mb-6"><p className="text-xs font-black uppercase tracking-[.14em] text-muted">{definition.label}</p><h2 className="font-display mt-1 text-2xl font-bold text-navy">Redigér tekster</h2><p className="mt-2 text-sm text-muted">{definition.description}</p></div><div className="space-y-5">{definition.fields.map((field) => <label key={field.key}><span className="admin-label">{field.label}</span>{field.multiline ? <textarea className="admin-input min-h-24 resize-y" value={working[selectedPage][field.key as keyof typeof working[typeof selectedPage]]} onChange={(event) => update(field.key, event.target.value)} /> : <input className="admin-input" value={working[selectedPage][field.key as keyof typeof working[typeof selectedPage]]} onChange={(event) => update(field.key, event.target.value)} />}{field.help && <span className="mt-1 block text-xs text-muted">{field.help}</span>}</label>)}</div></section>
      <aside className="space-y-6 xl:sticky xl:top-26 xl:h-fit"><section className="overflow-hidden rounded-[28px] border border-navy/8 bg-white"><div className="flex items-center gap-2 border-b border-navy/8 px-5 py-4"><Eye className="size-4 text-navy" /><h2 className="font-display font-bold text-navy">Forhåndsvisning af udkast</h2></div><ContentPreview page={selectedPage} content={working} /></section><section className="rounded-[28px] border border-navy/8 bg-white p-5"><div className="mb-4 flex items-center gap-2"><History className="size-4 text-navy" /><h2 className="font-display font-bold text-navy">Versionshistorik</h2></div><div className="space-y-2">{history.map((version, index) => <div key={version.id} className="flex items-center gap-3 rounded-2xl bg-ivory p-3"><Clock3 className="size-4 shrink-0 text-muted" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-navy">{version.label}</p><p className="text-xs text-muted">{formatDate(version.publishedAt)}{index === 0 ? ' · seneste' : ''}</p></div><button type="button" onClick={() => restoreVersion(version)} className="grid size-9 place-items-center rounded-xl text-navy hover:bg-periwinkle/40" aria-label={`Gendan ${version.label}`} title="Gendan og udgiv"><RotateCcw className="size-4" /></button></div>)}</div></section></aside>
    </div>
  </>
}

function ContentPreview({ page, content }: { page: ContentPageId; content: SiteContent }) {
  return <div className="bg-ivory p-5"><div className="mb-5 flex items-center justify-between border-b border-navy/10 pb-3"><span className="font-display text-sm font-extrabold lowercase text-navy">klik & lær.</span><span className="rounded-full bg-periwinkle/50 px-2 py-1 text-[10px] font-bold text-navy">{contentPageDefinitions.find((item) => item.id === page)?.label}</span></div><div className="overflow-hidden rounded-2xl bg-white shadow-sm"><PagePreview page={page} content={content} /></div><p className="mt-4 text-xs leading-5 text-muted"><FileText className="mr-1 inline size-3.5" />Forhåndsvisningen bruger udkastet. Elevsiden bruger fortsat den udgivne version.</p></div>
}

function PagePreview({ page, content }: { page: ContentPageId; content: SiteContent }) {
  if (page === 'homepage') { const copy = content.homepage; return <div className="bg-navy p-6 text-white"><p className="text-[10px] font-black uppercase tracking-[.14em] text-periwinkle">{copy.heroEyebrow}</p><h3 className="font-display mt-2 text-3xl font-extrabold leading-none">{copy.heroTitleFirst}<br /><span className="text-coral">{copy.heroTitleSecond}</span></h3><p className="mt-4 text-xs leading-5 text-white/65">{copy.heroDescription}</p><span className="mt-4 inline-flex rounded-full bg-lime px-3 py-2 text-[10px] font-bold text-navy">{copy.primaryButton}</span></div> }
  if (page === 'navigation') { const copy = content.navigation; return <div><div className="flex items-center justify-between border-b border-navy/8 p-4"><span className="font-display text-sm font-extrabold lowercase text-navy">klik & lær.</span><div className="flex gap-3 text-[10px] font-bold text-navy"><span>{copy.homeLabel}</span><span>{copy.exercisesLabel}</span></div></div><div className="p-6"><p className="text-[10px] font-black uppercase text-navy/60">Offentlig navigation</p><h3 className="font-display mt-2 text-2xl font-bold text-navy">{copy.notFoundHeading}</h3><p className="mt-2 text-xs leading-5 text-muted">{copy.notFoundBody}</p></div></div> }
  if (page === 'exercises') { const copy = content.exercises; return <div className="p-6"><p className="text-[10px] font-black uppercase tracking-[.14em] text-navy/60">{copy.libraryEyebrow}</p><h3 className="font-display mt-2 text-2xl font-bold text-navy">{copy.libraryHeading}</h3><p className="mt-2 text-xs leading-5 text-muted">{copy.libraryDescription}</p><div className="mt-4 rounded-xl border border-navy/10 bg-ivory p-3 text-[10px] text-muted">{copy.searchPlaceholder}</div><span className="mt-4 inline-flex rounded-full bg-navy px-3 py-2 text-[10px] font-bold text-white">{copy.startButton}</span></div> }
  if (page === 'categories') { const copy = content.categories; return <div className="p-6"><div className="rounded-2xl bg-periwinkle p-5"><p className="text-[10px] font-black uppercase text-navy/60">{copy.breadcrumbLabel}</p><h3 className="font-display mt-2 text-2xl font-bold text-navy">{copy.exercisesHeading}</h3><p className="mt-2 text-xs text-navy/70">0 {copy.exercisePlural}</p></div><h4 className="font-display mt-5 text-lg font-bold text-navy">{copy.emptyHeading}</h4><p className="mt-2 text-xs leading-5 text-muted">{copy.emptyBody}</p></div> }
  const copy = content.footer
  return <div className="bg-navy p-6 text-xs text-white/70"><strong className="font-display lowercase text-white">klik & lær.</strong> · {copy.tagline}<p className="mt-3">{copy.publicNote}</p></div>
}
