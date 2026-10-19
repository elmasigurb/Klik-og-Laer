const DATABASE_NAME = 'klik-og-laer-files'
const STORE_NAME = 'exercise-html'
const VERSION = 1

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('Din browser understøtter ikke lokal fillagring.'))
    const request = window.indexedDB.open(DATABASE_NAME, VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Den lokale fillagring kunne ikke åbnes.'))
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Filen kunne ikke gemmes lokalt. Browserens lager kan være fyldt.'))
  })
}

export interface ExerciseFileRepository {
  get(exerciseId: string): Promise<string | undefined>
  save(exerciseId: string, html: string): Promise<void>
  remove(exerciseId: string): Promise<void>
  copy(sourceId: string, destinationId: string): Promise<void>
}

export const exerciseFileRepository: ExerciseFileRepository = {
  async get(exerciseId) { const db = await openDatabase(); try { return await requestResult(db.transaction(STORE_NAME).objectStore(STORE_NAME).get(exerciseId)) as string | undefined } finally { db.close() } },
  async save(exerciseId, html) { const db = await openDatabase(); try { await requestResult(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(html, exerciseId)) } finally { db.close() } },
  async remove(exerciseId) { const db = await openDatabase(); try { await requestResult(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(exerciseId)) } finally { db.close() } },
  async copy(sourceId, destinationId) { const html = await this.get(sourceId); if (html) await this.save(destinationId, html) },
}
