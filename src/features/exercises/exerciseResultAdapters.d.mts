export const EXERCISE_RESULT_MANIFEST_VERSION: string

export interface ExerciseResultAdapter {
  id: string
  exerciseId: string
  title: string
  htmlSignature: string
  family: string
  possible: number
  requiresAdditionalCompletion: boolean
  finalSelector: string
  scoreSelector: string
  scorePattern: string
  retrySelector: string
  additionalCompletionSelector?: string
}

export const EXERCISE_RESULT_ADAPTERS: ExerciseResultAdapter[]
