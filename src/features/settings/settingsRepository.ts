import type { PlatformSettings } from '../../types'

const KEY = 'klik-og-laer:settings:v1'
export const defaultSettings: PlatformSettings = { siteName: 'Klik & Lær', description: 'Interaktive danskøvelser i et roligt og legende læringsrum.', defaultLanguage: 'da', compactTables: false }

export const settingsRepository = {
  get(): PlatformSettings { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as PlatformSettings : defaultSettings } catch { return defaultSettings } },
  save(settings: PlatformSettings) { localStorage.setItem(KEY, JSON.stringify(settings)) },
}
