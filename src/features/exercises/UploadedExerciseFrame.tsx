import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { exerciseFileRepository } from './exerciseFileRepository'
import { appwriteConfig, storage } from '../../lib/appwrite'

export function UploadedExerciseFrame({ exerciseId, fileId, title, html: providedHtml, large = false }: { exerciseId: string; fileId?: string; title: string; html?: string; large?: boolean }) {
  const [source, setSource] = useState<string>()
  const [error, setError] = useState('')

  useEffect(() => {
    let url = ''
    let active = true
    async function load() {
      try {
        let html = providedHtml
        if (!html && fileId) {
          const response = await fetch(storage.getFileView({ bucketId: appwriteConfig.buckets.exerciseFiles, fileId }), { credentials: 'include' })
          if (!response.ok) throw new Error(response.status === 401 || response.status === 404 ? 'Denne øvelse er ikke offentligt tilgængelig.' : 'HTML-filen kunne ikke hentes.')
          html = await response.text()
        }
        html ??= await exerciseFileRepository.get(exerciseId)
        if (!html) throw new Error('HTML-filen blev ikke fundet på denne enhed.')
        url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
        if (active) setSource(url)
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'Filen kunne ikke åbnes.') }
    }
    void load()
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [exerciseId, fileId, providedHtml])

  if (error) return <div role="alert" className="flex min-h-64 items-center justify-center gap-3 rounded-3xl border border-coral bg-coral/20 p-6 text-sm font-bold text-danger"><AlertTriangle className="size-5" />{error}</div>
  if (!source) return <div className="grid min-h-64 place-items-center rounded-3xl border border-navy/10 bg-white"><LoaderCircle className="size-7 animate-spin text-navy" aria-label="Indlæser forhåndsvisning" /></div>
  return <iframe src={source} title={title} sandbox="allow-scripts allow-forms" className={`w-full rounded-3xl border border-navy/15 bg-white ${large ? 'h-[75vh]' : 'h-[560px]'}`} />
}
