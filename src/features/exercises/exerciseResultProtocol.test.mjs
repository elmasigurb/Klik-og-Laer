import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { exerciseResultFixtures } from './exerciseResultFixtures.mjs'
import {
  buildExerciseResultBridge,
  EXERCISE_RESULT_MESSAGE,
  EXERCISE_RESULT_VERSION,
  exerciseHtmlSignature,
  getExerciseResultAdapter,
  getExerciseResultAdapterDefinition,
  isTrustedExerciseResultMessage,
  resolveExerciseResultSnapshot,
} from './exerciseResultProtocol.mjs'

function elementById(html, selector) {
  assert.match(selector, /^#[\w-]+$/)
  const id = selector.slice(1)
  const match = html.match(new RegExp(`<([a-z][\\w-]*)\\b([^>]*\\bid=["']${id}["'][^>]*)>([\\s\\S]*?)<\\/\\1>`, 'i'))
  if (!match) return null
  return { attributes: match[2], innerHtml: match[3], text: match[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }
}

function snapshotFromFixture(html, adapter) {
  const finalElement = elementById(html, adapter.finalSelector)
  const scoreElement = elementById(html, adapter.scoreSelector)
  const hidden = !finalElement || /\bhidden\b/i.test(finalElement.attributes)
  const additionalCompletion = !adapter.requiresAdditionalCompletion || /class=["'][^"']*\bfeedback\b[^"']*\bgood\b/i.test(finalElement.attributes + finalElement.innerHtml)
  return { finalVisible: !hidden, scoreText: scoreElement?.text ?? '', additionalCompletion }
}

test('all 36 linked exercise fixtures map to the four adapter families', () => {
  assert.equal(exerciseResultFixtures.length, 36)
  assert.deepEqual(exerciseResultFixtures.map((fixture) => getExerciseResultAdapter(fixture.exerciseId, fixture.htmlSignature)?.family), exerciseResultFixtures.map((fixture) => fixture.family))
  assert.deepEqual(new Set(exerciseResultFixtures.map((fixture) => fixture.family)), new Set(['bulk-submit', 'sequential-completion', 'multi-stage-point-based', 'composite-writing']))
})

test('intermediate feedback and progress percentages never resolve as final results for all 36 fixtures', () => {
  for (const fixture of exerciseResultFixtures) {
    const adapter = getExerciseResultAdapter(fixture.exerciseId, fixture.htmlSignature)
    assert.equal(resolveExerciseResultSnapshot(adapter, snapshotFromFixture(fixture.intermediate, adapter)), null, fixture.title)
  }
})

test('all 36 final result fixtures reuse raw earned and possible scores', () => {
  for (const fixture of exerciseResultFixtures) {
    const adapter = getExerciseResultAdapter(fixture.exerciseId, fixture.htmlSignature)
    assert.deepEqual(resolveExerciseResultSnapshot(adapter, snapshotFromFixture(fixture.passed, adapter)), { earned: fixture.passEarned, possible: fixture.possible, completed: true }, fixture.title)
  }
})

test('raw scores below 80 percent fail even when a rounded display could show 80 percent', () => {
  for (const fixture of exerciseResultFixtures.filter((item) => item.family !== 'composite-writing')) {
    const adapter = getExerciseResultAdapter(fixture.exerciseId, fixture.htmlSignature)
    assert.deepEqual(resolveExerciseResultSnapshot(adapter, snapshotFromFixture(fixture.failed, adapter)), { earned: fixture.failEarned, possible: fixture.possible, completed: false }, fixture.title)
  }
})

test('both composite writing exercises preserve the original writing completion requirement', () => {
  for (const fixture of exerciseResultFixtures.filter((item) => item.family === 'composite-writing')) {
    const adapter = getExerciseResultAdapter(fixture.exerciseId, fixture.htmlSignature)
    assert.deepEqual(resolveExerciseResultSnapshot(adapter, snapshotFromFixture(fixture.failed, adapter)), { earned: 8, possible: 10, completed: false }, fixture.title)
    assert.deepEqual(resolveExerciseResultSnapshot(adapter, snapshotFromFixture(fixture.passed, adapter)), { earned: 8, possible: 10, completed: true }, fixture.title)
  }
})

test('every adapter requires both its exercise ID and exact audited HTML signature', async () => {
  for (const fixture of exerciseResultFixtures) {
    assert.ok(getExerciseResultAdapterDefinition(fixture.exerciseId), fixture.title)
    assert.ok(getExerciseResultAdapter(fixture.exerciseId, fixture.htmlSignature), fixture.title)
    assert.equal(getExerciseResultAdapter(fixture.exerciseId, 'changed0'), null, fixture.title)
  }
  assert.notEqual(await exerciseHtmlSignature('<html>original</html>'), await exerciseHtmlSignature('<html>changed</html>'))
})

test('result messages require the exact opaque sandbox frame, schema, signature and adapter mapping', () => {
  const fixture = exerciseResultFixtures[0]
  const adapter = getExerciseResultAdapter(fixture.exerciseId, fixture.htmlSignature)
  const frameWindow = {}
  const frameId = 'frame-token-123456789'
  const data = { type: EXERCISE_RESULT_MESSAGE, version: EXERCISE_RESULT_VERSION, frameId, exerciseId: fixture.exerciseId, htmlSignature: fixture.htmlSignature, attemptId: 'attempt-token-123456789', adapterId: adapter.id, adapterFamily: adapter.family, earned: 32, possible: 40, completed: true, final: true }
  assert.equal(isTrustedExerciseResultMessage({ source: frameWindow, origin: 'null', data }, frameWindow, frameId, fixture.exerciseId, fixture.htmlSignature), true)
  assert.equal(isTrustedExerciseResultMessage({ source: {}, origin: 'null', data }, frameWindow, frameId, fixture.exerciseId, fixture.htmlSignature), false)
  assert.equal(isTrustedExerciseResultMessage({ source: frameWindow, origin: 'https://klik.test', data }, frameWindow, frameId, fixture.exerciseId, fixture.htmlSignature), false)
  assert.equal(isTrustedExerciseResultMessage({ source: frameWindow, origin: 'null', data: { ...data, extra: true } }, frameWindow, frameId, fixture.exerciseId, fixture.htmlSignature), false)
  assert.equal(isTrustedExerciseResultMessage({ source: frameWindow, origin: 'null', data: { ...data, htmlSignature: 'changed0' } }, frameWindow, frameId, fixture.exerciseId, fixture.htmlSignature), false)
  assert.equal(isTrustedExerciseResultMessage({ source: frameWindow, origin: 'null', data: { ...data, earned: 31, completed: true } }, frameWindow, frameId, fixture.exerciseId, fixture.htmlSignature), false)
  assert.equal(isTrustedExerciseResultMessage({ source: frameWindow, origin: 'null', data: { ...data, possible: 41 } }, frameWindow, frameId, fixture.exerciseId, fixture.htmlSignature), false)
})

test('runtime bridge targets the parent origin and changed or unsupported files fail safely', () => {
  const fixture = exerciseResultFixtures[0]
  const source = buildExerciseResultBridge('frame-token-123456789', 'https://klik.test', fixture.exerciseId, fixture.htmlSignature)
  assert.match(source, /data-kl-result-bridge/)
  assert.match(source, /beginRetry/)
  assert.match(source, /attemptId=createAttemptId\(\)/)
  assert.match(source, /armed=false/)
  assert.match(source, /waitingForReset=true/)
  assert.match(source, /EXERCISE_COMPLETION_PERCENT=80/)
  assert.match(source, /parent\.postMessage/)
  assert.match(source, /https:\/\/klik\.test/)
  assert.doesNotMatch(source, /postMessage\([^;]+,"\*"\)/)
  assert.equal(buildExerciseResultBridge('frame-token-123456789', 'https://klik.test', fixture.exerciseId, 'changed0'), '')
  assert.equal(buildExerciseResultBridge('frame-token-123456789', 'https://klik.test', 'unsupported', fixture.htmlSignature), '')
})

test('the generated bridge emits at most once per attempt and rearms after retry reset', () => {
  const fixture = exerciseResultFixtures[0]
  const source = buildExerciseResultBridge('frame-token-123456789', 'https://klik.test', fixture.exerciseId, fixture.htmlSignature)
  const script = source.match(/^<script[^>]*>([\s\S]*)<\/script>$/)?.[1]
  assert.ok(script)
  let hidden = false
  let scoreText = 'Anna — 32/40 rétt (80%)'
  let clickHandler
  let mutationHandler
  let attemptNumber = 0
  const messages = []
  class FakeElement { closest(selector) { return selector === '#retry' ? this : null } }
  const finalElement = { hidden: false, classList: { contains: () => hidden }, querySelector: () => null }
  const scoreElement = { get textContent() { return scoreText } }
  const context = {
    Element: FakeElement,
    Uint32Array,
    addEventListener: () => undefined,
    crypto: { randomUUID: () => `attempt-token-${String(++attemptNumber).padStart(8, '0')}` },
    document: {
      currentScript: { remove: () => undefined }, readyState: 'complete', documentElement: {},
      addEventListener: (type, handler) => { if (type === 'click') clickHandler = handler },
      querySelector: (selector) => selector === '#result' ? finalElement : selector === '#summary' ? scoreElement : null,
    },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
    MutationObserver: class { constructor(handler) { mutationHandler = handler } observe() {} },
    parent: { postMessage: (message, origin) => messages.push({ message, origin }) },
    requestAnimationFrame: (callback) => callback(),
  }
  vm.runInNewContext(script, context)
  assert.equal(messages.length, 1)
  assert.equal(messages[0].message.completed, true)
  clickHandler({ target: new FakeElement() })
  assert.equal(messages.length, 1)
  scoreText = ''
  mutationHandler()
  scoreText = 'Anna — 31/40 rétt (78%)'
  mutationHandler()
  assert.equal(messages.length, 2)
  assert.equal(messages[1].message.completed, false)
  assert.notEqual(messages[0].message.attemptId, messages[1].message.attemptId)
  assert.equal(messages[1].origin, 'https://klik.test')
})
