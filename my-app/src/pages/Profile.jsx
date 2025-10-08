import React, { useEffect, useState } from 'react'
import NavBar from '../components/NavBar'
import { supabase } from '../supabaseclient'
import UserProfile from '../components/UserProfile'
import { useLocation } from 'react-router-dom'

const SignedAudioPlayer = ({ audioPath, trackId }) => {
  const [signedUrl, setSignedUrl] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const getUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('audio')
          .createSignedUrl(audioPath, 300)
        if (error) throw error
        if (isMounted) setSignedUrl(data.signedUrl)
      } catch (err) {
        if (isMounted) setError(err.message)
      }
    }

    if (audioPath) {
      getUrl()
    }

    return () => { isMounted = false }
  }, [audioPath, trackId])

  if (error) return <span className="text-red-400 text-xs">Audio unavailable</span>
  if (!signedUrl) return <span className="text-gray-400 text-xs">Loading audio...</span>
  return <audio controls src={signedUrl} className="h-8 max-w-full" />
}

export default function Profile({ session }) {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const targetUserId = searchParams.get('user')
  const isOwnProfile = !targetUserId || targetUserId === session?.user?.id
  const [publicProfile, setPublicProfile] = useState(null)
  const [publicTracks, setPublicTracks] = useState([])
  const [publicLoading, setPublicLoading] = useState(false)
  const [publicError, setPublicError] = useState(null)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  useEffect(() => {
    if (isOwnProfile || !targetUserId) {
      setPublicProfile(null)
      setPublicTracks([])
      setPublicError(null)
      return
    }

    let isMounted = true
    const fetchProfile = async () => {
      setPublicLoading(true)
      setPublicError(null)
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, bio, location, avatar_url')
          .eq('id', targetUserId)
          .single()
        if (profileError) throw profileError
        if (!profileData) throw new Error('Profile not found')

        const { data: tracksData, error: tracksError } = await supabase
          .from('tracks')
          .select(`
            id, title, artist, album, audio_path, created_at,
            genres (name)
          `)
          .eq('user_id', targetUserId)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
        if (tracksError) throw tracksError

        if (isMounted) {
          setPublicProfile(profileData)
          setPublicTracks(tracksData || [])
        }
      } catch (err) {
        if (isMounted) {
          setPublicError(err.message)
          setPublicProfile(null)
          setPublicTracks([])
        }
      } finally {
        if (isMounted) setPublicLoading(false)
      }
    }

    fetchProfile()
    return () => { isMounted = false }
  }, [isOwnProfile, targetUserId])

  return (
    <>
      <NavBar session={session} onSignOut={handleSignOut} />
      {isOwnProfile ? (
        <UserProfile session={session} />
      ) : (
        <div className="max-w-4xl mx-auto mt-20 p-6 bg-black bg-opacity-80 rounded-lg text-white">
          {publicLoading ? (
            <div>Loading profile...</div>
          ) : publicError ? (
            <div className="bg-red-500 bg-opacity-25 text-red-100 p-3 rounded">{publicError}</div>
          ) : !publicProfile ? (
            <div className="text-gray-300">Profile not found.</div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row items-start gap-4 mb-6">
                <img
                  src={publicProfile.avatar_url || '/default-avatar.png'}
                  alt={`${publicProfile.username}'s avatar`}
                  className="w-24 h-24 rounded-full object-cover"
                  onError={(e) => { e.target.src = '/default-avatar.png' }}
                />
                <div>
                  <h2 className="text-3xl font-bold mb-1">{publicProfile.username}</h2>
                  {publicProfile.location && (
                    <p className="text-sm text-gray-300 mb-2">{publicProfile.location}</p>
                  )}
                  {publicProfile.bio && (
                    <p className="text-gray-200 whitespace-pre-line">{publicProfile.bio}</p>
                  )}
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-4">Tracks</h3>
              {publicTracks.length === 0 ? (
                <div className="text-gray-300 bg-gray-800 p-4 rounded">
                  No public tracks yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {publicTracks.map((track) => (
                    <div key={track.id} className="bg-gray-800 bg-opacity-80 p-4 rounded text-white">
                      <div className="flex flex-col md:flex-row justify-between">
                        <div>
                          <h4 className="font-bold text-lg">{track.title}</h4>
                          <p className="text-gray-300">
                            {track.artist} {track.album ? `• ${track.album}` : ''}
                          </p>
                          <div className="flex gap-2 items-center mt-1">
                            <span className="bg-gray-700 px-2 py-0.5 text-xs rounded">
                              {track.genres ? track.genres.name : 'No genre'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDate(track.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 min-w-[200px] flex items-center mt-3 md:mt-0">
                          {track.audio_path ? (
                            <SignedAudioPlayer audioPath={track.audio_path} trackId={track.id} />
                          ) : (
                            <span className="text-red-400">Audio unavailable</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
