import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function TeacherProgress() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [results, setResults]   = useState([])   // quiz_results rows
  const [lists, setLists]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null) // selected student id

  useEffect(() => {
    async function load() {
      const [{ data: sData }, { data: lData }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').eq('teacher_id', user.id),
        supabase.from('vocab_lists').select('id, title').eq('teacher_id', user.id)
      ])
      const studentIds = (sData ?? []).map(s => s.id)
      setStudents(sData ?? [])
      setLists(lData ?? [])

      if (studentIds.length > 0) {
        const { data: rData } = await supabase
          .from('quiz_results')
          .select('*')
          .in('student_id', studentIds)
          .order('created_at', { ascending: false })
        setResults(rData ?? [])
      }
      setLoading(false)
    }
    load()
  }, [user.id])

  if (loading) return <Spinner />

  const listMap  = Object.fromEntries(lists.map(l => [l.id, l.title]))
  const filteredResults = selected
    ? results.filter(r => r.student_id === selected)
    : results

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/teacher')} className="text-blue-700 hover:text-blue-900 text-sm">← Back</button>
        <h1 className="text-xl font-bold text-gray-900">Student Progress</h1>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📊</div>
          <p>No students linked yet.</p>
        </div>
      ) : (
        <>
          {/* Student filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
            <button
              onClick={() => setSelected(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selected ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => setSelected(s.id === selected ? null : s.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selected === s.id ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.full_name}
              </button>
            ))}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Sessions', value: filteredResults.length },
              {
                label: 'Avg Score',
                value: filteredResults.length
                  ? Math.round(filteredResults.reduce((a, r) => a + (r.score / r.total) * 100, 0) / filteredResults.length) + '%'
                  : '—'
              },
              {
                label: 'Best',
                value: filteredResults.length
                  ? Math.max(...filteredResults.map(r => Math.round((r.score / r.total) * 100))) + '%'
                  : '—'
              }
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                <p className="text-xl font-bold text-blue-900">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Results list */}
          {filteredResults.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">No quiz results yet for this student.</p>
          ) : (
            <div className="space-y-2">
              {filteredResults.map(r => {
                const pct = Math.round((r.score / r.total) * 100)
                const student = students.find(s => s.id === r.student_id)
                return (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{listMap[r.list_id] ?? 'Unknown list'}</p>
                        {!selected && (
                          <p className="text-xs text-blue-600">{student?.full_name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {pct}%
                        </span>
                        <p className="text-xs text-gray-400">{r.score}/{r.total}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.mode === 'mcq' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {r.mode === 'mcq' ? 'MCQ' : 'Flashcard'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
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
