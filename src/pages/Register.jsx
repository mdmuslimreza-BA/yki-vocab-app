import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', role: 'student', teacherEmail: ''
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    try {
      await signUp(form)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-400 to-green-500 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">
            📝
          </div>
          <h1 className="text-xl font-bold text-stone-900">Create Account</h1>
          <p className="text-stone-400 text-sm">Join YKI Ready</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[['teacher', 'Teacher'], ['student', 'Student']].map(([r, label]) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm(f => ({ ...f, role: r }))}
                className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                  form.role === r
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-stone-200 text-stone-400 hover:border-stone-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              className="w-full border-2 border-orange-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-orange-50"
              placeholder="Anna Makinen"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border-2 border-orange-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-orange-50"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border-2 border-orange-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-orange-50"
              placeholder="Min. 6 characters"
            />
          </div>

          {form.role === 'student' && (
            <div>
              <label className="block text-sm font-semibold text-stone-600 mb-1">
                Teacher Email <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={form.teacherEmail}
                onChange={e => setForm(f => ({ ...f, teacherEmail: e.target.value }))}
                className="w-full border-2 border-orange-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-orange-50"
                placeholder="teacher@school.fi"
              />
              <p className="text-xs text-stone-400 mt-1">Ask your teacher for their email to link accounts.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 shadow-md shadow-green-200 mt-1"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-stone-400 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-600 font-bold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
