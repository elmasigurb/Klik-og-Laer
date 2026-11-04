import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldScrollToTop } from './publicScrollManagement.mjs'

test('student link navigation starts the next page at the top', () => {
  assert.equal(shouldScrollToTop({ navigationType: 'PUSH', hash: '', previousLocation: '/exercises', nextLocation: '/categories/verber' }), true)
  assert.equal(shouldScrollToTop({ navigationType: 'REPLACE', hash: '', previousLocation: '/classes/a', nextLocation: '/exercises' }), true)
})

test('answer interactions, browser history, and anchor links keep native scrolling', () => {
  assert.equal(shouldScrollToTop({ navigationType: 'PUSH', hash: '', previousLocation: '/exercises/one', nextLocation: '/exercises/one' }), false)
  assert.equal(shouldScrollToTop({ navigationType: 'POP', hash: '', previousLocation: '/categories/verber', nextLocation: '/exercises' }), false)
  assert.equal(shouldScrollToTop({ navigationType: 'PUSH', hash: '#feedback', previousLocation: '/exercises/one', nextLocation: '/exercises/one#feedback' }), false)
})
