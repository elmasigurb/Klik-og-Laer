import {
  Blocks,
  Book,
  BookOpen,
  Brain,
  Calendar,
  CalendarDays,
  Clock3,
  GraduationCap,
  Headphones,
  Languages,
  Library,
  Lightbulb,
  ListChecks,
  MessageCircle,
  MessagesSquare,
  Mic,
  Notebook,
  PenLine,
  Pencil,
  Puzzle,
  Shapes,
  Sparkles,
  SpellCheck,
  Star,
  Target,
  Volume2,
  type LucideIcon,
} from 'lucide-react'

export const DEFAULT_CATEGORY_ICON = 'sparkles' as const

export const categoryIconOptions = [
  { name: 'book-closed', label: 'Bog', icon: Book },
  // Keep the original identifiers mapped to the same icons for existing categories.
  { name: 'book', label: 'Åben bog', icon: BookOpen },
  { name: 'graduation-cap', label: 'Studenterhue', icon: GraduationCap },
  { name: 'pencil', label: 'Blyant', icon: Pencil },
  { name: 'pen', label: 'Skrivepen', icon: PenLine },
  { name: 'languages', label: 'Sprog', icon: Languages },
  { name: 'spell-check', label: 'Stavning', icon: SpellCheck },
  { name: 'notebook', label: 'Notesbog', icon: Notebook },
  { name: 'calendar-single', label: 'Kalender', icon: Calendar },
  { name: 'calendar', label: 'Kalenderdage', icon: CalendarDays },
  { name: 'clock', label: 'Ur', icon: Clock3 },
  { name: 'headphones', label: 'Høretelefoner', icon: Headphones },
  { name: 'volume', label: 'Lyd', icon: Volume2 },
  { name: 'microphone', label: 'Mikrofon', icon: Mic },
  { name: 'message', label: 'Taleboble', icon: MessageCircle },
  { name: 'messages', label: 'Samtale', icon: MessagesSquare },
  { name: 'lightbulb', label: 'Idé', icon: Lightbulb },
  { name: 'brain', label: 'Hjerne', icon: Brain },
  { name: 'puzzle', label: 'Puslespil', icon: Puzzle },
  { name: 'shapes', label: 'Former', icon: Shapes },
  { name: 'blocks', label: 'Byggeklodser', icon: Blocks },
  { name: 'list-checks', label: 'Tjekliste', icon: ListChecks },
  { name: 'target', label: 'Mål', icon: Target },
  { name: 'star', label: 'Stjerne', icon: Star },
  { name: 'sparkles', label: 'Stjernedrys', icon: Sparkles },
  { name: 'library', label: 'Bibliotek', icon: Library },
] as const satisfies ReadonlyArray<{ name: string; label: string; icon: LucideIcon }>

export type CategoryIconName = (typeof categoryIconOptions)[number]['name']

const categoryIcons = Object.fromEntries(categoryIconOptions.map(({ name, icon }) => [name, icon])) as Record<CategoryIconName, LucideIcon>

export function isCategoryIconName(name: string): name is CategoryIconName {
  return Object.prototype.hasOwnProperty.call(categoryIcons, name)
}

export function getCategoryIconLabel(name: string) {
  return categoryIconOptions.find((option) => option.name === name)?.label ?? 'Stjernedrys'
}

export function CategoryIcon({ name, className = 'size-6' }: { name?: string; className?: string }) {
  const Icon = name && isCategoryIconName(name) ? categoryIcons[name] : categoryIcons[DEFAULT_CATEGORY_ICON]
  return <Icon aria-hidden="true" className={className} strokeWidth={1.8} />
}
