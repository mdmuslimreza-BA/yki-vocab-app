import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { masteryColor, masteryLabel } from '../../lib/mastery'

const MODE_LABELS = { mcq: 'MCQ Quiz', typing: 'Typing', matching: 'Matching', flashcards: 'Flashcards' }
const MODE_ICONS  = { mcq: '✏️', typing: '⌨️', matching: '🔗', flashcards: '🃏' }

function computeBadges(results, streak) {
  const badges = []
  if (results.length >= 1)  badges.push({ icon: '🎯', label: 'First Step' })
  if (streak >= 3)          badges.push({ icon: '🔥', label: 'On Fire' })
  if (streak >= 7)          badges.push({ icon: '⚡', label: 'Unstoppable' })
  if (results.some(r => Math.round((r.score / r.total) * 100) === 100))
                            badges.push({ icon: '💯', label: 'Perfect Score' })
  if (results.length >= 10) badges.push({ icon: '📚', label: 'Committed' })
  if (results.length >= 25) badges.push({ icon: '🏆', label: 'Scholar' })
  return badges
}

export default function StudentDetail() {
  const { studentId } = useParams()
  const navigate = useNavigate()

  const [student, setStudent]   = useState(null)
  const [lists, setLists]       = useState([])
  const [results, setResults]   = useState([])
  const [mastery, setMastery]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { data: studentData },
        { data: resultsData },
        { data: masteryData },
        { data: assignData }
      ] = await Promise.all([
        supabase.from('profiles').select('full_name, email, streak').eq('id', studentId).single(),
        supabase.from('quiz_results').select('list_id, score, total, mode, created_at')
          .eq('student_id', studentId).order('created_at', { ascending: false }),
        supabase.from('word_mastery').select('word_id, mastery_level, vocab_words(finnish, english), list_id')
          .eq('student_id', studentId),
        supabase.from('assignments').select('list_id, vocab_lists(id, title)').eq('student_id', studentId)
      ])

      setStudent(studentData)
      setResults(resultsData ?? [])
      setMastery(masteryData ?? [])
      setLists((assignData ?? []).map(a => a.vocab_lists))
      setLoading(false)
    }
    load()
  }, [studentId])

  if (loading) return <Spinner />

  const streak = student?.streak ?? 0
  const badges = computeBadges(results, streak)

  // Per-list stats
  const listStats = lists.map(list => {
    const listResults = results.filter(r => r.list_id === list.id)
    const sessions = listResults.length
    const avgScore = sessions > 0
      ? Math.round(listResults.reduce((a, r) => a + (r.score / r.total) * 100, 0) / sessions)
      : null
    const best = sessions > 0
      ? Math.max(...listResults.map(r => Math.round((r.score / r.total) * 100)))
      : null

    // Per-mode breakdown
    const byMode = {}
    listResults.forEach(r => {
      if (!byMode[r.mode]) byMode[r.mode] = []
      byMode[r.mode].push(Math.round((r.score / r.total) * 100))
    })

    // Mastery for this list
    const listMastery = mastery.filter(m => m.list_id === list.id)
    const masteredCount = listMastery.filter(m => m.mastery_level >= 5).length
    const learningCount = listMastery.filter(m => m.mastery_level >= 1 && m.mastery_level < 5).length

    return { ...list, sessions, avgScore, best, byMode, listMastery, masteredCount, learningCount }
  })

  // Weak words (mastery_level <= 2 with attempts)
  const weakWords = mastery
    .filter(m => m.mastery_level <= 2 && m.attempt_count > 0)
    .sort((a, b) => a.mastery_level - b.mastery_level)
    .slice(0, 10)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <button onClick={() => navigate('/teacher')} className="text-orange-600 text-sm font-medium mb-4 block">← Back</button>

      {/* Student header */}
      <div className="bg-white border border-orange-100 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {student?.full_name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-stone-900">{student?.full_name}</h1>
            <p className="text-stone-400 text-sm">{student?.email}</p>
          </div>
          <div className="text-center bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
            <p className="text-xl font-bold text-orange-600">{streak}</p>
            <p className="text-xs text-orange-500">🔥 streak</p>
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-orange-600">{results.length}</p>
            <p className="text-xs text-stone-400">Sessions</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-green-600">
              {results.length > 0 ? Math.round(results.reduce((a, r) => a + (r.score / r.total) * 100, 0) / results.length) : 0}%
            </p>
            <p className="text-xs text-stone-400">Avg Score</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-yellow-600">
              {mastery.filter(m => m.mastery_level >= 5).length}
            </p>
            <p className="text-xs text-stone-400">Mastered</p>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {badges.map((b, i) => (
              <span key={i} className="flex items-center gap-1 bg-white border border-orange-100 rounded-lg px-2 py-1 text-xs font-bold text-stone-700">
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Per-list breakdown */}
      {listStats.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-stone-500 text-xs uppercase tracking-widest mb-3">List Progress</h2>
          <div className="space-y-3">
            {listStats.map(list => (
              <div key={list.id} className="bg-white border border-orange-100 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm">{list.title}</h3>
                    <p className="text-xs text-stone-400">{list.sessions} sessions</p>
                  </div>
                  {list.best !== null && (
                    <div className="text-right">
                      <p className={`text-sm font-bold ${list.best >= 80 ? 'text-green-600' : list.best >= 60 ? 'text-orange-500' : 'text-red-500'}`}>
                        Best: {list.best}%
                      </p>
                      <p className="text-xs text-stone-400">Avg: {list.avgScore}%</p>
                    </div>
                  )}
                </div>

                {/* Mastery bar */}
                {list.listMastery.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 bg-stone-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all"
                          style={{ width: `${Math.round((list.masteredCount / list.listMastery.length) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-stone-500 shrink-0">
                        {list.masteredCount}/{list.listMastery.length} mastered
                      </span>
                    </div>
                  </div>
                )}

                {/* Mode breakdown */}
                {Object.keys(list.byMode).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(list.byMode).map(([mode, scores]) => {
                      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                      return (
                        <div key={mode} className="flex items-center gap-1 bg-stone-50 rounded-lg px-2 py-1">
                          <span className="text-xs">{MODE_ICONS[mode] ?? '📝'}</span>
                          <span className="text-xs font-semibold text-stone-600">{MODE_LABELS[mode] ?? mode}</span>
                          <span className={`text-xs font-bold ml-1 ${avg >= 80 ? 'text-green-600' : avg >= 60 ? 'text-orange-500' : 'text-red-500'}`}>
                            {avg}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {list.sessions === 0 && (
                  <p className="text-xs text-stone-400 italic">No practice yet</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weak words */}
      {weakWords.length > 0 && (
        <div>
          <h2 className="font-bold text-stone-500 text-xs uppercase tracking-widest mb-3">Words Needing Work</h2>
          <div className="space-y-2">
            {weakWords.map((m, i) => (
              <div key={i} className="bg-white border border-red-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <span className="font-semibold text-stone-800 text-sm">{m.vocab_words?.finnish}</span>
                  <span className="text-stone-300 mx-2 text-xs">→</span>
                  <span className="text-green-700 text-sm">{m.vocab_words?.english}</span>
                </div>
                <span className={`text-xs font-bold ${masteryColor(m.mastery_level)}`}>
                  {'★'.repeat(m.mastery_level)}{'☆'.repeat(5 - m.mastery_level)}
                </span>
              </div>
            ))}
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
