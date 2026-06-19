import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { masteryColor, masteryLabel } from '../../lib/mastery'

export default function ManageList() {
  const { listId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [list, setList]           = useState(null)
  const [words, setWords]         = useState([])
  const [students, setStudents]   = useState([])
  const [assigned, setAssigned]   = useState(new Set())
  const [mastery, setMastery]     = useState({}) // wordId -> avg level
  const [tab, setTab]             = useState('words')
  const [loading, setLoading]     = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm]   = useState({ finnish: '', english: '' })
  const [addForm, setAddForm]     = useState({ finnish: '', english: '' })
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    async function load() {
      const [
        { data: listData },
        { data: wordsData },
        { data: studentsData },
        { data: assignData },
        { data: masteryData }
      ] = await Promise.all([
        supabase.from('vocab_lists').select('title').eq('id', listId).single(),
        supabase.from('vocab_words').select('*').eq('list_id', listId).order('position'),
        supabase.from('profiles').select('id, full_name, email').eq('teacher_id', user.id),
        supabase.from('assignments').select('student_id').eq('list_id', listId),
        supabase.from('word_mastery').select('word_id, mastery_level').eq('list_id', listId)
      ])
      setList(listData)
      setWords(wordsData ?? [])
      setStudents(studentsData ?? [])
      setAssigned(new Set((assignData ?? []).map(a => a.student_id)))

      // Average mastery per word across all students
      const avgMap = {}
      ;(masteryData ?? []).forEach(m => {
        if (!avgMap[m.word_id]) avgMap[m.word_id] = []
        avgMap[m.word_id].push(m.mastery_level)
      })
      const result = {}
      Object.entries(avgMap).forEach(([wid, levels]) => {
        result[wid] = Math.round(levels.reduce((a, b) => a + b, 0) / levels.length)
      })
      setMastery(result)
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

  function startEdit(word) {
    setEditingId(word.id)
    setEditForm({ finnish: word.finnish, english: word.english })
  }

  async function saveEdit(wordId) {
    if (!editForm.finnish.trim() || !editForm.english.trim()) return
    setSaving(true)
    await supabase.from('vocab_words')
      .update({ finnish: editForm.finnish.trim(), english: editForm.english.trim() })
      .eq('id', wordId)
    setWords(ws => ws.map(w => w.id === wordId
      ? { ...w, finnish: editForm.finnish.trim(), english: editForm.english.trim() }
      : w
    ))
    setEditingId(null)
    setSaving(false)
  }

  async function addWord(e) {
    e.preventDefault()
    if (!addForm.finnish.trim() || !addForm.english.trim()) return
    setSaving(true)
    const nextPos = words.length + 1
    const { data } = await supabase.from('vocab_words')
      .insert({ list_id: listId, finnish: addForm.finnish.trim(), english: addForm.english.trim(), position: nextPos })
      .select().single()
    if (data) setWords(ws => [...ws, data])
    setAddForm({ finnish: '', english: '' })
    setSaving(false)
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
            <div className="text-center py-8 text-stone-400">
              <div className="text-4xl mb-2">📭</div>
              <p>No words yet — add one below</p>
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              {words.map((w, i) => {
                const level = mastery[w.id] ?? 0
                const isEditing = editingId === w.id
                return (
                  <div key={w.id} className="bg-white border border-orange-100 rounded-xl px-4 py-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            value={editForm.finnish}
                            onChange={e => setEditForm(f => ({ ...f, finnish: e.target.value }))}
                            placeholder="Finnish"
                            className="flex-1 border border-orange-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400 bg-orange-50"
                          />
                          <input
                            value={editForm.english}
                            onChange={e => setEditForm(f => ({ ...f, english: e.target.value }))}
                            placeholder="English"
                            className="flex-1 border border-orange-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400 bg-orange-50"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(w.id)}
                            disabled={saving}
                            className="flex-1 bg-orange-500 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-orange-600 disabled:opacity-60"
                          >
                            {saving ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex-1 bg-stone-100 text-stone-600 text-xs font-bold py-1.5 rounded-lg hover:bg-stone-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-stone-400 w-6 font-mono shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-stone-800 text-sm">{w.finnish}</span>
                            <span className="text-stone-300 text-xs">→</span>
                            <span className="text-green-700 text-sm">{w.english}</span>
                          </div>
                          {level > 0 && (
                            <p className={`text-xs mt-0.5 ${masteryColor(level)}`}>
                              {'★'.repeat(level)}{'☆'.repeat(5 - level)} {masteryLabel(level)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => startEdit(w)}
                          className="text-xs text-orange-400 hover:text-orange-600 px-2 shrink-0"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteWord(w.id)}
                          className="text-red-300 hover:text-red-500 text-sm shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Add word form */}
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-stone-700 mb-3">+ Add New Word</p>
            <form onSubmit={addWord} className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={addForm.finnish}
                  onChange={e => setAddForm(f => ({ ...f, finnish: e.target.value }))}
                  placeholder="Finnish word"
                  required
                  className="flex-1 border border-orange-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white"
                />
                <input
                  value={addForm.english}
                  onChange={e => setAddForm(f => ({ ...f, english: e.target.value }))}
                  placeholder="English translation"
                  required
                  className="flex-1 border border-orange-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-orange-500 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-orange-600 disabled:opacity-60 transition-colors"
              >
                {saving ? 'Adding...' : 'Add Word'}
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'assign' && (
        <div>
          {students.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-sm">No students in your class yet.</p>
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
