import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !panel.current) return
      const focusable = [...panel.current.querySelectorAll<HTMLElement>('button, a, input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])')].filter((item) => !item.hasAttribute('disabled'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus() }
  }, [onClose])
  return <div className="fixed inset-0 z-50 grid place-items-center bg-navy/65 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section ref={panel} role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`max-h-[92vh] w-full overflow-auto rounded-[28px] bg-ivory p-5 shadow-2xl sm:p-7 ${wide ? 'max-w-6xl' : 'max-w-2xl'}`}><div className="mb-5 flex items-center justify-between gap-4"><h2 id="modal-title" className="font-display text-2xl font-bold text-navy">{title}</h2><button autoFocus type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white text-navy hover:bg-periwinkle/30" aria-label="Luk"><X className="size-5" /></button></div>{children}</section></div>
}
