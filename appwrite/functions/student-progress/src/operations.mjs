import { timingSafeEqual } from 'node:crypto'
import { EXERCISE_RESULT_MANIFEST_VERSION, getManifestAdapter } from './exerciseResultManifest.mjs'

export class StudentProgressError extends Error {
  constructor(status, message = 'Anmodningen kunne ikke gennemføres.') { super(message); this.status = status }
}

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/
const credentialPattern = /^[A-Za-z0-9_-]{43}$/
const registrationPattern = /^[A-Za-z0-9_-]{32,128}$/
const attemptPattern = /^[A-Za-z0-9-]{16,128}$/
const signaturePattern = /^[a-f0-9]{64}$/

function exactKeys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new StudentProgressError(400)
  const keys = Object.keys(value).sort()
  const expected = [...allowed].sort()
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) throw new StudentProgressError(400)
}

function requiredId(value) {
  if (typeof value !== 'string' || !idPattern.test(value)) throw new StudentProgressError(400)
  return value
}

function studentName(value) {
  if (typeof value !== 'string') throw new StudentProgressError(400)
  const displayName = value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()
  if (displayName.length < 1 || displayName.length > 128) throw new StudentProgressError(400)
  return { displayName, normalizedName: displayName.toLocaleLowerCase('da-DK') }
}

function safeEqual(left, right) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function publicStudent(row) {
  return { id: row.$id, classId: row.classId, displayName: row.displayName, status: row.status }
}

async function listOne(ctx, tableId, queries) {
  const result = await ctx.tables.listRows({ databaseId: ctx.ids.database, tableId, queries })
  return result.rows[0] ?? null
}

async function authenticate(payload, ctx) {
  const studentId = requiredId(payload.studentId)
  if (typeof payload.credential !== 'string' || !credentialPattern.test(payload.credential)) throw new StudentProgressError(401)
  let student
  try { student = await ctx.tables.getRow({ databaseId: ctx.ids.database, tableId: ctx.ids.students, rowId: studentId }) }
  catch { throw new StudentProgressError(401) }
  const expected = ctx.digest(`credential:v${student.credentialVersion}:${payload.credential}`)
  if (student.status !== 'active' || !safeEqual(expected, student.credentialDigest)) throw new StudentProgressError(401)
  return student
}

async function register(payload, ctx) {
  exactKeys(payload, ['action', 'classId', 'displayName', 'registrationKey'])
  const classId = requiredId(payload.classId)
  const parsedName = studentName(payload.displayName)
  if (typeof payload.registrationKey !== 'string' || !registrationPattern.test(payload.registrationKey)) throw new StudentProgressError(400)
  let schoolClass
  try { schoolClass = await ctx.tables.getRow({ databaseId: ctx.ids.database, tableId: ctx.ids.classes, rowId: classId }) }
  catch { throw new StudentProgressError(400) }
  if (schoolClass.status !== 'active') throw new StudentProgressError(400)

  const registrationDigest = ctx.digest(`registration:${payload.registrationKey}`)
  const existing = await listOne(ctx, ctx.ids.students, ctx.queries.studentsByRegistrationDigest(registrationDigest))
  const credential = ctx.newCredential()
  if (!credentialPattern.test(credential)) throw new Error('Credential generator returned an invalid value.')
  if (existing) {
    if (existing.status !== 'active') throw new StudentProgressError(409)
    const age = Date.parse(ctx.now()) - Date.parse(existing.$createdAt)
    if (!Number.isFinite(age) || age < 0 || age > ctx.registrationReplayWindowMs) throw new StudentProgressError(409)
    const credentialVersion = existing.credentialVersion + 1
    const updated = await ctx.tables.updateRow({
      databaseId: ctx.ids.database,
      tableId: ctx.ids.students,
      rowId: existing.$id,
      data: { ...studentData(existing), credentialVersion, credentialDigest: ctx.digest(`credential:v${credentialVersion}:${credential}`), lastSeenAt: ctx.now() },
      permissions: [],
    })
    return { student: publicStudent(updated), credential, idempotentReplay: true }
  }

  const credentialVersion = 1
  const createData = {
      classId,
      teacherId: schoolClass.teacherId,
      ...parsedName,
      status: 'active',
      credentialDigest: ctx.digest(`credential:v${credentialVersion}:${credential}`),
      credentialVersion,
      registrationDigest,
      lastSeenAt: ctx.now(),
  }
  let created
  try {
    created = await ctx.tables.createRow({ databaseId: ctx.ids.database, tableId: ctx.ids.students, rowId: ctx.uniqueId(), data: createData, permissions: [] })
  } catch (reason) {
    if (reason?.code !== 409) throw reason
    const concurrent = await listOne(ctx, ctx.ids.students, ctx.queries.studentsByRegistrationDigest(registrationDigest))
    if (!concurrent || concurrent.status !== 'active') throw new StudentProgressError(409)
    const age = Date.parse(ctx.now()) - Date.parse(concurrent.$createdAt)
    if (!Number.isFinite(age) || age < 0 || age > ctx.registrationReplayWindowMs) throw new StudentProgressError(409)
    const credentialVersion = concurrent.credentialVersion + 1
    created = await ctx.tables.updateRow({ databaseId: ctx.ids.database, tableId: ctx.ids.students, rowId: concurrent.$id, data: { ...studentData(concurrent), credentialVersion, credentialDigest: ctx.digest(`credential:v${credentialVersion}:${credential}`), lastSeenAt: ctx.now() }, permissions: [] })
    return { student: publicStudent(created), credential, idempotentReplay: true }
  }
  return { student: publicStudent(created), credential, idempotentReplay: false }
}

