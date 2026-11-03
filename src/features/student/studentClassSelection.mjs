export const STUDENT_CLASS_STORAGE_KEY = 'klik-og-laer:selected-class'

export function getClassIdFromPath(pathname) {
  const match = pathname.match(/^\/classes\/([^/]+)(?:\/|$)/)
  if (!match) return ''
  try { return decodeURIComponent(match[1]) } catch { return '' }
}

export function readSelectedClassId(storage) {
  try { return storage?.getItem(STUDENT_CLASS_STORAGE_KEY)?.trim() ?? '' } catch { return '' }
}

export function persistSelectedClassId(storage, classId) {
  try {
    if (classId) storage?.setItem(STUDENT_CLASS_STORAGE_KEY, classId)
    else storage?.removeItem(STUDENT_CLASS_STORAGE_KEY)
  } catch {
    // Class selection still works for this page view when storage is unavailable.
  }
}

export function resolveSelectedClassId(selectedClassId, activeClassIds) {
  return activeClassIds.includes(selectedClassId) ? selectedClassId : ''
}
