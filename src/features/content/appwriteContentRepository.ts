import { ID, Query, type Models } from 'appwrite'
import { appwriteConfig, tablesDB } from '../../lib/appwrite'
import { executeContentManager, hasTrustedContentManager } from '../../lib/appwriteFunctions'
import { appwritePermissions, type AppwriteContentRow, type AppwriteContentVersionRow } from '../../lib/appwriteSchema'
import { mergeContent } from './contentRepository'
import type { ContentVersion, SiteContent } from './contentSchema'

type ContentDocument = Models.Row & AppwriteContentRow
type VersionDocument = Models.Row & AppwriteContentVersionRow

const databaseId = appwriteConfig.databaseId
const contentTableId = appwriteConfig.tables.content
const versionsTableId = appwriteConfig.tables.contentVersions
const pageId = 'site'

function parseContent(value: string): SiteContent {
  try { return mergeContent(JSON.parse(value) as Partial<SiteContent>) } catch { return mergeContent() }
}

function toVersion(row: VersionDocument): ContentVersion {
  return { id: row.$id, publishedAt: row.publishedAt, label: row.label, content: parseContent(row.contentJson) }
}

async function listRows() {
  return tablesDB.listRows<ContentDocument>({
    databaseId,
    tableId: contentTableId,
    queries: [Query.equal('pageId', pageId), Query.limit(10)],
    ttl: 0,
  })
}

export const appwriteContentRepository = {
  async getState(includePrivate: boolean) {
    const rows = (await listRows()).rows
    const published = rows.find((row) => row.isPublished)
    const draft = rows.find((row) => !row.isPublished)
    let history: ContentVersion[] = []
    if (includePrivate) {
      const versions = await tablesDB.listRows<VersionDocument>({
        databaseId,
        tableId: versionsTableId,
        queries: [Query.equal('pageId', pageId), Query.orderDesc('version'), Query.limit(12)],
        ttl: 0,
      })
      history = versions.rows.map(toVersion)
    }
    return {
      hasRemoteContent: rows.length > 0,
      published: published ? parseContent(published.contentJson) : null,
      draft: draft ? parseContent(draft.contentJson) : null,
      history,
      publishedVersion: published?.version ?? 0,
    }
  },

  async saveDraft(content: SiteContent, userId: string) {
    const rows = (await listRows()).rows
    const existing = rows.find((row) => !row.isPublished)
    const published = rows.find((row) => row.isPublished)
    const data: AppwriteContentRow = {
      pageId,
      contentJson: JSON.stringify(content),
      isPublished: false,
      version: published?.version ?? 0,
      publishedBy: userId,
    }
    if (existing) {
      await tablesDB.updateRow({ databaseId, tableId: contentTableId, rowId: existing.$id, data, permissions: appwritePermissions.teacherDraftRow() })
    } else {
      await tablesDB.createRow({ databaseId, tableId: contentTableId, rowId: ID.custom('site-draft'), data, permissions: appwritePermissions.teacherDraftRow() })
    }
  },

  async discardDraft() {
    const draft = (await listRows()).rows.find((row) => !row.isPublished)
    if (draft) await tablesDB.deleteRow({ databaseId, tableId: contentTableId, rowId: draft.$id })
  },

  async publish(content: SiteContent, userId: string, label = 'Udgivet indhold') {
    void userId
    if (!hasTrustedContentManager()) throw new Error('Den betroede Appwrite Function er ikke konfigureret. Udgivelse og gendannelse er blokeret.')
    return executeContentManager<{ publishedId: string; versionId: string; version: number; publishedAt: string }>({ action: 'content.publish', content, label })
  },

  async importLocal(published: SiteContent, draft: SiteContent | null, history: ContentVersion[], userId: string) {
    const existing = (await listRows()).rows
    if (existing.length) throw new Error('Appwrite indeholder allerede websiteindhold. Importen blev ikke startet.')
    await this.publish(published, userId, history[0]?.label ?? 'Importeret lokalt indhold')
    if (draft) await this.saveDraft(draft, userId)
  },
}
