export class OperationError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

const validId = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/
const validStatuses = new Set(['draft', 'published', 'archived'])
const validClassStatuses = new Set(['active', 'archived'])

function requiredId(value, label) {
  if (typeof value !== 'string' || !validId.test(value)) throw new OperationError(400, `${label} er ugyldigt.`)
  return value
}

function requiredStatus(value) {
  if (typeof value !== 'string' || !validStatuses.has(value)) throw new OperationError(400, 'Status skal være draft, published eller archived.')
  return value
}

function requiredClassStatus(value) {
  if (typeof value !== 'string' || !validClassStatuses.has(value)) throw new OperationError(400, 'Klassestatus skal være active eller archived.')
  return value
}

function className(value) {
  if (typeof value !== 'string') throw new OperationError(400, 'Klassen skal have et navn.')
  const name = value.normalize('NFKC').replace(/\s+/g, ' ').trim()
  if (!name || name.length > 128) throw new OperationError(400, 'Klassenavnet skal være mellem 1 og 128 tegn.')
  return { name, normalizedName: name.toLocaleLowerCase('da-DK') }
}

function requiredIds(value, label, maximum = 200) {
  if (!Array.isArray(value) || value.length > maximum) throw new OperationError(400, `${label} er ugyldige.`)
  return [...new Set(value.map((item) => requiredId(item, label)))]
}

function assertOwned(row, ctx) {
  if (row.teacherId !== ctx.userId) throw new OperationError(403, 'Du kan kun administrere dine egne klasser og klassetilknytninger.')
}

function classRowData(row, changes = {}) {
  return {
    name: row.name,
    normalizedName: row.normalizedName,
    activeNameKey: row.activeNameKey,
    teacherId: row.teacherId,
    displayOrder: row.displayOrder,
    status: row.status,
    ...changes,
  }
}

function assignmentData(row, changes = {}) {
  return {
    exerciseId: row.exerciseId,
    classId: row.classId,
    teacherId: row.teacherId,
    isPublished: row.isPublished,
    ...changes,
  }
}

function classPermissions(ctx, ownerId, published) {
  return ctx.ownerPermissions(ownerId, published)
}

async function listExerciseAssignments(ctx, exerciseId) {
  return (await ctx.tables.listRows({
    databaseId: ctx.ids.database,
    tableId: ctx.ids.exerciseClasses,
    queries: ctx.queries.assignmentsByExercise(exerciseId),
  })).rows
}

async function syncExerciseAssignments(ctx, exerciseId, exercisePublished) {
  const assignments = await listExerciseAssignments(ctx, exerciseId)
  for (const assignment of assignments) {
    const schoolClass = await ctx.tables.getRow({ databaseId: ctx.ids.database, tableId: ctx.ids.classes, rowId: assignment.classId })
    const visible = Boolean(exercisePublished && schoolClass.status === 'active')
    await ctx.tables.updateRow({
      databaseId: ctx.ids.database,
      tableId: ctx.ids.exerciseClasses,
      rowId: assignment.$id,
      data: assignmentData(assignment, { isPublished: visible }),
      permissions: classPermissions(ctx, assignment.teacherId, visible),
    })
  }
}

function exerciseData(row, changes = {}) {
  return {
    categoryId: row.categoryId,
    title: row.title,
    description: row.description,
    duration: row.duration,
    difficulty: row.difficulty,
    kind: row.kind,
    accent: row.accent,
    status: row.status,
    isPublished: row.isPublished,
    sourceType: row.sourceType,
    ...(row.fileId ? { fileId: row.fileId } : {}),
    ...(row.fileName ? { fileName: row.fileName } : {}),
    ...(Number.isFinite(row.fileSize) ? { fileSize: row.fileSize } : {}),
    ...changes,
  }
}

async function setFilePermissions(ctx, fileId, published) {
  if (!fileId) return
  await ctx.storage.updateFile({ bucketId: ctx.ids.bucket, fileId, permissions: published ? ctx.permissions.public : ctx.permissions.private })
}

