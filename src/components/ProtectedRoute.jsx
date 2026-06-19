import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-orange-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-stone-400">Loading...</p>
      </div>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (user && !profile) return (
    <div className="flex items-center justify-center min-h-screen bg-orange-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-stone-400">Loading profile...</p>
      </div>
    </div>
  )

  if (role && profile?.role !== role) return <Navigate to={profile?.role === 'teacher' ? '/teacher' : '/student'} replace />

  return children
}
