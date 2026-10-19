import { ArrowRight, Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Exercise } from '../../types'
import { useContent } from '../../features/content/ContentContext'

const accents: Record<string, string> = {
  mint: 'from-lime to-ivory', moss: 'from-lime to-periwinkle/40', apricot: 'from-coral to-ivory', clay: 'from-coral/80 to-lime/50', sky: 'from-periwinkle to-ivory', blue: 'from-periwinkle to-lime/45', violet: 'from-periwinkle to-coral/40', rose: 'from-coral to-periwinkle/35', berry: 'from-coral/70 to-periwinkle/65',
}

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const { content } = useContent()
  const copy = content.exercises
  return (
    <article className="card-lift overflow-hidden rounded-[26px] border border-forest-900/8 bg-cream-50">
      <Link to={`/exercises/${exercise.id}`} className="group block">
        <div className={`relative flex h-36 items-end overflow-hidden bg-gradient-to-br p-5 ${accents[exercise.accent] ?? accents.mint}`}>
          <div className="absolute -right-7 -top-12 size-36 rounded-full border-[24px] border-white/30" />
          <div className="absolute right-16 top-9 size-9 rotate-12 rounded-lg bg-white/35" />
        </div>
        <div className="p-5">
          <div className="mb-2 flex items-center gap-3 text-xs font-semibold text-muted"><span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />{exercise.duration} min.</span><span>·</span><span>{exercise.difficulty}</span></div>
          <h3 className="text-lg font-black tracking-[-0.02em] text-forest-950">{exercise.title}</h3>
          <p className="mt-2 min-h-12 text-sm leading-6 text-muted">{exercise.description}</p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-forest-800">{copy.startButton}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
        </div>
      </Link>
    </article>
  )
}
