import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

function buildQuestions(words) {
  return shuffle(words).map(word => {
    // Pick 3 wrong answers from other words
    const others = shuffle(words.filter(w => w.id !== word.id)).slice(0, 3)
    const options = shuffle([word.english, ...others.map(o => o.english)])
    return { word, options, correct: word.english }
  })
}

export default function MCQQuiz() {
  const { listId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [list, setList]       = useState(null)
  const [questions, setQuestions] = useState([])
  const [index, setIndex]     = useState(0)
  const [selected, setSelected] = useState(null)   // chosen answer
  const [score, setScore]     = useState(0)
  const [done, setDone]       = useState(false)
  const [loading, setLoading] = useState(true)
  const [wrongAnswers, setWrongAnswers] = useState([]) // { finnish, correct, chosen }

  useEffect(() => {
    async function load() {
      const [{ data: listData }, { data: wordsData }] = await Promise.all([
        supabase.from('vocab_lists').select('title').eq('id', listId).single(),
        supabase.from('vocab_words').select('*').eq('list_id', listId).order('position')
      ])
      setList(listData)
      setQuestions(buildQuestions(wordsData ?? []))
      setLoading(false)
    }
    load()
  }, [listId])

  async function handleSelect(option) {
    if (selected) return // already answered
    setSelected(option)

    const q = questions[index]
    const isCorrect = option === q.correct
    const newScore = isCorrect ? score + 1 : score
    const newWrong = isCorrect
      ? wrongAnswers
      : [...wrongAnswers, { finnish: q.word.finnish, correct: q.correct, chosen: option }]

    if (index + 1 >= questions.length) {
      await supabase.from('quiz_results').insert({
        student_id: user.id,
        list_id: listId,
        mode: 'mcq',
        score: newScore,
        total: questions.length
      })
      setScore(newScore)
      setWrongAnswers(newWrong)
      setTimeout(() => setDone(true), 800)
    } else {
      setScore(newScore)
      setWrongAnswers(newWrong)
      setTimeout(() => {
        setSelected(null)
        setIndex(i => i + 1)
      }, 800)
    }
  }

  function restart() {
    setQuestions(q => buildQuestions(q.map(x => x.word)))
    setIndex(0)
    setSelected(null)
    setScore(0)
    setDone(false)
    setWrongAnswers([])
  }

  if (loading) return <Spinner />

  const q = questions[index]
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0
  const progress = ((index) / questions.length) * 100

  // Done screen
  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'}</div>
          <h2 className="text-2xl font-bold text-gray-900">Quiz Complete!</h2>
          <p className="text-gray-500 mt-1">{list?.title}</p>
        </div>

        <div className="bg-blue-50 rounded-2xl p-6 text-center mb-6">
          <p className="text-5xl font-bold text-blue-900">{pct}%</p>
          <p className="text-blue-700 mt-1">{score} / {questions.length} correct</p>
        </div>

        {/* Missed words review */}
        {wrongAnswers.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-red-500">✗</span> Review these words
            </h3>
            <div className="space-y-2">
              {wrongAnswers.map((w, i) => (
                <div key={i} className="bg-white rounded-xl border border-red-100 p-3">
                  <p className="font-semibold text-gray-900">{w.finnish}</p>
                  <p className="text-sm text-green-600 mt-0.5">✓ {w.correct}</p>
                  <p className="text-sm text-red-400 line-through">{w.chosen}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={restart}
            className="w-full bg-blue-900 text-white font-semibold py-3 rounded-xl hover:bg-blue-800"
          >
            🔄 Try Again
          </button>
          <button
            onClick={() => navigate('/student')}
            className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-200"
          >
            ← Back to Lists
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/student')} className="text-blue-700 text-sm">← Back</button>
        <span className="text-sm text-gray-500 font-medium">{index + 1} / {questions.length}</span>
        <span className="text-sm font-semibold text-blue-900">Score: {score}</span>
      </div>

      {/* Progress bar */}
      <div className="bg-gray-200 rounded-full h-1.5 mb-6">
        <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">What does this mean in English?</p>
        <p className="text-4xl font-bold text-blue-900">{q?.word?.finnish}</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {q?.options?.map(option => {
          let style = 'bg-white border-2 border-gray-200 text-gray-800 hover:border-blue-400 hover:bg-blue-50'
          if (selected) {
            if (option === q.correct) {
              style = 'bg-green-50 border-2 border-green-500 text-green-800'
            } else if (option === selected && option !== q.correct) {
              style = 'bg-red-50 border-2 border-red-400 text-red-700'
            } else {
              style = 'bg-white border-2 border-gray-200 text-gray-400'
            }
          }
          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              disabled={!!selected}
              className={`w-full text-left px-4 py-3.5 rounded-xl font-medium text-sm transition-all ${style}`}
            >
              <span className="flex items-center gap-3">
                {selected && option === q.correct && <span>✓</span>}
                {selected && option === selected && option !== q.correct && <span>✗</span>}
                {(!selected || (option !== q.correct && option !== selected)) && <span className="w-4" />}
                {option}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
