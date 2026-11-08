export type ExerciseResultAdapterFamily = 'bulk-submit' | 'sequential-completion' | 'multi-stage-point-based' | 'composite-writing'

export interface ExerciseResultMessage {
  type: string
  version: number
  frameId: string
  exerciseId: string
  htmlSignature: string
  attemptId: string
  adapterId: string
  adapterFamily: ExerciseResultAdapterFamily
  earned: number
  possible: number
  completed: boolean
  final: true
}

export const EXERCISE_RESULT_MESSAGE: string
export const EXERCISE_RESULT_VERSION: number
export const EXERCISE_COMPLETION_PERCENT: number
export function exerciseHtmlSignature(html: string): Promise<string>
export function getExerciseResultAdapterDefinition(exerciseId: string): Record<string, unknown> | null
export function getExerciseResultAdapter(exerciseId: string, htmlSignature: string): Record<string, unknown> | null
export function resolveExerciseResultSnapshot(adapter: Record<string, unknown>, snapshot: { finalVisible: boolean; scoreText: string; additionalCompletion: boolean }): { earned: number; possible: number; completed: boolean } | null
export function isTrustedExerciseResultMessage(event: MessageEvent, frameWindow: Window | null, frameId: string, exerciseId: string, htmlSignature: string): boolean
export function buildExerciseResultBridge(frameId: string, parentOrigin: string, exerciseId: string, htmlSignature: string): string
