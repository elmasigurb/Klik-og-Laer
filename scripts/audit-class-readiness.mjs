import { Client, Query, TablesDB } from 'node-appwrite'

const required = ['VITE_APPWRITE_ENDPOINT', 'VITE_APPWRITE_PROJECT_ID', 'VITE_APPWRITE_DATABASE_ID', 'VITE_APPWRITE_EXERCISES_TABLE_ID']
for (const name of required) if (!process.env[name]?.trim()) throw new Error(`Missing environment variable: ${name}`)
const key = process.env.APPWRITE_AUDIT_KEY?.trim() || process.env.APPWRITE_SETUP_KEY?.trim()
if (!key) throw new Error('Missing environment variable: APPWRITE_AUDIT_KEY or APPWRITE_SETUP_KEY')

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT.replace(/\/$/, ''))
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(key)
const tables = new TablesDB(client)
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID
const classTableId = process.env.VITE_APPWRITE_CLASSES_TABLE_ID?.trim() || 'classes'
const exerciseClassTableId = process.env.VITE_APPWRITE_EXERCISE_CLASSES_TABLE_ID?.trim() || 'exercise-classes'

async function list(tableId, queries) {
  return (await tables.listRows({ databaseId, tableId, queries: [...queries, Query.limit(500)] })).rows
}

let classes
let assignments
try {
  ;[classes, assignments] = await Promise.all([list(classTableId, []), list(exerciseClassTableId, [])])
} catch (reason) {
  if (reason?.code !== 404) throw reason
  process.stdout.write(`${JSON.stringify({ ready: false, reason: 'Class tables have not been provisioned.', missingTableId: reason?.response?.message ?? 'classes or exercise-classes' }, null, 2)}\n`)
  process.exit(0)
}
const exercises = await list(process.env.VITE_APPWRITE_EXERCISES_TABLE_ID, [Query.equal('isPublished', true)])
const assignedIds = new Set(assignments.map((item) => item.exerciseId))
const unassigned = exercises.filter((item) => !assignedIds.has(item.$id))
const activeClasses = classes.filter((item) => item.status === 'active')
const classesWithoutPublishedExercises = activeClasses.filter((schoolClass) => !assignments.some((assignment) => assignment.classId === schoolClass.$id && assignment.isPublished))

process.stdout.write(`${JSON.stringify({
  ready: activeClasses.length > 0 && unassigned.length === 0,
  summary: {
    activeClasses: activeClasses.length,
    archivedClasses: classes.length - activeClasses.length,
    publishedExercises: exercises.length,
    assignments: assignments.length,
    unassignedPublishedExercises: unassigned.length,
    activeClassesWithoutPublishedExercises: classesWithoutPublishedExercises.length,
  },
  unassignedPublishedExercises: unassigned.map((item) => ({ id: item.$id, title: item.title })),
  emptyActiveClasses: classesWithoutPublishedExercises.map((item) => ({ id: item.$id, name: item.name })),
  note: 'This command is read-only. Set VITE_PUBLIC_CLASS_NAVIGATION_ENABLED=true only after reviewing this report.',
}, null, 2)}\n`)
