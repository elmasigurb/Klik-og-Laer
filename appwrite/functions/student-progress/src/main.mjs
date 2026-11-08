import { createHmac, randomBytes } from 'node:crypto'
import { Client, ID, Query, TablesDB } from 'node-appwrite'
import { runStudentProgressOperation, StudentProgressError } from './operations.mjs'

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing Function variable: ${name}`)
  return value
}

function parseBody(req) {
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
  if (Buffer.byteLength(raw, 'utf8') > 8 * 1024) throw new StudentProgressError(413)
  try { return JSON.parse(raw || '{}') } catch { throw new StudentProgressError(400) }
}

const safeMessages = {
  general_unauthorized_scope: 'Appwrite rejected the Function key scope.',
  general_rate_limit_exceeded: 'Appwrite rate limiting rejected the operation.',
  general_query_invalid: 'Appwrite rejected a database query.',
  row_invalid_structure: 'Appwrite rejected the row structure.',
  document_invalid_structure: 'Appwrite rejected the row structure.',
  row_already_exists: 'Appwrite reported a conflicting row.',
  document_already_exists: 'Appwrite reported a conflicting row.',
}

export function safeErrorMetadata(reason) {
  const code = Number.isInteger(reason?.code) ? reason.code : null
  const candidate = typeof reason?.type === 'string' ? reason.type : ''
  const type = /^[a-z0-9_.-]{1,80}$/.test(candidate) ? candidate : 'unknown'
  return { code, type, message: safeMessages[type] ?? 'Unexpected Appwrite operation failure.' }
}

export default async ({ req, res, error }) => {
  if (req.method !== 'POST') return res.json({ ok: false, error: 'Anmodningen kunne ikke gennemføres.' }, 405)
  try {
    const key = req.headers['x-appwrite-key']
    if (!key) throw new Error('Function server key missing.')
    const client = new Client().setEndpoint(required('APPWRITE_FUNCTION_API_ENDPOINT')).setProject(required('APPWRITE_FUNCTION_PROJECT_ID')).setKey(key)
    const tables = new TablesDB(client)
    const pepper = required('STUDENT_CREDENTIAL_PEPPER')
    if (Buffer.byteLength(pepper, 'utf8') < 32) throw new Error('STUDENT_CREDENTIAL_PEPPER must contain at least 32 bytes.')
    const data = await runStudentProgressOperation(parseBody(req), {
      tables,
      ids: {
        database: required('DATABASE_ID'), students: required('STUDENTS_TABLE_ID'), completions: required('EXERCISE_COMPLETIONS_TABLE_ID'),
        classes: required('CLASSES_TABLE_ID'), exercises: required('EXERCISES_TABLE_ID'), exerciseClasses: required('EXERCISE_CLASSES_TABLE_ID'),
      },
      queries: {
        studentsByRegistrationDigest: (digest) => [Query.equal('registrationDigest', digest), Query.limit(1)],
        completionsByStudent: (studentId) => [Query.equal('studentId', studentId), Query.orderDesc('completedAt'), Query.limit(500)],
        completionByStudentExercise: (studentId, exerciseId) => [Query.equal('studentId', studentId), Query.equal('exerciseId', exerciseId), Query.limit(1)],
        publishedAssignment: (exerciseId, classId, teacherId) => [Query.equal('exerciseId', exerciseId), Query.equal('classId', classId), Query.equal('teacherId', teacherId), Query.equal('isPublished', true), Query.limit(1)],
      },
      digest: (value) => createHmac('sha256', pepper).update(value).digest('hex'),
      newCredential: () => randomBytes(32).toString('base64url'),
      uniqueId: () => ID.unique(),
      now: () => new Date().toISOString(),
      registrationReplayWindowMs: Math.min(3_600, Math.max(60, Number(process.env.REGISTRATION_IDEMPOTENCY_WINDOW_SECONDS) || 600)) * 1000,
    })
    return res.json({ ok: true, data }, 200)
  } catch (reason) {
    const status = reason instanceof StudentProgressError ? reason.status : 500
    if (status >= 500) error(JSON.stringify({ event: 'student-progress.failure', ...safeErrorMetadata(reason) }))
    return res.json({ ok: false, error: status === 422 ? reason.message : 'Anmodningen kunne ikke gennemføres.' }, status)
  }
}
