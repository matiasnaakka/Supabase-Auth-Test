import './index.css'
import { useState, useEffect } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseclient'
import Home from './pages/Home'
import ProtectedRoute from './components/protectedRoutes'
import LoginLayout from './components/LoginLayout'
import Profile from './pages/Profile'

const App = () => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            session ? (
              <Navigate to="/home" replace />
            ) : (
              <LoginLayout>
                <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} />
              </LoginLayout>
            )
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute session={session}>
              <Home session={session} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute session={session}>
              <Profile session={session} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App