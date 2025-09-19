import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const UserProfile = ({ session }) => {
  const [profile, setProfile] = useState({
    username: '',
    bio: '',
    location: '',
    avatar_url: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('username, bio, location, avatar_url')
        .eq('id', session.user.id)
        .single()
      if (error) setError(error.message)
      else setProfile(data)
      setLoading(false)
    }
    if (session) fetchProfile()
  }, [session])

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value })
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    // Upload avatar to Supabase Storage (assumes 'avatars' bucket exists)
    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(`${session.user.id}/${file.name}`, file, { upsert: true })
    if (uploadError) {
      setError(uploadError.message)
      setLoading(false)
      return
    }
    const avatarUrl = supabase.storage
      .from('avatars')
      .getPublicUrl(`${session.user.id}/${file.name}`).data.publicUrl
    setProfile({ ...profile, avatar_url: avatarUrl })
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const updates = {
      ...profile,
      id: session.user.id,
      updated_at: new Date()
    }
    const { error } = await supabase
      .from('profiles')
      .upsert(updates, { onConflict: ['id'] })
    if (error) setError(error.message)
    setLoading(false)
  }

  if (!session) return <div>Please log in to view your profile.</div>
  if (loading) return <div>Loading...</div>

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-black bg-opacity-80 rounded-lg text-white">
      <h2 className="text-2xl font-bold mb-4">Profile</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col items-center">
          <img
            src={profile.avatar_url || '/default-avatar.png'}
            alt="Avatar"
            className="w-24 h-24 rounded-full mb-2 object-cover"
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="text-white"
          />
        </div>
        <label>
          Username
          <input
            type="text"
            name="username"
            value={profile.username}
            onChange={handleChange}
            className="w-full p-2 rounded text-white"
            required
          />
        </label>
        <label>
          Bio
          <textarea
            name="bio"
            value={profile.bio}
            onChange={handleChange}
            className="w-full p-2 rounded text-white"
            rows={3}
          />
        </label>
        <label>
          Location
          <input
            type="text"
            name="location"
            value={profile.location}
            onChange={handleChange}
            className="w-full p-2 rounded text-white"
          />
        </label>
        <button
          type="submit"
          className="bg-teal-400 text-white px-4 py-2 rounded font-bold hover:bg-teal-300"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Update Profile'}
        </button>
      </form>
    </div>
  )
}

export default UserProfile
