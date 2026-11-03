import assert from 'node:assert/strict'
import test from 'node:test'
import { buildResizableExerciseDocument, EXERCISE_RESIZE_MESSAGE, EXERCISE_RESIZE_VERSION, isTrustedResizeMessage, MAX_EXERCISE_HEIGHT, MIN_EXERCISE_HEIGHT } from './iframeResizeProtocol.mjs'

const frameWindow = {}
const frameId = 'unpredictable-frame-id'
const validData = { type: EXERCISE_RESIZE_MESSAGE, version: EXERCISE_RESIZE_VERSION, frameId, height: 840 }

test('resize messages require the exact sandboxed frame, opaque origin, token and schema', () => {
  assert.equal(isTrustedResizeMessage({ source: frameWindow, origin: 'null', data: validData }, frameWindow, frameId), true)
  assert.equal(isTrustedResizeMessage({ source: {}, origin: 'null', data: validData }, frameWindow, frameId), false)
  assert.equal(isTrustedResizeMessage({ source: frameWindow, origin: 'https://example.com', data: validData }, frameWindow, frameId), false)
  assert.equal(isTrustedResizeMessage({ source: frameWindow, origin: 'null', data: { ...validData, frameId: 'wrong' } }, frameWindow, frameId), false)
  assert.equal(isTrustedResizeMessage({ source: frameWindow, origin: 'null', data: { ...validData, extra: 'ignored' } }, frameWindow, frameId), false)
  assert.equal(isTrustedResizeMessage({ source: frameWindow, origin: 'null', data: { ...validData, height: '840' } }, frameWindow, frameId), false)
})

test('resize heights must be integer measurements inside strict bounds', () => {
  for (const height of [NaN, Infinity, 10.5, MIN_EXERCISE_HEIGHT - 1, MAX_EXERCISE_HEIGHT + 1]) {
    assert.equal(isTrustedResizeMessage({ source: frameWindow, origin: 'null', data: { ...validData, height } }, frameWindow, frameId), false)
  }
  assert.equal(isTrustedResizeMessage({ source: frameWindow, origin: 'null', data: { ...validData, height: MIN_EXERCISE_HEIGHT } }, frameWindow, frameId), true)
  assert.equal(isTrustedResizeMessage({ source: frameWindow, origin: 'null', data: { ...validData, height: MAX_EXERCISE_HEIGHT } }, frameWindow, frameId), true)
})

test('trusted resize bridge is injected without changing the stored exercise HTML', () => {
  const original = '<!doctype html><html><body><button>Check</button></body></html>'
  const wrapped = buildResizableExerciseDocument(original, frameId, 'https://klik.test')
  assert.equal(original, '<!doctype html><html><body><button>Check</button></body></html>')
  assert.match(wrapped, /data-kl-resize-bridge/)
  assert.match(wrapped, /ResizeObserver/)
  assert.match(wrapped, /MutationObserver/)
  assert.match(wrapped, /name="viewport"/)
  assert.match(wrapped, /data-kl-touch-bridge/)
  assert.match(wrapped, /font-size:max\(16px,1em\)!important/)
  assert.match(wrapped, /bridgeScript\.remove/)
  assert.match(wrapped, /unpredictable-frame-id/)
  assert.match(wrapped, /https:\/\/klik\.test/)
  assert.doesNotMatch(wrapped, /postMessage\([^;]+,"\*"\)/)
  assert.ok(wrapped.indexOf('data-kl-resize-bridge') < wrapped.indexOf('<html>'))
})
