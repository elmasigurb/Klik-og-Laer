import { Check, RotateCcw, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Exercise } from '../../types'
import { exerciseContent } from './demoData'
import { useContent } from '../content/ContentContext'

type AnswerMap = Record<string, string>

interface Props {
  exercise: Exercise
  savedAnswers?: unknown
  onAnswersChange: (answers: AnswerMap) => void
  onCheck: (score: number) => void
}

const fallback = exerciseContent['verber-i-nutid']

export function DemoExerciseRenderer({ exercise, savedAnswers, onAnswersChange, onCheck }: Props) {
  const { content: siteContent } = useContent()
  const copy = siteContent.exercises
  const content = exerciseContent[exercise.id as keyof typeof exerciseContent] ?? fallback
  const initial = useMemo(() => (savedAnswers && typeof savedAnswers === 'object' ? savedAnswers as AnswerMap : {}), [savedAnswers])
  const [answers, setAnswers] = useState<AnswerMap>(initial)
  const [checked, setChecked] = useState(false)

  const setAnswer = (key: string, value: string) => { setChecked(false); setAnswers((current) => { const next = { ...current, [key]: value }; onAnswersChange(next); return next }) }

  function correctCount() {
    if (content.type === 'sentence') return answers.sentence === content.answer.join(' ') ? 1 : 0
    if (content.type === 'match') return content.pairs.filter((pair, index) => answers[String(index)] === pair.answer).length
    return content.questions.filter((question, index) => answers[String(index)]?.trim().toLocaleLowerCase('da') === question.answer.toLocaleLowerCase('da')).length
  }
  const total = content.type === 'sentence' ? 1 : content.type === 'match' ? content.pairs.length : content.questions.length
  const score = Math.round(correctCount() / total * 100)
  const handleCheck = () => { setChecked(true); onCheck(score) }

  return <div className="rounded-[30px] border border-forest-900/10 bg-white p-5 shadow-soft sm:p-8">
    <div className="mb-7 border-b border-forest-900/8 pb-6"><p className="text-xs font-black uppercase tracking-[.16em] text-navy/70">{copy.interactiveEyebrow}</p><p className="mt-2 text-base leading-7 text-muted">{content.prompt}</p></div>

    {(content.type === 'choice' || content.type === 'fill') && <div className="space-y-7">{content.questions.map((question, index) => {
      const isCorrect = answers[String(index)]?.trim().toLocaleLowerCase('da') === question.answer.toLocaleLowerCase('da')
      return <fieldset key={question.text}><legend className="mb-3 font-bold text-forest-950"><span className="mr-2 text-muted">{index + 1}.</span>{question.text}</legend>
        {content.type === 'choice' && 'options' in question ? <div className="grid gap-2 sm:grid-cols-3">{question.options.map((option: string) => <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition-colors ${answers[String(index)] === option ? 'border-navy bg-periwinkle/35' : 'border-forest-900/10 hover:bg-cream-100'}`}><input type="radio" name={`question-${index}`} value={option} checked={answers[String(index)] === option} onChange={() => setAnswer(String(index), option)} className="accent-navy" /><span className="text-sm font-semibold">{option}</span></label>)}</div> : <input aria-label={`${copy.questionAriaPrefix} ${index + 1}`} value={answers[String(index)] ?? ''} onChange={(event) => setAnswer(String(index), event.target.value)} className="w-full rounded-2xl border border-forest-900/15 bg-cream-50 px-4 py-3 outline-none focus:border-forest-700" placeholder={copy.answerPlaceholder} />}
        {checked && <p className={`mt-2 flex items-center gap-2 text-sm font-bold ${isCorrect ? 'text-navy' : 'text-danger'}`}>{isCorrect ? <Check className="size-4" /> : <X className="size-4" />}{isCorrect ? copy.correctFeedback : `${copy.incorrectAnswerPrefix} “${question.answer}”.`}</p>}
      </fieldset>
    })}</div>}

    {content.type === 'match' && <div className="space-y-4">{content.pairs.map((pair, index) => <label key={pair.word} className="grid items-center gap-2 rounded-2xl bg-cream-100 p-4 sm:grid-cols-[150px_1fr]"><span className="font-black text-forest-950">{pair.word}</span><select value={answers[String(index)] ?? ''} onChange={(event) => setAnswer(String(index), event.target.value)} className="rounded-xl border border-forest-900/15 bg-white px-3 py-2.5 outline-none focus:border-forest-700"><option value="">{copy.matchPlaceholder}</option>{content.pairs.map((option) => <option key={option.answer}>{option.answer}</option>)}</select>{checked && <span className={`sm:col-start-2 text-sm font-bold ${answers[String(index)] === pair.answer ? 'text-navy' : 'text-danger'}`}>{answers[String(index)] === pair.answer ? copy.correctFeedback : `${copy.matchAnswerPrefix}: ${pair.answer}`}</span>}</label>)}</div>}

    {content.type === 'sentence' && <SentenceBuilder words={[...content.words]} value={answers.sentence ?? ''} onChange={(value) => setAnswer('sentence', value)} checked={checked} correct={score === 100} answer={content.answer.join(' ')} placeholder={copy.sentencePlaceholder} correctFeedback={copy.sentenceCorrectFeedback} incorrectPrefix={copy.incorrectAnswerPrefix} />}

    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-forest-900/8 pt-6"><button type="button" onClick={handleCheck} className="rounded-full bg-forest-900 px-6 py-3 text-sm font-black text-white hover:bg-forest-800">{copy.checkAnswersButton}</button><button type="button" onClick={() => { setAnswers({}); setChecked(false) }} className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-muted hover:bg-cream-100"><RotateCcw className="size-4" />{copy.clearAnswersButton}</button>{checked && <p className="ml-auto font-black text-forest-900">{correctCount()} af {total} {copy.correctCountSuffix} · {score}%</p>}</div>
  </div>
}

function SentenceBuilder({ words, value, onChange, checked, correct, answer, placeholder, correctFeedback, incorrectPrefix }: { words: string[]; value: string; onChange: (value: string) => void; checked: boolean; correct: boolean; answer: string; placeholder: string; correctFeedback: string; incorrectPrefix: string }) {
  const chosen = value ? value.split(' ') : []
  const available = words.filter((word) => !chosen.includes(word))
  return <div><div className="min-h-20 rounded-2xl border-2 border-dashed border-forest-900/15 bg-cream-50 p-4">{chosen.length ? <div className="flex flex-wrap gap-2">{chosen.map((word) => <button type="button" key={word} onClick={() => onChange(chosen.filter((item) => item !== word).join(' '))} className="rounded-xl bg-forest-900 px-3 py-2 text-sm font-bold text-white">{word}</button>)}</div> : <p className="text-sm text-muted">{placeholder}</p>}</div><div className="mt-3 flex flex-wrap gap-2">{available.map((word) => <button type="button" key={word} onClick={() => onChange([...chosen, word].join(' '))} className="rounded-xl border border-forest-900/12 bg-white px-3 py-2 text-sm font-bold hover:bg-cream-100">{word}</button>)}</div>{checked && <p className={`mt-3 text-sm font-bold ${correct ? 'text-navy' : 'text-danger'}`}>{correct ? correctFeedback : `${incorrectPrefix}: ${answer}.`}</p>}</div>
}
