import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function Leaderboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      // Use RPC to safely fetch classmates without recursive RLS
      const { data: classmates } = await supabase.rpc('get_classmates')

      if (!classmates || classmates.length === 0) {
        setLoading(false); return
      }

      // Fetch session counts
      const ids = classmates.map(s => s.id)
      const { data: results } = await supabase
        .from('quiz_results')
        .select('student_id, score, total')
        .in('student_id', ids)

      const enriched = classmates.map(s => {
        const myResults = (results ?? []).filter(r => r.student_id === s.id)
        const sessions  = myResults.length
        const avgScore  = sessions > 0
          ? Math.round(myResults.reduce((acc, r) => acc + (r.score / r.total) * 100, 0) / sessions)
          : 0
        return { ...s, sessions, avgScore }
      }).sort((a, b) => b.streak !== a.streak ? b.streak - a.streak : b.avgScore - a.avgScore)

      setStudents(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const medals = ['🥇', '🥈', '🥉']

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/student')} className="text-orange-600 text-sm font-medium">← Back</button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-stone-900">🏆 Leaderboard</h1>
          <p className="text-stone-400 text-sm">Your class ranking</p>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <div className="text-5xl mb-3">👥</div>
          <p>No classmates yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((s, i) => {
            const isMe = s.id === user.id
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  isMe
                    ? 'border-orange-400 bg-orange-50 shadow-md'
                    : 'border-stone-100 bg-white'
                }`}
              >
                <div className="text-2xl w-8 text-center shrink-0">
                  {i < 3 ? medals[i] : <span className="text-sm font-bold text-stone-400">#{i + 1}</span>}
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                  isMe ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'
                }`}>
                  {s.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-900 text-sm">
                    {s.full_name} {isMe && <span className="text-orange-500">(you)</span>}
                  </p>
                  <p className="text-xs text-stone-400">{s.sessions} session{s.sessions !== 1 ? 's' : ''} · avg {s.avgScore}%</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-orange-600">{s.streak} 🔥</p>
                  <p className="text-xs text-stone-400">streak</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-center text-xs text-stone-400 mt-6">
        Ranked by streak, then average score
      </p>
    </div>
  )
}
