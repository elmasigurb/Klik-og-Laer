import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Models } from 'appwrite'
import type { Category, Exercise, ExerciseStatus } from '../../types'
import { appwriteConfig, storage } from '../../lib/appwrite'
import { useAuth } from '../auth/AuthContext'
import { exerciseFileRepository } from '../exercises/exerciseFileRepository'
import { appwriteCatalogRepository } from './appwriteCatalogRepository'
import { localCatalogRepository, slugify } from './catalogRepository'

type CategoryDraft = Pick<Category, 'name' | 'description' | 'tone' | 'isPublished'> & Partial<Pick<Category, 'eyebrow' | 'icon' | 'displayOrder'>>
type ExerciseDraft = Omit<Exercise, 'createdAt' | 'updatedAt'> & Partial<Pick<Exercise, 'createdAt' | 'updatedAt'>>
type RepositoryMode = 'local' | 'appwrite'

interface CatalogValue {
  categories: Category[]
  exercises: Exercise[]
  repositoryMode: RepositoryMode
  loading: boolean
  error: string
  createCategory(draft: CategoryDraft): Promise<Category>
  updateCategory(id: string, changes: Partial<Category>): Promise<void>
  deleteCategory(id: string): Promise<boolean>
  moveCategory(id: string, direction: -1 | 1): Promise<void>
  createExercise(draft: ExerciseDraft, file?: File): Promise<Exercise>
  updateExercise(id: string, changes: Partial<Exercise>, file?: File): Promise<void>
  setExerciseStatus(id: string, status: ExerciseStatus): Promise<void>
  deleteExercise(id: string): Promise<void>
  importLocalData(): Promise<void>
}

