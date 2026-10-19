import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useContent } from '../features/content/ContentContext'

export function NotFoundPage() {
  const { content } = useContent()
  const copy = content.navigation
  return <div className="page-shell grid min-h-[65vh] place-items-center py-16 text-center"><div><p className="display text-8xl font-bold text-periwinkle">{copy.notFoundCode}</p><h1 className="display mt-3 text-4xl font-bold text-forest-950">{copy.notFoundHeading}</h1><p className="mt-3 text-muted">{copy.notFoundBody}</p><Link to="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-forest-900 px-6 py-3 text-sm font-black text-white"><ArrowLeft className="size-4" />{copy.backHomeButton}</Link></div></div>
}