async function setExerciseStatus(payload, ctx) {
  const exerciseId = requiredId(payload.exerciseId, 'Øvelses-ID')
  const status = requiredStatus(payload.status)
  const row = await ctx.tables.getRow({ databaseId: ctx.ids.database, tableId: ctx.ids.exercises, rowId: exerciseId })
  const previousStatus = validStatuses.has(row.status) ? row.status : row.isPublished ? 'published' : 'draft'
  const previousPublished = previousStatus === 'published'
  const nextPublished = status === 'published'
  if (row.fileId) await setFilePermissions(ctx, row.fileId, nextPublished)
  try {
    const updated = await ctx.tables.updateRow({
      databaseId: ctx.ids.database,
      tableId: ctx.ids.exercises,
      rowId: exerciseId,
      data: exerciseData(row, { status, isPublished: nextPublished }),
      permissions: nextPublished ? ctx.permissions.public : ctx.permissions.private,
    })
    await syncExerciseAssignments(ctx, exerciseId, nextPublished)
    return { exercise: updated }
  } catch (reason) {
    if (row.fileId) await setFilePermissions(ctx, row.fileId, previousPublished).catch(() => undefined)
    await ctx.tables.updateRow({
      databaseId: ctx.ids.database,
      tableId: ctx.ids.exercises,
      rowId: exerciseId,
      data: exerciseData(row, { status: previousStatus, isPublished: previousPublished }),
      permissions: previousPublished ? ctx.permissions.public : ctx.permissions.private,
    }).catch(() => undefined)
    await syncExerciseAssignments(ctx, exerciseId, previousPublished).catch(() => undefined)
    throw reason
  }
}

async function replaceExerciseFile(payload, ctx) {
  const exerciseId = requiredId(payload.exerciseId, 'Øvelses-ID')
  const newFileId = requiredId(payload.newFileId, 'Fil-ID')
  const status = requiredStatus(payload.status)
  const row = await ctx.tables.getRow({ databaseId: ctx.ids.database, tableId: ctx.ids.exercises, rowId: exerciseId })
  const file = await ctx.storage.getFile({ bucketId: ctx.ids.bucket, fileId: newFileId })
  if (!file.name.toLowerCase().endsWith('.html') || file.sizeOriginal > 2 * 1024 * 1024) throw new OperationError(400, 'Erstatningsfilen skal være en HTML-fil på højst 2 MB.')
  const oldPublished = row.status === 'published' && row.isPublished
  const nextPublished = status === 'published'
  if (row.fileId && row.fileId !== newFileId) await setFilePermissions(ctx, row.fileId, false)
  await setFilePermissions(ctx, newFileId, nextPublished)
  try {
    const updated = await ctx.tables.updateRow({
      databaseId: ctx.ids.database,
      tableId: ctx.ids.exercises,
      rowId: exerciseId,
      data: exerciseData(row, { fileId: file.$id, fileName: file.name, fileSize: file.sizeOriginal, sourceType: 'upload', kind: 'upload', status, isPublished: nextPublished }),
      permissions: nextPublished ? ctx.permissions.public : ctx.permissions.private,
    })
    await syncExerciseAssignments(ctx, exerciseId, nextPublished)
    let cleanupPending = false
    if (row.fileId && row.fileId !== newFileId) {
      try { await ctx.storage.deleteFile({ bucketId: ctx.ids.bucket, fileId: row.fileId }) } catch { cleanupPending = true }
    }
    return { exercise: updated, cleanupPending }
  } catch (reason) {
    await setFilePermissions(ctx, newFileId, false).catch(() => undefined)
    if (row.fileId && row.fileId !== newFileId) await setFilePermissions(ctx, row.fileId, oldPublished).catch(() => undefined)
    await syncExerciseAssignments(ctx, exerciseId, oldPublished).catch(() => undefined)
    throw reason
  }
}

