export type CategoryTone = 'sage' | 'apricot' | 'sky' | 'lavender' | 'rose' | 'sand'

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  eyebrow: string
  icon: string
  tone: CategoryTone
  displayOrder: number
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export type ExerciseKind = 'choice' | 'fill' | 'match' | 'sentence' | 'upload'
export type ExerciseStatus = 'draft' | 'published' | 'archived'

export interface Exercise {
  id: string
  categoryId: string
  title: string
  description: string
  duration: number
  difficulty: 'Let' | 'Mellem' | 'Udfordring'
  kind: ExerciseKind
  accent: string
  status: ExerciseStatus
  isPublished: boolean
  sourceType: 'demo' | 'upload'
  fileId?: string
  fileName?: string
  fileSize?: number
  createdAt: string
  updatedAt: string
}

export interface PlatformSettings {
  siteName: string
  description: string
  defaultLanguage: string
  compactTables: boolean
}
