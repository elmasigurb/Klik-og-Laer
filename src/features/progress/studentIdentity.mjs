export const STUDENT_IDENTITY_STORAGE_KEY = 'klik-og-laer:student-identity:v1'
export const STUDENT_REGISTRATION_PENDING_KEY = 'klik-og-laer:student-registration-pending:v1'
export const STUDENT_COMPLETION_CACHE_KEY = 'klik-og-laer:student-completions:v1'

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/
const secretPattern = /^[A-Za-z0-9_-]{43}$/

function validIdentity(value) {
  return value && value.version === 1 && idPattern.test(value.studentId) && idPattern.test(value.classId) && secretPattern.test(value.credential) && typeof value.displayName === 'string' && value.displayName.length >= 1 && value.displayName.length <= 128
}

function parse(storage, key) {
  try { return JSON.parse(storage.getItem(key) || 'null') } catch { return null }
}

export function loadStudentIdentity(storage = globalThis.localStorage) {
  const value = parse(storage, STUDENT_IDENTITY_STORAGE_KEY)
  if (validIdentity(value)) return value
  storage.removeItem(STUDENT_IDENTITY_STORAGE_KEY)
  return null
}

export function saveStudentIdentity(identity, storage = globalThis.localStorage) {
  const value = { version: 1, studentId: identity.studentId, classId: identity.classId, displayName: identity.displayName, credential: identity.credential }
  if (!validIdentity(value)) throw new Error('Invalid student identity.')
  storage.setItem(STUDENT_IDENTITY_STORAGE_KEY, JSON.stringify(value))
  storage.removeItem(STUDENT_REGISTRATION_PENDING_KEY)
  return value
}

export function getOrCreateRegistrationKey(displayName, classId, storage = globalThis.localStorage, cryptoApi = globalThis.crypto) {
  const pending = parse(storage, STUDENT_REGISTRATION_PENDING_KEY)
  if (pending?.displayName === displayName && pending?.classId === classId && secretPattern.test(pending.registrationKey)) return pending.registrationKey
  const bytes = new Uint8Array(32)
  cryptoApi.getRandomValues(bytes)
  const registrationKey = bytesToBase64Url(bytes)
  storage.setItem(STUDENT_REGISTRATION_PENDING_KEY, JSON.stringify({ displayName, classId, registrationKey }))
  return registrationKey
}

function bytesToBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function clearStudentIdentity(storage = globalThis.localStorage) {
  storage.removeItem(STUDENT_IDENTITY_STORAGE_KEY)
  storage.removeItem(STUDENT_REGISTRATION_PENDING_KEY)
  storage.removeItem(STUDENT_COMPLETION_CACHE_KEY)
}
