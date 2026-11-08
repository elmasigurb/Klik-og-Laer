import { ExecutionMethod } from 'appwrite'
import { appwriteConfig, functions, requireAppwriteResourceId } from './appwrite'

interface TrustedResponse<T> { ok: true; data: T }

export class FunctionExecutionError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

async function executeTrustedFunction<T>(functionId: string, payload: Record<string, unknown>, fallback: string): Promise<T> {
  const execution = await functions.createExecution({
    functionId,
    body: JSON.stringify(payload),
    async: false,
    method: ExecutionMethod.POST,
    headers: { 'content-type': 'application/json' },
  })
  let parsed: TrustedResponse<T> | { ok?: false; error?: string } | undefined
  try { parsed = JSON.parse(execution.responseBody) as typeof parsed } catch { /* handled below */ }
  if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300 || !parsed?.ok) {
    throw new FunctionExecutionError(parsed && 'error' in parsed && parsed.error ? parsed.error : fallback, execution.responseStatusCode)
  }
  return parsed.data
}

export function hasTrustedContentManager() {
  return Boolean(appwriteConfig.functions.contentManager)
}

export async function executeContentManager<T = Record<string, never>>(payload: Record<string, unknown>): Promise<T> {
  const functionId = requireAppwriteResourceId('VITE_APPWRITE_CONTENT_MANAGER_FUNCTION_ID', appwriteConfig.functions.contentManager)
  return executeTrustedFunction<T>(functionId, payload, 'Den betroede Appwrite-operation mislykkedes.')
}

export async function executeStudentProgress<T>(payload: Record<string, unknown>): Promise<T> {
  if (!appwriteConfig.features.studentProgress) throw new FunctionExecutionError('Elevfremskridt er ikke aktiveret.', 503)
  const functionId = requireAppwriteResourceId('VITE_APPWRITE_STUDENT_PROGRESS_FUNCTION_ID', appwriteConfig.functions.studentProgress)
  return executeTrustedFunction<T>(functionId, payload, 'Elevfremskridt kunne ikke opdateres.')
}
