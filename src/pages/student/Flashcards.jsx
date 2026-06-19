import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

export default function Flashcards() {
  const { listId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [list, setList]   = useState(null)
  const [words, setWords] = useState([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown]     = useState(0)
  const [unknown, setUnknown] = useState(0)
  const [done, setDone]       = useState(false)
  const [loading, setLoading] = useState(true)

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

  async function handleAnswer(isKnown) {
    const newKnown   = isKnown ? known + 1 : known
    const newUnknown = !isKnown ? unknown + 1 : unknown

    if (index + 1 >= words.length) {
      // Save result
      await supabase.from('quiz_results').insert({
        student_id: user.id,
        list_id: listId,
        mode: 'flashcard',
        score: newKnown,
        total: words.length
      })
      setKnown(newKnown)
      setUnknown(newUnknown)
      setDone(true)
    } else {
      setKnown(newKnown)
      setUnknown(newUnknown)
      setFlipped(false)
      setTimeout(() => setIndex(i => i + 1), 100)
    }
  }

  function restart() {
    setWords(w => shuffle(w))
    setIndex(0)
    setFlipped(false)
    setKnown(0)
    setUnknown(0)
    setDone(false)
  }

  if (loading) return <Spinner />

  const word = words[index]
  const progress = ((index) / words.length) * 100

  // Done screen
  if (done) {
    const pct = Math.round((known / words.length) * 100)
    return (
      <div className="max-w-lg mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">{pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'}</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Session Complete!</h2>
        <p className="text-gray-500 mb-6">{list?.title}</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-green-50 rounded-2xl p-5">
            <p className="text-3xl font-bold text-green-600">{known}</p>
            <p className="text-sm text-green-700 mt-1">I knew it ✓</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-5">
            <p className="text-3xl font-bold text-red-500">{unknown}</p>
            <p className="text-sm text-red-600 mt-1">Still learning</p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-2xl p-5 mb-8">
          <p className="text-4xl font-bold text-blue-900">{pct}%</p>
          <p className="text-blue-700 text-sm mt-1">Score</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={restart}
            className="w-full bg-blue-900 text-white font-semibold py-3 rounded-xl hover:bg-blue-800 transition-colors"
          >
            🔄 Practice Again
          </button>
          <button
            onClick={() => navigate('/student')}
            className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors"
          >
            ← Back to Lists
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col min-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/student')} className="text-blue-700 text-sm">← Back</button>
        <span className="text-sm text-gray-500 font-medium">{index + 1} / {words.length}</span>
        <div className="flex gap-3 text-sm">
          <span className="text-green-600 font-semibold">✓ {known}</span>
          <span className="text-red-500 font-semibold">✗ {unknown}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-gray-200 rounded-full h-1.5 mb-6">
        <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">
          {flipped ? 'English' : 'Finnish — tap to reveal'}
        </p>

        <div className="card-flip w-full" style={{ height: 220 }} onClick={() => setFlipped(f => !f)}>
          <div className={`card-inner ${flipped ? 'flipped' : ''}`}>
            {/* Front: Finnish */}
            <div className="card-front bg-white border-2 border-blue-100 shadow-lg cursor-pointer select-none">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-900 mb-2">{word?.finnish}</div>
                <p className="text-gray-400 text-sm">Tap to see translation</p>
              </div>
            </div>
            {/* Back: English */}
            <div className="card-back bg-blue-900 shadow-lg cursor-pointer select-none">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">{word?.english}</div>
                <p className="text-blue-300 text-sm">{word?.finnish}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Answer buttons — only show after flip */}
        <div className={`w-full mt-6 grid grid-cols-2 gap-3 transition-opacity ${flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button
            onClick={() => handleAnswer(false)}
            className="bg-red-50 border-2 border-red-200 text-red-600 font-semibold py-3.5 rounded-xl hover:bg-red-100 transition-colors"
          >
            ✗ Still learning
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="bg-green-50 border-2 border-green-200 text-green-700 font-semibold py-3.5 rounded-xl hover:bg-green-100 transition-colors"
          >
            ✓ I knew it!
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          {flipped ? 'How did you do?' : 'Tap the card to reveal the answer'}
        </p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
