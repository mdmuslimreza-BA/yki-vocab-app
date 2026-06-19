import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function StudentDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [lists, setLists]     = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Get assigned lists
      const { data: assignData } = await supabase
        .from('assignments')
        .select('list_id, vocab_lists(id, title, vocab_words(count))')
        .eq('student_id', user.id)

      // Get recent results
      const { data: resultData } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      setLists((assignData ?? []).map(a => a.vocab_lists).filter(Boolean))
      setResults(resultData ?? [])
      setLoading(false)
    }
    load()
  }, [user.id])

  if (loading) return <Spinner />

  // Best score per list
  const bestScore = {}
  results.forEach(r => {
    const pct = Math.round((r.score / r.total) * 100)
    if (!bestScore[r.list_id] || pct > bestScore[r.list_id]) bestScore[r.list_id] = pct
  })

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {lists.length} list{lists.length !== 1 ? 's' : ''} assigned · {results.length} quiz{results.length !== 1 ? 'zes' : ''} completed
        </p>
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📚</div>
          <p className="font-medium">No lists assigned yet</p>
          <p className="text-sm mt-1">Your teacher will assign vocabulary lists to you.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Your Lists</h2>
          {lists.map(list => {
            const wordCount = list.vocab_words?.[0]?.count ?? 0
            const best = bestScore[list.id]
            return (
              <div key={list.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{list.title}</h3>
                    <p className="text-sm text-gray-400">{wordCount} words</p>
                  </div>
                  {best !== undefined && (
                    <div className={`text-sm font-bold px-2 py-1 rounded-lg ${
                      best >= 80 ? 'bg-green-100 text-green-700' :
                      best >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-600'
                    }`}>
                      Best: {best}%
                    </div>
                  )}
                </div>

                {/* Practice buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate(`/student/flashcards/${list.id}`)}
                    className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium py-2.5 rounded-lg text-sm transition-colors"
                  >
                    🃏 Flashcards
                  </button>
                  <button
                    onClick={() => navigate(`/student/mcq/${list.id}`)}
                    className={`flex items-center justify-center gap-2 font-medium py-2.5 rounded-lg text-sm transition-colors ${
                      wordCount < 4
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-800'
                    }`}
                    disabled={wordCount < 4}
                    title={wordCount < 4 ? 'Need at least 4 words for MCQ' : ''}
                  >
                    📝 Quiz (MCQ)
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent results */}
      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Recent Results</h2>
          <div className="space-y-2">
            {results.slice(0, 5).map(r => {
              const pct = Math.round((r.score / r.total) * 100)
              const list = lists.find(l => l.id === r.list_id)
              return (
                <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    r.mode === 'mcq' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {r.mode === 'mcq' ? 'MCQ' : 'FC'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{list?.title ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-bold text-sm ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
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
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
