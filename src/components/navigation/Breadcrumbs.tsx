import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useContent } from '../../features/content/ContentContext'

export interface Crumb { label: string; to?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { content } = useContent()
  return <nav aria-label={content.navigation.breadcrumbAriaLabel} className="flex flex-wrap items-center gap-2 text-sm text-muted"><Link to="/" aria-label={content.navigation.homeAriaLabel} className="rounded hover:text-forest-900"><Home className="size-4" /></Link>{items.map((item) => <span className="flex items-center gap-2" key={item.label}><ChevronRight className="size-3.5 opacity-50" />{item.to ? <Link to={item.to} className="font-semibold hover:text-forest-900">{item.label}</Link> : <span aria-current="page">{item.label}</span>}</span>)}</nav>
}
