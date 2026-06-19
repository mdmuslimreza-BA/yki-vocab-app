import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const isTeacher = profile?.role === 'teacher'

  return (
    <nav className="bg-blue-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to={isTeacher ? '/teacher' : '/student'} className="font-bold text-lg tracking-tight">
          🇫🇮 YKI Vocab
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-3 text-sm">
          {isTeacher && (
            <>
              <NavLink to="/teacher" label="Lists" current={location.pathname} />
              <NavLink to="/teacher/progress" label="Progress" current={location.pathname} />
            </>
          )}
          {!isTeacher && (
            <NavLink to="/student" label="Practice" current={location.pathname} />
          )}
          <button
            onClick={handleSignOut}
            className="ml-2 text-blue-200 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}

function NavLink({ to, label, current }) {
  const active = current === to
  return (
    <Link
      to={to}
      className={`px-2 py-1 rounded transition-colors ${active ? 'text-white font-semibold' : 'text-blue-200 hover:text-white'}`}
    >
      {label}
    </Link>
  )
}
