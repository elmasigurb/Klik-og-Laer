/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPWRITE_ENDPOINT: string
  readonly VITE_APPWRITE_PROJECT_ID: string
  readonly VITE_APPWRITE_TEACHERS_TEAM_ID?: string
  readonly VITE_APPWRITE_DATABASE_ID?: string
  readonly VITE_APPWRITE_CATEGORIES_TABLE_ID?: string
  readonly VITE_APPWRITE_EXERCISES_TABLE_ID?: string
  readonly VITE_APPWRITE_CONTENT_TABLE_ID?: string
  readonly VITE_APPWRITE_CONTENT_VERSIONS_TABLE_ID?: string
  readonly VITE_APPWRITE_EXERCISE_FILES_BUCKET_ID?: string
  readonly VITE_APPWRITE_CONTENT_MANAGER_FUNCTION_ID?: string
  readonly VITE_APPWRITE_STUDENT_PROGRESS_FUNCTION_ID?: string
  readonly VITE_PUBLIC_CLASS_NAVIGATION_ENABLED?: string
  readonly VITE_STUDENT_PROGRESS_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
