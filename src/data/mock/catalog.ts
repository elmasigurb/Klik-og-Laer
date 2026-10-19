import type { Category, Exercise } from '../../types'

const created = '2026-09-01T10:00:00.000Z'

export const seedCategories: Category[] = [
  { id: 'tense', name: 'Nutid & datid', slug: 'nutid-datid', description: 'Bliv sikker på, hvornår noget sker — og vælg den rigtige tid.', eyebrow: 'Tid på ordene', icon: 'clock', tone: 'sage', displayOrder: 0, isPublished: true, createdAt: created, updatedAt: '2026-10-15T09:30:00.000Z' },
  { id: 'grammar', name: 'Grammatik', slug: 'grammatik', description: 'Få styr på de små regler, der får dine sætninger til at sidde lige i skabet.', eyebrow: 'Sprogets byggeklodser', icon: 'blocks', tone: 'apricot', displayOrder: 1, isPublished: true, createdAt: created, updatedAt: '2026-10-12T08:00:00.000Z' },
  { id: 'vocabulary', name: 'Ordforråd', slug: 'ordforraad', description: 'Opdag nye ord og gør dit danske sprog mere levende og præcist.', eyebrow: 'Flere ord at vælge imellem', icon: 'sparkles', tone: 'sky', displayOrder: 2, isPublished: true, createdAt: created, updatedAt: '2026-10-11T08:00:00.000Z' },
  { id: 'week45', name: 'Uge 45', slug: 'uge-45', description: 'Ugens samlede træning med lidt af det hele fra undervisningen.', eyebrow: 'Denne uges fokus', icon: 'calendar', tone: 'lavender', displayOrder: 3, isPublished: true, createdAt: created, updatedAt: '2026-10-09T08:00:00.000Z' },
  { id: 'reading', name: 'Læseforståelse', slug: 'laeseforstaaelse', description: 'Læs korte tekster, find sporene og forstå det vigtigste.', eyebrow: 'Læs mellem linjerne', icon: 'book', tone: 'rose', displayOrder: 4, isPublished: true, createdAt: created, updatedAt: '2026-10-07T08:00:00.000Z' },
  { id: 'writing', name: 'Skriveøvelser', slug: 'skriveoevelser', description: 'Øv dig i at formulere klare, varierede og spændende tekster.', eyebrow: 'Find din stemme', icon: 'pen', tone: 'sand', displayOrder: 5, isPublished: true, createdAt: created, updatedAt: '2026-10-05T08:00:00.000Z' },
]

const seedExerciseRows: Array<Omit<Exercise, 'status'>> = [
  { id: 'verber-i-nutid', categoryId: 'tense', title: 'Verber i nutid', description: 'Vælg den rigtige nutidsform i fem hverdagssætninger.', duration: 6, difficulty: 'Let', kind: 'choice', accent: 'mint', isPublished: true, sourceType: 'demo', createdAt: created, updatedAt: '2026-10-18T10:30:00.000Z' },
  { id: 'fra-nutid-til-datid', categoryId: 'tense', title: 'Fra nutid til datid', description: 'Skriv verberne om, så handlingerne foregår i går.', duration: 8, difficulty: 'Mellem', kind: 'fill', accent: 'moss', isPublished: true, sourceType: 'demo', createdAt: created, updatedAt: '2026-10-16T13:00:00.000Z' },
  { id: 'ordklasser', categoryId: 'grammar', title: 'Hvilken ordklasse?', description: 'Genkend navneord, udsagnsord og tillægsord.', duration: 7, difficulty: 'Let', kind: 'choice', accent: 'apricot', isPublished: true, sourceType: 'demo', createdAt: created, updatedAt: '2026-10-15T11:00:00.000Z' },
  { id: 'saetningen-paa-plads', categoryId: 'grammar', title: 'Sætningen på plads', description: 'Saml ordene til naturlige danske sætninger.', duration: 9, difficulty: 'Mellem', kind: 'sentence', accent: 'clay', isPublished: true, sourceType: 'demo', createdAt: created, updatedAt: '2026-10-13T09:00:00.000Z' },
  { id: 'hjemmets-ord', categoryId: 'vocabulary', title: 'Hjemmets ord', description: 'Match hverdagsting med den rigtige forklaring.', duration: 5, difficulty: 'Let', kind: 'match', accent: 'sky', isPublished: true, sourceType: 'demo', createdAt: created, updatedAt: '2026-10-12T14:00:00.000Z' },
  { id: 'modsatte-ord', categoryId: 'vocabulary', title: 'Modsatte ord', description: 'Find ordpar med modsat betydning.', duration: 6, difficulty: 'Mellem', kind: 'choice', accent: 'blue', isPublished: false, sourceType: 'demo', createdAt: created, updatedAt: '2026-10-10T10:00:00.000Z' },
  { id: 'ugens-sprogmix', categoryId: 'week45', title: 'Ugens sprogmix', description: 'En blanding af tid, ordforråd og grammatik.', duration: 12, difficulty: 'Udfordring', kind: 'choice', accent: 'violet', isPublished: true, sourceType: 'demo', createdAt: created, updatedAt: '2026-10-09T12:00:00.000Z' },
  { id: 'en-tur-i-skoven', categoryId: 'reading', title: 'En tur i skoven', description: 'Læs en kort fortælling og svar på spørgsmålene.', duration: 10, difficulty: 'Let', kind: 'choice', accent: 'rose', isPublished: true, sourceType: 'demo', createdAt: created, updatedAt: '2026-10-08T09:00:00.000Z' },
  { id: 'find-hovedbudskabet', categoryId: 'reading', title: 'Find hovedbudskabet', description: 'Træn i at skelne hovedidéer fra detaljer.', duration: 11, difficulty: 'Mellem', kind: 'choice', accent: 'berry', isPublished: true, sourceType: 'demo', createdAt: created, updatedAt: '2026-10-06T08:30:00.000Z' },
]

export const seedExercises: Exercise[] = seedExerciseRows.map((exercise) => ({
  ...exercise,
  status: exercise.isPublished ? 'published' : 'draft',
}))
