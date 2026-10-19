import { ArrowRight, BookOpenCheck, Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CategoryCard } from '../components/catalog/CategoryCard'
import { useCatalog } from '../features/catalog/CatalogContext'
import { useContent } from '../features/content/ContentContext'

export function HomePage() {
  const { content } = useContent()
  const copy = content.homepage
  const catalog = useCatalog()
  const categories = catalog.categories.filter((category) => category.isPublished)

  return (
    <>
      <section className="grain relative border-b border-forest-900/8 bg-forest-900 text-white">
        <div className="page-shell grid min-h-[600px] items-center gap-10 py-16 lg:grid-cols-[1.15fr_.85fr] lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-bold text-periwinkle"><Sprout className="size-4" />{copy.heroEyebrow}</div>
            <h1 className="display text-[clamp(3.4rem,8vw,7rem)] font-extrabold leading-[.9] tracking-[-0.055em]">{copy.heroTitleFirst}<br /><span className="text-coral">{copy.heroTitleSecond}</span></h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-white/70">{copy.heroDescription}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/exercises" className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-sm font-black text-navy transition-transform hover:-translate-y-0.5">{copy.primaryButton} <ArrowRight className="size-4" /></Link>
            </div>
          </div>
          <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block" aria-hidden="true">
            <div className="absolute inset-[6%] rounded-full border border-white/15" />
            <div className="absolute inset-[20%] rounded-full bg-periwinkle shadow-2xl" />
            <div className="absolute left-[11%] top-[22%] grid size-24 -rotate-6 place-items-center rounded-[28px] bg-coral text-4xl font-black text-navy shadow-xl">Æ</div>
            <div className="absolute bottom-[12%] right-[10%] grid size-28 rotate-6 place-items-center rounded-full bg-lime text-navy shadow-xl"><BookOpenCheck className="size-11" /></div>
            <div className="absolute right-[12%] top-[8%] rounded-full bg-ivory px-5 py-3 text-sm font-black text-navy shadow-lg">{copy.visualLabel}</div>
            <div className="absolute bottom-[24%] left-[1%] h-3 w-24 rotate-[-20deg] rounded-full bg-coral" />
          </div>
        </div>
      </section>

      <section className="page-shell py-20" aria-labelledby="categories-title">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="mb-3 text-xs font-black uppercase tracking-[.18em] text-navy/70">{copy.categoriesEyebrow}</p><h2 id="categories-title" className="display text-4xl font-bold tracking-[-.035em] text-forest-950 sm:text-5xl">{copy.categoriesHeading}</h2></div>
          <Link to="/exercises" className="inline-flex items-center gap-2 text-sm font-black text-forest-800 hover:underline">{copy.categoriesLink} <ArrowRight className="size-4" /></Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{categories.map((category) => <CategoryCard key={category.id} category={category} />)}</div>
      </section>
    </>
  )
}