async function deleteExercise(payload, ctx) {
  const exerciseId = requiredId(payload.exerciseId, 'Øvelses-ID')
  const row = await ctx.tables.getRow({ databaseId: ctx.ids.database, tableId: ctx.ids.exercises, rowId: exerciseId })
  const wasPublished = row.status === 'published' && row.isPublished
  if (row.fileId) await setFilePermissions(ctx, row.fileId, false)
  try { await ctx.tables.deleteRow({ databaseId: ctx.ids.database, tableId: ctx.ids.exercises, rowId: exerciseId }) }
  catch (reason) {
    if (row.fileId) await setFilePermissions(ctx, row.fileId, wasPublished).catch(() => undefined)
    throw reason
  }
  let cleanupPending = false
  if (row.fileId) {
    try { await ctx.storage.deleteFile({ bucketId: ctx.ids.bucket, fileId: row.fileId }) } catch { cleanupPending = true }
  }
  const assignments = await listExerciseAssignments(ctx, exerciseId).catch(() => [])
  for (const assignment of assignments) {
    try { await ctx.tables.deleteRow({ databaseId: ctx.ids.database, tableId: ctx.ids.exerciseClasses, rowId: assignment.$id }) }
    catch { cleanupPending = true }
  }
  return { deleted: true, cleanupPending }
}

async function createClass(payload, ctx) {
  const parsed = className(payload.name)
  const classId = ctx.uniqueId()
  const listed = await ctx.tables.listRows({ databaseId: ctx.ids.database, tableId: ctx.ids.classes, queries: ctx.queries.classesByTeacher(ctx.userId) })
  const displayOrder = listed.rows.length
  const data = {
    ...parsed,
    activeNameKey: `${ctx.userId}:${parsed.normalizedName}`,
    teacherId: ctx.userId,
    displayOrder,
    status: 'active',
  }
  try {
    const schoolClass = await ctx.tables.createRow({
      databaseId: ctx.ids.database,
      tableId: ctx.ids.classes,
      rowId: classId,
      data,
      permissions: classPermissions(ctx, ctx.userId, true),
    })
    return { class: schoolClass }
  } catch (reason) {
    if (reason?.code === 409) throw new OperationError(409, 'Du har allerede en aktiv klasse med dette navn.')
    throw reason
  }
}

async function updateClass(payload, ctx) {
  const classId = requiredId(payload.classId, 'Klasse-ID')
  const parsed = className(payload.name)
  const row = await ctx.tables.getRow({ databaseId: ctx.ids.database, tableId: ctx.ids.classes, rowId: classId })
  assertOwned(row, ctx)
  const activeNameKey = row.status === 'active' ? `${ctx.userId}:${parsed.normalizedName}` : `archived:${row.$id}`
  try {
    const schoolClass = await ctx.tables.updateRow({
      databaseId: ctx.ids.database,
      tableId: ctx.ids.classes,
      rowId: classId,
      data: classRowData(row, { ...parsed, activeNameKey }),
      permissions: classPermissions(ctx, ctx.userId, row.status === 'active'),
    })
    return { class: schoolClass }
  } catch (reason) {
    if (reason?.code === 409) throw new OperationError(409, 'Du har allerede en aktiv klasse med dette navn.')
    throw reason
  }
}

async function setClassStatus(payload, ctx) {
  const classId = requiredId(payload.classId, 'Klasse-ID')
  const status = requiredClassStatus(payload.status)
  const row = await ctx.tables.getRow({ databaseId: ctx.ids.database, tableId: ctx.ids.classes, rowId: classId })
  assertOwned(row, ctx)
  const visible = status === 'active'
  const activeNameKey = visible ? `${ctx.userId}:${row.normalizedName}` : `archived:${row.$id}`
  let schoolClass
  try {
    schoolClass = await ctx.tables.updateRow({
      databaseId: ctx.ids.database,
      tableId: ctx.ids.classes,
      rowId: classId,
      data: classRowData(row, { status, activeNameKey }),
      permissions: classPermissions(ctx, ctx.userId, visible),
    })
  } catch (reason) {
    if (reason?.code === 409) throw new OperationError(409, 'Klassen kan ikke gendannes, fordi en aktiv klasse allerede bruger navnet.')
    throw reason
  }
  const assignments = (await ctx.tables.listRows({ databaseId: ctx.ids.database, tableId: ctx.ids.exerciseClasses, queries: ctx.queries.assignmentsByClass(classId) })).rows
  for (const assignment of assignments) {
    const exercise = await ctx.tables.getRow({ databaseId: ctx.ids.database, tableId: ctx.ids.exercises, rowId: assignment.exerciseId })
    const assignmentVisible = Boolean(visible && exercise.status === 'published' && exercise.isPublished)
    await ctx.tables.updateRow({
      databaseId: ctx.ids.database,
      tableId: ctx.ids.exerciseClasses,
      rowId: assignment.$id,
      data: assignmentData(assignment, { isPublished: assignmentVisible }),
      permissions: classPermissions(ctx, ctx.userId, assignmentVisible),
    })
  }
  return { class: schoolClass }
}

