import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function ManageList() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [list, setList]         = useState(null)
  const [words, setWords]       = useState([])
  const [students, setStudents] = useState([])      // all teacher's students
  const [assigned, setAssigned] = useState(new Set()) // student IDs already assigned
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [tab, setTab]           = useState('words') // 'words' | 'assign'

  useEffect(() => {
    async function load() {
      const [
        { data: listData },
        { data: wordsData },
        { data: studentsData },
        { data: assignData }
      ] = await Promise.all([
        supabase.from('vocab_lists').select('*').eq('id', id).single(),
        supabase.from('vocab_words').select('*').eq('list_id', id).order('position'),
        supabase.from('profiles').select('id, full_name, email').eq('teacher_id', user.id),
        supabase.from('assignments').select('student_id').eq('list_id', id)
      ])
      setList(listData)
      setWords(wordsData ?? [])
      setStudents(studentsData ?? [])
      setAssigned(new Set((assignData ?? []).map(a => a.student_id)))
      setLoading(false)
    }
    load()
  }, [id, user.id])

  async function toggleAssign(studentId) {
    setSaving(true)
    if (assigned.has(studentId)) {
      await supabase.from('assignments').delete()
        .eq('list_id', id).eq('student_id', studentId)
      setAssigned(s => { const n = new Set(s); n.delete(studentId); return n })
    } else {
      await supabase.from('assignments').insert({ list_id: id, student_id: studentId })
      setAssigned(s => new Set(s).add(studentId))
    }
    setSaving(false)
  }

  if (loading) return <Spinner />
  if (!list) return <div className="text-center py-16 text-gray-400">List not found.</div>

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate('/teacher')} className="text-blue-700 hover:text-blue-900 text-sm">← Back</button>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">{list.title}</h1>
      <p className="text-sm text-gray-400 mb-5">{words.length} words</p>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
        {[['words', '📋 Words'], ['assign', '👩‍🎓 Assign Students']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Words tab */}
      {tab === 'words' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {words.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">No words in this list.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Finnish</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">English</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {words.map((w, i) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-300 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{w.finnish}</td>
                    <td className="px-4 py-2.5 text-gray-500">{w.english}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Assign tab */}
      {tab === 'assign' && (
        <div>
          {students.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-sm">No students linked to your account yet.</p>
              <p className="text-xs mt-1">Students enter your email when registering.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-3">
                Toggle students to give them access to this list.
              </p>
              {students.map(s => {
                const isAssigned = assigned.has(s.id)
                return (
                  <div
                    key={s.id}
                    onClick={() => !saving && toggleAssign(s.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isAssigned
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 ${
                      isAssigned ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {isAssigned && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">{s.full_name}</p>
                      <p className="text-xs text-gray-400">{s.email}</p>
                    </div>
                    {isAssigned && <span className="text-xs text-blue-600 font-medium">Assigned</span>}
                  </div>
                )
              })}
              <p className="text-xs text-center text-gray-400 mt-2">
                {assigned.size} of {students.length} students assigned
              </p>
            </div>
          )}
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
