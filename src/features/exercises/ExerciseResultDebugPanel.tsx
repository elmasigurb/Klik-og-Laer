import { CheckCircle2, FlaskConical, RotateCcw, XCircle } from 'lucide-react'
import type { ExerciseResultMessage } from './exerciseResultProtocol.mjs'

export function ExerciseResultDebugPanel({ results, onClear }: { results: ExerciseResultMessage[]; onClear: () => void }) {
  return <section aria-label="Lokal resultatbro" className="mt-6 rounded-[28px] border border-dashed border-navy/25 bg-periwinkle/15 p-5 text-navy sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-white"><FlaskConical className="size-5" /></span><div><p className="font-bold">Lokal resultatbro</p><p className="text-sm text-muted">Kun synlig i udviklingsmiljøet. Intet gemmes.</p></div></div>
      {results.length > 0 && <button type="button" onClick={onClear} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm"><RotateCcw className="size-4" />Ryd log</button>}
    </div>
    {results.length === 0 ? <p className="mt-4 rounded-2xl bg-white/70 p-4 text-sm text-muted">Afslut den understøttede øvelse for at se den validerede slutbesked her.</p> : <ol className="mt-4 space-y-3">{results.map((result) => {
      const percent = (result.earned * 100 / result.possible).toFixed(1).replace('.0', '')
      return <li key={result.attemptId} className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-start gap-3">{result.completed ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-forest-900" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-danger" />}<div className="min-w-0"><p className="font-bold">{result.completed ? 'Gennemført' : 'Ikke gennemført'} — {result.earned}/{result.possible} ({percent}%)</p><p className="mt-1 break-all font-mono text-xs text-muted">{result.adapterFamily} · forsøg {result.attemptId}</p></div></div></li>
    })}</ol>}
  </section>
}
