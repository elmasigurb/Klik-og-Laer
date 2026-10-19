import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Category } from '../../types'
import { useCatalog } from '../../features/catalog/CatalogContext'
import { useContent } from '../../features/content/ContentContext'
import { CategoryIcon } from '../ui/Icons'

const tones = {
  sage: 'bg-lime', apricot: 'bg-coral/70', sky: 'bg-periwinkle', lavender: 'bg-periwinkle/70', rose: 'bg-coral/50', sand: 'bg-lime/65',
}

export function CategoryCard({ category }: { category: Category }) {
  const { exercises } = useCatalog()
  const { content } = useContent()
  const items = exercises.filter((exercise) => exercise.categoryId === category.id && exercise.isPublished)

  return (
    <Link to={`/categories/${category.slug}`} className={`card-lift group flex min-h-64 flex-col rounded-[28px] border border-forest-950/7 p-6 ${tones[category.tone]}`}>
      <div className="mb-8 flex items-start justify-between">
        <span className="grid size-12 place-items-center rounded-2xl bg-white/65 text-forest-900"><CategoryIcon name={category.icon} /></span>
        <ArrowUpRight className="size-5 text-forest-900/50 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
      </div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-forest-800/65">{category.eyebrow}</p>
      <h3 className="display text-2xl font-bold leading-tight text-forest-950">{category.name}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-forest-950/70">{category.description}</p>
      <div className="mt-6 flex items-center gap-4">
        <span className="whitespace-nowrap text-xs font-bold text-forest-900/70">{items.length} {items.length === 1 ? content.categories.exerciseSingular : content.categories.exercisePlural}</span>
      </div>
    </Link>
  )
}
