import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const MODES = [
  { key: 'flashcards', label: 'Flashcards', icon: 'FC', path: '/student/flashcards/', color: 'bg-orange-500 hover:bg-orange-600' },
  { key: 'quiz',       label: 'MCQ Quiz',   icon: 'Q',  path: '/student/quiz/',       color: 'bg-green-500 hover:bg-green-600' },
  { key: 'typing',     label: 'Typing',     icon: 'T',  path: '/student/typing/',     color: 'bg-blue-500 hover:bg-blue-600' },
  { key: 'matching',   label: 'Matching',   icon: 'M',  path: '/student/matching/',   color: 'bg-purple-500 hover:bg-purple-600' },
]

export default function StudentDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [lists, setLists]     = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: assigned }, { data: scores }] = await Promise.all([
        supabase
          .from('assignments')
          .select('list_id, vocab_lists(id, title, vocab_words(count))')
          .eq('student_id', user.id),
        supabase
          .from('quiz_results')
          .select('list_id, score, total, mode, created_at')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
      ])
      setLists((assigned ?? []).map(a => a.vocab_lists))
      setResults(scores ?? [])
      setLoading(false)
    }
    load()
  }, [user.id])

  if (loading) return <Spinner />

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const bestByList = {}
  results.forEach(r => {
    const pct = Math.round((r.score / r.total) * 100)
    if (!bestByList[r.list_id] || pct > bestByList[r.list_id]) bestByList[r.list_id] = pct
  })

  const modeEmojis = { flashcard: '🃏', mcq: '✏️', typing: '⌨️', matching: '🔗' }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Hi, {firstName}! 👋</h1>
        <p className="text-stone-400 text-sm mt-1">
          {lists.length} list{lists.length !== 1 ? 's' : ''} assigned · Ready to practice?
        </p>
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <div className="text-6xl mb-4">📚</div>
          <p className="font-semibold text-stone-600">No lists assigned yet</p>
          <p className="text-sm mt-2">Your teacher will assign vocabulary lists soon.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-bold text-stone-500 text-xs uppercase tracking-widest">Your Vocabulary Lists</h2>
          {lists.map(list => {
            const wordCount = list?.vocab_words?.[0]?.count ?? 0
            const best = bestByList[list.id]
            return (
              <div key={list.id} className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-stone-900">{list.title}</h3>
                      <p className="text-stone-400 text-sm">{wordCount} words</p>
                    </div>
                    {best !== undefined && (
                      <span className={'text-xs font-bold px-2 py-1 rounded-full ' + (
                        best >= 80 ? 'bg-green-100 text-green-700'
                        : best >= 60 ? 'bg-orange-100 text-orange-700'
                        : 'bg-red-100 text-red-600'
                      )}>
                        Best: {best}%
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {MODES.map(mode => (
                      <button
                        key={mode.key}
                        onClick={() => navigate(mode.path + list.id)}
                        className={'flex items-center justify-center gap-1.5 text-white font-bold py-2.5 rounded-xl transition-colors text-sm shadow-sm ' + mode.color}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="font-bold text-stone-500 text-xs uppercase tracking-widest mb-3">Recent Activity</h2>
          <div className="space-y-2">
            {results.slice(0, 5).map((r, i) => {
              const pct = Math.round((r.score / r.total) * 100)
              const listName = lists.find(l => l.id === r.list_id)?.title ?? 'Unknown'
              return (
                <div key={i} className="bg-white border border-orange-100 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-lg">{modeEmojis[r.mode] ?? '📝'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 truncate">{listName}</p>
                    <p className="text-xs text-stone-400">{r.mode} · {r.score}/{r.total} correct</p>
                  </div>
                  <span className={'text-sm font-bold ' + (pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-orange-500' : 'text-red-500')}>
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
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
