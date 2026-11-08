import assert from 'node:assert/strict'
import test from 'node:test'
import { buildStudentProgressRows, isExerciseCompleted, mergeCompletion } from './progressViewModel.mjs'

test('completion indicators remain complete and duplicate retries do not add entries', () => {
  const first = { exerciseId: 'exercise-1', completedAt: '2026-11-08T10:00:00.000Z', evidenceType: 'client-reported' }
  const saved = mergeCompletion([], first)
  assert.equal(isExerciseCompleted(saved, 'exercise-1'), true)
  assert.equal(isExerciseCompleted(saved, 'exercise-2'), false)
  assert.equal(mergeCompletion(saved, { ...first, completedAt: '2026-11-08T11:00:00.000Z' }), saved)
})

test('teacher progress rows isolate students with identical names and sort dates newest first', () => {
  const students = [{ id: 'student-1', displayName: 'Alex', idSuffix: 'ent-1' }, { id: 'student-2', displayName: 'Alex', idSuffix: 'ent-2' }]
  const rows = buildStudentProgressRows(students, [
    { studentId: 'student-1', exerciseId: 'older', completedAt: '2026-11-07T10:00:00.000Z' },
    { studentId: 'student-2', exerciseId: 'other', completedAt: '2026-11-08T09:00:00.000Z' },
    { studentId: 'student-1', exerciseId: 'newer', completedAt: '2026-11-08T10:00:00.000Z' },
  ])
  assert.deepEqual(rows[0].completions.map((item) => item.exerciseId), ['newer', 'older'])
  assert.deepEqual(rows[1].completions.map((item) => item.exerciseId), ['other'])
  assert.notEqual(rows[0].idSuffix, rows[1].idSuffix)
})
