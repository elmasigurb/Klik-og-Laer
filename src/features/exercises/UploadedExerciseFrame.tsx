import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { exerciseFileRepository } from './exerciseFileRepository'
import { appwriteConfig, storage } from '../../lib/appwrite'
import { buildResizableExerciseDocument, isTrustedResizeMessage, MAX_EXERCISE_HEIGHT } from './iframeResizeProtocol.mjs'

const DEFAULT_FRAME_HEIGHT = 720
const LARGE_FRAME_HEIGHT = 900

function createFrameId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint32Array(4))
  return Array.from(bytes, (value) => value.toString(36)).join('-')
}

export function UploadedExerciseFrame({ exerciseId, fileId, title, html: providedHtml, large = false }: { exerciseId: string; fileId?: string; title: string; html?: string; large?: boolean }) {
  const [source, setSource] = useState<string>()
  const [error, setError] = useState('')
  const [height, setHeight] = useState(large ? LARGE_FRAME_HEIGHT : DEFAULT_FRAME_HEIGHT)
  const [resized, setResized] = useState(false)
  const [fallback, setFallback] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const frameIdRef = useRef('')

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
        frameIdRef.current = createFrameId()
        const wrappedHtml = buildResizableExerciseDocument(html, frameIdRef.current, window.location.origin)
        url = URL.createObjectURL(new Blob([wrappedHtml], { type: 'text/html' }))
        if (active) setSource(url)
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'Filen kunne ikke åbnes.') }
    }
    void load()
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [exerciseId, fileId, providedHtml])

  useEffect(() => {
    setHeight(large ? LARGE_FRAME_HEIGHT : DEFAULT_FRAME_HEIGHT)
    setResized(false)
    setFallback(false)
  }, [large, source])

  useEffect(() => {
    if (!source) return
    const handleMessage = (event: MessageEvent) => {
      const frameWindow = frameRef.current?.contentWindow ?? null
      // A sandbox without allow-same-origin has the opaque "null" origin, so
      // the exact Window reference and per-render token are both required.
      if (!isTrustedResizeMessage(event, frameWindow, frameIdRef.current)) return
      setHeight(event.data.height)
      setResized(true)
      setFallback(false)
    }
    window.addEventListener('message', handleMessage)
    const fallbackTimer = window.setTimeout(() => setFallback((current) => current || !resized), 2500)
    return () => { window.removeEventListener('message', handleMessage); window.clearTimeout(fallbackTimer) }
  }, [resized, source])

  if (error) return <div role="alert" className="flex min-h-64 items-center justify-center gap-3 rounded-3xl border border-coral bg-coral/20 p-6 text-sm font-bold text-danger"><AlertTriangle className="size-5" />{error}</div>
  if (!source) return <div className="grid min-h-64 place-items-center rounded-3xl border border-navy/10 bg-white"><LoaderCircle className="size-7 animate-spin text-navy" aria-label="Indlæser forhåndsvisning" /></div>
  return <div className="w-full min-w-0">
    <iframe ref={frameRef} src={source} title={title} sandbox="allow-scripts allow-forms" scrolling={resized ? 'no' : 'auto'} style={{ height }} className="block w-full max-w-full rounded-3xl border border-navy/15 bg-white transition-[height] duration-200" />
    {fallback && !resized && <div role="status" className="mt-3 flex flex-col gap-3 rounded-2xl border border-navy/10 bg-periwinkle/20 p-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between"><p>Automatisk højde kunne ikke aktiveres for denne fil. Du kan stadig bruge øvelsen og rulle inde i rammen.</p><button type="button" onClick={() => setHeight((current) => Math.min(current + 480, MAX_EXERCISE_HEIGHT))} className="min-h-11 shrink-0 rounded-full bg-white px-5 py-2 font-bold text-navy shadow-sm">Gør visningen højere</button></div>}
  </div>
}
