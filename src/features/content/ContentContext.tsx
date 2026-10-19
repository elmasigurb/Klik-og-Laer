import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { appwriteContentRepository } from './appwriteContentRepository'
import { localContentRepository } from './contentRepository'
import type { ContentVersion, SiteContent } from './contentSchema'

type RepositoryMode = 'local' | 'appwrite'

interface ContentValue {
  content: SiteContent
  draft: SiteContent | null
  history: ContentVersion[]
  repositoryMode: RepositoryMode
  loading: boolean
  error: string
  saveDraft(content: SiteContent): Promise<void>
  publish(content: SiteContent): Promise<void>
  discardDraft(): Promise<void>
  restore(version: ContentVersion): Promise<void>
  importLocalContent(): Promise<void>
}

const ContentContext = createContext<ContentValue | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const { user, status: authStatus, isTeacher } = useAuth()
  const [content, setContent] = useState(() => localContentRepository.getPublished())
  const [draft, setDraft] = useState(() => localContentRepository.getDraft())
  const [history, setHistory] = useState(() => localContentRepository.getHistory())
  const [repositoryMode, setRepositoryMode] = useState<RepositoryMode>('local')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (authStatus === 'loading') return
    setLoading(true)
    setError('')
    try {
      const remote = await appwriteContentRepository.getState(isTeacher)
      if (remote.hasRemoteContent) {
        setContent(remote.published ?? localContentRepository.getPublished())
        setDraft(remote.draft)
        setHistory(remote.history.length ? remote.history : localContentRepository.getHistory())
        setRepositoryMode('appwrite')
      } else {
        setContent(localContentRepository.getPublished())
        setDraft(localContentRepository.getDraft())
        setHistory(localContentRepository.getHistory())
        setRepositoryMode('local')
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Websiteindholdet kunne ikke hentes fra Appwrite.')
      setRepositoryMode('local')
    } finally {
      setLoading(false)
    }
  }, [authStatus, isTeacher])

  useEffect(() => { void load() }, [load])

  const saveDraft = useCallback(async (next: SiteContent) => {
    if (repositoryMode === 'appwrite') {
      if (!isTeacher || !user) throw new Error('Kun en godkendt lærer kan gemme websiteindhold.')
      await appwriteContentRepository.saveDraft(next, user.$id)
    } else localContentRepository.saveDraft(next)
    setDraft(next)
  }, [isTeacher, repositoryMode, user])

  const publish = useCallback(async (next: SiteContent, label = 'Udgivet indhold') => {
    if (repositoryMode === 'appwrite') {
      if (!isTeacher || !user) throw new Error('Kun en godkendt lærer kan udgive websiteindhold.')
      await appwriteContentRepository.publish(next, user.$id, label)
      const remote = await appwriteContentRepository.getState(true)
      setHistory(remote.history)
    } else setHistory(localContentRepository.publish(next, label))
    setContent(next)
    setDraft(null)
  }, [isTeacher, repositoryMode, user])

  const discardDraft = useCallback(async () => {
    if (repositoryMode === 'appwrite') {
      if (!isTeacher) throw new Error('Kun en godkendt lærer kan kassere websiteindhold.')
      await appwriteContentRepository.discardDraft()
    } else localContentRepository.discardDraft()
    setDraft(null)
  }, [isTeacher, repositoryMode])

  const restore = useCallback(async (version: ContentVersion) => {
    await publish(version.content, `Gendannet: ${version.label}`)
  }, [publish])

  const importLocalContent = useCallback(async () => {
    if (!isTeacher || !user) throw new Error('Kun en godkendt lærer kan importere websiteindhold.')
    const localPublished = localContentRepository.getPublished()
    const localDraft = localContentRepository.getDraft()
    const localHistory = localContentRepository.getHistory()
    await appwriteContentRepository.importLocal(localPublished, localDraft, localHistory, user.$id)
    const remote = await appwriteContentRepository.getState(true)
    setContent(remote.published ?? localPublished)
    setDraft(remote.draft)
    setHistory(remote.history)
    setRepositoryMode('appwrite')
  }, [isTeacher, user])

  const value = useMemo<ContentValue>(() => ({
    content, draft, history, repositoryMode, loading, error,
    saveDraft, publish, discardDraft, restore, importLocalContent,
  }), [content, draft, history, repositoryMode, loading, error, saveDraft, publish, discardDraft, restore, importLocalContent])
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export function useContent() {
  const value = useContext(ContentContext)
  if (!value) throw new Error('useContent skal bruges inden i ContentProvider')
  return value
}
