const column = (key, type, required, size) => ({ key, type, required, ...(size ? { size } : {}) })
const index = (key, type, columns, orders) => ({ key, type, columns, orders })

export function progressTableDefinitions(environment = process.env) {
  return [
    {
      alias: 'students',
      id: environment.APPWRITE_STUDENTS_TABLE_ID?.trim() || 'students',
      name: 'Students',
      rowSecurity: true,
      permissions: [],
      columns: [
        column('classId', 'varchar', true, 36),
        column('teacherId', 'varchar', true, 36),
        column('displayName', 'varchar', true, 128),
        column('normalizedName', 'varchar', true, 128),
        column('status', 'varchar', true, 16),
        column('credentialDigest', 'varchar', true, 64),
        column('credentialVersion', 'integer', true),
        column('registrationDigest', 'varchar', true, 64),
        column('lastSeenAt', 'datetime', false),
      ],
      indexes: [
        index('students_credential_unique', 'unique', ['credentialDigest'], ['asc']),
        index('students_registration_unique', 'unique', ['registrationDigest'], ['asc']),
        index('students_teacher_class_status_name', 'key', ['teacherId', 'classId', 'status', 'normalizedName'], ['asc', 'asc', 'asc', 'asc']),
        index('students_class_status', 'key', ['classId', 'status'], ['asc', 'asc']),
      ],
    },
    {
      alias: 'exerciseCompletions',
      id: environment.APPWRITE_EXERCISE_COMPLETIONS_TABLE_ID?.trim() || 'exercise-completions',
      name: 'Exercise completions',
      rowSecurity: true,
      permissions: [],
      columns: [
        column('studentId', 'varchar', true, 36),
        column('teacherId', 'varchar', true, 36),
        column('classIdAtCompletion', 'varchar', true, 36),
        column('exerciseId', 'varchar', true, 36),
        column('completedAt', 'datetime', true),
        column('evidenceType', 'varchar', true, 32),
        column('adapterId', 'varchar', true, 80),
        column('htmlSignature', 'varchar', true, 64),
      ],
      indexes: [
        index('completions_student_exercise_unique', 'unique', ['studentId', 'exerciseId'], ['asc', 'asc']),
        index('completions_student_date', 'key', ['studentId', 'completedAt'], ['asc', 'desc']),
        index('completions_teacher_class_date', 'key', ['teacherId', 'classIdAtCompletion', 'completedAt'], ['asc', 'asc', 'desc']),
        index('completions_teacher_exercise', 'key', ['teacherId', 'exerciseId'], ['asc', 'asc']),
      ],
    },
  ]
}

const sorted = (values = []) => [...values].sort()
const same = (left = [], right = []) => JSON.stringify(left) === JSON.stringify(right)

function columnMatches(actual, expected) {
  return actual.type === expected.type && actual.required === expected.required && !actual.array && (expected.type !== 'varchar' || actual.size === expected.size)
}

function indexMatches(actual, expected) {
  return actual.type === expected.type && same(actual.columns ?? actual.attributes ?? [], expected.columns) && same(actual.orders ?? [], expected.orders)
}

export function planProgressSchema(definitions, state) {
  const proposedChanges = []
  const conflicts = []
  for (const definition of definitions) {
    const current = state.get(definition.id)
    if (!current) {
      proposedChanges.push({ action: 'create-table', tableId: definition.id, name: definition.name, rowSecurity: true, permissions: [] })
      for (const expected of definition.columns) proposedChanges.push({ action: 'create-column', tableId: definition.id, column: expected })
      for (const expected of definition.indexes) proposedChanges.push({ action: 'create-index', tableId: definition.id, index: expected })
      continue
    }
    for (const expected of definition.columns) {
      const actual = current.columns.find((item) => item.key === expected.key)
      if (!actual) proposedChanges.push({ action: 'create-column', tableId: definition.id, column: expected })
      else if (!columnMatches(actual, expected) || actual.status === 'failed' || actual.status === 'stuck') conflicts.push({ resource: `${definition.id}.${expected.key}`, expected, actual: { type: actual.type, required: actual.required, size: actual.size, status: actual.status } })
    }
    for (const expected of definition.indexes) {
      const actual = current.indexes.find((item) => item.key === expected.key)
      if (!actual) proposedChanges.push({ action: 'create-index', tableId: definition.id, index: expected })
      else if (!indexMatches(actual, expected) || actual.status === 'failed' || actual.status === 'stuck') conflicts.push({ resource: `${definition.id}.${expected.key}`, expected, actual: { type: actual.type, columns: actual.columns ?? actual.attributes, orders: actual.orders, status: actual.status } })
    }
    if (!current.table.rowSecurity || !same(sorted(current.table.$permissions), [])) proposedChanges.push({ action: 'lock-table', tableId: definition.id, rowSecurity: true, permissions: [] })
  }
  return { proposedChanges, conflicts }
}
