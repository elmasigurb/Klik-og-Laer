import assert from 'node:assert/strict'
import test from 'node:test'
import { ProgressManagerError, runProgressManagerOperation } from '../src/progressOperations.mjs'
import { verifyTeacherSession } from '../src/authorization.mjs'

const ids = { database: 'db', classes: 'classes', students: 'students', completions: 'completions' }

function createContext() {
  const maps = {
    classes: new Map([
      ['class-1', { $id: 'class-1', teacherId: 'teacher-1', name: '8.A', status: 'active' }],
      ['class-2', { $id: 'class-2', teacherId: 'teacher-1', name: '8.B', status: 'active' }],
      ['class-other', { $id: 'class-other', teacherId: 'teacher-2', name: '9.A', status: 'active' }],
    ]),
    students: new Map([
      ['student-1', { $id: 'student-1', $createdAt: 'now', classId: 'class-1', teacherId: 'teacher-1', displayName: 'Alex', normalizedName: 'alex', status: 'active', credentialDigest: 'a'.repeat(64), credentialVersion: 1, registrationDigest: 'b'.repeat(64) }],
      ['student-2', { $id: 'student-2', $createdAt: 'now', classId: 'class-1', teacherId: 'teacher-1', displayName: 'Alex', normalizedName: 'alex', status: 'active', credentialDigest: 'c'.repeat(64), credentialVersion: 1, registrationDigest: 'd'.repeat(64) }],
      ['student-other', { $id: 'student-other', $createdAt: 'now', classId: 'class-other', teacherId: 'teacher-2', displayName: 'Other', normalizedName: 'other', status: 'active', credentialDigest: 'e'.repeat(64), credentialVersion: 1, registrationDigest: 'f'.repeat(64) }],
    ]),
    completions: new Map([
      ['completion-1', { $id: 'completion-1', studentId: 'student-1', teacherId: 'teacher-1', classIdAtCompletion: 'class-1', exerciseId: 'exercise-1', completedAt: 'now', evidenceType: 'client-reported' }],
      ['completion-other', { $id: 'completion-other', studentId: 'student-other', teacherId: 'teacher-2', classIdAtCompletion: 'class-other', exerciseId: 'exercise-1', completedAt: 'now', evidenceType: 'client-reported' }],
    ]),
  }
  const match = (row, query) => !query || (query.kind === 'studentsByClass' ? row.classId === query.classId && row.teacherId === query.teacherId : query.kind === 'teacher' ? row.teacherId === query.teacherId : query.kind === 'student' ? row.studentId === query.studentId : query.kind === 'class' ? row.classIdAtCompletion === query.classId && row.teacherId === query.teacherId : true)
  const tables = {
    async getRow({ tableId, rowId }) { const row = maps[tableId].get(rowId); if (!row) throw Object.assign(new Error('missing'), { code: 404 }); return row },
    async listRows({ tableId, queries }) { return { rows: [...maps[tableId].values()].filter((row) => queries.every((query) => match(row, query))) } },
    async updateRow({ tableId, rowId, data, permissions }) { assert.deepEqual(permissions, []); const row = { ...maps[tableId].get(rowId), ...data }; maps[tableId].set(rowId, row); return row },
    async deleteRow({ tableId, rowId }) { if (!maps[tableId].has(rowId)) throw Object.assign(new Error('missing'), { code: 404 }); maps[tableId].delete(rowId) },
  }
  return { maps, ctx: { userId: 'teacher-1', tables, ids, queries: {
    studentsByClass: (classId, teacherId) => [{ kind: 'studentsByClass', classId, teacherId }],
    completionsByTeacher: (teacherId) => [{ kind: 'teacher', teacherId }],
    completionsByClass: (classId, teacherId) => [{ kind: 'class', classId, teacherId }],
    completionsByStudent: (studentId) => [{ kind: 'student', studentId }],
  }, digest: (value) => `digest:${value}`, revokedDigest: () => 'r'.repeat(64), newCredential: () => 'N'.repeat(43) } }
}

test('teacher authorization independently requires JWT and Teachers Team membership', async () => {
  await assert.rejects(() => verifyTeacherSession({ jwt: '', account: {}, teams: {}, teamId: 'teachers' }), (error) => error.status === 401)
  const denied = Object.assign(new Error('not member'), { code: 404 })
  await assert.rejects(() => verifyTeacherSession({ jwt: 'jwt', account: { get: async () => ({ $id: 'teacher-1' }) }, teams: { get: async () => { throw denied } }, teamId: 'teachers' }), denied)
  const user = await verifyTeacherSession({ jwt: 'jwt', account: { get: async () => ({ $id: 'teacher-1' }) }, teams: { get: async () => ({ $id: 'teachers' }) }, teamId: 'teachers' })
  assert.equal(user.$id, 'teacher-1')
})

