import { seedCategories, seedExercises } from '../../data/mock/catalog'
import type { Category, Exercise } from '../../types'

const CATEGORY_KEY = 'klik-og-laer:categories:v1'
const EXERCISE_KEY = 'klik-og-laer:exercises:v1'

function read<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

export interface CatalogRepository {
  getCategories(): Category[]
  getExercises(): Exercise[]
  saveCategories(categories: Category[]): void
  saveExercises(exercises: Exercise[]): void
}

export const localCatalogRepository: CatalogRepository = {
  getCategories: () => read(CATEGORY_KEY, seedCategories).map((item) => ({ ...item })),
  getExercises: () => read<Exercise[]>(EXERCISE_KEY, seedExercises).map((item) => ({
    ...item,
    status: item.status ?? (item.isPublished ? 'published' : 'draft'),
  })),
  saveCategories: (categories) => write(CATEGORY_KEY, categories),
  saveExercises: (exercises) => write(EXERCISE_KEY, exercises),
}

export function slugify(value: string) {
  return value.toLocaleLowerCase('da').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
