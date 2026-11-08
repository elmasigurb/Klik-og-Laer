import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import { EXERCISE_RESULT_ADAPTERS, EXERCISE_RESULT_MANIFEST_VERSION } from '../src/exerciseResultManifest.mjs'
import { safeErrorMetadata } from '../src/main.mjs'
import { runStudentProgressOperation, StudentProgressError } from '../src/operations.mjs'
import { EXERCISE_RESULT_ADAPTERS as frontendAdapters } from '../../../../src/features/exercises/exerciseResultAdapters.mjs'

const ids = { database: 'db', students: 'students', completions: 'completions', classes: 'classes', exercises: 'exercises', exerciseClasses: 'assignments' }
const digest = (value) => createHmac('sha256', 'test-pepper-with-at-least-thirty-two-bytes').update(value).digest('hex')
const credential = 'C'.repeat(43)
const registrationKey = 'R'.repeat(43)

test('sanitized Function errors expose only allowlisted metadata', () => {
  const reason = Object.assign(new Error('Elma credential=secret-token'), { code: 401, type: 'general_unauthorized_scope' })
  const metadata = safeErrorMetadata(reason)
  assert.deepEqual(metadata, { code: 401, type: 'general_unauthorized_scope', message: 'Appwrite rejected the Function key scope.' })
  assert.doesNotMatch(JSON.stringify(metadata), /Elma|secret-token|credential/)

  const unsafeType = safeErrorMetadata(Object.assign(new Error('private details'), { type: 'bad type with personal data' }))
  assert.deepEqual(unsafeType, { code: null, type: 'unknown', message: 'Unexpected Appwrite operation failure.' })
})

function createContext(seed = {}) {
  let serial = 0
  const maps = {
    classes: new Map([['class-1', { $id: 'class-1', teacherId: 'teacher-1', status: 'active', name: '8.A' }], ['class-2', { $id: 'class-2', teacherId: 'teacher-1', status: 'active', name: '8.B' }]]),
    exercises: new Map(), assignments: new Map(), students: new Map(), completions: new Map(), ...seed,
  }
  const matches = (row, query) => {
    if (query.kind === 'registration') return row.registrationDigest === query.digest
    if (query.kind === 'student') return row.studentId === query.studentId
    if (query.kind === 'studentExercise') return row.studentId === query.studentId && row.exerciseId === query.exerciseId
    if (query.kind === 'assignment') return row.exerciseId === query.exerciseId && row.classId === query.classId && row.teacherId === query.teacherId && row.isPublished
    return true
  }
  const tables = {
    async getRow({ tableId, rowId }) { const row = maps[tableId].get(rowId); if (!row) throw Object.assign(new Error('missing'), { code: 404 }); return row },
    async listRows({ tableId, queries }) { return { rows: [...maps[tableId].values()].filter((row) => queries.every((query) => matches(row, query))) } },
    async createRow({ tableId, rowId, data, permissions }) {
      if (permissions.length) throw new Error('progress rows must not receive client permissions')
      if (tableId === ids.students && [...maps.students.values()].some((row) => row.registrationDigest === data.registrationDigest)) throw Object.assign(new Error('duplicate'), { code: 409 })
      if (tableId === ids.completions && [...maps.completions.values()].some((row) => row.studentId === data.studentId && row.exerciseId === data.exerciseId)) throw Object.assign(new Error('duplicate'), { code: 409 })
      const row = { $id: rowId, $createdAt: '2026-11-05T10:00:00.000Z', ...data }; maps[tableId].set(rowId, row); return row
    },
    async updateRow({ tableId, rowId, data, permissions }) { if (permissions.length) throw new Error('progress rows must not receive client permissions'); const row = { ...maps[tableId].get(rowId), ...data }; maps[tableId].set(rowId, row); return row },
  }
  return {
    maps,
    ctx: {
      tables, ids,
      queries: {
        studentsByRegistrationDigest: (value) => [{ kind: 'registration', digest: value }],
        completionsByStudent: (studentId) => [{ kind: 'student', studentId }],
        completionByStudentExercise: (studentId, exerciseId) => [{ kind: 'studentExercise', studentId, exerciseId }],
        publishedAssignment: (exerciseId, classId, teacherId) => [{ kind: 'assignment', exerciseId, classId, teacherId }],
      },
      digest, newCredential: () => (serial === 0 ? 'C' : 'D').repeat(43), uniqueId: () => `row-${++serial}`, now: () => '2026-11-05T10:00:00.000Z', registrationReplayWindowMs: 600_000,
    },
  }
}

