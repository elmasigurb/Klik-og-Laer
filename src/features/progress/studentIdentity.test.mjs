import assert from 'node:assert/strict'
import test from 'node:test'
import { clearStudentIdentity, getOrCreateRegistrationKey, loadStudentIdentity, saveStudentIdentity, STUDENT_COMPLETION_CACHE_KEY, STUDENT_IDENTITY_STORAGE_KEY } from './studentIdentity.mjs'

function memoryStorage() {
  const values = new Map()
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key), values }
}

test('student identity persists by opaque credential and rejects malformed storage', () => {
  const storage = memoryStorage()
  saveStudentIdentity({ studentId: 'student-1', classId: 'class-1', displayName: 'Anna', credential: 'C'.repeat(43) }, storage)
  assert.equal(loadStudentIdentity(storage).displayName, 'Anna')
  storage.setItem(STUDENT_IDENTITY_STORAGE_KEY, JSON.stringify({ displayName: 'Anna', classId: 'class-1' }))
  assert.equal(loadStudentIdentity(storage), null)
})

test('registration retry reuses only its pending high-entropy key', () => {
  const storage = memoryStorage()
  let fill = 1
  const cryptoApi = { getRandomValues(bytes) { bytes.fill(fill++); return bytes } }
  const first = getOrCreateRegistrationKey('Anna', 'class-1', storage, cryptoApi)
  assert.equal(first.length, 43)
  assert.equal(getOrCreateRegistrationKey('Anna', 'class-1', storage, cryptoApi), first)
  assert.notEqual(getOrCreateRegistrationKey('Anna', 'class-2', storage, cryptoApi), first)
})

test('switch student clears identity, pending registration, and cached progress only', () => {
  const storage = memoryStorage()
  saveStudentIdentity({ studentId: 'student-1', classId: 'class-1', displayName: 'Anna', credential: 'C'.repeat(43) }, storage)
  storage.setItem(STUDENT_COMPLETION_CACHE_KEY, '[]')
  storage.setItem('unrelated', 'keep')
  clearStudentIdentity(storage)
  assert.equal(loadStudentIdentity(storage), null)
  assert.equal(storage.getItem(STUDENT_COMPLETION_CACHE_KEY), null)
  assert.equal(storage.getItem('unrelated'), 'keep')
})
