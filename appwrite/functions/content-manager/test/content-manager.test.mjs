import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyTeacherSession } from '../src/authorization.mjs'
import { OperationError, runOperation } from '../src/operations.mjs'
import handler from '../src/main.mjs'

const ids = { database: 'db', exercises: 'exercises', content: 'content', versions: 'versions', bucket: 'bucket' }
const permissions = { public: ['read:any', 'teacher:write'], private: ['teacher:read', 'teacher:write'] }

function context(overrides = {}) {
  return {
    userId: 'teacher-1', ids, permissions,
    queries: { siteRows: ['site'] }, uniqueId: () => 'version-1', now: () => '2026-10-19T12:00:00.000Z',
    ...overrides,
  }
}

test('authorization rejects executions without a verified session JWT', async () => {
  await assert.rejects(() => verifyTeacherSession({ jwt: '', account: {}, teams: {}, teamId: 'teachers' }), (error) => error instanceof OperationError && error.status === 401)
})

test('the deployed handler returns 401 before any admin operation for an unauthenticated caller', async () => {
  process.env.APPWRITE_FUNCTION_API_ENDPOINT = 'https://example.invalid/v1'
  process.env.APPWRITE_FUNCTION_PROJECT_ID = 'project'
  process.env.TEACHERS_TEAM_ID = 'teachers'
  let response
  await handler({
    req: { method: 'POST', headers: {}, body: JSON.stringify({ action: 'exercise.delete', exerciseId: 'exercise-1' }) },
    res: { json: (body, status) => { response = { body, status }; return response } },
    error: () => undefined,
  })
  assert.equal(response.status, 401)
  assert.equal(response.body.ok, false)
})

test('authorization rejects an authenticated non-member', async () => {
  const denied = Object.assign(new Error('not a team member'), { code: 404 })
  await assert.rejects(() => verifyTeacherSession({ jwt: 'jwt', account: { get: async () => ({ $id: 'user-1' }) }, teams: { get: async () => { throw denied } }, teamId: 'teachers' }), denied)
})

test('authorization returns the server-verified teacher identity', async () => {
  const user = await verifyTeacherSession({ jwt: 'jwt', account: { get: async () => ({ $id: 'teacher-1' }) }, teams: { get: async ({ teamId }) => ({ $id: teamId }) }, teamId: 'teachers' })
  assert.equal(user.$id, 'teacher-1')
})

test('publishing updates file visibility before publishing the exercise row', async () => {
  const events = []
  const row = { $id: 'exercise-1', categoryId: 'category-1', title: 'Test', description: 'Test', duration: 10, difficulty: 'Mellem', kind: 'upload', accent: 'blue', status: 'draft', isPublished: false, sourceType: 'upload', fileId: 'file-1', fileName: 'test.html', fileSize: 10 }
  const result = await runOperation({ action: 'exercise.setStatus', exerciseId: row.$id, status: 'published' }, context({
    tables: { getRow: async () => row, updateRow: async (args) => { events.push(['row', args.data.status, args.permissions]); return { ...row, ...args.data } } },
    storage: { updateFile: async (args) => { events.push(['file', args.permissions]) } },
  }))
  assert.deepEqual(events.map((event) => event[0]), ['file', 'row'])
  assert.equal(result.exercise.status, 'published')
  assert.deepEqual(events[0][1], permissions.public)
})

test('archiving removes public file access and keeps the exercise row', async () => {
  let deleted = false
  let filePermissions
  const row = { $id: 'exercise-1', categoryId: 'category-1', title: 'Test', description: 'Test', duration: 10, difficulty: 'Mellem', kind: 'upload', accent: 'blue', status: 'published', isPublished: true, sourceType: 'upload', fileId: 'file-1' }
  const result = await runOperation({ action: 'exercise.setStatus', exerciseId: row.$id, status: 'archived' }, context({
    tables: { getRow: async () => row, updateRow: async ({ data }) => ({ ...row, ...data }), deleteRow: async () => { deleted = true } },
    storage: { updateFile: async ({ permissions: next }) => { filePermissions = next } },
  }))
  assert.equal(result.exercise.status, 'archived')
  assert.equal(result.exercise.isPublished, false)
  assert.deepEqual(filePermissions, permissions.private)
  assert.equal(deleted, false)
})

test('a failed row publication restores private file permissions', async () => {
  const permissionChanges = []
  const row = { $id: 'exercise-1', categoryId: 'category-1', title: 'Test', description: 'Test', duration: 10, difficulty: 'Mellem', kind: 'upload', accent: 'blue', status: 'draft', isPublished: false, sourceType: 'upload', fileId: 'file-1' }
  await assert.rejects(() => runOperation({ action: 'exercise.setStatus', exerciseId: row.$id, status: 'published' }, context({
    tables: { getRow: async () => row, updateRow: async () => { throw new Error('row failed') } },
    storage: { updateFile: async ({ permissions: next }) => { permissionChanges.push(next) } },
  })), /row failed/)
  assert.deepEqual(permissionChanges, [permissions.public, permissions.private])
})

test('file replacement validates HTML and deletes the old file only after the row update', async () => {
  const events = []
  const row = { $id: 'exercise-1', categoryId: 'category-1', title: 'Test', description: 'Test', duration: 10, difficulty: 'Mellem', kind: 'upload', accent: 'blue', status: 'published', isPublished: true, sourceType: 'upload', fileId: 'old-file', fileName: 'old.html', fileSize: 10 }
  const result = await runOperation({ action: 'exercise.replaceFile', exerciseId: row.$id, newFileId: 'new-file', status: 'published' }, context({
    tables: { getRow: async () => row, updateRow: async ({ data }) => { events.push('row-updated'); return { ...row, ...data } } },
    storage: {
      getFile: async () => ({ $id: 'new-file', name: 'new.html', sizeOriginal: 20 }),
      updateFile: async ({ fileId, permissions: next }) => { events.push(`${fileId}:${next === permissions.public ? 'public' : 'private'}`) },
      deleteFile: async ({ fileId }) => { events.push(`${fileId}:deleted`) },
    },
  }))
  assert.equal(result.exercise.fileId, 'new-file')
  assert.deepEqual(events, ['old-file:private', 'new-file:public', 'row-updated', 'old-file:deleted'])
})

test('permanent deletion makes the file private before deleting row and file', async () => {
  const events = []
  const row = { $id: 'exercise-1', status: 'published', isPublished: true, fileId: 'file-1' }
  await runOperation({ action: 'exercise.delete', exerciseId: row.$id }, context({
    tables: { getRow: async () => row, deleteRow: async () => { events.push('row-deleted') } },
    storage: { updateFile: async () => { events.push('file-private') }, deleteFile: async () => { events.push('file-deleted') } },
  }))
  assert.deepEqual(events, ['file-private', 'row-deleted', 'file-deleted'])
})

test('CMS publication derives publishedBy from verified context and creates a private version', async () => {
  const writes = []
  const result = await runOperation({ action: 'content.publish', content: { homepage: { title: 'Hej' } }, label: 'Testversion' }, context({
    tables: {
      listRows: async () => ({ rows: [] }),
      createRow: async (args) => { writes.push(args); return { $id: args.rowId, ...args.data } },
      deleteRow: async () => undefined,
    },
    storage: {},
  }))
  assert.equal(result.version, 1)
  assert.equal(writes[0].data.publishedBy, 'teacher-1')
  assert.deepEqual(writes[0].permissions, permissions.public)
  assert.deepEqual(writes[1].permissions, permissions.private)
})
