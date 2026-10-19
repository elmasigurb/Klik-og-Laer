import { Blocks, BookOpen, CalendarDays, Clock3, Feather, PenLine, Sparkles } from 'lucide-react'

const icons = { blocks: Blocks, book: BookOpen, calendar: CalendarDays, clock: Clock3, pen: PenLine, sparkles: Sparkles }

export function CategoryIcon({ name, className = 'size-6' }: { name: string; className?: string }) {
  const Icon = icons[name as keyof typeof icons] ?? Feather
  return <Icon aria-hidden="true" className={className} strokeWidth={1.8} />
}
