import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function TeacherDashboard() {
  const { user, profile } = useAuth()
  const [lists, setLists]         = useState([])
  const [students, setStudents]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [addEmail, setAddEmail]   = useState('')
  const [addMsg, setAddMsg]       = useState('')   // success / error message
  const [adding, setAdding]       = useState(false)
  const [showAdd, setShowAdd]     = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: listsData }, { data: studentsData }] = await Promise.all([
        supabase
          .from('vocab_lists')
          .select('*, vocab_words(count)')
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('teacher_id', user.id)
      ])
      setLists(listsData ?? [])
      setStudents(studentsData ?? [])
      setLoading(false)
    }
    load()
  }, [user.id])

  async function deleteList(id) {
    if (!confirm('Delete this list and all its words?')) return
    await supabase.from('vocab_lists').delete().eq('id', id)
    setLists(l => l.filter(x => x.id !== id))
  }

  async function addStudent(e) {
    e.preventDefault()
    setAdding(true)
    setAddMsg('')
    const email = addEmail.trim().toLowerCase()

    // Find student by email
    const { data: found, error } = await supabase
      .from('profiles')
      .select('id, full_name, teacher_id')
      .eq('email', email)
      .eq('role', 'student')
      .single()

    if (error || !found) {
      setAddMsg('❌ No student account found with that email. Make sure they registered first.')
      setAdding(false)
      return
    }
    if (found.teacher_id === user.id) {
      setAddMsg('✅ This student is already linked to you.')
      setAdding(false)
      return
    }
    if (found.teacher_id && found.teacher_id !== user.id) {
      setAddMsg('❌ This student is already linked to another teacher.')
      setAdding(false)
      return
    }

    // Link student to this teacher
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ teacher_id: user.id })
      .eq('id', found.id)

    if (updateErr) {
      setAddMsg('❌ Could not link student. Try again.')
    } else {
      setStudents(s => [...s, { id: found.id, full_name: found.full_name, email }])
      setAddMsg(`✅ ${found.full_name} added successfully!`)
      setAddEmail('')
    }
    setAdding(false)
  }

  async function removeStudent(studentId, name) {
    if (!confirm(`Remove ${name} from your class?`)) return
    await supabase.from('profiles').update({ teacher_id: null }).eq('id', studentId)
    setStudents(s => s.filter(x => x.id !== studentId))
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {lists.length} vocab list{lists.length !== 1 ? 's' : ''} · {students.length} student{students.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Upload button */}
      <Link
        to="/teacher/upload"
        className="flex items-center justify-center gap-2 w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl mb-6 transition-colors"
      >
        <span className="text-lg">+</span> Upload New Vocabulary List
      </Link>

      {/* Lists */}
      {lists.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">📚</div>
          <p className="font-medium">No lists yet</p>
          <p className="text-sm mt-1">Upload a CSV to get started</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Your Lists</h2>
          {lists.map(list => {
            const wordCount = list.vocab_words?.[0]?.count ?? 0
            return (
              <div key={list.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Link to={`/teacher/list/${list.id}`} className="font-semibold text-gray-900 hover:text-blue-700 truncate block">
                    {list.title}
                  </Link>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {wordCount} word{wordCount !== 1 ? 's' : ''} · {new Date(list.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    to={`/teacher/list/${list.id}`}
                    className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium"
                  >
                    Manage
                  </Link>
                  <button
                    onClick={() => deleteList(list.id)}
                    className="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-100 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Students section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
            Your Students ({students.length})
          </h2>
          <button
            onClick={() => { setShowAdd(a => !a); setAddMsg('') }}
            className="text-xs bg-blue-900 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 font-medium"
          >
            + Add Student
          </button>
        </div>

        {/* Add student form */}
        {showAdd && (
          <form onSubmit={addStudent} className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-3">
            <p className="text-sm font-medium text-blue-900 mb-2">Add student by email</p>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                placeholder="student@email.com"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={adding}
                className="bg-blue-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-60 font-medium"
              >
                {adding ? '...' : 'Add'}
              </button>
            </div>
            {addMsg && (
              <p className="text-sm mt-2 text-gray-700">{addMsg}</p>
            )}
          </form>
        )}

        {students.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-gray-100">
            <div className="text-3xl mb-2">👥</div>
            <p className="text-sm">No students yet — click <strong>+ Add Student</strong> above</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {students.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {s.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{s.full_name}</p>
                  <p className="text-xs text-gray-400">{s.email}</p>
                </div>
                <button
                  onClick={() => removeStudent(s.id, s.full_name)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
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