async function reorderClasses(payload, ctx) {
  const classIds = requiredIds(payload.classIds, 'Klasse-ID')
  if (!classIds.length) throw new OperationError(400, 'Vælg mindst én klasse.')
  const owned = (await ctx.tables.listRows({ databaseId: ctx.ids.database, tableId: ctx.ids.classes, queries: ctx.queries.classesByTeacher(ctx.userId) })).rows
  if (owned.length !== classIds.length || owned.some((row) => !classIds.includes(row.$id))) throw new OperationError(400, 'Rækkefølgen skal indeholde alle dine klasser præcis én gang.')
  const rows = await Promise.all(classIds.map((classId) => ctx.tables.getRow({ databaseId: ctx.ids.database, tableId: ctx.ids.classes, rowId: classId })))
  rows.forEach((row) => assertOwned(row, ctx))
  const updated = []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    updated.push(await ctx.tables.updateRow({
      databaseId: ctx.ids.database,
      tableId: ctx.ids.classes,
      rowId: row.$id,
      data: classRowData(row, { displayOrder: index }),
      permissions: classPermissions(ctx, ctx.userId, row.status === 'active'),
    }))
  }
  return { classes: updated }
}

async function assignExerciseClasses(payload, ctx) {
  const exerciseIds = requiredIds(payload.exerciseIds, 'Øvelses-ID')
  const classIds = requiredIds(payload.classIds, 'Klasse-ID')
  const mode = payload.mode
  if (!exerciseIds.length) throw new OperationError(400, 'Vælg mindst én øvelse.')
  if (!['add', 'remove', 'replace'].includes(mode)) throw new OperationError(400, 'Tilknytningstilstanden er ugyldig.')
  if (mode === 'replace' && exerciseIds.length !== 1) throw new OperationError(400, 'Erstatning af klasser kan kun udføres for én øvelse ad gangen.')
  if (mode !== 'replace' && !classIds.length) throw new OperationError(400, 'Vælg mindst én klasse.')

  const selectedClasses = await Promise.all(classIds.map((classId) => ctx.tables.getRow({ databaseId: ctx.ids.database, tableId: ctx.ids.classes, rowId: classId })))
  selectedClasses.forEach((row) => {
    assertOwned(row, ctx)
    if (mode === 'add' && row.status !== 'active') throw new OperationError(400, 'Arkiverede klasser kan ikke modtage nye øvelser.')
  })

  let created = 0
  let removed = 0
  for (const exerciseId of exerciseIds) {
    const exercise = await ctx.tables.getRow({ databaseId: ctx.ids.database, tableId: ctx.ids.exercises, rowId: exerciseId })
    const existing = (await listExerciseAssignments(ctx, exerciseId)).filter((assignment) => assignment.teacherId === ctx.userId)
    const existingByClass = new Map(existing.map((assignment) => [assignment.classId, assignment]))
    const desired = mode === 'replace'
      ? new Set(classIds)
      : mode === 'add'
        ? new Set([...existingByClass.keys(), ...classIds])
        : new Set([...existingByClass.keys()].filter((classId) => !classIds.includes(classId)))

    if (mode === 'replace' && selectedClasses.some((schoolClass) => schoolClass.status === 'archived' && !existingByClass.has(schoolClass.$id))) throw new OperationError(400, 'Arkiverede klasser kan ikke modtage nye øvelser.')

    for (const classId of desired) {
      if (existingByClass.has(classId)) continue
      const schoolClass = selectedClasses.find((item) => item.$id === classId)
      if (!schoolClass) throw new OperationError(403, 'Klassen tilhører ikke den aktuelle lærer.')
      const visible = Boolean(schoolClass.status === 'active' && exercise.status === 'published' && exercise.isPublished)
      await ctx.tables.createRow({
        databaseId: ctx.ids.database,
        tableId: ctx.ids.exerciseClasses,
        rowId: ctx.uniqueId(),
        data: { exerciseId, classId, teacherId: ctx.userId, isPublished: visible },
        permissions: classPermissions(ctx, ctx.userId, visible),
      })
      created += 1
    }
    for (const [classId, assignment] of existingByClass) {
      if (desired.has(classId)) continue
      await ctx.tables.deleteRow({ databaseId: ctx.ids.database, tableId: ctx.ids.exerciseClasses, rowId: assignment.$id })
      removed += 1
    }
  }
  return { created, removed }
}

