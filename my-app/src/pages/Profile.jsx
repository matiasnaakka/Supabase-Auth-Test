import React from 'react'
import NavBar from '../components/NavBar'
import { supabase } from '../supabaseclient'

export default function Profile({ session }) {
  const user = session?.user

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <>
      <NavBar session={session} onSignOut={handleSignOut} />
      <div style={{ padding: 24, textAlign: 'center', marginTop: '80px' }}>
        <h1>Profile</h1>
        <p>Email: {user?.email}</p>
        <p>User ID: {user?.id}</p>
      </div>
    </>
  )
}
