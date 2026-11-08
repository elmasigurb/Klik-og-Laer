export function mergeCompletion(completions, completion) {
  if (completions.some((item) => item.exerciseId === completion.exerciseId)) return completions
  return [...completions, completion]
}

export function isExerciseCompleted(completions, exerciseId) {
  return completions.some((item) => item.exerciseId === exerciseId)
}

export function buildStudentProgressRows(students, completions) {
  return students.map((student) => ({
    ...student,
    completions: completions
      .filter((completion) => completion.studentId === student.id)
      .sort((left, right) => right.completedAt.localeCompare(left.completedAt)),
  }))
}
