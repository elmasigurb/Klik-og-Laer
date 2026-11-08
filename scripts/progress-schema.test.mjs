import assert from 'node:assert/strict'
import test from 'node:test'
import { planProgressSchema, progressTableDefinitions } from './progress-schema.mjs'

test('progress schema has only the two locked tables and approved columns/indexes', () => {
  const definitions = progressTableDefinitions({})
  assert.deepEqual(definitions.map((item) => item.id), ['students', 'exercise-completions'])
  assert.deepEqual(definitions.map((item) => [item.columns.length, item.indexes.length]), [[9, 4], [8, 4]])
  assert.equal(definitions.every((item) => item.rowSecurity && item.permissions.length === 0), true)
  assert.equal(definitions.some((item) => item.id === 'student-progress'), false)
})

test('schema planner is idempotent and a partial rerun proposes only missing resources', () => {
  const definitions = progressTableDefinitions({})
  const completeState = new Map(definitions.map((definition) => [definition.id, {
    table: { rowSecurity: true, $permissions: [] },
    columns: definition.columns.map((column) => ({ ...column, array: false, status: 'available' })),
    indexes: definition.indexes.map((index) => ({ ...index, status: 'available' })),
  }]))
  assert.deepEqual(planProgressSchema(definitions, completeState), { proposedChanges: [], conflicts: [] })

  const partialState = new Map(completeState)
  partialState.set('students', { ...partialState.get('students'), columns: partialState.get('students').columns.filter((column) => column.key !== 'lastSeenAt') })
  const partial = planProgressSchema(definitions, partialState)
  assert.equal(partial.conflicts.length, 0)
  assert.deepEqual(partial.proposedChanges.map((change) => [change.action, change.tableId, change.column?.key]), [['create-column', 'students', 'lastSeenAt']])
})
