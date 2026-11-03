export const EXERCISE_RESIZE_MESSAGE: string
export const EXERCISE_RESIZE_VERSION: number
export const MIN_EXERCISE_HEIGHT: number
export const MAX_EXERCISE_HEIGHT: number
export function isTrustedResizeMessage(event: MessageEvent, frameWindow: Window | null, frameId: string): boolean
export function buildResizableExerciseDocument(html: string, frameId: string, parentOrigin: string): string
