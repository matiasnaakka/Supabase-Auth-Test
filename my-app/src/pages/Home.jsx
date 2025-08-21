import { supabase } from '../supabaseclient'

export default function Home({ session }) {

  const email = session?.user?.email ?? 'user'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <h1>Welcome, {email}</h1>
      <p>This is the protected home page.</p>
      <button onClick={handleSignOut}>Sign out</button>
    </div>
  )
}