function contentJson(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new OperationError(400, 'Websiteindholdet er ugyldigt.')
  const json = JSON.stringify(value)
  if (new TextEncoder().encode(json).length > 65535) throw new OperationError(400, 'Websiteindholdet er for stort.')
  return json
}

async function publishContent(payload, ctx) {
  const json = contentJson(payload.content)
  const label = typeof payload.label === 'string' && payload.label.trim() ? payload.label.trim().slice(0, 200) : 'Udgivet indhold'
  const listed = await ctx.tables.listRows({ databaseId: ctx.ids.database, tableId: ctx.ids.content, queries: ctx.queries.siteRows })
  const existing = listed.rows.find((row) => row.isPublished)
  const draft = listed.rows.find((row) => !row.isPublished)
  const version = (existing?.version ?? 0) + 1
  const publishedAt = ctx.now()
  const data = { pageId: 'site', contentJson: json, isPublished: true, version, publishedAt, publishedBy: ctx.userId }
  const published = existing
    ? await ctx.tables.updateRow({ databaseId: ctx.ids.database, tableId: ctx.ids.content, rowId: existing.$id, data, permissions: ctx.permissions.public })
    : await ctx.tables.createRow({ databaseId: ctx.ids.database, tableId: ctx.ids.content, rowId: 'site-published', data, permissions: ctx.permissions.public })
  let snapshot
  try {
    snapshot = await ctx.tables.createRow({
      databaseId: ctx.ids.database,
      tableId: ctx.ids.versions,
      rowId: ctx.uniqueId(),
      data: { pageId: 'site', contentJson: json, version, sourceRowId: published.$id, label, publishedAt, publishedBy: ctx.userId },
      permissions: ctx.permissions.private,
    })
  } catch (reason) {
    if (existing) {
      const previous = { pageId: existing.pageId, contentJson: existing.contentJson, isPublished: true, version: existing.version, ...(existing.publishedAt ? { publishedAt: existing.publishedAt } : {}), ...(existing.publishedBy ? { publishedBy: existing.publishedBy } : {}) }
      await ctx.tables.updateRow({ databaseId: ctx.ids.database, tableId: ctx.ids.content, rowId: existing.$id, data: previous, permissions: ctx.permissions.public }).catch(() => undefined)
    } else await ctx.tables.deleteRow({ databaseId: ctx.ids.database, tableId: ctx.ids.content, rowId: published.$id }).catch(() => undefined)
    throw reason
  }
  if (draft) await ctx.tables.deleteRow({ databaseId: ctx.ids.database, tableId: ctx.ids.content, rowId: draft.$id }).catch(() => undefined)
  return { publishedId: published.$id, versionId: snapshot.$id, version, publishedAt }
}

export async function runOperation(payload, ctx) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new OperationError(400, 'Anmodningen er ugyldig.')
  switch (payload.action) {
    case 'exercise.setStatus': return setExerciseStatus(payload, ctx)
    case 'exercise.replaceFile': return replaceExerciseFile(payload, ctx)
    case 'exercise.delete': return deleteExercise(payload, ctx)
    case 'exercise.setClasses':
    case 'exercise.assignClasses': return assignExerciseClasses(payload, ctx)
    case 'class.create': return createClass(payload, ctx)
    case 'class.update': return updateClass(payload, ctx)
    case 'class.setStatus': return setClassStatus(payload, ctx)
    case 'class.reorder': return reorderClasses(payload, ctx)
    case 'content.publish': return publishContent(payload, ctx)
    default: throw new OperationError(400, 'Handlingen er ikke understøttet.')
  }
}
