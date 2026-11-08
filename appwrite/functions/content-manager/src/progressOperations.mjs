import { OperationError } from './operations.mjs'

export class ProgressManagerError extends OperationError {}

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/
const validStatuses = new Set(['active', 'revoked', 'archived'])

function exactKeys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ProgressManagerError(400, 'Anmodningen er ugyldig.')
  const actual = Object.keys(value).sort()
  const expected = [...allowed].sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw new ProgressManagerError(400, 'Anmodningen er ugyldig.')
}

function requiredId(value) {
  if (typeof value !== 'string' || !idPattern.test(value)) throw new ProgressManagerError(400, 'ID er ugyldigt.')
  return value
}

function parsedName(value) {
  if (typeof value !== 'string') throw new ProgressManagerError(400, 'Navnet er ugyldigt.')
  const displayName = value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()
  if (!displayName || displayName.length > 128) throw new ProgressManagerError(400, 'Navnet er ugyldigt.')
  return { displayName, normalizedName: displayName.toLocaleLowerCase('da-DK') }
}

function studentData(row, changes = {}) {
  return {
    classId: row.classId, teacherId: row.teacherId, displayName: row.displayName, normalizedName: row.normalizedName,
    status: row.status, credentialDigest: row.credentialDigest, credentialVersion: row.credentialVersion,
    registrationDigest: row.registrationDigest, ...(row.lastSeenAt ? { lastSeenAt: row.lastSeenAt } : {}), ...changes,
  }
}

async function ownedClass(classId, ctx, requireActive = false) {
  let schoolClass
  try { schoolClass = await ctx.tables.getRow({ databaseId: ctx.ids.database, tableId: ctx.ids.classes, rowId: requiredId(classId) }) }
  catch { throw new ProgressManagerError(404, 'Klassen blev ikke fundet.') }
  if (schoolClass.teacherId !== ctx.userId) throw new ProgressManagerError(403, 'Du kan kun administrere dine egne klasser.')
  if (requireActive && schoolClass.status !== 'active') throw new ProgressManagerError(409, 'Klassen er ikke aktiv.')
  return schoolClass
}

async function ownedStudent(studentId, ctx, validateClass = true) {
  let student
  try { student = await ctx.tables.getRow({ databaseId: ctx.ids.database, tableId: ctx.ids.students, rowId: requiredId(studentId) }) }
  catch { throw new ProgressManagerError(404, 'Eleven blev ikke fundet.') }
  if (student.teacherId !== ctx.userId) throw new ProgressManagerError(403, 'Du kan kun administrere elever i dine egne klasser.')
  if (validateClass) await ownedClass(student.classId, ctx)
  return student
}

async function deleteRows(rows, tableId, ctx) {
  for (const row of rows) await ctx.tables.deleteRow({ databaseId: ctx.ids.database, tableId, rowId: row.$id }).catch((reason) => { if (reason?.code !== 404) throw reason })
  return rows.length
}

async function listClass(payload, ctx) {
  exactKeys(payload, ['action', 'classId'])
  const schoolClass = await ownedClass(payload.classId, ctx)
  const students = await ctx.tables.listRows({ databaseId: ctx.ids.database, tableId: ctx.ids.students, queries: ctx.queries.studentsByClass(schoolClass.$id, ctx.userId) })
  students.rows.sort((left, right) => left.normalizedName.localeCompare(right.normalizedName, 'da-DK') || left.$id.localeCompare(right.$id))
  const completionLists = await Promise.all(students.rows.map((student) => ctx.tables.listRows({ databaseId: ctx.ids.database, tableId: ctx.ids.completions, queries: ctx.queries.completionsByStudent(student.$id) })))
  const completions = completionLists.flatMap((result) => result.rows)
  return {
    class: { id: schoolClass.$id, name: schoolClass.name, status: schoolClass.status },
    students: students.rows.map((row) => ({ id: row.$id, idSuffix: row.$id.slice(-6), displayName: row.displayName, status: row.status, classId: row.classId, createdAt: row.$createdAt })),
    completions: completions.map((row) => ({ studentId: row.studentId, exerciseId: row.exerciseId, completedAt: row.completedAt, evidenceType: row.evidenceType })),
  }
}

async function rename(payload, ctx) {
  exactKeys(payload, ['action', 'displayName', 'studentId'])
  const student = await ownedStudent(payload.studentId, ctx)
  const updated = await ctx.tables.updateRow({ databaseId: ctx.ids.database, tableId: ctx.ids.students, rowId: student.$id, data: studentData(student, parsedName(payload.displayName)), permissions: [] })
  return { student: { id: updated.$id, displayName: updated.displayName, idSuffix: updated.$id.slice(-6) } }
}

async function moveClass(payload, ctx) {
  exactKeys(payload, ['action', 'classId', 'studentId'])
  const student = await ownedStudent(payload.studentId, ctx)
  const target = await ownedClass(payload.classId, ctx, true)
  const updated = await ctx.tables.updateRow({ databaseId: ctx.ids.database, tableId: ctx.ids.students, rowId: student.$id, data: studentData(student, { classId: target.$id }), permissions: [] })
  return { student: { id: updated.$id, classId: updated.classId }, completionsPreserved: true }
}

