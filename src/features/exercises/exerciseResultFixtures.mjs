import { EXERCISE_RESULT_ADAPTERS } from './exerciseResultAdapters.mjs'

function selectorId(selector) {
  const match = selector.match(/^#([\w-]+)$/)
  if (!match) throw new Error(`Fixture selector must be an ID: ${selector}`)
  return match[1]
}

function resultMarkup(adapter, earned, additionalCompletion, hidden = false) {
  const finalId = selectorId(adapter.finalSelector)
  const scoreId = selectorId(adapter.scoreSelector)
  const percentage = Math.round(earned / adapter.possible * 100)
  const scoreText = `Þú fékkst ${earned} af ${adapter.possible} rétt (${percentage}%).`
  const completionClass = adapter.requiresAdditionalCompletion ? `feedback ${additionalCompletion ? 'good' : 'bad'}` : 'score-value'
  if (finalId === scoreId) return `<section id="${finalId}" class="${hidden ? 'hidden ' : ''}${completionClass}">${scoreText}</section>`
  return `<section id="${finalId}" class="${hidden ? 'hidden' : ''}"><p id="${scoreId}" class="${completionClass}">${scoreText}</p></section>`
}

export const exerciseResultFixtures = EXERCISE_RESULT_ADAPTERS.map((adapter) => {
  const passEarned = Math.ceil(adapter.possible * 0.8)
  const failEarned = passEarned - 1
  const finalIsScore = adapter.finalSelector === adapter.scoreSelector
  return {
    exerciseId: adapter.exerciseId,
    title: adapter.title,
    family: adapter.family,
    htmlSignature: adapter.htmlSignature,
    passEarned,
    failEarned,
    possible: adapter.possible,
    intermediate: finalIsScore
      ? `<div id="progress">100%</div><section id="${selectorId(adapter.finalSelector)}"></section>`
      : `<div id="progress">100%</div>${resultMarkup(adapter, passEarned, true, true)}`,
    failed: adapter.requiresAdditionalCompletion ? resultMarkup(adapter, passEarned, false) : resultMarkup(adapter, failEarned, true),
    passed: resultMarkup(adapter, passEarned, true),
  }
})
