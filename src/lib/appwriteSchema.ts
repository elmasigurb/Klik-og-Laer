import { Permission, Role } from 'appwrite'
import { appwriteConfig, requireAppwriteResourceId } from './appwrite'

export const appwriteResources = appwriteConfig

function teacherRole() {
  return Role.team(requireAppwriteResourceId('VITE_APPWRITE_TEACHERS_TEAM_ID', appwriteConfig.teachersTeamId))
}

export const appwritePermissions = {
  teacherTable: () => [
    Permission.create(teacherRole()),
    Permission.read(teacherRole()),
    Permission.update(teacherRole()),
    Permission.delete(teacherRole()),
  ],
  publicPublishedRow: () => [
    Permission.read(Role.any()),
    Permission.update(teacherRole()),
    Permission.delete(teacherRole()),
  ],
  teacherDraftRow: () => [
    Permission.read(teacherRole()),
    Permission.update(teacherRole()),
    Permission.delete(teacherRole()),
  ],
} as const

export interface AppwriteCategoryRow {
  name: string
  slug: string
  description: string
  eyebrow: string
  icon: string
  tone: string
  displayOrder: number
  isPublished: boolean
}

export interface AppwriteExerciseRow {
  categoryId: string
  title: string
  description: string
  duration: number
  difficulty: string
  kind: string
  accent: string
  status: 'draft' | 'published' | 'archived'
  isPublished: boolean
  sourceType: string
  fileId?: string
  fileName?: string
  fileSize?: number
}

export interface AppwriteContentRow {
  pageId: string
  contentJson: string
  isPublished: boolean
  version: number
  publishedAt?: string
  publishedBy?: string
}

export interface AppwriteContentVersionRow {
  pageId: string
  contentJson: string
  version: number
  sourceRowId: string
  label: string
  publishedAt: string
  publishedBy: string
}
