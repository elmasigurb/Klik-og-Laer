import type { ExerciseStatus } from '../../types'

const statuses: Record<ExerciseStatus, { label: string; className: string }> = {
  draft: { label: 'Kladde', className: 'bg-periwinkle/35 text-navy' },
  published: { label: 'Udgivet', className: 'bg-lime text-navy' },
  archived: { label: 'Arkiveret', className: 'bg-navy/8 text-muted' },
}

export function AdminStatusBadge({ status }: { status: ExerciseStatus }) {
  const value = statuses[status]
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${value.className}`}>{value.label}</span>
}
