export class OperationError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

const validId = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/
const validStatuses = new Set(['draft', 'published', 'archived'])

function requiredId(value, label) {
  if (typeof value !== 'string' || !validId.test(value)) throw new OperationError(400, `${label} er ugyldigt.`)
  return value
}

function requiredStatus(value) {
  if (typeof value !== 'string' || !validStatuses.has(value)) throw new OperationError(400, 'Status skal være draft, published eller archived.')
  return value
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
    return { exercise: updated }
  } catch (reason) {
    if (row.fileId) await setFilePermissions(ctx, row.fileId, previousPublished).catch(() => undefined)
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
    let cleanupPending = false
    if (row.fileId && row.fileId !== newFileId) {
      try { await ctx.storage.deleteFile({ bucketId: ctx.ids.bucket, fileId: row.fileId }) } catch { cleanupPending = true }
    }
    return { exercise: updated, cleanupPending }
  } catch (reason) {
    await setFilePermissions(ctx, newFileId, false).catch(() => undefined)
    if (row.fileId && row.fileId !== newFileId) await setFilePermissions(ctx, row.fileId, oldPublished).catch(() => undefined)
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
  return { deleted: true, cleanupPending }
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
    case 'content.publish': return publishContent(payload, ctx)
    default: throw new OperationError(400, 'Handlingen er ikke understøttet.')
  }
}
