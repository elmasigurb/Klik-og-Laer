import { createHmac, randomBytes } from 'node:crypto'
import { Account, Client, ID, Permission, Query, Role, Storage, TablesDB, Teams } from 'node-appwrite'
import { OperationError, runOperation } from './operations.mjs'
import { PROGRESS_MANAGER_ACTIONS, runProgressManagerOperation } from './progressOperations.mjs'
import { verifyTeacherSession } from './authorization.mjs'

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing Function variable: ${name}`)
  return value
}

async function verifiedTeacher(req) {
  const endpoint = required('APPWRITE_FUNCTION_API_ENDPOINT')
  const projectId = required('APPWRITE_FUNCTION_PROJECT_ID')
  const jwt = req.headers['x-appwrite-user-jwt']
  if (!jwt) throw new OperationError(401, 'Du skal være logget ind som lærer.')
  const callerClient = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt)
  return verifyTeacherSession({ jwt, account: new Account(callerClient), teams: new Teams(callerClient), teamId: required('TEACHERS_TEAM_ID') })
}

export default async ({ req, res, error }) => {
  if (req.method !== 'POST') return res.json({ ok: false, error: 'Kun POST er tilladt.' }, 405)
  try {
    const user = await verifiedTeacher(req)
    const key = req.headers['x-appwrite-key']
    if (!key) throw new Error('Functionens servernøgle mangler.')
    const teamId = required('TEACHERS_TEAM_ID')
    const adminClient = new Client()
      .setEndpoint(required('APPWRITE_FUNCTION_API_ENDPOINT'))
      .setProject(required('APPWRITE_FUNCTION_PROJECT_ID'))
      .setKey(key)
    const permissions = {
      private: [Permission.read(Role.team(teamId)), Permission.update(Role.team(teamId)), Permission.delete(Role.team(teamId))],
      public: [Permission.read(Role.any()), Permission.update(Role.team(teamId)), Permission.delete(Role.team(teamId))],
    }
    const ownerPermissions = (ownerId, published) => [
      ...(published ? [Permission.read(Role.any())] : []),
      Permission.read(Role.user(ownerId)),
    ]
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
    let body
    try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body }
    catch { throw new OperationError(400, 'Anmodningen indeholder ugyldig JSON.') }
    if (PROGRESS_MANAGER_ACTIONS.has(body?.action) && Buffer.byteLength(rawBody, 'utf8') > 8_192) throw new OperationError(413, 'Anmodningen er for stor.')
    const tables = new TablesDB(adminClient)
    const common = {
      userId: user.$id,
      tables,
    }
    let data
    if (PROGRESS_MANAGER_ACTIONS.has(body?.action)) {
      const credentialPepper = required('STUDENT_CREDENTIAL_PEPPER')
      if (Buffer.byteLength(credentialPepper, 'utf8') < 32) throw new Error('STUDENT_CREDENTIAL_PEPPER must contain at least 32 bytes.')
      data = await runProgressManagerOperation(body, {
        ...common,
        ids: {
          database: required('DATABASE_ID'), classes: required('CLASSES_TABLE_ID'),
          students: required('STUDENTS_TABLE_ID'), completions: required('EXERCISE_COMPLETIONS_TABLE_ID'),
        },
        queries: {
          studentsByClass: (classId, teacherId) => [Query.equal('classId', classId), Query.equal('teacherId', teacherId), Query.limit(500)],
          completionsByClass: (classId, teacherId) => [Query.equal('classIdAtCompletion', classId), Query.equal('teacherId', teacherId), Query.orderDesc('completedAt'), Query.limit(500)],
          completionsByStudent: (studentId) => [Query.equal('studentId', studentId), Query.limit(500)],
        },
        digest: (value) => createHmac('sha256', credentialPepper).update(value).digest('hex'),
        revokedDigest: () => createHmac('sha256', credentialPepper).update(`revoked:${randomBytes(32).toString('base64url')}`).digest('hex'),
        newCredential: () => randomBytes(32).toString('base64url'),
      })
    } else {
      data = await runOperation(body, {
        ...common,
        storage: new Storage(adminClient),
        permissions,
        ids: {
          database: required('DATABASE_ID'),
          exercises: required('EXERCISES_TABLE_ID'),
          classes: required('CLASSES_TABLE_ID'),
          exerciseClasses: required('EXERCISE_CLASSES_TABLE_ID'),
          content: required('CONTENT_TABLE_ID'),
          versions: required('CONTENT_VERSIONS_TABLE_ID'),
          bucket: required('EXERCISE_FILES_BUCKET_ID'),
        },
        queries: {
          siteRows: [Query.equal('pageId', 'site'), Query.limit(10)],
          classesByTeacher: (teacherId) => [Query.equal('teacherId', teacherId), Query.limit(500)],
          assignmentsByExercise: (exerciseId) => [Query.equal('exerciseId', exerciseId), Query.limit(500)],
          assignmentsByClass: (classId) => [Query.equal('classId', classId), Query.limit(500)],
        },
        ownerPermissions,
        uniqueId: () => ID.unique(),
        now: () => new Date().toISOString(),
      })
    }
    return res.json({ ok: true, data }, 200)
  } catch (reason) {
    const status = reason instanceof OperationError ? reason.status : reason?.code === 401 || reason?.code === 404 ? 403 : 500
    if (status >= 500) error(`Content manager failed: ${reason instanceof Error ? reason.message : 'unknown error'}`)
    return res.json({ ok: false, error: status >= 500 ? 'Den betroede handling kunne ikke gennemføres.' : reason.message }, status)
  }
}
