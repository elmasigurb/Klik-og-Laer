import { Account, Client, Functions, Storage, TablesDB, Teams } from 'appwrite'

function requiredEnvironmentValue(name: string, value: string | undefined) {
  if (!value?.trim()) {
    throw new Error(`Missing required Vite environment variable: ${name}`)
  }
  return value.trim()
}

export const appwriteConfig = {
  endpoint: requiredEnvironmentValue('VITE_APPWRITE_ENDPOINT', import.meta.env.VITE_APPWRITE_ENDPOINT),
  projectId: requiredEnvironmentValue('VITE_APPWRITE_PROJECT_ID', import.meta.env.VITE_APPWRITE_PROJECT_ID),
  teachersTeamId: import.meta.env.VITE_APPWRITE_TEACHERS_TEAM_ID?.trim() ?? '',
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID?.trim() ?? '',
  tables: {
    categories: import.meta.env.VITE_APPWRITE_CATEGORIES_TABLE_ID?.trim() || 'categories',
    exercises: import.meta.env.VITE_APPWRITE_EXERCISES_TABLE_ID?.trim() || 'exercises',
    content: import.meta.env.VITE_APPWRITE_CONTENT_TABLE_ID?.trim() || 'site-content',
    contentVersions: import.meta.env.VITE_APPWRITE_CONTENT_VERSIONS_TABLE_ID?.trim() || 'content-versions',
  },
  buckets: {
    exerciseFiles: import.meta.env.VITE_APPWRITE_EXERCISE_FILES_BUCKET_ID?.trim() || 'exercise-files',
  },
  functions: {
    contentManager: import.meta.env.VITE_APPWRITE_CONTENT_MANAGER_FUNCTION_ID?.trim() ?? '',
  },
} as const

export const appwriteClient = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)

export const account = new Account(appwriteClient)
export const teams = new Teams(appwriteClient)
export const tablesDB = new TablesDB(appwriteClient)
export const storage = new Storage(appwriteClient)
export const functions = new Functions(appwriteClient)

export function requireAppwriteResourceId(label: string, value: string) {
  if (!value) throw new Error(`${label} is not configured.`)
  return value
}