const CatalogContext = createContext<CatalogValue | null>(null)
const localCategories = () => localCatalogRepository.getCategories().sort((a, b) => a.displayOrder - b.displayOrder)
const localExercises = () => localCatalogRepository.getExercises()

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, isTeacher } = useAuth()
  const [categories, setCategories] = useState(localCategories)
  const [exercises, setExercises] = useState(localExercises)
  const [repositoryMode, setRepositoryMode] = useState<RepositoryMode>('local')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (authStatus === 'loading') return
    setLoading(true)
    setError('')
    try {
      const remote = await appwriteCatalogRepository.getAll()
      if (remote.categories.length || remote.exercises.length) {
        setCategories(remote.categories.sort((a, b) => a.displayOrder - b.displayOrder))
        setExercises(remote.exercises)
        setRepositoryMode('appwrite')
      } else {
        setCategories(localCategories())
        setExercises(localExercises())
        setRepositoryMode('local')
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Appwrite-indholdet kunne ikke hentes.')
      setCategories(localCategories())
      setExercises(localExercises())
      setRepositoryMode('local')
    } finally {
      setLoading(false)
    }
  }, [authStatus, isTeacher])

  useEffect(() => { void load() }, [load])

  const createCategory = useCallback(async (draft: CategoryDraft) => {
    const now = new Date().toISOString()
    const category: Category = { id: crypto.randomUUID(), slug: `${slugify(draft.name)}-${Date.now().toString().slice(-4)}`, eyebrow: draft.eyebrow ?? 'Nyt læringsområde', icon: draft.icon ?? 'sparkles', displayOrder: draft.displayOrder ?? categories.length, ...draft, createdAt: now, updatedAt: now }
    if (repositoryMode === 'appwrite') {
      const saved = await appwriteCatalogRepository.createCategory(category)
      setCategories((current) => [...current, saved].sort((a, b) => a.displayOrder - b.displayOrder))
      return saved
    }
    const next = [...categories, category]
    localCatalogRepository.saveCategories(next)
    setCategories(next)
    return category
  }, [categories, repositoryMode])

  const updateCategory = useCallback(async (id: string, changes: Partial<Category>) => {
    const current = categories.find((item) => item.id === id)
    if (!current) return
    const nextItem = { ...current, ...changes, updatedAt: new Date().toISOString() }
    if (repositoryMode === 'appwrite') await appwriteCatalogRepository.updateCategory(nextItem)
    const next = categories.map((item) => item.id === id ? nextItem : item)
    if (repositoryMode === 'local') localCatalogRepository.saveCategories(next)
    setCategories(next)
  }, [categories, repositoryMode])

  const deleteCategory = useCallback(async (id: string) => {
    if (exercises.some((item) => item.categoryId === id)) return false
    if (repositoryMode === 'appwrite') await appwriteCatalogRepository.deleteCategory(id)
    const next = categories.filter((item) => item.id !== id).map((item, index) => ({ ...item, displayOrder: index }))
    if (repositoryMode === 'local') localCatalogRepository.saveCategories(next)
    setCategories(next)
    return true
  }, [categories, exercises, repositoryMode])

  const moveCategory = useCallback(async (id: string, direction: -1 | 1) => {
    const index = categories.findIndex((item) => item.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= categories.length) return
    const reordered = [...categories]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    const next = reordered.map((item, position) => ({ ...item, displayOrder: position, updatedAt: new Date().toISOString() }))
    if (repositoryMode === 'appwrite') await Promise.all([appwriteCatalogRepository.updateCategory(next[index]), appwriteCatalogRepository.updateCategory(next[target])])
    else localCatalogRepository.saveCategories(next)
    setCategories(next)
  }, [categories, repositoryMode])

  const createExercise = useCallback(async (draft: ExerciseDraft, file?: File) => {
    const now = new Date().toISOString()
    const status = draft.status ?? (draft.isPublished ? 'published' : 'draft')
    let exercise: Exercise = { ...draft, status, isPublished: status === 'published', createdAt: draft.createdAt ?? now, updatedAt: now }
    if (repositoryMode === 'appwrite') {
      let uploaded: Models.File | undefined
      try {
        if (file) {
          uploaded = await appwriteCatalogRepository.uploadHtml(file, status)
          exercise = { ...exercise, fileId: uploaded.$id, fileName: uploaded.name, fileSize: uploaded.sizeOriginal }
        }
        exercise = await appwriteCatalogRepository.createExercise(exercise)
      } catch (reason) {
        if (uploaded) await storage.deleteFile({ bucketId: appwriteConfig.buckets.exerciseFiles, fileId: uploaded.$id }).catch(() => undefined)
        throw reason
      }
    } else {
      localCatalogRepository.saveExercises([exercise, ...exercises])
    }
    setExercises((current) => [exercise, ...current])
    return exercise
  }, [exercises, repositoryMode])

  const updateExercise = useCallback(async (id: string, changes: Partial<Exercise>, file?: File) => {
    const current = exercises.find((item) => item.id === id)
    if (!current) return
    let nextItem = { ...current, ...changes, updatedAt: new Date().toISOString() }
    if (repositoryMode === 'appwrite') {
      const replacement = file ? await appwriteCatalogRepository.uploadHtml(file, 'draft') : undefined
      try {
        nextItem = await appwriteCatalogRepository.updateExercise(nextItem, current, replacement?.$id)
      } catch (reason) {
        if (replacement) await storage.deleteFile({ bucketId: appwriteConfig.buckets.exerciseFiles, fileId: replacement.$id }).catch(() => undefined)
        throw reason
      }
    }
    const next = exercises.map((item) => item.id === id ? nextItem : item)
    if (repositoryMode === 'local') localCatalogRepository.saveExercises(next)
    setExercises(next)
  }, [exercises, repositoryMode])

  const setExerciseStatus = useCallback((id: string, status: ExerciseStatus) => updateExercise(id, { status, isPublished: status === 'published' }), [updateExercise])

  const deleteExercise = useCallback(async (id: string) => {
    const exercise = exercises.find((item) => item.id === id)
    if (!exercise) return
    if (repositoryMode === 'appwrite') await appwriteCatalogRepository.deleteExercise(exercise)
    const next = exercises.filter((item) => item.id !== id)
    if (repositoryMode === 'local') localCatalogRepository.saveExercises(next)
    setExercises(next)
  }, [exercises, repositoryMode])

  const importLocalData = useCallback(async () => {
    if (!isTeacher) throw new Error('Kun en godkendt lærer kan importere indhold.')
    if (!appwriteCatalogRepository.trustedOperationsConfigured()) throw new Error('Konfigurér den betroede Content Manager Function før import.')
    const remote = await appwriteCatalogRepository.getAll()
    if (remote.categories.length || remote.exercises.length) throw new Error('Appwrite indeholder allerede katalogdata. Importen blev ikke startet.')
    const localCategoryRows = localCategories()
    const localExerciseRows = localExercises()
    const htmlFiles = new Map<string, string>()
    for (const exercise of localExerciseRows.filter((item) => item.sourceType === 'upload')) {
      const html = await exerciseFileRepository.get(exercise.id)
      if (!html) throw new Error(`HTML-filen til “${exercise.title}” mangler lokalt. Ingen data blev importeret.`)
      htmlFiles.set(exercise.id, html)
    }
    const createdCategories: Category[] = []
    const createdExercises: Exercise[] = []
    const unlinkedFileIds: string[] = []
    try {
      for (const category of localCategoryRows) createdCategories.push(await appwriteCatalogRepository.createCategory(category))
      for (const exercise of localExerciseRows) {
        let migrated = exercise
        const html = htmlFiles.get(exercise.id)
        if (html) {
          const file = new File([html], exercise.fileName || `${exercise.id}.html`, { type: 'text/html' })
          const uploaded = await appwriteCatalogRepository.uploadHtml(file, exercise.status)
          unlinkedFileIds.push(uploaded.$id)
          migrated = { ...exercise, fileId: uploaded.$id, fileName: uploaded.name, fileSize: uploaded.sizeOriginal }
        }
        createdExercises.push(await appwriteCatalogRepository.createExercise(migrated))
        if (migrated.fileId) unlinkedFileIds.splice(unlinkedFileIds.indexOf(migrated.fileId), 1)
      }
    } catch (reason) {
      for (const exercise of createdExercises.reverse()) await appwriteCatalogRepository.deleteExercise(exercise).catch(() => undefined)
      for (const fileId of unlinkedFileIds) await storage.deleteFile({ bucketId: appwriteConfig.buckets.exerciseFiles, fileId }).catch(() => undefined)
      for (const category of createdCategories.reverse()) await appwriteCatalogRepository.deleteCategory(category.id).catch(() => undefined)
      throw reason
    }
    setCategories(createdCategories.sort((a, b) => a.displayOrder - b.displayOrder))
    setExercises(createdExercises)
    setRepositoryMode('appwrite')
  }, [isTeacher])

  const value = useMemo(() => ({ categories, exercises, repositoryMode, loading, error, createCategory, updateCategory, deleteCategory, moveCategory, createExercise, updateExercise, setExerciseStatus, deleteExercise, importLocalData }), [categories, exercises, repositoryMode, loading, error, createCategory, updateCategory, deleteCategory, moveCategory, createExercise, updateExercise, setExerciseStatus, deleteExercise, importLocalData])
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const value = useContext(CatalogContext)
  if (!value) throw new Error('useCatalog skal bruges inden i CatalogProvider')
  return value
}