test('class progress lists duplicate names with distinct non-secret suffixes and client-reported evidence', async () => {
  const { ctx } = createContext()
  const result = await runProgressManagerOperation({ action: 'progress.listClass', classId: 'class-1' }, ctx)
  assert.equal(result.students.length, 2)
  assert.notEqual(result.students[0].idSuffix, result.students[1].idSuffix)
  assert.equal(result.completions[0].evidenceType, 'client-reported')
  assert.equal(result.completions.some((row) => row.studentId === 'student-other'), false)
})

test('cross-teacher reads, renames, transfers, and deletion are denied', async () => {
  const { ctx } = createContext()
  const operations = [
    { action: 'progress.listClass', classId: 'class-other' },
    { action: 'student.rename', studentId: 'student-other', displayName: 'No' },
    { action: 'student.moveClass', studentId: 'student-1', classId: 'class-other' },
    { action: 'student.delete', studentId: 'student-other' },
  ]
  for (const operation of operations) await assert.rejects(() => runProgressManagerOperation(operation, ctx), (error) => error instanceof ProgressManagerError && error.status === 403)
})

test('moving a student between owned classes preserves completion records and history', async () => {
  const { ctx, maps } = createContext()
  const result = await runProgressManagerOperation({ action: 'student.moveClass', studentId: 'student-1', classId: 'class-2' }, ctx)
  assert.equal(result.completionsPreserved, true)
  assert.equal(maps.students.get('student-1').classId, 'class-2')
  assert.equal(maps.completions.get('completion-1').classIdAtCompletion, 'class-1')
  const listing = await runProgressManagerOperation({ action: 'progress.listClass', classId: 'class-2' }, ctx)
  assert.equal(listing.completions.length, 1)
})

test('revocation invalidates the stored credential and rotation returns a one-time replacement', async () => {
  const { ctx, maps } = createContext()
  await runProgressManagerOperation({ action: 'student.setStatus', studentId: 'student-1', status: 'revoked' }, ctx)
  assert.equal(maps.students.get('student-1').credentialDigest, 'r'.repeat(64))
  const rotated = await runProgressManagerOperation({ action: 'student.rotateCredential', studentId: 'student-1', expectedCredentialVersion: 2 }, ctx)
  assert.equal(rotated.credential, 'N'.repeat(43))
  assert.equal(maps.students.get('student-1').status, 'active')
  assert.equal(maps.students.get('student-1').credentialVersion, 3)
  await assert.rejects(() => runProgressManagerOperation({ action: 'student.rotateCredential', studentId: 'student-1', expectedCredentialVersion: 2 }, ctx), (error) => error.status === 409)
})

test('progress and student deletion are scoped, complete, and idempotent for missing completion rows', async () => {
  const first = createContext()
  const progress = await runProgressManagerOperation({ action: 'progress.deleteStudent', studentId: 'student-1' }, first.ctx)
  assert.equal(progress.deleted, 1)
  assert.equal(first.maps.students.has('student-1'), true)
  const again = await runProgressManagerOperation({ action: 'progress.deleteStudent', studentId: 'student-1' }, first.ctx)
  assert.equal(again.deleted, 0)

  const second = createContext()
  const deleted = await runProgressManagerOperation({ action: 'student.delete', studentId: 'student-1' }, second.ctx)
  assert.equal(deleted.deleted, true)
  assert.equal(second.maps.students.has('student-1'), false)
  assert.equal(second.maps.completions.has('completion-1'), false)
  assert.equal(second.maps.completions.has('completion-other'), true)
  const replay = await runProgressManagerOperation({ action: 'student.delete', studentId: 'student-1' }, second.ctx)
  assert.deepEqual(replay, { deleted: true, completionsDeleted: 0 })
})

test('class progress deletion only removes owned historical class completions', async () => {
  const { ctx, maps } = createContext()
  const result = await runProgressManagerOperation({ action: 'progress.deleteClass', classId: 'class-1' }, ctx)
  assert.equal(result.deleted, 1)
  assert.equal(maps.completions.has('completion-other'), true)
})
