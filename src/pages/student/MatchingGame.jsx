import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { updateStreak } from '../../lib/streak'
import { updateMastery } from '../../lib/mastery'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

const PAIR_COUNT = 6

export default function MatchingGame() {
  const { listId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [list, setList]           = useState(null)
  const [allWords, setAllWords]   = useState([])
  const [round, setRound]         = useState([])
  const [selected, setSelected]   = useState(null) // { id, side } side = 'fi' | 'en'
  const [matched, setMatched]     = useState(new Set())
  const [wrong, setWrong]         = useState(null)
  const [roundNum, setRoundNum]   = useState(0)
  const [totalRounds, setTotalRounds] = useState(0)
  const [score, setScore]         = useState(0)
  const [attempts, setAttempts]   = useState(0)
  const [done, setDone]           = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: listData }, { data: wordsData }] = await Promise.all([
        supabase.from('vocab_lists').select('title').eq('id', listId).single(),
        supabase.from('vocab_words').select('*').eq('list_id', listId).order('position')
      ])
      setList(listData)
      const shuffled = shuffle(wordsData ?? [])
      setAllWords(shuffled)
      setTotalRounds(Math.ceil(shuffled.length / PAIR_COUNT))
      startRound(shuffled, 0)
      setLoading(false)
    }
    load()
  }, [listId])

  function startRound(words, rNum) {
    const slice = words.slice(rNum * PAIR_COUNT, (rNum + 1) * PAIR_COUNT)
    setRound(slice)
    setMatched(new Set())
    setSelected(null)
    setWrong(null)
    setRoundNum(rNum)
  }

  async function handleTap(id, side) {
    if (matched.has(id) || wrong) return

    if (!selected) {
      setSelected({ id, side })
      return
    }

    // Same side tapped - just re-select
    if (selected.side === side) {
      setSelected({ id, side })
      return
    }

    // Different sides tapped - check match
    setAttempts(a => a + 1)
    if (selected.id === id) {
      // Correct match
      const newMatched = new Set([...matched, id])
      setMatched(newMatched)
      setSelected(null)
      setScore(s => s + 1)
      updateMastery(user.id, id, listId, true)

      // Round complete
      if (newMatched.size === round.length) {
        const nextRound = roundNum + 1
        if (nextRound >= totalRounds) {
          // All done
          await supabase.from('quiz_results').insert({
            student_id: user.id, list_id: listId,
            mode: 'matching', score: score + 1, total: allWords.length
          })
          await updateStreak(user.id)
          setTimeout(() => setDone(true), 600)
        } else {
          setTimeout(() => startRound(allWords, nextRound), 600)
        }
      }
    } else {
      // Wrong match
      updateMastery(user.id, selected.id, listId, false)
      setWrong({ a: { id: selected.id, side: selected.side }, b: { id, side } })
      setTimeout(() => { setWrong(null); setSelected(null) }, 800)
    }
  }

  function restart() {
    const reshuffled = shuffle(allWords)
    setAllWords(reshuffled)
    setTotalRounds(Math.ceil(reshuffled.length / PAIR_COUNT))
    setScore(0); setAttempts(0); setDone(false)
    startRound(reshuffled, 0)
  }

  if (loading) return <Spinner />

  const pct = allWords.length > 0 ? Math.round((score / allWords.length) * 100) : 0
  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 100
  const finnishCol = shuffle([...round])
  const englishCol = shuffle([...round])

  if (done) {
    const emoji = pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'
    return (
      <div className="max-w-lg mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-3">{emoji}</div>
        <h2 className="text-2xl font-bold text-stone-900">Matching Complete!</h2>
        <p className="text-stone-400 mb-6">{list?.title}</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
            <p className="text-3xl font-bold text-orange-600">{pct}%</p>
            <p className="text-sm text-orange-500 mt-1">Score</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <p className="text-3xl font-bold text-green-600">{accuracy}%</p>
            <p className="text-sm text-green-600 mt-1">Accuracy</p>
          </div>
        </div>
        <div className="space-y-3">
          <button onClick={restart}
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 shadow-md">
            Play Again
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
        <span className="text-sm text-stone-400">Round {roundNum + 1} / {totalRounds}</span>
        <span className="text-sm font-bold text-green-600">{matched.size}/{round.length} matched</span>
      </div>

      <div className="bg-stone-200 rounded-full h-2 mb-1">
        <div className="bg-orange-400 h-2 rounded-full transition-all"
          style={{ width: (score / allWords.length * 100) + '%' }} />
      </div>
      <p className="text-xs text-stone-400 text-center mb-6">Tap a Finnish word, then its English match</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">Finnish</p>
          {finnishCol.map(w => {
            const isMatched = matched.has(w.id)
            const isSelected = selected?.id === w.id && selected?.side === 'fi'
            const isWrong = wrong && ((wrong.a.id === w.id && wrong.a.side === 'fi') || (wrong.b.id === w.id && wrong.b.side === 'fi'))
            return (
              <button
                key={w.id + '-fi'}
                onClick={() => handleTap(w.id, 'fi')}
                disabled={isMatched}
                className={`w-full py-3 px-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                  isMatched
                    ? 'bg-green-100 border-green-300 text-green-700 opacity-60'
                    : isWrong
                    ? 'bg-red-100 border-red-400 text-red-700'
                    : isSelected
                    ? 'bg-orange-500 border-orange-500 text-white shadow-md scale-105'
                    : 'bg-white border-stone-200 text-stone-800 hover:border-orange-300'
                }`}
              >
                {isMatched ? '✓' : w.finnish}
              </button>
            )
          })}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">English</p>
          {englishCol.map(w => {
            const isMatched = matched.has(w.id)
            const isSelected = selected?.id === w.id && selected?.side === 'en'
            const isWrong = wrong && ((wrong.a.id === w.id && wrong.a.side === 'en') || (wrong.b.id === w.id && wrong.b.side === 'en'))
            return (
              <button
                key={w.id + '-en'}
                onClick={() => handleTap(w.id, 'en')}
                disabled={isMatched}
                className={`w-full py-3 px-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                  isMatched
                    ? 'bg-green-100 border-green-300 text-green-700 opacity-60'
                    : isWrong
                    ? 'bg-red-100 border-red-400 text-red-700'
                    : isSelected
                    ? 'bg-green-500 border-green-500 text-white shadow-md scale-105'
                    : 'bg-white border-stone-200 text-stone-800 hover:border-green-300'
                }`}
              >
                {isMatched ? '✓' : w.english}
              </button>
            )
          })}
        </div>
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
