const requiredEnvironment = [
  'VITE_APPWRITE_ENDPOINT',
  'VITE_APPWRITE_PROJECT_ID',
  'VITE_APPWRITE_TEACHERS_TEAM_ID',
  'VITE_APPWRITE_DATABASE_ID',
  'VITE_APPWRITE_PROFILES_TABLE_ID',
  'VITE_APPWRITE_CATEGORIES_TABLE_ID',
  'VITE_APPWRITE_EXERCISES_TABLE_ID',
  'VITE_APPWRITE_CONTENT_TABLE_ID',
  'VITE_APPWRITE_CONTENT_VERSIONS_TABLE_ID',
  'VITE_APPWRITE_STUDENT_PROGRESS_TABLE_ID',
  'VITE_APPWRITE_EXERCISE_FILES_BUCKET_ID',
]

for (const name of requiredEnvironment) {
  if (!process.env[name]?.trim()) throw new Error(`Missing environment variable: ${name}`)
}

const endpoint = process.env.VITE_APPWRITE_ENDPOINT.replace(/\/$/, '')
const projectId = process.env.VITE_APPWRITE_PROJECT_ID
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID
const teachersTeamId = process.env.VITE_APPWRITE_TEACHERS_TEAM_ID
const auditKey = process.env.APPWRITE_AUDIT_KEY?.trim() || process.env.APPWRITE_SETUP_KEY?.trim()
if (!auditKey) throw new Error('Missing environment variable: APPWRITE_AUDIT_KEY or APPWRITE_SETUP_KEY')

const headers = {
  'X-Appwrite-Project': projectId,
  'X-Appwrite-Key': auditKey,
  Accept: 'application/json',
}

async function request(path) {
  const response = await fetch(`${endpoint}${path}`, { headers })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(`${response.status} ${payload.type ?? 'request_failed'}: ${payload.message ?? 'Unknown Appwrite error'}`)
    error.status = response.status
    throw error
  }
  return payload
}

const tableDefinitions = [
  ['profiles', process.env.VITE_APPWRITE_PROFILES_TABLE_ID],
  ['categories', process.env.VITE_APPWRITE_CATEGORIES_TABLE_ID],
  ['exercises', process.env.VITE_APPWRITE_EXERCISES_TABLE_ID],
  ['content', process.env.VITE_APPWRITE_CONTENT_TABLE_ID],
  ['contentVersions', process.env.VITE_APPWRITE_CONTENT_VERSIONS_TABLE_ID],
  ['studentProgress', process.env.VITE_APPWRITE_STUDENT_PROGRESS_TABLE_ID],
]

function summarizeColumn(column) {
  return {
    key: column.key,
    type: column.type ?? column.$type,
    required: column.required,
    array: column.array,
    size: column.size,
    status: column.status,
    relatedTable: column.relatedTable,
    relationType: column.relationType,
    twoWay: column.twoWay,
  }
}

function summarizeIndex(index) {
  return {
    key: index.key,
    type: index.type,
    columns: index.columns ?? index.attributes,
    orders: index.orders,
    status: index.status,
  }
}

function summarizePermissions(permissions = []) {
  return [...permissions].sort()
}

async function inspectTable([alias, tableId]) {
  const encodedDatabase = encodeURIComponent(databaseId)
  const encodedTable = encodeURIComponent(tableId)
  const base = `/tablesdb/${encodedDatabase}/tables/${encodedTable}`
  const [table, columnsResult, indexesResult, rowsResult] = await Promise.all([
    request(base),
    request(`${base}/columns?total=false`),
    request(`${base}/indexes?total=false`),
    request(`${base}/rows?total=false`),
  ])

  const columns = columnsResult.columns ?? table.columns ?? []
  const indexes = indexesResult.indexes ?? table.indexes ?? []
  const rows = rowsResult.rows ?? []

  return {
    alias,
    id: table.$id,
    name: table.name,
    enabled: table.enabled,
    rowSecurity: table.rowSecurity,
    permissions: summarizePermissions(table.$permissions),
    columns: columns.map(summarizeColumn),
    indexes: indexes.map(summarizeIndex),
    rowsReturned: rows.length,
    rowPermissionAudit: rows.map((row) => ({
      id: row.$id,
      isPublished: typeof row.isPublished === 'boolean' ? row.isPublished : undefined,
      permissions: summarizePermissions(row.$permissions),
    })),
  }
}

const tables = []
for (const definition of tableDefinitions) tables.push(await inspectTable(definition))

const team = await request(`/teams/${encodeURIComponent(teachersTeamId)}`)
const bucketId = process.env.VITE_APPWRITE_EXERCISE_FILES_BUCKET_ID
const encodedBucket = encodeURIComponent(bucketId)
const [bucket, filesResult] = await Promise.all([
  request(`/storage/buckets/${encodedBucket}`),
  request(`/storage/buckets/${encodedBucket}/files?total=false`),
])

const output = {
  auditedAt: new Date().toISOString(),
  projectId,
  databaseId,
  teachersTeam: {
    id: team.$id,
    name: team.name,
    totalMembers: team.total,
  },
  tables,
  bucket: {
    id: bucket.$id,
    name: bucket.name,
    enabled: bucket.enabled,
    fileSecurity: bucket.fileSecurity,
    maximumFileSize: bucket.maximumFileSize,
    allowedFileExtensions: bucket.allowedFileExtensions,
    encryption: bucket.encryption,
    antivirus: bucket.antivirus,
    permissions: summarizePermissions(bucket.$permissions),
    filesReturned: filesResult.files?.length ?? 0,
    filePermissionAudit: (filesResult.files ?? []).map((file) => ({
      id: file.$id,
      name: file.name,
      mimeType: file.mimeType,
      sizeOriginal: file.sizeOriginal,
      permissions: summarizePermissions(file.$permissions),
    })),
  },
}

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
