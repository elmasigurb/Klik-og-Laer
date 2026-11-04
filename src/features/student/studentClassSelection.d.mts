export const STUDENT_CLASS_STORAGE_KEY: string
export function getClassIdFromPath(pathname: string): string
export function readSelectedClassId(storage: Pick<Storage, 'getItem'> | null | undefined): string
export function persistSelectedClassId(storage: Pick<Storage, 'setItem' | 'removeItem'> | null | undefined, classId: string): void
export function resolveSelectedClassId(selectedClassId: string, activeClassIds: string[]): string
export function getVisibleExerciseIds(exerciseIds: string[], selectedClassId: string, assignments: Array<{ exerciseId: string; classId: string; isPublished: boolean }>): string[]