async function register(context, name = 'Anna') {
  return runStudentProgressOperation({ action: 'student.register', classId: 'class-1', displayName: name, registrationKey }, context)
}

function completionPayload(studentId, adapter = EXERCISE_RESULT_ADAPTERS[0], changes = {}) {
  return { action: 'completion.record', studentId, credential, exerciseId: adapter.exerciseId, attemptId: 'attempt-123456789', adapterId: adapter.id, htmlSignature: adapter.htmlSignature, manifestVersion: EXERCISE_RESULT_MANIFEST_VERSION, earned: Math.ceil(adapter.possible * .8), possible: adapter.possible, requirementsSatisfied: true, ...changes }
}

function publishAdapter(context, adapter = EXERCISE_RESULT_ADAPTERS[0]) {
  context.maps.exercises.set(adapter.exerciseId, { $id: adapter.exerciseId, status: 'published', isPublished: true })
  context.maps.assignments.set(`a-${adapter.exerciseId}`, { $id: `a-${adapter.exerciseId}`, exerciseId: adapter.exerciseId, classId: 'class-1', teacherId: 'teacher-1', isPublished: true })
}

test('manifest contains all 36 adapters and matches the frontend identity, signatures, scoring, and version', () => {
  assert.equal(EXERCISE_RESULT_ADAPTERS.length, 36)
  assert.equal(frontendAdapters.length, 36)
  for (const adapter of EXERCISE_RESULT_ADAPTERS) {
    const frontend = frontendAdapters.find((item) => item.exerciseId === adapter.exerciseId)
    assert.deepEqual({ id: frontend.id, signature: frontend.htmlSignature, possible: frontend.possible, additional: frontend.requiresAdditionalCompletion }, { id: adapter.id, signature: adapter.htmlSignature, possible: adapter.possible, additional: adapter.requiresAdditionalCompletion })
    assert.equal(adapter.manifestVersion, EXERCISE_RESULT_MANIFEST_VERSION)
  }
})

test('registration creates a backend credential digest and never grants row permissions', async () => {
  const { ctx, maps } = createContext()
  const result = await register(ctx)
  const stored = maps.students.get(result.student.id)
  assert.equal(result.credential, credential)
  assert.equal(stored.credentialDigest, digest(`credential:v1:${credential}`))
  assert.notEqual(stored.credentialDigest, credential)
  assert.equal(stored.displayName, 'Anna')
})

test('registration is idempotent by high-entropy registration key and rotates the credential', async () => {
  const { ctx, maps } = createContext()
  const first = await register(ctx)
  const second = await register(ctx, 'Different ignored name')
  assert.equal(first.student.id, second.student.id)
  assert.equal(second.idempotentReplay, true)
  assert.equal(maps.students.size, 1)
  assert.equal(maps.students.get(first.student.id).displayName, 'Anna')
  assert.equal(maps.students.get(first.student.id).credentialVersion, 2)
})

test('duplicate names create independent student records and name/class never restore identity', async () => {
  const first = createContext()
  await register(first.ctx, 'Alex')
  await runStudentProgressOperation({ action: 'student.register', classId: 'class-1', displayName: 'Alex', registrationKey: 'S'.repeat(43) }, first.ctx)
  assert.equal(first.maps.students.size, 2)
})

test('credentials cannot read another student and revoked credentials fail generically', async () => {
  const { ctx, maps } = createContext()
  const registered = await register(ctx)
  await runStudentProgressOperation({ action: 'student.register', classId: 'class-1', displayName: 'Bo', registrationKey: 'S'.repeat(43) }, ctx)
  const other = [...maps.students.values()].find((row) => row.$id !== registered.student.id)
  await assert.rejects(() => runStudentProgressOperation({ action: 'student.me', studentId: other.$id, credential }, ctx), (error) => error instanceof StudentProgressError && error.status === 401)
  await assert.rejects(() => runStudentProgressOperation({ action: 'student.me', studentId: registered.student.id, credential: 'X'.repeat(43) }, ctx), (error) => error instanceof StudentProgressError && error.status === 401)
  maps.students.get(registered.student.id).status = 'revoked'
  await assert.rejects(() => runStudentProgressOperation({ action: 'student.listCompletions', studentId: registered.student.id, credential }, ctx), (error) => error.status === 401)
})

