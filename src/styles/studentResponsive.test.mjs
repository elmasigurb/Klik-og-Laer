import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../../', import.meta.url)

test('student layout keeps iPad widths fluid and touch controls readable', async () => {
  const [css, exercisePage, selector, appLayout] = await Promise.all([
    readFile(new URL('src/styles/index.css', root), 'utf8'),
    readFile(new URL('src/pages/ExercisePage.tsx', root), 'utf8'),
    readFile(new URL('src/components/catalog/StudentClassSelector.tsx', root), 'utf8'),
    readFile(new URL('src/components/layout/AppLayout.tsx', root), 'utf8'),
  ])

  assert.match(css, /overflow-x:\s*hidden/)
  assert.match(css, /font-size:\s*max\(1rem, 16px\)/)
  assert.match(css, /min-height:\s*44px/)
  assert.match(exercisePage, /xl:grid-cols-/)
  assert.doesNotMatch(exercisePage, /lg:grid-cols-/)
  assert.match(selector, /text-base/)
  assert.match(selector, /min-h-11/)
  assert.match(selector, /Alle klasser/)
  assert.match(selector, /max-w-\[15rem\]/)
  assert.match(appLayout, /h-20/)
  assert.match(appLayout, /md:flex/)
})
