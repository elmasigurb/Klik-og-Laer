export interface CompletionView { exerciseId: string; completedAt: string; evidenceType: 'client-reported' }
export function mergeCompletion<T extends CompletionView>(completions: T[], completion: T): T[]
export function isExerciseCompleted(completions: Array<Pick<CompletionView, 'exerciseId'>>, exerciseId: string): boolean
export function buildStudentProgressRows<T extends { id: string }, C extends { studentId: string; completedAt: string }>(students: T[], completions: C[]): Array<T & { completions: C[] }>
