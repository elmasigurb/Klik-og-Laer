import {
  Client,
  OrderBy,
  Permission,
  Role,
  Storage,
  TablesDB,
  TablesDBIndexType,
  Teams,
} from 'node-appwrite'

const apply = process.argv.includes('--apply')

if (process.argv.includes('--help')) {
  process.stdout.write(`Usage: npm run setup:appwrite -- [--apply]\n\n`)
  process.stdout.write(`Without --apply, this command is a read-only dry run.\n`)
  process.stdout.write(`With --apply, it applies the displayed schema and security changes.\n`)
  process.exit(0)
}

const commonEnvironment = [
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

const keyEnvironment = apply
  ? 'APPWRITE_SETUP_KEY'
  : process.env.APPWRITE_AUDIT_KEY?.trim()
    ? 'APPWRITE_AUDIT_KEY'
    : 'APPWRITE_SETUP_KEY'
for (const name of [...commonEnvironment, keyEnvironment]) {
  if (!process.env[name]?.trim()) throw new Error(`Missing environment variable: ${name}`)
}

const endpoint = process.env.VITE_APPWRITE_ENDPOINT.replace(/\/$/, '')
const projectId = process.env.VITE_APPWRITE_PROJECT_ID
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID
const teachersTeamId = process.env.VITE_APPWRITE_TEACHERS_TEAM_ID
const bucketId = process.env.VITE_APPWRITE_EXERCISE_FILES_BUCKET_ID

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(process.env[keyEnvironment])

const tablesDB = new TablesDB(client)
const storage = new Storage(client)
const teams = new Teams(client)

const teacherRole = Role.team(teachersTeamId)
const teacherRead = [Permission.read(teacherRole)]
const teacherCrud = [
  Permission.create(teacherRole),
  Permission.read(teacherRole),
  Permission.update(teacherRole),
  Permission.delete(teacherRole),
]

const column = (key, type, required, size) => ({ key, type, required, ...(size ? { size } : {}) })
const index = (key, type, columns, orders) => ({ key, type, columns, orders })

const tableDefinitions = [
  {
    alias: 'profiles',
    id: process.env.VITE_APPWRITE_PROFILES_TABLE_ID,
    permissions: teacherRead,
    columns: [column('userId', 'varchar', true, 36), column('displayName', 'varchar', true, 128)],
    indexes: [index('profiles_user_id_unique', TablesDBIndexType.Unique, ['userId'], [OrderBy.Asc])],
  },
  {
    alias: 'categories',
    id: process.env.VITE_APPWRITE_CATEGORIES_TABLE_ID,
    permissions: teacherCrud,
    columns: [
      column('name', 'varchar', true, 128),
      column('slug', 'varchar', true, 128),
      column('description', 'text', true),
      column('eyebrow', 'varchar', true, 128),
      column('icon', 'varchar', true, 64),
      column('tone', 'varchar', true, 32),
      column('displayOrder', 'integer', true),
      column('isPublished', 'boolean', true),
    ],
    indexes: [
      index('categories_slug_unique', TablesDBIndexType.Unique, ['slug'], [OrderBy.Asc]),
      index('categories_order', TablesDBIndexType.Key, ['displayOrder'], [OrderBy.Asc]),
      index(
        'categories_published_order',
        TablesDBIndexType.Key,
        ['isPublished', 'displayOrder'],
        [OrderBy.Asc, OrderBy.Asc],
      ),
    ],
  },
  {
    alias: 'exercises',
    id: process.env.VITE_APPWRITE_EXERCISES_TABLE_ID,
    permissions: teacherCrud,
    columns: [
      column('categoryId', 'varchar', true, 36),
      column('title', 'varchar', true, 200),
      column('description', 'text', true),
      column('duration', 'integer', true),
      column('difficulty', 'varchar', true, 32),
      column('kind', 'varchar', true, 32),
      column('accent', 'varchar', true, 32),
      column('isPublished', 'boolean', true),
      column('status', 'varchar', true, 32),
      column('sourceType', 'varchar', true, 32),
      column('fileId', 'varchar', false, 36),
      column('fileName', 'varchar', false, 255),
      column('fileSize', 'integer', false),
    ],
    indexes: [
      index('exercises_published', TablesDBIndexType.Key, ['isPublished'], [OrderBy.Asc]),
      index('exercises_status', TablesDBIndexType.Key, ['status'], [OrderBy.Asc]),
      index(
        'exercises_category_published',
        TablesDBIndexType.Key,
        ['categoryId', 'isPublished'],
        [OrderBy.Asc, OrderBy.Asc],
      ),
    ],
  },
  {
    alias: 'content',
    id: process.env.VITE_APPWRITE_CONTENT_TABLE_ID,
    permissions: teacherCrud,
    columns: [
      column('pageId', 'varchar', true, 64),
      column('contentJson', 'mediumtext', true),
      column('isPublished', 'boolean', true),
      column('version', 'integer', true),
      column('publishedAt', 'datetime', false),
      column('publishedBy', 'varchar', false, 36),
    ],
    indexes: [
      index(
        'content_page_state_unique',
        TablesDBIndexType.Unique,
        ['pageId', 'isPublished'],
        [OrderBy.Asc, OrderBy.Asc],
      ),
      index('content_published', TablesDBIndexType.Key, ['isPublished'], [OrderBy.Asc]),
    ],
  },
  {
    alias: 'contentVersions',
    id: process.env.VITE_APPWRITE_CONTENT_VERSIONS_TABLE_ID,
    permissions: teacherCrud,
    columns: [
      column('pageId', 'varchar', true, 64),
      column('contentJson', 'mediumtext', true),
      column('version', 'integer', true),
      column('sourceRowId', 'varchar', true, 36),
      column('label', 'varchar', true, 200),
      column('publishedAt', 'datetime', true),
      column('publishedBy', 'varchar', true, 36),
    ],
    indexes: [
      index(
        'versions_page_version',
        TablesDBIndexType.Key,
        ['pageId', 'version'],
        [OrderBy.Asc, OrderBy.Desc],
      ),
      index('versions_published_at', TablesDBIndexType.Key, ['publishedAt'], [OrderBy.Desc]),
    ],
  },
  {
    alias: 'studentProgress',
    id: process.env.VITE_APPWRITE_STUDENT_PROGRESS_TABLE_ID,
    permissions: teacherRead,
    columns: [
      column('userId', 'varchar', true, 36),
      column('exerciseId', 'varchar', true, 36),
      column('status', 'varchar', true, 32),
      column('lastAccessedAt', 'datetime', true),
      column('completedAt', 'datetime', false),
      column('score', 'integer', false),
      column('attempts', 'integer', true),
      column('savedAnswersJson', 'mediumtext', false),
    ],
    indexes: [
      index(
        'progress_user_exercise_unique',
        TablesDBIndexType.Unique,
        ['userId', 'exerciseId'],
        [OrderBy.Asc, OrderBy.Asc],
      ),
      index(
        'progress_user_activity',
        TablesDBIndexType.Key,
        ['userId', 'lastAccessedAt'],
        [OrderBy.Asc, OrderBy.Desc],
      ),
      index('progress_activity', TablesDBIndexType.Key, ['lastAccessedAt'], [OrderBy.Desc]),
    ],
  },
]

const normalize = (values = []) => [...values].sort()
const sameValues = (left = [], right = []) => JSON.stringify(left) === JSON.stringify(right)
const sameSet = (left = [], right = []) => sameValues(normalize(left), normalize(right))

function columnMatches(actual, expected) {
  return (
    actual.type === expected.type &&
    actual.required === expected.required &&
    Boolean(actual.array) === false &&
    (expected.type !== 'varchar' || actual.size === expected.size)
  )
}

function indexMatches(actual, expected) {
  const actualColumns = actual.columns ?? actual.attributes ?? []
  return (
    actual.type === expected.type &&
    sameValues(actualColumns, expected.columns) &&
    sameValues(actual.orders ?? [], expected.orders)
  )
}

function describeColumn(value) {
  return {
    key: value.key,
    type: value.type,
    required: value.required,
    array: Boolean(value.array),
    ...(value.type === 'varchar' ? { size: value.size } : {}),
    ...(value.status ? { status: value.status } : {}),
  }
}

function describeIndex(value) {
  return {
    key: value.key,
    type: value.type,
    columns: value.columns ?? value.attributes ?? [],
    orders: value.orders ?? [],
    ...(value.status ? { status: value.status } : {}),
  }
}

const plan = []
const conflicts = []
const current = new Map()

await teams.get({ teamId: teachersTeamId })

for (const definition of tableDefinitions) {
  const [table, columnList, indexList] = await Promise.all([
    tablesDB.getTable({ databaseId, tableId: definition.id }),
    tablesDB.listColumns({ databaseId, tableId: definition.id, total: false }),
    tablesDB.listIndexes({ databaseId, tableId: definition.id, total: false }),
  ])
  current.set(definition.id, { table, columns: columnList.columns, indexes: indexList.indexes })

  for (const expected of definition.columns) {
    const actual = columnList.columns.find((candidate) => candidate.key === expected.key)
    if (!actual) {
      plan.push({ action: 'create-column', table: definition.alias, tableId: definition.id, column: expected })
    } else if (!columnMatches(actual, expected) || actual.status === 'failed' || actual.status === 'stuck') {
      conflicts.push({
        resource: `table:${definition.alias}/column:${expected.key}`,
        expected: describeColumn(expected),
        actual: describeColumn(actual),
        reason: 'An existing column with this key is incompatible; the script will not alter or delete it.',
      })
    }
  }

  for (const expected of definition.indexes) {
    const actual = indexList.indexes.find((candidate) => candidate.key === expected.key)
    if (!actual) {
      plan.push({ action: 'create-index', table: definition.alias, tableId: definition.id, index: expected })
    } else if (!indexMatches(actual, expected) || actual.status === 'failed' || actual.status === 'stuck') {
      conflicts.push({
        resource: `table:${definition.alias}/index:${expected.key}`,
        expected: describeIndex(expected),
        actual: describeIndex(actual),
        reason: 'An existing index with this key is incompatible; the script will not alter or delete it.',
      })
    }
  }

  if (!table.rowSecurity || !sameSet(table.$permissions, definition.permissions)) {
    plan.push({
      action: 'update-table-security',
      table: definition.alias,
      tableId: definition.id,
      from: { rowSecurity: table.rowSecurity, permissions: normalize(table.$permissions) },
      to: { rowSecurity: true, permissions: normalize(definition.permissions) },
    })
  }
}

const bucket = await storage.getBucket({ bucketId })
const expectedBucket = {
  fileSecurity: true,
  maximumFileSize: 2 * 1024 * 1024,
  allowedFileExtensions: ['html'],
  permissions: teacherCrud,
  encryption: true,
  antivirus: true,
}
if (
  bucket.fileSecurity !== expectedBucket.fileSecurity ||
  bucket.maximumFileSize !== expectedBucket.maximumFileSize ||
  !sameSet(bucket.allowedFileExtensions, expectedBucket.allowedFileExtensions) ||
  !sameSet(bucket.$permissions, expectedBucket.permissions) ||
  bucket.encryption !== true ||
  bucket.antivirus !== true
) {
  plan.push({
    action: 'update-bucket-security',
    bucketId,
    from: {
      fileSecurity: bucket.fileSecurity,
      maximumFileSize: bucket.maximumFileSize,
      allowedFileExtensions: normalize(bucket.allowedFileExtensions),
      permissions: normalize(bucket.$permissions),
      encryption: bucket.encryption,
      antivirus: bucket.antivirus,
    },
    to: { ...expectedBucket, permissions: normalize(expectedBucket.permissions) },
    preserved: {
      name: bucket.name,
      enabled: bucket.enabled,
      compression: bucket.compression,
      transformations: bucket.transformations,
      existingFiles: 'untouched',
    },
  })
}

process.stdout.write(
  `${JSON.stringify(
    {
      mode: apply ? 'apply' : 'dry-run',
      projectId,
      databaseId,
      teachersTeamId,
      resources: { tables: tableDefinitions.length, bucketId },
      proposedChanges: plan,
      conflicts,
      summary: { proposedChanges: plan.length, conflicts: conflicts.length },
    },
    null,
    2,
  )}\n`,
)

if (conflicts.length > 0) {
  throw new Error('Preflight found incompatible resources. No changes were applied.')
}

if (!apply) {
  process.stdout.write('Dry run complete. No remote changes were applied.\n')
  process.exit(0)
}

async function waitUntilAvailable(getResource, label) {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    const resource = await getResource()
    if (resource.status === 'available') return resource
    if (resource.status === 'failed' || resource.status === 'stuck') {
      throw new Error(`${label} entered ${resource.status}: ${resource.error || 'unknown error'}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function ensureColumn(definition, expected) {
  const existing = current.get(definition.id).columns.find((candidate) => candidate.key === expected.key)
  if (!existing) {
    const base = {
      databaseId,
      tableId: definition.id,
      key: expected.key,
      required: expected.required,
      array: false,
    }
    if (expected.type === 'varchar') await tablesDB.createVarcharColumn({ ...base, size: expected.size })
    else if (expected.type === 'text') await tablesDB.createTextColumn(base)
    else if (expected.type === 'mediumtext') await tablesDB.createMediumtextColumn(base)
    else if (expected.type === 'integer') await tablesDB.createIntegerColumn(base)
    else if (expected.type === 'boolean') await tablesDB.createBooleanColumn(base)
    else if (expected.type === 'datetime') await tablesDB.createDatetimeColumn(base)
    else throw new Error(`Unsupported column type: ${expected.type}`)
  }
  await waitUntilAvailable(
    () => tablesDB.getColumn({ databaseId, tableId: definition.id, key: expected.key }),
    `${definition.alias}.${expected.key}`,
  )
}

async function ensureIndex(definition, expected) {
  const existing = current.get(definition.id).indexes.find((candidate) => candidate.key === expected.key)
  if (!existing) {
    await tablesDB.createIndex({
      databaseId,
      tableId: definition.id,
      key: expected.key,
      type: expected.type,
      columns: expected.columns,
      orders: expected.orders,
    })
  }
  await waitUntilAvailable(
    () => tablesDB.getIndex({ databaseId, tableId: definition.id, key: expected.key }),
    `${definition.alias}.${expected.key}`,
  )
}

for (const definition of tableDefinitions) {
  for (const expected of definition.columns) await ensureColumn(definition, expected)
  for (const expected of definition.indexes) await ensureIndex(definition, expected)
  const needsSecurityUpdate = plan.some(
    (change) => change.action === 'update-table-security' && change.tableId === definition.id,
  )
  if (needsSecurityUpdate) {
    await tablesDB.updateTable({
      databaseId,
      tableId: definition.id,
      permissions: definition.permissions,
      rowSecurity: true,
    })
  }
}

if (plan.some((change) => change.action === 'update-bucket-security')) {
  await storage.updateBucket({
    bucketId,
    name: bucket.name,
    permissions: expectedBucket.permissions,
    fileSecurity: expectedBucket.fileSecurity,
    enabled: bucket.enabled,
    maximumFileSize: expectedBucket.maximumFileSize,
    allowedFileExtensions: expectedBucket.allowedFileExtensions,
    compression: bucket.compression,
    encryption: true,
    antivirus: true,
    transformations: bucket.transformations,
  })
}

process.stdout.write('Appwrite schema and security configuration applied successfully.\n')
