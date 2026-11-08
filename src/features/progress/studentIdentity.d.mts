export interface StoredStudentIdentity { version: 1; studentId: string; classId: string; displayName: string; credential: string }
export const STUDENT_IDENTITY_STORAGE_KEY: string
export const STUDENT_REGISTRATION_PENDING_KEY: string
export const STUDENT_COMPLETION_CACHE_KEY: string
export const STUDENT_REGISTRATION_DISMISSED_KEY: string
export function loadStudentIdentity(storage?: Storage): StoredStudentIdentity | null
export function saveStudentIdentity(identity: Omit<StoredStudentIdentity, 'version'>, storage?: Storage): StoredStudentIdentity
export function getOrCreateRegistrationKey(displayName: string, classId: string, storage?: Storage, cryptoApi?: Crypto): string
export function hasDismissedStudentRegistration(storage?: Storage): boolean
export function dismissStudentRegistration(storage?: Storage): void
export function clearStudentRegistrationDismissal(storage?: Storage): void
export function clearStudentIdentity(storage?: Storage): void
