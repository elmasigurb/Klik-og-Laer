import assert from 'node:assert/strict'
import test from 'node:test'
import { getClassIdFromPath, persistSelectedClassId, readSelectedClassId, resolveSelectedClassId, STUDENT_CLASS_STORAGE_KEY } from './studentClassSelection.mjs'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

test('class selection persists without storing student identity', () => {
  const storage = memoryStorage()
  persistSelectedClassId(storage, 'class-a')
  assert.equal(readSelectedClassId(storage), 'class-a')
  assert.equal(storage.getItem(STUDENT_CLASS_STORAGE_KEY), 'class-a')
  persistSelectedClassId(storage, '')
  assert.equal(readSelectedClassId(storage), '')
})

test('only an active persisted class is restored', () => {
  assert.equal(resolveSelectedClassId('class-a', ['class-a', 'class-b']), 'class-a')
  assert.equal(resolveSelectedClassId('archived-class', ['class-a']), '')
})

test('class routes keep the selected class across category and exercise navigation', () => {
  assert.equal(getClassIdFromPath('/classes/class-a/categories/verber'), 'class-a')
  assert.equal(getClassIdFromPath('/classes/class-a/exercises/exercise-1'), 'class-a')
  assert.equal(getClassIdFromPath('/categories/verber'), '')
  assert.equal(getClassIdFromPath('/classes/class%20a'), 'class a')
})
