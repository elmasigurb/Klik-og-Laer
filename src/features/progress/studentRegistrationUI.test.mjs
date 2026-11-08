import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const uiSource = await readFile(new URL('./StudentIdentityUI.tsx', import.meta.url), 'utf8')
const contextSource = await readFile(new URL('./StudentProgressContext.tsx', import.meta.url), 'utf8')

test('registration prompt offers accessible anonymous use and later registration', () => {
  assert.match(uiSource, /aria-label="Fortsæt uden at gemme"/)
  assert.match(uiSource, />Fortsæt uden at gemme<\/button>/)
  assert.match(uiSource, />Gem dine fremskridt<\/button>/)
  assert.match(uiSource, /bliver ikke tilføjet bagefter/)
  assert.match(uiSource, /size-11/)
})

test('anonymous exercise results never call the persistence Function', () => {
  assert.match(contextSource, /status !== 'ready' \|\| !identity \|\| !result\.completed\) return/)
  assert.match(contextSource, /setRegistrationPromptOpen\(false\)/)
  assert.match(contextSource, /dismissStudentRegistration\(\)/)
})
