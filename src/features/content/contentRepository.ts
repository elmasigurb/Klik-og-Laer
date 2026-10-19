import { defaultContent, type ContentVersion, type SiteContent } from './contentSchema'

const PUBLISHED_KEY = 'klik-og-laer:content:published:v1'
const DRAFT_KEY = 'klik-og-laer:content:draft:v1'
const HISTORY_KEY = 'klik-og-laer:content:history:v1'

function clone(content: SiteContent): SiteContent { return JSON.parse(JSON.stringify(content)) as SiteContent }
export function mergeContent(value?: Partial<SiteContent>): SiteContent {
  const merged = clone(defaultContent) as unknown as Record<string, Record<string, string>>
  if (!value) return merged as unknown as SiteContent
  const incoming = value as unknown as Record<string, Record<string, string> | undefined>
  for (const page of Object.keys(merged)) merged[page] = { ...merged[page], ...(incoming[page] ?? {}) }
  return merged as unknown as SiteContent
}
function parse<T>(key: string): T | undefined { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : undefined } catch { return undefined } }
function write(key: string, value: unknown) { localStorage.setItem(key, JSON.stringify(value)) }

const initialVersion = (): ContentVersion => ({ id: 'initial', publishedAt: '2026-10-19T00:00:00.000Z', label: 'Oprindeligt indhold', content: clone(defaultContent) })

export interface ContentRepository {
  getPublished(): SiteContent
  getDraft(): SiteContent | null
  getHistory(): ContentVersion[]
  saveDraft(content: SiteContent): void
  discardDraft(): void
  publish(content: SiteContent, label?: string): ContentVersion[]
  restore(version: ContentVersion): ContentVersion[]
}

export const localContentRepository: ContentRepository = {
  getPublished: () => mergeContent(parse<Partial<SiteContent>>(PUBLISHED_KEY)),
  getDraft: () => { const value = parse<Partial<SiteContent>>(DRAFT_KEY); return value ? mergeContent(value) : null },
  getHistory: () => parse<ContentVersion[]>(HISTORY_KEY) ?? [initialVersion()],
  saveDraft(content) { write(DRAFT_KEY, content) },
  discardDraft() { localStorage.removeItem(DRAFT_KEY) },
  publish(content, label = 'Udgivet indhold') {
    const snapshot: ContentVersion = { id: crypto.randomUUID(), publishedAt: new Date().toISOString(), label, content: clone(content) }
    const history = [snapshot, ...this.getHistory()].slice(0, 12)
    write(PUBLISHED_KEY, content); write(HISTORY_KEY, history); localStorage.removeItem(DRAFT_KEY)
    return history
  },
  restore(version) { return this.publish(version.content, `Gendannet: ${version.label}`) },
}
