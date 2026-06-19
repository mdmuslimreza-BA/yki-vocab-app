import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { updateStreak } from '../../lib/streak'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

function buildQuestions(words) {
  return shuffle(words).map(w => {
    const distractors = shuffle(words.filter(x => x.id !== w.id)).slice(0, 3).map(x => x.english)
    const choices = shuffle([w.english, ...distractors])
    return { ...w, choices, correct: w.english }
  })
}

export default function MCQQuiz() {
  const { listId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [list, setList]           = useState(null)
  const [questions, setQuestions] = useState([])
  const [index, setIndex]         = useState(0)
  const [selected, setSelected]   = useState(null)
  const [score, setScore]         = useState(0)
  const [missed, setMissed]       = useState([])
  const [done, setDone]           = useState(false)
  const [loading, setLoading]     = useState(true)

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

  async function handleSelect(choice) {
    if (selected) return
    setSelected(choice)
    const q = questions[index]
    const correct = choice === q.correct
    const newScore = correct ? score + 1 : score
    const newMissed = correct ? missed : [...missed, q]

    setTimeout(async () => {
      if (index + 1 >= questions.length) {
        await supabase.from('quiz_results').insert({
          student_id: user.id, list_id: listId,
          mode: 'mcq', score: newScore, total: questions.length
        })
        await updateStreak(user.id)
        setScore(newScore); setMissed(newMissed); setDone(true)
      } else {
        setScore(newScore); setMissed(newMissed)
        setIndex(i => i + 1); setSelected(null)
      }
    }, 900)
  }

  function restart() {
    setQuestions(q => buildQuestions(q))
    setIndex(0); setSelected(null); setScore(0); setMissed([]); setDone(false)
  }

  if (loading) return <Spinner />

  const q = questions[index]
  const progress = ((index) / questions.length) * 100
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0

  if (done) {
    const emoji = pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">{emoji}</div>
          <h2 className="text-2xl font-bold text-stone-900">Quiz Complete!</h2>
          <p className="text-stone-400">{list?.title}</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center mb-6">
          <p className="text-5xl font-bold text-orange-600">{pct}%</p>
          <p className="text-orange-500 mt-1">{score} / {questions.length} correct</p>
        </div>

        {missed.length > 0 && (
          <div className="mb-6">
            <p className="font-bold text-stone-700 mb-3">📖 Review these words:</p>
            <div className="space-y-2">
              {missed.map((m, i) => (
                <div key={i} className="bg-white border border-orange-100 rounded-xl px-4 py-3 flex justify-between items-center">
                  <span className="font-semibold text-stone-800">{m.finnish}</span>
                  <span className="text-green-600 font-bold">→ {m.english}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button onClick={restart}
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors shadow-md">
            🔄 Try Again
          </button>
          <button onClick={() => navigate('/student')}
            className="w-full bg-stone-100 text-stone-600 font-bold py-3 rounded-xl hover:bg-stone-200 transition-colors">
            ← Back to Lists
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/student')} className="text-orange-600 text-sm font-medium">← Back</button>
        <span className="text-sm text-stone-400 font-medium">Q {index + 1} / {questions.length}</span>
        <span className="text-sm font-bold text-green-600">{score} ✓</span>
      </div>

      <div className="bg-stone-200 rounded-full h-2 mb-6">
        <div className="bg-orange-400 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="bg-white border-2 border-orange-100 rounded-2xl p-6 mb-6 shadow-sm">
        <p className="text-xs text-stone-400 uppercase tracking-widest mb-3 font-medium">🇫🇮 What does this mean?</p>
        <p className="text-3xl font-bold text-stone-900 text-center">{q?.finnish}</p>
      </div>

      <div className="space-y-3">
        {q?.choices.map((c, i) => {
          let style = 'bg-white border-2 border-stone-200 text-stone-800 hover:border-orange-300 hover:bg-orange-50'
          if (selected === c && c === q.correct) style = 'bg-green-500 border-green-500 text-white'
          else if (selected === c && c !== q.correct) style = 'bg-red-400 border-red-400 text-white'
          else if (selected && c === q.correct) style = 'bg-green-500 border-green-500 text-white'
          return (
            <button
              key={i}
              onClick={() => handleSelect(c)}
              disabled={!!selected}
              className={`w-full text-left px-5 py-4 rounded-xl font-semibold transition-all ${style} disabled:cursor-default`}
            >
              <span className="text-xs opacity-70 mr-2">{['A','B','C','D'][i]}</span>{c}
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
      <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
