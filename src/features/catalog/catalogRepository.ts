import { seedCategories, seedExercises } from '../../data/mock/catalog'
import type { Category, Exercise, ExerciseClassAssignment, SchoolClass } from '../../types'

const CATEGORY_KEY = 'klik-og-laer:categories:v1'
const EXERCISE_KEY = 'klik-og-laer:exercises:v1'
const CLASS_KEY = 'klik-og-laer:classes:v1'
const EXERCISE_CLASS_KEY = 'klik-og-laer:exercise-classes:v1'

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
  getClasses(): SchoolClass[]
  getExerciseClassAssignments(): ExerciseClassAssignment[]
  saveCategories(categories: Category[]): void
  saveExercises(exercises: Exercise[]): void
  saveClasses(classes: SchoolClass[]): void
  saveExerciseClassAssignments(assignments: ExerciseClassAssignment[]): void
}

export const localCatalogRepository: CatalogRepository = {
  getCategories: () => read(CATEGORY_KEY, seedCategories).map((item) => ({ ...item })),
  getExercises: () => read<Exercise[]>(EXERCISE_KEY, seedExercises).map((item) => ({
    ...item,
    status: item.status ?? (item.isPublished ? 'published' : 'draft'),
  })),
  getClasses: () => read<SchoolClass[]>(CLASS_KEY, []).map((item) => ({ ...item })),
  getExerciseClassAssignments: () => read<ExerciseClassAssignment[]>(EXERCISE_CLASS_KEY, []).map((item) => ({ ...item })),
  saveCategories: (categories) => write(CATEGORY_KEY, categories),
  saveExercises: (exercises) => write(EXERCISE_KEY, exercises),
  saveClasses: (classes) => write(CLASS_KEY, classes),
  saveExerciseClassAssignments: (assignments) => write(EXERCISE_CLASS_KEY, assignments),
}

export function slugify(value: string) {
  return value.toLocaleLowerCase('da').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
