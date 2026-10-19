export const exerciseContent = {
  'verber-i-nutid': {
    type: 'choice' as const,
    prompt: 'Vælg det ord, der passer bedst i sætningen.',
    questions: [
      { text: 'Maja ___ sin cykel til skole.', options: ['cykler', 'cyklede', 'cyklet'], answer: 'cykler' },
      { text: 'Vi ___ aftensmad klokken seks.', options: ['spiser', 'spiste', 'spist'], answer: 'spiser' },
      { text: 'Hunden ___ i haven.', options: ['leger', 'legede', 'leget'], answer: 'leger' },
    ],
  },
  'fra-nutid-til-datid': {
    type: 'fill' as const,
    prompt: 'Skriv verbet i datid. Små og store bogstaver tæller ikke.',
    questions: [
      { text: 'I dag går jeg hjem. I går ___ jeg hjem.', answer: 'gik' },
      { text: 'I dag spiser vi sammen. I går ___ vi sammen.', answer: 'spiste' },
      { text: 'I dag læser Noor en bog. I går ___ Noor en bog.', answer: 'læste' },
    ],
  },
  'ordklasser': {
    type: 'choice' as const,
    prompt: 'Hvilken ordklasse tilhører det fremhævede ord?',
    questions: [
      { text: 'Katten sover på den bløde pude. — “katten”', options: ['Navneord', 'Udsagnsord', 'Tillægsord'], answer: 'Navneord' },
      { text: 'Bilen kører hurtigt. — “kører”', options: ['Navneord', 'Udsagnsord', 'Tillægsord'], answer: 'Udsagnsord' },
      { text: 'Det er en solrig dag. — “solrig”', options: ['Navneord', 'Udsagnsord', 'Tillægsord'], answer: 'Tillægsord' },
    ],
  },
  'saetningen-paa-plads': {
    type: 'sentence' as const,
    prompt: 'Tryk på ordene i den rækkefølge, der danner en korrekt sætning.',
    words: ['hver', 'biblioteket', 'besøger', 'Sara', 'torsdag'],
    answer: ['Sara', 'besøger', 'biblioteket', 'hver', 'torsdag'],
  },
  'hjemmets-ord': {
    type: 'match' as const,
    prompt: 'Vælg den forklaring, der passer til hvert ord.',
    pairs: [
      { word: 'En kost', answer: 'Noget man fejer gulvet med' },
      { word: 'En pude', answer: 'Noget blødt man hviler hovedet på' },
      { word: 'Et komfur', answer: 'Et sted man laver varm mad' },
    ],
  },
} as const
