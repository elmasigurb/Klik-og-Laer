import { ID, Query, type Models } from 'appwrite'
import type { Category, CategoryTone, Exercise, ExerciseKind, ExerciseStatus } from '../../types'
import { appwriteConfig, storage, tablesDB } from '../../lib/appwrite'
import { executeContentManager, hasTrustedContentManager } from '../../lib/appwriteFunctions'
import { appwritePermissions, type AppwriteCategoryRow, type AppwriteExerciseRow } from '../../lib/appwriteSchema'

type CategoryDocument = Models.Row & AppwriteCategoryRow
type ExerciseDocument = Models.Row & AppwriteExerciseRow

const databaseId = appwriteConfig.databaseId
const categoryTableId = appwriteConfig.tables.categories
const exerciseTableId = appwriteConfig.tables.exercises
const bucketId = appwriteConfig.buckets.exerciseFiles

const rowPermissions = (published: boolean) => published ? appwritePermissions.publicPublishedRow() : appwritePermissions.teacherDraftRow()

function toCategory(row: CategoryDocument): Category {
  return {
    id: row.$id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    eyebrow: row.eyebrow,
    icon: row.icon,
    tone: row.tone as CategoryTone,
    displayOrder: row.displayOrder,
    isPublished: row.isPublished,
    createdAt: row.$createdAt,
    updatedAt: row.$updatedAt,
  }
}

function toExercise(row: ExerciseDocument): Exercise {
  const status = row.status as ExerciseStatus
  return {
    id: row.$id,
    categoryId: row.categoryId,
    title: row.title,
    description: row.description,
    duration: row.duration,
    difficulty: row.difficulty as Exercise['difficulty'],
    kind: row.kind as ExerciseKind,
    accent: row.accent,
    status,
    isPublished: status === 'published' && row.isPublished,
    sourceType: row.sourceType as Exercise['sourceType'],
    fileId: row.fileId,
    fileName: row.fileName,
    fileSize: row.fileSize,
    createdAt: row.$createdAt,
    updatedAt: row.$updatedAt,
  }
}

function categoryData(category: Category): AppwriteCategoryRow {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description,
    eyebrow: category.eyebrow,
    icon: category.icon,
    tone: category.tone,
    displayOrder: category.displayOrder,
    isPublished: category.isPublished,
  }
}

function exerciseData(exercise: Exercise): AppwriteExerciseRow {
  return {
    categoryId: exercise.categoryId,
    title: exercise.title,
    description: exercise.description,
    duration: exercise.duration,
    difficulty: exercise.difficulty,
    kind: exercise.kind,
    accent: exercise.accent,
    status: exercise.status,
    isPublished: exercise.status === 'published',
    sourceType: exercise.sourceType,
    fileId: exercise.fileId,
    fileName: exercise.fileName,
    fileSize: exercise.fileSize,
  }
}

export const appwriteCatalogRepository = {
  trustedOperationsConfigured: hasTrustedContentManager,
  async getAll() {
    const [categories, exercises] = await Promise.all([
      tablesDB.listRows<CategoryDocument>({ databaseId, tableId: categoryTableId, queries: [Query.orderAsc('displayOrder'), Query.limit(500)], ttl: 0 }),
      tablesDB.listRows<ExerciseDocument>({ databaseId, tableId: exerciseTableId, queries: [Query.orderDesc('$updatedAt'), Query.limit(500)], ttl: 0 }),
    ])
    return { categories: categories.rows.map(toCategory), exercises: exercises.rows.map(toExercise) }
  },

  async createCategory(category: Category) {
    const row = await tablesDB.createRow<CategoryDocument>({
      databaseId,
      tableId: categoryTableId,
      rowId: ID.custom(category.id),
      data: categoryData(category),
      permissions: rowPermissions(category.isPublished),
    })
    return toCategory(row)
  },

  async updateCategory(category: Category) {
    const row = await tablesDB.updateRow<CategoryDocument>({
      databaseId,
      tableId: categoryTableId,
      rowId: category.id,
      data: categoryData(category),
      permissions: rowPermissions(category.isPublished),
    })
    return toCategory(row)
  },

  deleteCategory(categoryId: string) {
    return tablesDB.deleteRow({ databaseId, tableId: categoryTableId, rowId: categoryId })
  },

  async createExercise(exercise: Exercise) {
    if (exercise.status === 'published' && !hasTrustedContentManager()) throw new Error('Den betroede Appwrite Function er ikke konfigureret. Øvelsen kan kun gemmes som kladde.')
    const initial = exercise.status === 'published' ? { ...exercise, status: 'draft' as const, isPublished: false } : exercise
    const row = await tablesDB.createRow<ExerciseDocument>({
      databaseId,
      tableId: exerciseTableId,
      rowId: ID.custom(exercise.id),
      data: exerciseData(initial),
      permissions: rowPermissions(false),
    })
    if (exercise.status === 'published') {
      try { await executeContentManager({ action: 'exercise.setStatus', exerciseId: exercise.id, status: 'published' }) }
      catch (reason) {
        await tablesDB.deleteRow({ databaseId, tableId: exerciseTableId, rowId: exercise.id }).catch(() => undefined)
        throw reason
      }
      return toExercise(await tablesDB.getRow<ExerciseDocument>({ databaseId, tableId: exerciseTableId, rowId: exercise.id }))
    }
    return toExercise(row)
  },

  async updateExercise(exercise: Exercise, previous: Exercise, replacementFileId?: string) {
    const needsTrustedOperation = previous.status !== exercise.status || Boolean(replacementFileId)
    if (needsTrustedOperation && !hasTrustedContentManager()) throw new Error('Den betroede Appwrite Function er ikke konfigureret. Udgivelse, arkivering og filudskiftning er blokeret.')
    const metadata = replacementFileId
      ? { ...exercise, status: previous.status, isPublished: previous.status === 'published', fileId: previous.fileId, fileName: previous.fileName, fileSize: previous.fileSize }
      : { ...exercise, status: previous.status, isPublished: previous.status === 'published' }
    try {
      await tablesDB.updateRow<ExerciseDocument>({
        databaseId,
        tableId: exerciseTableId,
        rowId: exercise.id,
        data: exerciseData(metadata),
        permissions: rowPermissions(previous.status === 'published'),
      })
      if (replacementFileId) await executeContentManager({ action: 'exercise.replaceFile', exerciseId: exercise.id, newFileId: replacementFileId, status: exercise.status })
      else if (previous.status !== exercise.status) await executeContentManager({ action: 'exercise.setStatus', exerciseId: exercise.id, status: exercise.status })
      return toExercise(await tablesDB.getRow<ExerciseDocument>({ databaseId, tableId: exerciseTableId, rowId: exercise.id }))
    } catch (error) { throw error }
  },

  async deleteExercise(exercise: Exercise) {
    if (!hasTrustedContentManager()) throw new Error('Den betroede Appwrite Function er ikke konfigureret. Permanent sletning er blokeret.')
    await executeContentManager({ action: 'exercise.delete', exerciseId: exercise.id })
  },

  async uploadHtml(file: File, _status: ExerciseStatus) {
    return storage.createFile({
      bucketId,
      fileId: ID.unique(),
      file,
      permissions: rowPermissions(false),
    })
  },
}
