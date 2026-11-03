import { ArrowRight, BookOpenCheck, Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CategoryCard } from '../components/catalog/CategoryCard'
import { useCatalog } from '../features/catalog/CatalogContext'
import { useContent } from '../features/content/ContentContext'
import { appwriteConfig } from '../lib/appwrite'
import { useStudentClass } from '../features/student/StudentClassContext'

export function HomePage() {
  const { content } = useContent()
  const copy = content.homepage
  const catalog = useCatalog()
  const categories = catalog.categories.filter((category) => category.isPublished)
  const { selectedClass } = useStudentClass()
  const assignedIds = new Set(catalog.exerciseClassAssignments.filter((item) => item.classId === selectedClass?.id && item.isPublished).map((item) => item.exerciseId))
  const classExercises = catalog.exercises.filter((item) => item.isPublished && assignedIds.has(item.id))
  const classCategories = categories.filter((category) => classExercises.some((exercise) => exercise.categoryId === category.id))
  const libraryPath = appwriteConfig.features.publicClassNavigation ? selectedClass ? `/classes/${selectedClass.id}` : '/classes' : '/exercises'

  return (
    <>
      <section className="grain relative border-b border-forest-900/8 bg-forest-900 text-white">
        <div className="page-shell grid min-h-[480px] items-center gap-10 py-14 lg:min-h-[600px] lg:grid-cols-[1.15fr_.85fr] lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-bold text-periwinkle"><Sprout className="size-4" />{copy.heroEyebrow}</div>
            <h1 className="display text-[clamp(2.8rem,8vw,7rem)] font-extrabold leading-[.9] tracking-[-0.055em]">{copy.heroTitleFirst}<br /><span className="text-coral">{copy.heroTitleSecond}</span></h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-white/70">{copy.heroDescription}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to={libraryPath} className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-sm font-black text-navy transition-transform hover:-translate-y-0.5">{copy.primaryButton} <ArrowRight className="size-4" /></Link>
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
          <div><p className="mb-3 text-xs font-black uppercase tracking-[.18em] text-navy/70">{appwriteConfig.features.publicClassNavigation ? 'Din undervisning' : copy.categoriesEyebrow}</p><h2 id="categories-title" className="display text-4xl font-bold tracking-[-.035em] text-forest-950 sm:text-5xl">{appwriteConfig.features.publicClassNavigation ? selectedClass ? selectedClass.name : 'Vælg din klasse ovenfor' : copy.categoriesHeading}</h2></div>
          <Link to={libraryPath} className="inline-flex min-h-11 items-center gap-2 text-base font-black text-forest-800 hover:underline">{appwriteConfig.features.publicClassNavigation ? selectedClass ? 'Se klassens kategorier' : 'Se alle klasser' : copy.categoriesLink} <ArrowRight className="size-4" /></Link>
        </div>
        {appwriteConfig.features.publicClassNavigation ? selectedClass ? classCategories.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{classCategories.map((category) => <CategoryCard key={category.id} category={category} to={`/classes/${selectedClass.id}/categories/${category.slug}`} count={classExercises.filter((exercise) => exercise.categoryId === category.id).length} />)}</div> : <div className="rounded-[28px] border border-dashed border-forest-900/20 bg-white/60 p-8 text-center sm:p-12"><p className="display text-2xl font-bold text-navy">Ingen øvelser er klar endnu</p><p className="mx-auto mt-2 max-w-lg text-base leading-7 text-muted">Din lærer er ved at gøre klassens øvelser klar.</p></div> : <div className="rounded-[28px] border border-dashed border-forest-900/20 bg-white/60 p-8 text-center sm:p-12"><p className="display text-2xl font-bold text-navy">Vælg en klasse for at komme i gang</p><p className="mx-auto mt-2 max-w-lg text-base leading-7 text-muted">Når du har valgt din klasse, viser vi kun de kategorier og øvelser, som din lærer har gjort klar.</p></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{categories.map((category) => <CategoryCard key={category.id} category={category} />)}</div>}
      </section>
    </>
  )
}
