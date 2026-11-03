import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyTeacherSession } from '../src/authorization.mjs'
import { OperationError, runOperation } from '../src/operations.mjs'
import handler from '../src/main.mjs'

const ids = { database: 'db', exercises: 'exercises', classes: 'classes', exerciseClasses: 'exercise-classes', content: 'content', versions: 'versions', bucket: 'bucket' }
const permissions = { public: ['read:any', 'teacher:write'], private: ['teacher:read', 'teacher:write'] }

function context(overrides = {}) {
  return {
    userId: 'teacher-1', ids, permissions,
    tables: { listRows: async () => ({ rows: [] }), ...overrides.tables },
    storage: { ...overrides.storage },
    queries: {
      siteRows: ['site'],
      classesByTeacher: (teacherId) => ['teacher', teacherId],
      assignmentsByExercise: (exerciseId) => ['exercise', exerciseId],
      assignmentsByClass: (classId) => ['class', classId],
    },
    ownerPermissions: (ownerId, published) => published ? [`public:${ownerId}`] : [`private:${ownerId}`],
    uniqueId: () => 'version-1', now: () => '2026-10-19T12:00:00.000Z',
    ...overrides,
    tables: { listRows: async () => ({ rows: [] }), ...overrides.tables },
    storage: { ...overrides.storage },
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

test('class creation derives ownership and normalized duplicate key from the verified teacher', async () => {
  let created
  const result = await runOperation({ action: 'class.create', name: '  8.A  ' }, context({
    uniqueId: () => 'class-1',
    tables: {
      listRows: async () => ({ rows: [] }),
      createRow: async (args) => { created = args; return { $id: args.rowId, ...args.data } },
    },
  }))
  assert.equal(result.class.teacherId, 'teacher-1')
  assert.equal(created.data.name, '8.A')
  assert.equal(created.data.normalizedName, '8.a')
  assert.equal(created.data.activeNameKey, 'teacher-1:8.a')
  assert.deepEqual(created.permissions, ['public:teacher-1'])
})

test('a teacher cannot rename another teacher\'s class', async () => {
  await assert.rejects(() => runOperation({ action: 'class.update', classId: 'class-1', name: '9.A' }, context({
    tables: { getRow: async () => ({ $id: 'class-1', teacherId: 'teacher-2', status: 'active' }) },
  })), (error) => error instanceof OperationError && error.status === 403)
})

test('exercise.setClasses bulk assignment adds selected exercises without removing existing classes', async () => {
  const created = []
  const classes = {
    'class-1': { $id: 'class-1', teacherId: 'teacher-1', status: 'active' },
    'class-2': { $id: 'class-2', teacherId: 'teacher-1', status: 'active' },
  }
  const result = await runOperation({ action: 'exercise.setClasses', exerciseIds: ['exercise-1', 'exercise-2'], classIds: ['class-2'], mode: 'add' }, context({
    uniqueId: (() => { let id = 0; return () => `assignment-${++id}` })(),
    tables: {
      getRow: async ({ tableId, rowId }) => tableId === 'classes' ? classes[rowId] : { $id: rowId, status: 'published', isPublished: true },
      listRows: async ({ queries }) => queries[1] === 'exercise-1'
        ? { rows: [{ $id: 'existing-1', exerciseId: 'exercise-1', classId: 'class-1', teacherId: 'teacher-1', isPublished: true }] }
        : { rows: [] },
      createRow: async (args) => { created.push(args.data); return { $id: args.rowId, ...args.data } },
      deleteRow: async () => assert.fail('add mode must not delete existing assignments'),
    },
  }))
  assert.equal(result.created, 2)
  assert.equal(result.removed, 0)
  assert.deepEqual(created.map((item) => [item.exerciseId, item.classId]), [['exercise-1', 'class-2'], ['exercise-2', 'class-2']])
})

test('bulk removal only removes the selected class assignment', async () => {
  const deleted = []
  const result = await runOperation({ action: 'exercise.setClasses', exerciseIds: ['exercise-1'], classIds: ['class-1'], mode: 'remove' }, context({
    tables: {
      getRow: async ({ tableId, rowId }) => tableId === 'classes'
        ? { $id: rowId, teacherId: 'teacher-1', status: 'active' }
        : { $id: rowId, status: 'published', isPublished: true },
      listRows: async () => ({ rows: [
        { $id: 'assignment-1', exerciseId: 'exercise-1', classId: 'class-1', teacherId: 'teacher-1', isPublished: true },
        { $id: 'assignment-2', exerciseId: 'exercise-1', classId: 'class-2', teacherId: 'teacher-1', isPublished: true },
      ] }),
      deleteRow: async ({ rowId }) => { deleted.push(rowId) },
    },
  }))
  assert.equal(result.removed, 1)
  assert.deepEqual(deleted, ['assignment-1'])
})

test('archiving a class keeps assignments but removes their public visibility', async () => {
  const updates = []
  const schoolClass = { $id: 'class-1', name: '8.A', normalizedName: '8.a', activeNameKey: 'teacher-1:8.a', teacherId: 'teacher-1', displayOrder: 0, status: 'active' }
  const assignment = { $id: 'assignment-1', exerciseId: 'exercise-1', classId: 'class-1', teacherId: 'teacher-1', isPublished: true }
  const result = await runOperation({ action: 'class.setStatus', classId: 'class-1', status: 'archived' }, context({
    tables: {
      getRow: async ({ tableId }) => tableId === 'classes' ? schoolClass : { $id: 'exercise-1', status: 'published', isPublished: true },
      listRows: async () => ({ rows: [assignment] }),
      updateRow: async (args) => { updates.push(args); return { ...(args.tableId === 'classes' ? schoolClass : assignment), ...args.data } },
      deleteRow: async () => assert.fail('archiving must not delete assignments'),
    },
  }))
  assert.equal(result.class.status, 'archived')
  assert.equal(updates[1].data.isPublished, false)
  assert.deepEqual(updates[1].permissions, ['private:teacher-1'])
})

test('publishing an exercise exposes its assignment only when its class is active', async () => {
  const assignmentUpdates = []
  const exercise = { $id: 'exercise-1', categoryId: 'category-1', title: 'Test', description: 'Test', duration: 10, difficulty: 'Mellem', kind: 'upload', accent: 'blue', status: 'draft', isPublished: false, sourceType: 'upload' }
  await runOperation({ action: 'exercise.setStatus', exerciseId: 'exercise-1', status: 'published' }, context({
    tables: {
      getRow: async ({ tableId }) => tableId === 'exercises' ? exercise : { $id: 'class-1', status: 'active', teacherId: 'teacher-1' },
      listRows: async () => ({ rows: [{ $id: 'assignment-1', exerciseId: 'exercise-1', classId: 'class-1', teacherId: 'teacher-1', isPublished: false }] }),
      updateRow: async (args) => { if (args.tableId === 'exercise-classes') assignmentUpdates.push(args); return { ...exercise, ...args.data } },
    },
  }))
  assert.equal(assignmentUpdates[0].data.isPublished, true)
  assert.deepEqual(assignmentUpdates[0].permissions, ['public:teacher-1'])
})

test('class creation turns a unique-index conflict into a clear duplicate-name error', async () => {
  const duplicate = Object.assign(new Error('duplicate'), { code: 409 })
  await assert.rejects(() => runOperation({ action: 'class.create', name: '8.A' }, context({
    tables: { listRows: async () => ({ rows: [] }), createRow: async () => { throw duplicate } },
  })), (error) => error instanceof OperationError && error.status === 409 && /allerede/.test(error.message))
})

test('class.update preserves stable ID and ownership while changing normalized name', async () => {
  const row = { $id: 'class-1', name: '8.A', normalizedName: '8.a', activeNameKey: 'teacher-1:8.a', teacherId: 'teacher-1', displayOrder: 0, status: 'active' }
  let update
  const result = await runOperation({ action: 'class.update', classId: 'class-1', name: '  9.B  ' }, context({
    tables: {
      getRow: async () => row,
      updateRow: async (args) => { update = args; return { ...row, ...args.data } },
    },
  }))
  assert.equal(result.class.$id, 'class-1')
  assert.equal(result.class.name, '9.B')
  assert.equal(result.class.normalizedName, '9.b')
  assert.equal(result.class.activeNameKey, 'teacher-1:9.b')
  assert.deepEqual(update.permissions, ['public:teacher-1'])
})

test('class.reorder requires the complete owned class set and saves sequential positions', async () => {
  const rows = [
    { $id: 'class-1', name: '8.A', normalizedName: '8.a', activeNameKey: 'teacher-1:8.a', teacherId: 'teacher-1', displayOrder: 0, status: 'active' },
    { $id: 'class-2', name: '9.A', normalizedName: '9.a', activeNameKey: 'teacher-1:9.a', teacherId: 'teacher-1', displayOrder: 1, status: 'active' },
  ]
  const positions = []
  const result = await runOperation({ action: 'class.reorder', classIds: ['class-2', 'class-1'] }, context({
    tables: {
      listRows: async () => ({ rows }),
      getRow: async ({ rowId }) => rows.find((item) => item.$id === rowId),
      updateRow: async ({ rowId, data }) => { positions.push([rowId, data.displayOrder]); return { ...rows.find((item) => item.$id === rowId), ...data } },
    },
  }))
  assert.deepEqual(positions, [['class-2', 0], ['class-1', 1]])
  assert.deepEqual(result.classes.map((item) => item.$id), ['class-2', 'class-1'])
  await assert.rejects(() => runOperation({ action: 'class.reorder', classIds: ['class-1'] }, context({
    tables: { listRows: async () => ({ rows }) },
  })), (error) => error instanceof OperationError && error.status === 400)
})

test('exercise.setClasses replace changes one exercise exact set without touching its file', async () => {
  const created = []
  const deleted = []
  const classes = {
    'class-2': { $id: 'class-2', teacherId: 'teacher-1', status: 'active' },
  }
  const result = await runOperation({ action: 'exercise.setClasses', exerciseIds: ['exercise-1'], classIds: ['class-2'], mode: 'replace' }, context({
    tables: {
      getRow: async ({ tableId, rowId }) => tableId === 'classes' ? classes[rowId] : { $id: rowId, status: 'published', isPublished: true, fileId: 'file-1' },
      listRows: async () => ({ rows: [{ $id: 'assignment-1', exerciseId: 'exercise-1', classId: 'class-1', teacherId: 'teacher-1', isPublished: true }] }),
      createRow: async (args) => { created.push(args); return { $id: args.rowId, ...args.data } },
      deleteRow: async (args) => { deleted.push(args) },
    },
    storage: { updateFile: async () => assert.fail('class assignment must not touch HTML files') },
  }))
  assert.equal(result.created, 1)
  assert.equal(result.removed, 1)
  assert.equal(created[0].data.classId, 'class-2')
  assert.deepEqual(created[0].permissions, ['public:teacher-1'])
  assert.equal(deleted[0].rowId, 'assignment-1')
})

test('draft exercise assignments remain owner-private', async () => {
  let created
  await runOperation({ action: 'exercise.setClasses', exerciseIds: ['exercise-1'], classIds: ['class-1'], mode: 'add' }, context({
    tables: {
      getRow: async ({ tableId, rowId }) => tableId === 'classes'
        ? { $id: rowId, teacherId: 'teacher-1', status: 'active' }
        : { $id: rowId, status: 'draft', isPublished: false },
      listRows: async () => ({ rows: [] }),
      createRow: async (args) => { created = args; return { $id: args.rowId, ...args.data } },
    },
  }))
  assert.equal(created.data.isPublished, false)
  assert.deepEqual(created.permissions, ['private:teacher-1'])
})

test('exercise.setClasses rejects assignment to another teacher class', async () => {
  await assert.rejects(() => runOperation({ action: 'exercise.setClasses', exerciseIds: ['exercise-1'], classIds: ['class-1'], mode: 'add' }, context({
    tables: { getRow: async () => ({ $id: 'class-1', teacherId: 'teacher-2', status: 'active' }) },
  })), (error) => error instanceof OperationError && error.status === 403)
})

test('exercise.assignClasses remains a backwards-compatible alias', async () => {
  const result = await runOperation({ action: 'exercise.assignClasses', exerciseIds: ['exercise-1'], classIds: ['class-1'], mode: 'remove' }, context({
    tables: {
      getRow: async ({ tableId, rowId }) => tableId === 'classes' ? { $id: rowId, teacherId: 'teacher-1', status: 'active' } : { $id: rowId },
      listRows: async () => ({ rows: [] }),
    },
  }))
  assert.deepEqual(result, { created: 0, removed: 0 })
})

test('archiving an exercise makes all of its assignments owner-private', async () => {
  const assignmentUpdates = []
  const exercise = { $id: 'exercise-1', categoryId: 'category-1', title: 'Test', description: 'Test', duration: 10, difficulty: 'Mellem', kind: 'upload', accent: 'blue', status: 'published', isPublished: true, sourceType: 'upload' }
  await runOperation({ action: 'exercise.setStatus', exerciseId: 'exercise-1', status: 'archived' }, context({
    tables: {
      getRow: async ({ tableId }) => tableId === 'exercises' ? exercise : { $id: 'class-1', status: 'active', teacherId: 'teacher-1' },
      listRows: async () => ({ rows: [{ $id: 'assignment-1', exerciseId: 'exercise-1', classId: 'class-1', teacherId: 'teacher-1', isPublished: true }] }),
      updateRow: async (args) => { if (args.tableId === 'exercise-classes') assignmentUpdates.push(args); return { ...exercise, ...args.data } },
    },
  }))
  assert.equal(assignmentUpdates[0].data.isPublished, false)
  assert.deepEqual(assignmentUpdates[0].permissions, ['private:teacher-1'])
})

test('restoring a class republishes only assignments whose exercises are published', async () => {
  const updates = []
  const schoolClass = { $id: 'class-1', name: '8.A', normalizedName: '8.a', activeNameKey: 'archived:class-1', teacherId: 'teacher-1', displayOrder: 0, status: 'archived' }
  const assignments = [
    { $id: 'assignment-1', exerciseId: 'published-1', classId: 'class-1', teacherId: 'teacher-1', isPublished: false },
    { $id: 'assignment-2', exerciseId: 'draft-1', classId: 'class-1', teacherId: 'teacher-1', isPublished: false },
  ]
  await runOperation({ action: 'class.setStatus', classId: 'class-1', status: 'active' }, context({
    tables: {
      getRow: async ({ tableId, rowId }) => tableId === 'classes' ? schoolClass : { $id: rowId, status: rowId === 'published-1' ? 'published' : 'draft', isPublished: rowId === 'published-1' },
      listRows: async () => ({ rows: assignments }),
      updateRow: async (args) => { updates.push(args); return { ...(args.tableId === 'classes' ? schoolClass : assignments.find((item) => item.$id === args.rowId)), ...args.data } },
    },
  }))
  assert.equal(updates[1].data.isPublished, true)
  assert.deepEqual(updates[1].permissions, ['public:teacher-1'])
  assert.equal(updates[2].data.isPublished, false)
  assert.deepEqual(updates[2].permissions, ['private:teacher-1'])
})

test('restoring a duplicate archived class returns a conflict without changing assignments', async () => {
  const duplicate = Object.assign(new Error('duplicate'), { code: 409 })
  let assignmentsRead = false
  await assert.rejects(() => runOperation({ action: 'class.setStatus', classId: 'class-1', status: 'active' }, context({
    tables: {
      getRow: async () => ({ $id: 'class-1', name: '8.A', normalizedName: '8.a', activeNameKey: 'archived:class-1', teacherId: 'teacher-1', displayOrder: 0, status: 'archived' }),
      updateRow: async () => { throw duplicate },
      listRows: async () => { assignmentsRead = true; return { rows: [] } },
    },
  })), (error) => error instanceof OperationError && error.status === 409)
  assert.equal(assignmentsRead, false)
})