async function setStatus(payload, ctx) {
  exactKeys(payload, ['action', 'status', 'studentId'])
  if (!validStatuses.has(payload.status)) throw new ProgressManagerError(400, 'Elevstatus er ugyldig.')
  const student = await ownedStudent(payload.studentId, ctx)
  if (student.status === 'revoked' && payload.status === 'active') throw new ProgressManagerError(409, 'En tilbagekaldt adgang skal roteres, før eleven kan aktiveres.')
  const changes = { status: payload.status }
  if (payload.status === 'revoked') {
    changes.credentialVersion = student.credentialVersion + 1
    changes.credentialDigest = ctx.revokedDigest()
  }
  const updated = await ctx.tables.updateRow({ databaseId: ctx.ids.database, tableId: ctx.ids.students, rowId: student.$id, data: studentData(student, changes), permissions: [] })
  return { student: { id: updated.$id, status: updated.status } }
}

async function rotateCredential(payload, ctx) {
  exactKeys(payload, ['action', 'expectedCredentialVersion', 'studentId'])
  const student = await ownedStudent(payload.studentId, ctx)
  if (!Number.isInteger(payload.expectedCredentialVersion) || payload.expectedCredentialVersion !== student.credentialVersion) throw new ProgressManagerError(409, 'Elevens adgang er allerede ændret. Genindlæs siden.')
  const credential = ctx.newCredential()
  const credentialVersion = student.credentialVersion + 1
  const updated = await ctx.tables.updateRow({ databaseId: ctx.ids.database, tableId: ctx.ids.students, rowId: student.$id, data: studentData(student, { status: 'active', credentialVersion, credentialDigest: ctx.digest(`credential:v${credentialVersion}:${credential}`) }), permissions: [] })
  return { student: { id: updated.$id, status: updated.status }, credential }
}

async function deleteStudentProgress(student, ctx) {
  const listed = await ctx.tables.listRows({ databaseId: ctx.ids.database, tableId: ctx.ids.completions, queries: ctx.queries.completionsByStudent(student.$id) })
  return deleteRows(listed.rows, ctx.ids.completions, ctx)
}

async function deleteStudent(payload, ctx) {
  exactKeys(payload, ['action', 'studentId'])
  let student
  try { student = await ownedStudent(payload.studentId, ctx, false) }
  catch (reason) { if (reason instanceof ProgressManagerError && reason.status === 404) return { deleted: true, completionsDeleted: 0 }; throw reason }
  const completionsDeleted = await deleteStudentProgress(student, ctx)
  await ctx.tables.deleteRow({ databaseId: ctx.ids.database, tableId: ctx.ids.students, rowId: student.$id }).catch((reason) => { if (reason?.code !== 404) throw reason })
  return { deleted: true, completionsDeleted }
}

async function deleteProgressForStudent(payload, ctx) {
  exactKeys(payload, ['action', 'studentId'])
  let student
  try { student = await ownedStudent(payload.studentId, ctx, false) }
  catch (reason) { if (reason instanceof ProgressManagerError && reason.status === 404) return { deleted: 0 }; throw reason }
  return { deleted: await deleteStudentProgress(student, ctx) }
}

async function deleteProgressForClass(payload, ctx) {
  exactKeys(payload, ['action', 'classId'])
  const schoolClass = await ownedClass(payload.classId, ctx)
  const listed = await ctx.tables.listRows({ databaseId: ctx.ids.database, tableId: ctx.ids.completions, queries: ctx.queries.completionsByClass(schoolClass.$id, ctx.userId) })
  return { deleted: await deleteRows(listed.rows, ctx.ids.completions, ctx) }
}

export const PROGRESS_MANAGER_ACTIONS = new Set(['progress.listClass', 'student.rename', 'student.moveClass', 'student.setStatus', 'student.rotateCredential', 'student.delete', 'progress.deleteStudent', 'progress.deleteClass'])

export async function runProgressManagerOperation(payload, ctx) {
  if (!payload || typeof payload.action !== 'string') throw new ProgressManagerError(400, 'Anmodningen er ugyldig.')
  switch (payload.action) {
    case 'progress.listClass': return listClass(payload, ctx)
    case 'student.rename': return rename(payload, ctx)
    case 'student.moveClass': return moveClass(payload, ctx)
    case 'student.setStatus': return setStatus(payload, ctx)
    case 'student.rotateCredential': return rotateCredential(payload, ctx)
    case 'student.delete': return deleteStudent(payload, ctx)
    case 'progress.deleteStudent': return deleteProgressForStudent(payload, ctx)
    case 'progress.deleteClass': return deleteProgressForClass(payload, ctx)
    default: throw new ProgressManagerError(400, 'Handlingen understøttes ikke.')
  }
}
