import { ArrowUpRight, BookOpenCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { SchoolClass } from '../../types'

export function ClassCard({ schoolClass, exerciseCount }: { schoolClass: SchoolClass; exerciseCount: number }) {
  return <Link to={`/classes/${schoolClass.id}`} className="card-lift group flex min-h-56 flex-col rounded-[28px] border border-forest-950/7 bg-periwinkle p-6"><div className="mb-8 flex items-start justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-white/65 text-forest-900"><BookOpenCheck className="size-5" /></span><ArrowUpRight className="size-5 text-forest-900/50 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></div><p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-forest-800/65">Klasse</p><h2 className="display text-3xl font-bold leading-tight text-forest-950">{schoolClass.name}</h2><p className="mt-auto pt-6 text-sm font-bold text-forest-900/70">{exerciseCount} {exerciseCount === 1 ? 'øvelse' : 'øvelser'}</p></Link>
}
