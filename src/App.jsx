import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'

import Login          from './pages/Login'
import Register       from './pages/Register'
import TeacherDash    from './pages/teacher/Dashboard'
import UploadVocab    from './pages/teacher/UploadVocab'
import ManageList     from './pages/teacher/ManageList'
import TeacherProgress from './pages/teacher/Progress'
import StudentDash    from './pages/student/Dashboard'
import Flashcards     from './pages/student/Flashcards'
import MCQQuiz        from './pages/student/MCQQuiz'

function AppRoutes() {
  const { user, profile } = useAuth()
  const home = profile?.role === 'teacher' ? '/teacher' : '/student'

  return (
    <>
      {user && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/login"    element={user ? <Navigate to={home} /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={home} /> : <Register />} />

        {/* Teacher */}
        <Route path="/teacher" element={
          <ProtectedRoute role="teacher"><TeacherDash /></ProtectedRoute>
        } />
        <Route path="/teacher/upload" element={
          <ProtectedRoute role="teacher"><UploadVocab /></ProtectedRoute>
        } />
        <Route path="/teacher/list/:id" element={
          <ProtectedRoute role="teacher"><ManageList /></ProtectedRoute>
        } />
        <Route path="/teacher/progress" element={
          <ProtectedRoute role="teacher"><TeacherProgress /></ProtectedRoute>
        } />

        {/* Student */}
        <Route path="/student" element={
          <ProtectedRoute role="student"><StudentDash /></ProtectedRoute>
        } />
        <Route path="/student/flashcards/:listId" element={
          <ProtectedRoute role="student"><Flashcards /></ProtectedRoute>
        } />
        <Route path="/student/mcq/:listId" element={
          <ProtectedRoute role="student"><MCQQuiz /></ProtectedRoute>
        } />

        {/* Default */}
        <Route path="/" element={<Navigate to={user ? home : '/login'} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
