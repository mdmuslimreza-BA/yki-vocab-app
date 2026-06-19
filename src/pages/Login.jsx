import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(form)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-400 to-green-500 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl shadow-sm">
            🎯
          </div>
          <h1 className="text-2xl font-bold text-stone-900">YKI Ready</h1>
          <p className="text-stone-400 text-sm mt-1">Finnish–English Vocabulary Practice</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border-2 border-orange-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-orange-50 transition-colors"
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
              className="w-full border-2 border-orange-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-orange-50 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 shadow-md shadow-orange-200 mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

     