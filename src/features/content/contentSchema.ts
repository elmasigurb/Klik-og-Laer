export const defaultContent = {
  homepage: {
    heroEyebrow: 'Lær lidt. Husk mere.',
    heroTitleFirst: 'Dansk, der',
    heroTitleSecond: 'giver mening.',
    heroDescription: 'Korte, interaktive øvelser, der hjælper dig med at forstå sproget — uden login og uden karakterpres.',
    primaryButton: 'Udforsk øvelser',
    visualLabel: 'ord + idéer',
    categoriesEyebrow: 'Vælg dit fokus',
    categoriesHeading: 'Hvad vil du øve i dag?',
    categoriesLink: 'Se alle øvelser',
  },
  navigation: {
    homeLabel: 'Hjem',
    exercisesLabel: 'Øvelser',
    primaryAriaLabel: 'Primær navigation',
    mobileAriaLabel: 'Mobilnavigation',
    openMenuLabel: 'Åbn menu',
    closeMenuLabel: 'Luk menu',
    logoAriaLabel: 'Klik & Lær, gå til forsiden',
    breadcrumbAriaLabel: 'Brødkrummer',
    homeAriaLabel: 'Forside',
    backHomeButton: 'Tilbage til forsiden',
    notFoundCode: '404',
    notFoundHeading: 'Siden blev ikke fundet',
    notFoundBody: 'Måske har ordene byttet plads.',
  },
  exercises: {
    libraryEyebrow: 'Øvelsesbibliotek',
    libraryHeading: 'Find din næste øvelse',
    libraryDescription: 'Vælg en udgivet øvelse og arbejd direkte i browseren. Dine svar og resultater gemmes ikke.',
    searchPlaceholder: 'Søg efter en øvelse…',
    allCategoriesLabel: 'Alle kategorier',
    noResultsHeading: 'Ingen øvelser fundet',
    noResultsBody: 'Prøv et andet søgeord eller en anden kategori.',
    startButton: 'Start øvelsen',
    interactiveEyebrow: 'Interaktiv øvelse',
    checkAnswersButton: 'Tjek mine svar',
    clearAnswersButton: 'Ryd svar',
    answerPlaceholder: 'Skriv dit svar…',
    matchPlaceholder: 'Vælg en forklaring',
    questionAriaPrefix: 'Svar på spørgsmål',
    correctFeedback: 'Rigtigt!',
    incorrectAnswerPrefix: 'Det rigtige svar er',
    matchAnswerPrefix: 'Svar',
    sentencePlaceholder: 'Din sætning kommer til at stå her.',
    sentenceCorrectFeedback: 'Perfekt — sætningen er rigtig!',
    correctCountSuffix: 'rigtige',
    sessionHeading: 'Denne øvelse',
    sessionNote: 'Feedback og point vises kun, mens øvelsen er åben. Intet resultat bliver gemt.',
    backCategoryButton: 'Tilbage til kategorien',
  },
  categories: {
    breadcrumbLabel: 'Øvelser',
    exercisesHeading: 'Øvelser',
    exerciseSingular: 'øvelse',
    exercisePlural: 'øvelser',
    emptyHeading: 'Der er ikke lagt øvelser ind endnu',
    emptyBody: 'Vi er ved at gøre de første øvelser klar. Kig forbi igen snart.',
  },
  footer: {
    tagline: 'små skridt, stærkere sprog.',
    publicNote: 'Ingen konto · Ingen gemte resultater',
  },
}

export type SiteContent = { [Page in keyof typeof defaultContent]: { [Key in keyof typeof defaultContent[Page]]: string } }
export type ContentPageId = keyof SiteContent

export interface ContentVersion {
  id: string
  publishedAt: string
  label: string
  content: SiteContent
}

export interface ContentFieldDefinition { key: string; label: string; multiline?: boolean; help?: string }

const fields = (values: Array<[string, string, boolean?]>): ContentFieldDefinition[] => values.map(([key, label, multiline]) => ({ key, label, multiline: Boolean(multiline) }))