function studentData(row, changes = {}) {
  return {
    classId: row.classId,
    teacherId: row.teacherId,
    displayName: row.displayName,
    normalizedName: row.normalizedName,
    status: row.status,
    credentialDigest: row.credentialDigest,
    credentialVersion: row.credentialVersion,
    registrationDigest: row.registrationDigest,
    ...(row.lastSeenAt ? { lastSeenAt: row.lastSeenAt } : {}),
    ...changes,
  }
}

async function me(payload, ctx) {
  exactKeys(payload, ['action', 'credential', 'studentId'])
  return { student: publicStudent(await authenticate(payload, ctx)) }
}

async function listCompletions(payload, ctx) {
  exactKeys(payload, ['action', 'credential', 'studentId'])
  const student = await authenticate(payload, ctx)
  const result = await ctx.tables.listRows({ databaseId: ctx.ids.database, tableId: ctx.ids.completions, queries: ctx.queries.completionsByStudent(student.$id) })
  return { completions: result.rows.map((row) => ({ exerciseId: row.exerciseId, completedAt: row.completedAt, evidenceType: row.evidenceType })) }
}

async function recordCompletion(payload, ctx) {
  exactKeys(payload, ['action', 'adapterId', 'attemptId', 'credential', 'earned', 'exerciseId', 'htmlSignature', 'manifestVersion', 'possible', 'requirementsSatisfied', 'studentId'])
  const student = await authenticate(payload, ctx)
  const exerciseId = requiredId(payload.exerciseId)
  if (typeof payload.attemptId !== 'string' || !attemptPattern.test(payload.attemptId)) throw new StudentProgressError(400)
  if (!Number.isInteger(payload.earned) || !Number.isInteger(payload.possible) || payload.possible < 1 || payload.earned < 0 || payload.earned > payload.possible) throw new StudentProgressError(400)
  if (payload.earned * 100 < payload.possible * 80) throw new StudentProgressError(422, 'Øvelsen er ikke gennemført endnu.')
  if (typeof payload.htmlSignature !== 'string' || !signaturePattern.test(payload.htmlSignature) || typeof payload.adapterId !== 'string') throw new StudentProgressError(400)
  if (payload.manifestVersion !== EXERCISE_RESULT_MANIFEST_VERSION || typeof payload.requirementsSatisfied !== 'boolean') throw new StudentProgressError(400)

  const adapter = getManifestAdapter(exerciseId)
  if (!adapter || adapter.id !== payload.adapterId || adapter.htmlSignature !== payload.htmlSignature || adapter.possible !== payload.possible) throw new StudentProgressError(422)
  if (adapter.requiresAdditionalCompletion && payload.requirementsSatisfied !== true) throw new StudentProgressError(422)

  let exercise
  try { exercise = await ctx.tables.getRow({ databaseId: ctx.ids.database, tableId: ctx.ids.exercises, rowId: exerciseId }) }
  catch { throw new StudentProgressError(422) }
  if (exercise.status !== 'published' || exercise.isPublished !== true) throw new StudentProgressError(422)
  const assignment = await listOne(ctx, ctx.ids.exerciseClasses, ctx.queries.publishedAssignment(exerciseId, student.classId, student.teacherId))
  if (!assignment || assignment.isPublished !== true) throw new StudentProgressError(422)

  const prior = await listOne(ctx, ctx.ids.completions, ctx.queries.completionByStudentExercise(student.$id, exerciseId))
  if (prior) return { completion: { exerciseId: prior.exerciseId, completedAt: prior.completedAt, evidenceType: prior.evidenceType }, alreadyCompleted: true }
  const completedAt = ctx.now()
  try {
    const created = await ctx.tables.createRow({
      databaseId: ctx.ids.database,
      tableId: ctx.ids.completions,
      rowId: ctx.uniqueId(),
      data: { studentId: student.$id, teacherId: student.teacherId, classIdAtCompletion: student.classId, exerciseId, completedAt, evidenceType: 'client-reported', adapterId: adapter.id, htmlSignature: adapter.htmlSignature },
      permissions: [],
    })
    return { completion: { exerciseId: created.exerciseId, completedAt: created.completedAt, evidenceType: created.evidenceType }, alreadyCompleted: false }
  } catch (reason) {
    if (reason?.code !== 409) throw reason
    const duplicate = await listOne(ctx, ctx.ids.completions, ctx.queries.completionByStudentExercise(student.$id, exerciseId))
    if (!duplicate) throw reason
    return { completion: { exerciseId: duplicate.exerciseId, completedAt: duplicate.completedAt, evidenceType: duplicate.evidenceType }, alreadyCompleted: true }
  }
}

export async function runStudentProgressOperation(payload, ctx) {
  if (!payload || typeof payload.action !== 'string') throw new StudentProgressError(400)
  switch (payload.action) {
    case 'student.register': return register(payload, ctx)
    case 'student.me': return me(payload, ctx)
    case 'student.listCompletions': return listCompletions(payload, ctx)
    case 'completion.record': return recordCompletion(payload, ctx)
    default: throw new StudentProgressError(400)
  }
}
