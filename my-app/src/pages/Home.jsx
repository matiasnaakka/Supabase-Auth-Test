import { supabase } from '../supabaseclient'
import NavBar from '../components/NavBar'

export default function Home({ session }) {

  const email = session?.user?.email ?? 'user'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <>
      <NavBar session={session} onSignOut={handleSignOut} />
      <div style={{ padding: 24, textAlign: 'center', marginTop: '80px' }}>
        <h1>Welcome, {email}</h1>
        <p>This is the protected home page.</p>
      </div>
    </>
  )
}