import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function UploadVocab() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef()

  const [title, setTitle]     = useState('')
  const [words, setWords]     = useState([])      // { finnish, english }[]
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setError('')
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete(results) {
        const parsed = results.data
          .map(row => ({ finnish: row[0]?.trim(), english: row[1]?.trim() }))
          .filter(r => r.finnish && r.english)
        if (parsed.length === 0) {
          setError('No valid rows found. Make sure the CSV has: finnish,english')
          return
        }
        setWords(parsed)
      },
      error() { setError('Could not parse file. Use a .csv file.') }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return setError('Please enter a list title.')
    if (words.length === 0) return setError('Please upload a CSV file with words.')
    setLoading(true)
    setError('')

    try {
      // Create list
      const { data: list, error: listErr } = await supabase
        .from('vocab_lists')
        .insert({ teacher_id: user.id, title: title.trim() })
        .select()
        .single()
      if (listErr) throw listErr

      // Insert words in batches
      const wordRows = words.map((w, i) => ({
        list_id: list.id,
        finnish: w.finnish,
        english: w.english,
        position: i
      }))
      const { error: wordErr } = await supabase.from('vocab_words').insert(wordRows)
      if (wordErr) throw wordErr

      navigate(`/teacher/list/${list.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/teacher')} className="text-blue-700 hover:text-blue-900">← Back</button>
        <h1 className="text-xl font-bold text-gray-900">Upload Vocabulary List</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">List Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Session 3 – Daily Life"
          />
        </div>

        {/* CSV upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
          <div
            onClick={() => fileRef.current.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
          >
            <div className="text-3xl mb-2">📄</div>
            <p className="text-sm font-medium text-gray-700">Click to choose CSV file</p>
            <p className="text-xs text-gray-400 mt-1">Format: <code className="bg-gray-100 px-1 rounded">finnish,english</code> — one word pair per row</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
        </div>

        {/* CSV format example */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">CSV Example</p>
          <pre className="text-xs text-gray-600 font-mono leading-relaxed">
{`talo,house
koira,dog
vesi,water
koulu,school`}
          </pre>
          <p className="text-xs text-gray-400 mt-2">No header row needed. Just word pairs.</p>
        </div>

        {/* Preview */}
        {words.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              ✅ {words.length} words ready to import
            </p>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Finnish</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">English</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {words.map((w, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{w.finnish}</td>
                      <td className="px-4 py-2 text-gray-500">{w.english}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || words.length === 0}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
        >
          {loading ? 'Saving...' : `Save List (${words.length} words)`}
        </button>
      </form>
    </div>
  )
}
