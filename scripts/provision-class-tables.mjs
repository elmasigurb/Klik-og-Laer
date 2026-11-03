import { Client, TablesDB } from 'node-appwrite'

const apply = process.argv.includes('--apply')
const required = ['VITE_APPWRITE_ENDPOINT', 'VITE_APPWRITE_PROJECT_ID', 'VITE_APPWRITE_DATABASE_ID']
const keyName = apply ? 'APPWRITE_SETUP_KEY' : process.env.APPWRITE_AUDIT_KEY?.trim() ? 'APPWRITE_AUDIT_KEY' : 'APPWRITE_SETUP_KEY'
for (const name of [...required, keyName]) {
  if (!process.env[name]?.trim()) throw new Error(`Missing environment variable: ${name}`)
}

const resources = [
  { id: process.env.VITE_APPWRITE_CLASSES_TABLE_ID?.trim() || 'classes', name: 'Classes' },
  { id: process.env.VITE_APPWRITE_EXERCISE_CLASSES_TABLE_ID?.trim() || 'exercise-classes', name: 'Exercise classes' },
]
const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT.replace(/\/$/, ''))
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env[keyName])
const tables = new TablesDB(client)
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID
const missing = []

for (const resource of resources) {
  try { await tables.getTable({ databaseId, tableId: resource.id }) }
  catch (reason) {
    if (reason?.code !== 404) throw reason
    missing.push(resource)
  }
}

process.stdout.write(`${JSON.stringify({ mode: apply ? 'apply' : 'dry-run', databaseId, existing: resources.filter((item) => !missing.includes(item)), missing, next: missing.length ? apply ? 'Creating missing empty tables.' : 'Review, then rerun with --apply.' : 'No changes required.' }, null, 2)}\n`)
if (!apply || !missing.length) process.exit(0)

for (const resource of missing) {
  await tables.createTable({ databaseId, tableId: resource.id, name: resource.name, permissions: [], rowSecurity: true, enabled: true })
  process.stdout.write(`Created empty table ${resource.id}.\n`)
}
process.stdout.write('Run npm run setup:appwrite -- --apply to add the reviewed columns and indexes.\n')
