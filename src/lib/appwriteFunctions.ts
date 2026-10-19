import { ExecutionMethod } from 'appwrite'
import { appwriteConfig, functions, requireAppwriteResourceId } from './appwrite'

interface TrustedResponse<T> { ok: true; data: T }

export function hasTrustedContentManager() {
  return Boolean(appwriteConfig.functions.contentManager)
}

export async function executeContentManager<T = Record<string, never>>(payload: Record<string, unknown>): Promise<T> {
  const functionId = requireAppwriteResourceId('VITE_APPWRITE_CONTENT_MANAGER_FUNCTION_ID', appwriteConfig.functions.contentManager)
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
    throw new Error(parsed && 'error' in parsed && parsed.error ? parsed.error : 'Den betroede Appwrite-operation mislykkedes.')
  }
  return parsed.data
}
