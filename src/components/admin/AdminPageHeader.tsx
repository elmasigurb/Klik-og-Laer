import type { ReactNode } from 'react'

export function AdminPageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end"><div><p className="text-xs font-black uppercase tracking-[.16em] text-navy/65">{eyebrow}</p><h1 className="font-display mt-2 text-4xl font-extrabold tracking-[-.04em] text-navy sm:text-5xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">{description}</p></div>{action}</div>
}
