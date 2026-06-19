import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function ManageList() {
  const { listId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [list, setList]           = useState(null)
  const [words, setWords]         = useState([])
  const [students, setStudents]   = useState([])
  const [assigned, setAssigned]   = useState(new Set())
  const [tab, setTab]             = useState('words')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { data: listData },
        { data: wordsData },
        { data: studentsData },
        { data: assignData }
      ] = await Promise.all([
        supabase.from('vocab_lists').select('title').eq('id', listId).single(),
        supabase.from('vocab_words').select('*').eq('list_id', listId).order('position'),
        supabase.from('profiles').select('id, full_name, email').eq('teacher_id', user.id),
        supabase.from('assignments').select('student_id').eq('list_id', listId)
      ])
      setList(listData)
      setWords(wordsData ?? [])
      setStudents(studentsData ?? [])
      setAssigned(new Set((assignData ?? []).map(a => a.student_id)))
      setLoading(false)
    }
    load()
  }, [listId, user.id])

  async function toggleAssign(studentId) {
    if (assigned.has(studentId)) {
      await supabase.from('assignments')
        .delete().eq('list_id', listId).eq('student_id', studentId)
      setAssigned(s => { const n = new Set(s); n.delete(studentId); return n })
    } else {
      await supabase.from('assignments')
        .insert({ list_id: listId, student_id: studentId })
      setAssigned(s => new Set([...s, studentId]))
    }
  }

  async function deleteWord(wordId) {
    await supabase.from('vocab_words').delete().eq('id', wordId)
    setWords(w => w.filter(x => x.id !== wordId))
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate('/teacher')} className="text-orange-600 text-sm font-medium">← Back</button>
      </div>
      <h1 className="text-xl font-bold text-stone-900 mb-1">{list?.title}</h1>
      <p className="text-stone-400 text-sm mb-5">{words.length} words · {assigned.size} assigned</p>

      {/* Tab bar */}
      <div className="flex bg-orange-100 rounded-2xl p-1 mb-6 gap-1">
        {[['words', '📖 Words'], ['assign', '👥 Assign Students']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === key
                ? 'bg-white text-orange-700 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'words' && (
        <div>
          {words.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <div className="text-4xl mb-2">📭</div>
              <p>No words in this list</p>
            </div>
          ) : (
            <div className="space-y-2">
              {words.map((w, i) => (
                <div key={w.id} className="bg-white border border-orange-100 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-xs text-stone-400 w-6 font-mono">{i + 1}</span>
                  <div className="flex-1">
                    <span className="font-semibold text-stone-800 text-sm">{w.finnish}</span>
                    <span className="text-stone-400 text-xs mx-2">→</span>
                    <span className="text-green-700 text-sm">{w.english}</span>
                  </div>
                  <button onClick={() => deleteWord(w.id)} className="text-red-300 hover:text-red-500 text-sm ml-1">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'assign' && (
        <div>
          {students.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-sm">No students in your class yet.</p>
              <p className="text-sm mt-1">Add students from your <strong>Dashboard</strong>.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-stone-400 mb-3">Toggle to assign this list to students:</p>
              {students.map(s => {
                const isAssigned = assigned.has(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleAssign(s.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${
                      isAssigned
                        ? 'border-green-400 bg-green-50'
                        : 'border-stone-200 bg-white hover:border-orange-200'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      isAssigned ? 'bg-green-500 text-white' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {isAssigned ? '✓' : s.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm text-stone-900">{s.full_name}</p>
                      <p className="text-xs text-stone-400">{s.email}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      isAssigned ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'
                    }`}>
                      {isAssigned ? 'Assigned' : 'Assign'}
                    </span>
                  </button>
                )
              })}
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
      <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