test('registration rejects archived classes and expired idempotency keys', async () => {
  const { ctx, maps } = createContext()
  maps.classes.get('class-1').status = 'archived'
  await assert.rejects(() => register(ctx), (error) => error.status === 400)
  maps.classes.get('class-1').status = 'active'
  const registered = await register(ctx)
  maps.students.get(registered.student.id).$createdAt = '2026-11-05T09:00:00.000Z'
  await assert.rejects(() => register(ctx), (error) => error.status === 409)
})

test('registration propagates database permission errors to the sanitized server handler', async () => {
  const { ctx } = createContext()
  const permissionError = Object.assign(new Error('must never be logged verbatim'), { code: 401, type: 'general_unauthorized_scope' })
  ctx.tables.getRow = async () => { throw permissionError }
  await assert.rejects(() => register(ctx), (error) => {
    assert.equal(error, permissionError)
    assert.equal(error instanceof StudentProgressError, false)
    return true
  })
  assert.deepEqual(safeErrorMetadata(permissionError), {
    code: 401,
    type: 'general_unauthorized_scope',
    message: 'Appwrite rejected the Function key scope.',
  })
  assert.doesNotMatch(JSON.stringify(safeErrorMetadata(permissionError)), /must never be logged verbatim/)
})

test('all 36 manifest adapters can persist a valid final completion with exact signatures', async () => {
  for (const adapter of EXERCISE_RESULT_ADAPTERS) {
    const { ctx, maps } = createContext()
    const registered = await register(ctx)
    publishAdapter({ ctx, maps }, adapter)
    const result = await runStudentProgressOperation(completionPayload(registered.student.id, adapter), ctx)
    assert.equal(result.completion.evidenceType, 'client-reported')
    assert.equal(maps.completions.size, 1)
    const stored = [...maps.completions.values()][0]
    assert.equal('earned' in stored, false)
    assert.equal('possible' in stored, false)
    assert.equal('attemptId' in stored, false)
  }
})

test('raw scores below 80 percent, wrong signatures, and missing writing requirements are rejected without writes', async () => {
  const { ctx, maps } = createContext()
  const registered = await register(ctx)
  const adapter = EXERCISE_RESULT_ADAPTERS.find((item) => item.requiresAdditionalCompletion)
  publishAdapter({ ctx, maps }, adapter)
  await assert.rejects(() => runStudentProgressOperation(completionPayload(registered.student.id, adapter, { earned: Math.ceil(adapter.possible * .8) - 1 }), ctx), (error) => error.status === 422)
  await assert.rejects(() => runStudentProgressOperation(completionPayload(registered.student.id, adapter, { htmlSignature: '0'.repeat(64) }), ctx), (error) => error.status === 422)
  await assert.rejects(() => runStudentProgressOperation(completionPayload(registered.student.id, adapter, { requirementsSatisfied: false }), ctx), (error) => error.status === 422)
  assert.equal(maps.completions.size, 0)
})

test('unassigned, unpublished, and archived exercises fail safely', async () => {
  const { ctx, maps } = createContext()
  const registered = await register(ctx)
  const adapter = EXERCISE_RESULT_ADAPTERS[0]
  maps.exercises.set(adapter.exerciseId, { $id: adapter.exerciseId, status: 'draft', isPublished: false })
  await assert.rejects(() => runStudentProgressOperation(completionPayload(registered.student.id, adapter), ctx), (error) => error.status === 422)
  maps.exercises.set(adapter.exerciseId, { $id: adapter.exerciseId, status: 'published', isPublished: true })
  await assert.rejects(() => runStudentProgressOperation(completionPayload(registered.student.id, adapter), ctx), (error) => error.status === 422)
  assert.equal(maps.completions.size, 0)
})

test('duplicate completion submissions are monotonic and do not create another row', async () => {
  const { ctx, maps } = createContext()
  const registered = await register(ctx)
  publishAdapter({ ctx, maps })
  await runStudentProgressOperation(completionPayload(registered.student.id), ctx)
  const duplicate = await runStudentProgressOperation(completionPayload(registered.student.id, EXERCISE_RESULT_ADAPTERS[0], { attemptId: 'retry-attempt-123456' }), ctx)
  assert.equal(duplicate.alreadyCompleted, true)
  assert.equal(maps.completions.size, 1)
})
