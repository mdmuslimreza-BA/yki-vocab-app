import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { updateStreak } from '../../lib/streak'
import { updateMastery } from '../../lib/mastery'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

function normalize(s) { return s.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '') }

export default function TypingMode() {
  const { listId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const inputRef = useRef()

  const [list, setList]         = useState(null)
  const [words, setWords]       = useState([])
  const [index, setIndex]       = useState(0)
  const [input, setInput]       = useState('')
  const [feedback, setFeedback] = useState(null) // null | 'correct' | 'wrong'
  const [score, setScore]       = useState(0)
  const [missed, setMissed]     = useState([])
  const [done, setDone]         = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: listData }, { data: wordsData }] = await Promise.all([
        supabase.from('vocab_lists').select('title').eq('id', listId).single(),
        supabase.from('vocab_words').select('*').eq('list_id', listId).order('position')
      ])
      setList(listData)
      setWords(shuffle(wordsData ?? []))
      setLoading(false)
    }
    load()
  }, [listId])

  useEffect(() => {
    if (!loading && !done) inputRef.current?.focus()
  }, [index, loading, done])

  async function handleSubmit(e) {
    e.preventDefault()
    if (feedback) return

    const word = words[index]
    const correct = normalize(input) === normalize(word.english)

    setFeedback(correct ? 'correct' : 'wrong')
    const newScore = correct ? score + 1 : score
    const newMissed = correct ? missed : [...missed, word]

    // Update per-word mastery
    updateMastery(user.id, word.id, listId, correct)

    setTimeout(async () => {
      if (index + 1 >= words.length) {
        await supabase.from('quiz_results').insert({
          student_id: user.id, list_id: listId,
          mode: 'typing', score: newScore, total: words.length
        })
        await updateStreak(user.id)
        setScore(newScore); setMissed(newMissed); setDone(true)
      } else {
        setScore(newScore); setMissed(newMissed)
        setInput(''); setFeedback(null)
        setIndex(i => i + 1)
      }
    }, 1200)
  }

  function handleSkip() {
    if (feedback) return
    const word = words[index]
    setFeedback('wrong')
    updateMastery(user.id, word.id, listId, false)
    const newMissed = [...missed, word]
    setTimeout(async () => {
      if (index + 1 >= words.length) {
        await supabase.from('quiz_results').insert({
          student_id: user.id, list_id: listId,
          mode: 'typing', score, total: words.length
        })
        await updateStreak(user.id)
        setMissed(newMissed); setDone(true)
      } else {
        setMissed(newMissed)
        setInput(''); setFeedback(null)
        setIndex(i => i + 1)
      }
    }, 1200)
  }

  function restart() {
    setWords(w => shuffle(w)); setIndex(0)
    setInput(''); setFeedback(null)
    setScore(0); setMissed([]); setDone(false)
  }

  if (loading) return <Spinner />

  const word = words[index]
  const progress = (index / words.length) * 100
  const pct = words.length > 0 ? Math.round((score / words.length) * 100) : 0

  if (done) {
    const emoji = pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">{emoji}</div>
          <h2 className="text-2xl font-bold text-stone-900">Typing Test Done!</h2>
          <p className="text-stone-400">{list?.title}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center mb-6">
          <p className="text-5xl font-bold text-orange-600">{pct}%</p>
          <p className="text-orange-500 mt-1">{score} / {words.length} correct</p>
        </div>
        {missed.length > 0 && (
          <div className="mb-6">
            <p className="font-bold text-stone-700 mb-3">Review these words:</p>
            <div className="space-y-2">
              {missed.map((m, i) => (
                <div key={i} className="bg-white border border-orange-100 rounded-xl px-4 py-3 flex justify-between">
                  <span className="font-semibold text-stone-800">{m.finnish}</span>
                  <span className="text-green-600 font-bold">{m.english}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-3">
          <button onClick={restart}
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors shadow-md">
            Try Again
          </button>
          <button onClick={() => navigate('/student')}
            className="w-full bg-stone-100 text-stone-600 font-bold py-3 rounded-xl hover:bg-stone-200">
            Back to Lists
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/student')} className="text-orange-600 text-sm font-medium">Back</button>
        <span className="text-sm text-stone-400 font-medium">{index + 1} / {words.length}</span>
        <span className="text-sm font-bold text-green-600">{score} correct</span>
      </div>

      <div className="bg-stone-200 rounded-full h-2 mb-6">
        <div className="bg-orange-400 h-2 rounded-full transition-all duration-300" style={{ width: progress + '%' }} />
      </div>

      <div className="bg-white border-2 border-orange-100 rounded-2xl p-8 text-center mb-6 shadow-sm">
        <p className="text-xs text-stone-400 uppercase tracking-widest mb-3 font-medium">Finnish word</p>
        <p className="text-4xl font-bold text-stone-900">{word?.finnish}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={!!feedback}
            placeholder="Type the English translation..."
            className={`w-full border-2 rounded-2xl px-4 py-4 text-lg font-semibold text-center focus:outline-none transition-all ${
              feedback === 'correct'
                ? 'border-green-400 bg-green-50 text-green-700'
                : feedback === 'wrong'
                ? 'border-red-400 bg-red-50 text-red-600'
                : 'border-orange-200 bg-orange-50 focus:border-orange-400'
            }`}
          />
          {feedback === 'wrong' && (
            <p className="text-center text-green-600 font-bold mt-2 text-sm">
              Correct: {word?.english}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!input.trim() || !!feedback}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-40 shadow-md"
        >
          Check Answer
        </button>

        <button
          type="button"
          onClick={handleSkip}
          disabled={!!feedback}
          className="w-full bg-stone-100 text-stone-500 font-semibold py-3 rounded-xl hover:bg-stone-200 transition-all disabled:opacity-40 text-sm"
        >
          Skip
        </button>
      </form>

      <p className="text-center text-xs text-stone-400 mt-4">
        Tip: Spelling counts! Type carefully.
      </p>
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
