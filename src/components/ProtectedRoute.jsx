import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  // Profile still loading (e.g. slow DB) — wait instead of redirecting
  if (user && !profile) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500">Loading profile...</p>
      </div>
    </div>
  )

  if (role && profile?.role !== role) return <Navigate to={profile?.role === 'teacher' ? '/teacher' : '/student'} replace />

  return children
}