export const contentPageDefinitions: Array<{ id: ContentPageId; label: string; description: string; fields: ContentFieldDefinition[] }> = [
  { id: 'homepage', label: 'Forside', description: 'Velkomst, introduktion og kategorioversigt.', fields: fields([
    ['heroEyebrow', 'Lille velkomstlinje'], ['heroTitleFirst', 'Hovedoverskrift, linje 1'], ['heroTitleSecond', 'Hovedoverskrift, linje 2'], ['heroDescription', 'Introduktion', true], ['primaryButton', 'Primær knap'], ['visualLabel', 'Visuel mærkat'], ['categoriesEyebrow', 'Kategori-sektion: lille overskrift'], ['categoriesHeading', 'Kategori-sektion: overskrift'], ['categoriesLink', 'Kategori-sektion: link'],
  ]) },
  { id: 'navigation', label: 'Navigation', description: 'Offentlig navigation, tilgængelighed og fejlside.', fields: fields([
    ['homeLabel', 'Menupunkt: Hjem'], ['exercisesLabel', 'Menupunkt: Øvelser'], ['primaryAriaLabel', 'Tilgængeligt navn: hovedmenu'], ['mobileAriaLabel', 'Tilgængeligt navn: mobilmenu'], ['openMenuLabel', 'Åbn menu'], ['closeMenuLabel', 'Luk menu'], ['logoAriaLabel', 'Tilgængeligt navn: logo'], ['breadcrumbAriaLabel', 'Tilgængeligt navn: brødkrummer'], ['homeAriaLabel', 'Tilgængeligt navn: forside'], ['backHomeButton', 'Tilbage til forsiden'], ['notFoundCode', 'Fejlkode'], ['notFoundHeading', '404-overskrift'], ['notFoundBody', '404-beskrivelse'],
  ]) },
  { id: 'exercises', label: 'Øvelser', description: 'Bibliotek, kort, feedback og øvelsesside.', fields: fields([
    ['libraryEyebrow', 'Bibliotek: lille overskrift'], ['libraryHeading', 'Bibliotek: overskrift'], ['libraryDescription', 'Bibliotek: beskrivelse', true], ['searchPlaceholder', 'Søgefelt'], ['allCategoriesLabel', 'Alle kategorier'], ['noResultsHeading', 'Ingen resultater: overskrift'], ['noResultsBody', 'Ingen resultater: tekst'], ['startButton', 'Start-knap'], ['interactiveEyebrow', 'Interaktiv øvelse: mærkat'], ['checkAnswersButton', 'Tjek svar-knap'], ['clearAnswersButton', 'Ryd svar-knap'], ['answerPlaceholder', 'Svarfelt'], ['matchPlaceholder', 'Match-felt'], ['questionAriaPrefix', 'Tilgængeligt spørgsmålssvar'], ['correctFeedback', 'Feedback: rigtigt'], ['incorrectAnswerPrefix', 'Feedback: forkert svar'], ['matchAnswerPrefix', 'Feedback: match-svar'], ['sentencePlaceholder', 'Sætningsbygger: tom tekst'], ['sentenceCorrectFeedback', 'Sætningsbygger: korrekt'], ['correctCountSuffix', 'Resultat: efter antal'], ['sessionHeading', 'Sessionspanel: overskrift'], ['sessionNote', 'Sessionspanel: forklaring', true], ['backCategoryButton', 'Tilbage til kategori'],
  ]) },
  { id: 'categories', label: 'Kategorier', description: 'Kategorioversigt, optælling og tom tilstand.', fields: fields([
    ['breadcrumbLabel', 'Brødkrumme'], ['exercisesHeading', 'Listeoverskrift'], ['exerciseSingular', 'Ental: øvelse'], ['exercisePlural', 'Flertal: øvelser'], ['emptyHeading', 'Tom kategori: overskrift'], ['emptyBody', 'Tom kategori: beskrivelse', true],
  ]) },
  { id: 'footer', label: 'Sidefod', description: 'Brandbudskab og information om den offentlige oplevelse.', fields: fields([
    ['tagline', 'Tagline'], ['publicNote', 'Note om konto og resultater'],
  ]) },
]
