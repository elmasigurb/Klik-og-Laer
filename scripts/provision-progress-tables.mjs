import { Client, TablesDB } from 'node-appwrite'
import { planProgressSchema, progressTableDefinitions } from './progress-schema.mjs'

const apply = process.argv.includes('--apply')
const confirmation = process.argv.find((argument) => argument.startsWith('--confirm-project='))?.slice('--confirm-project='.length)
if (process.argv.includes('--help')) {
  process.stdout.write('Usage: npm run provision:progress-tables -- [--apply --confirm-project=<exact-project-id>]\n\nDry-run is the default. Apply requires an exact project confirmation and never creates rows.\n')
  process.exit(0)
}

const endpoint = (process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT)?.trim()?.replace(/\/$/, '')
const projectId = (process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID)?.trim()
const databaseId = (process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID)?.trim()
const keyName = apply ? 'APPWRITE_PROGRESS_SETUP_KEY' : process.env.APPWRITE_PROGRESS_AUDIT_KEY?.trim() ? 'APPWRITE_PROGRESS_AUDIT_KEY' : 'APPWRITE_PROGRESS_SETUP_KEY'
if (!endpoint || !projectId || !databaseId || !process.env[keyName]?.trim()) throw new Error(`Missing endpoint, project, database, or ${keyName}.`)
if (apply && confirmation !== projectId) throw new Error('Apply refused: --confirm-project must exactly match the configured Appwrite project ID.')

const definitions = progressTableDefinitions()
const tables = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(process.env[keyName]))
const state = new Map()
for (const definition of definitions) {
  try {
    const [table, columns, indexes] = await Promise.all([
      tables.getTable({ databaseId, tableId: definition.id }),
      tables.listColumns({ databaseId, tableId: definition.id, total: false }),
      tables.listIndexes({ databaseId, tableId: definition.id, total: false }),
    ])
    state.set(definition.id, { table, columns: columns.columns, indexes: indexes.indexes })
  } catch (reason) {
    if (reason?.code !== 404) throw reason
    state.set(definition.id, null)
  }
}

const { proposedChanges, conflicts } = planProgressSchema(definitions, state)
process.stdout.write(`${JSON.stringify({ mode: apply ? 'apply' : 'dry-run', projectId, databaseId, proposedChanges, conflicts, summary: { proposedChanges: proposedChanges.length, conflicts: conflicts.length } }, null, 2)}\n`)
if (conflicts.length) throw new Error('Preflight found incompatible resources. Nothing was changed.')
if (!apply) { process.stdout.write('Dry run complete. No remote changes were applied.\n'); process.exit(0) }

async function waitAvailable(get, label) {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    const resource = await get()
    if (resource.status === 'available') return
    if (resource.status === 'failed' || resource.status === 'stuck') throw new Error(`${label} entered ${resource.status}.`)
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }
  throw new Error(`Timed out waiting for ${label}.`)
}

async function ensureColumn(definition, expected) {
  if (!state.get(definition.id)?.columns.some((item) => item.key === expected.key)) {
    const base = { databaseId, tableId: definition.id, key: expected.key, required: expected.required, array: false }
    if (expected.type === 'varchar') await tables.createVarcharColumn({ ...base, size: expected.size })
    else if (expected.type === 'integer') await tables.createIntegerColumn(base)
    else if (expected.type === 'datetime') await tables.createDatetimeColumn(base)
    else throw new Error(`Unsupported column type: ${expected.type}`)
  }
  await waitAvailable(() => tables.getColumn({ databaseId, tableId: definition.id, key: expected.key }), `${definition.id}.${expected.key}`)
}

for (const definition of definitions) {
  if (!state.get(definition.id)) {
    await tables.createTable({ databaseId, tableId: definition.id, name: definition.name, permissions: [], rowSecurity: true, enabled: true })
    state.set(definition.id, { columns: [], indexes: [] })
  }
  for (const expected of definition.columns) await ensureColumn(definition, expected)
  for (const expected of definition.indexes) {
    if (!state.get(definition.id).indexes.some((item) => item.key === expected.key)) await tables.createIndex({ databaseId, tableId: definition.id, key: expected.key, type: expected.type, columns: expected.columns, orders: expected.orders })
    await waitAvailable(() => tables.getIndex({ databaseId, tableId: definition.id, key: expected.key }), `${definition.id}.${expected.key}`)
  }
  await tables.updateTable({ databaseId, tableId: definition.id, permissions: [], rowSecurity: true })
}
process.stdout.write('Student-progress tables are provisioned with no rows and no client permissions.\n')
