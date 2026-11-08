import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { EXERCISE_RESULT_MANIFEST_VERSION } from '../exercises/exerciseResultAdapters.mjs'
import type { ExerciseResultMessage } from '../exercises/exerciseResultProtocol.mjs'
import { appwriteConfig } from '../../lib/appwrite'
import { executeStudentProgress, FunctionExecutionError } from '../../lib/appwriteFunctions'
import { useStudentClass } from '../student/StudentClassContext'
import { clearStudentIdentity, getOrCreateRegistrationKey, loadStudentIdentity, saveStudentIdentity, STUDENT_COMPLETION_CACHE_KEY, type StoredStudentIdentity } from './studentIdentity.mjs'
import { isExerciseCompleted, mergeCompletion } from './progressViewModel.mjs'

export interface StudentCompletion {
  exerciseId: string
  completedAt: string
  evidenceType: 'client-reported'
}

type ProgressStatus = 'disabled' | 'loading' | 'guest' | 'ready' | 'error'
type SubmissionStatus = 'idle' | 'saving' | 'saved' | 'error'

interface StudentProgressValue {
  enabled: boolean
  status: ProgressStatus
  submissionStatus: SubmissionStatus
  identity: StoredStudentIdentity | null
  completions: StudentCompletion[]
  error: string
  register(displayName: string, classId: string): Promise<void>
  switchStudent(): void
  retryValidation(): Promise<void>
  recordResult(result: ExerciseResultMessage): Promise<void>
  isCompleted(exerciseId: string): boolean
}

const StudentProgressContext = createContext<StudentProgressValue | null>(null)

interface StudentResponse { student: { id: string; classId: string; displayName: string; status: string }; credential?: string }
interface CompletionResponse { completions: StudentCompletion[] }

function cacheCompletions(studentId: string, completions: StudentCompletion[]) {
  localStorage.setItem(STUDENT_COMPLETION_CACHE_KEY, JSON.stringify({ studentId, completions }))
}

export function StudentProgressProvider({ children }: { children: ReactNode }) {
  const enabled = appwriteConfig.features.studentProgress
  const { activeClasses, selectClass } = useStudentClass()
  const [status, setStatus] = useState<ProgressStatus>(enabled ? 'loading' : 'disabled')
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle')
  const [identity, setIdentity] = useState<StoredStudentIdentity | null>(() => enabled ? loadStudentIdentity() : null)
  const [completions, setCompletions] = useState<StudentCompletion[]>([])
  const [error, setError] = useState('')

  const loadCompletions = useCallback(async (current: StoredStudentIdentity) => {
    const result = await executeStudentProgress<CompletionResponse>({ action: 'student.listCompletions', studentId: current.studentId, credential: current.credential })
    setCompletions(result.completions)
    cacheCompletions(current.studentId, result.completions)
  }, [])

  const validate = useCallback(async () => {
    if (!enabled) return
    const stored = loadStudentIdentity()
    if (!stored) { setIdentity(null); setCompletions([]); setStatus('guest'); return }
    setStatus('loading')
    setError('')
    try {
      const result = await executeStudentProgress<StudentResponse>({ action: 'student.me', studentId: stored.studentId, credential: stored.credential })
      const next = saveStudentIdentity({ studentId: result.student.id, classId: result.student.classId, displayName: result.student.displayName, credential: stored.credential })
      setIdentity(next)
      selectClass(next.classId, false)
      await loadCompletions(next)
      setStatus('ready')
    } catch (reason) {
      if (reason instanceof FunctionExecutionError && (reason.status === 401 || reason.status === 403)) {
        clearStudentIdentity()
        setIdentity(null)
        setCompletions([])
        setStatus('guest')
        return
      }
      setIdentity(stored)
      setStatus('error')
      setError(reason instanceof Error ? reason.message : 'Elevprofilen kunne ikke kontrolleres.')
    }
  }, [enabled, loadCompletions, selectClass])

  useEffect(() => { void validate() }, [validate])

  useEffect(() => {
    if (status === 'ready' && identity && activeClasses.some((item) => item.id === identity.classId)) selectClass(identity.classId, false)
  }, [activeClasses, identity, selectClass, status])

  const register = useCallback(async (displayName: string, classId: string) => {
    if (!enabled || !activeClasses.some((item) => item.id === classId)) throw new Error('Vælg en aktiv klasse.')
    const normalized = displayName.normalize('NFKC').replace(/\s+/g, ' ').trim()
    if (!normalized || normalized.length > 128) throw new Error('Skriv elevens navn.')
    setStatus('loading')
    setError('')
    try {
      const registrationKey = getOrCreateRegistrationKey(normalized, classId)
      const result = await executeStudentProgress<StudentResponse>({ action: 'student.register', classId, displayName: normalized, registrationKey })
      if (!result.credential) throw new Error('Elevadgangen blev ikke returneret.')
      const next = saveStudentIdentity({ studentId: result.student.id, classId: result.student.classId, displayName: result.student.displayName, credential: result.credential })
      setIdentity(next)
      setCompletions([])
      cacheCompletions(next.studentId, [])
      selectClass(next.classId, false)
      setStatus('ready')
    } catch (reason) {
      setStatus('guest')
      setError(reason instanceof Error ? reason.message : 'Elevprofilen kunne ikke oprettes.')
      throw reason
    }
  }, [activeClasses, enabled, selectClass])

  const switchStudent = useCallback(() => {
    clearStudentIdentity()
    setIdentity(null)
    setCompletions([])
    setSubmissionStatus('idle')
    setError('')
    selectClass('', false)
    setStatus(enabled ? 'guest' : 'disabled')
  }, [enabled, selectClass])

  const recordResult = useCallback(async (result: ExerciseResultMessage) => {
    if (!enabled || status !== 'ready' || !identity || !result.completed) return
    if (completions.some((item) => item.exerciseId === result.exerciseId)) return
    setSubmissionStatus('saving')
    setError('')
    try {
      const response = await executeStudentProgress<{ completion: StudentCompletion }>({
        action: 'completion.record', studentId: identity.studentId, credential: identity.credential,
        exerciseId: result.exerciseId, attemptId: result.attemptId, adapterId: result.adapterId,
        htmlSignature: result.htmlSignature, manifestVersion: EXERCISE_RESULT_MANIFEST_VERSION,
        earned: result.earned, possible: result.possible, requirementsSatisfied: true,
      })
      setCompletions((current) => {
        if (current.some((item) => item.exerciseId === response.completion.exerciseId)) return current
        const next = mergeCompletion(current, response.completion)
        cacheCompletions(identity.studentId, next)
        return next
      })
      setSubmissionStatus('saved')
    } catch (reason) {
      setSubmissionStatus('error')
      setError(reason instanceof Error ? reason.message : 'Gennemførelsen kunne ikke gemmes.')
    }
  }, [completions, enabled, identity, status])

  const value = useMemo<StudentProgressValue>(() => ({
    enabled, status, submissionStatus, identity, completions, error, register, switchStudent,
    retryValidation: validate, recordResult, isCompleted: (exerciseId) => isExerciseCompleted(completions, exerciseId),
  }), [completions, enabled, error, identity, recordResult, register, status, submissionStatus, switchStudent, validate])

  return <StudentProgressContext.Provider value={value}>{children}</StudentProgressContext.Provider>
}

export function useStudentProgress() {
  const value = useContext(StudentProgressContext)
  if (!value) throw new Error('useStudentProgress must be used inside StudentProgressProvider')
  return value
}
