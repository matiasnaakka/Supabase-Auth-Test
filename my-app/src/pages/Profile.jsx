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
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [publicFollowingCount, setPublicFollowingCount] = useState(0)
  const [followError, setFollowError] = useState(null)

  // Own tracks state (unchanged)
  const [ownTracks, setOwnTracks] = useState([])
  const [ownTracksLoading, setOwnTracksLoading] = useState(false)
  const [ownTracksError, setOwnTracksError] = useState(null)

  // NEW: Own header state to mirror public header
  const [ownProfile, setOwnProfile] = useState(null)
  const [ownFollowerCount, setOwnFollowerCount] = useState(0)
  const [ownFollowingCount, setOwnFollowingCount] = useState(0)
  const [ownHeaderLoading, setOwnHeaderLoading] = useState(false)
  const [ownHeaderError, setOwnHeaderError] = useState(null)

  const [showSettings, setShowSettings] = useState(false)

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
      setIsFollowing(false)
      setFollowerCount(0)
      setPublicFollowingCount(0)
      setFollowError(null)
      setFollowLoading(false)
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

        const { count: followerCountResult = 0, error: followersError } = await supabase
          .from('followers')
          .select('follower_id', { count: 'exact', head: true })
          .eq('followed_id', targetUserId)
        if (followersError) throw followersError

        const { count: followingCountResult = 0, error: followingCountError } = await supabase
          .from('followers')
          .select('followed_id', { count: 'exact', head: true })
          .eq('follower_id', targetUserId)
        if (followingCountError) throw followingCountError

        let userFollows = false
        if (session?.user?.id) {
          const { count: followStatusCount = 0, error: followStatusError } = await supabase
            .from('followers')
            .select('follower_id', { count: 'exact', head: true })
            .eq('followed_id', targetUserId)
            .eq('follower_id', session.user.id)
          if (followStatusError) throw followStatusError
          userFollows = followStatusCount > 0
        }

        if (isMounted) {
          setPublicProfile(profileData)
          setPublicTracks(tracksData || [])
          setFollowerCount(followerCountResult)
          setPublicFollowingCount(followingCountResult)
          setIsFollowing(userFollows)
          setFollowError(null)
        }
      } catch (err) {
        if (isMounted) {
          setPublicError(err.message)
          setPublicProfile(null)
          setPublicTracks([])
          setIsFollowing(false)
          setFollowerCount(0)
          setPublicFollowingCount(0)
        }
      } finally {
        if (isMounted) setPublicLoading(false)
      }
    }

    fetchProfile()
    return () => { isMounted = false }
  }, [isOwnProfile, targetUserId, session?.user?.id])

  useEffect(() => {
    if (!isOwnProfile || !session?.user?.id) {
      setOwnTracks([])
      setOwnTracksError(null)
      setOwnTracksLoading(false)
      return
    }

    let isMounted = true
    const fetchOwnTracks = async () => {
      setOwnTracksLoading(true)
      setOwnTracksError(null)
      try {
        const { data, error } = await supabase
          .from('tracks')
          .select(`
            id, title, artist, album, audio_path, created_at, is_public,
            genres (name)
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
        if (error) throw error
        if (isMounted) setOwnTracks(data || [])
      } catch (err) {
        if (isMounted) {
          setOwnTracksError(err.message)
          setOwnTracks([])
        }
      } finally {
        if (isMounted) setOwnTracksLoading(false)
      }
    }

    fetchOwnTracks()
    return () => { isMounted = false }
  }, [isOwnProfile, session?.user?.id])

  // NEW: Fetch own profile header data (same fields and counts as public header)
  useEffect(() => {
    if (!isOwnProfile || !session?.user?.id) {
      setOwnProfile(null)
      setOwnFollowerCount(0)
      setOwnFollowingCount(0)
      setOwnHeaderError(null)
      setOwnHeaderLoading(false)
      return
    }

    let isMounted = true
    const fetchOwnHeader = async () => {
      setOwnHeaderLoading(true)
      setOwnHeaderError(null)
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, bio, location, avatar_url')
          .eq('id', session.user.id)
          .single()
        if (profileError) throw profileError

        const { count: followers = 0, error: followersError } = await supabase
          .from('followers')
          .select('follower_id', { count: 'exact', head: true })
          .eq('followed_id', session.user.id)
        if (followersError) throw followersError

        const { count: following = 0, error: followingError } = await supabase
          .from('followers')
          .select('followed_id', { count: 'exact', head: true })
          .eq('follower_id', session.user.id)
        if (followingError) throw followingError

        if (isMounted) {
          setOwnProfile(profileData)
          setOwnFollowerCount(followers)
          setOwnFollowingCount(following)
        }
      } catch (err) {
        if (isMounted) setOwnHeaderError(err.message)
      } finally {
        if (isMounted) setOwnHeaderLoading(false)
      }
    }

    fetchOwnHeader()
    return () => { isMounted = false }
  }, [isOwnProfile, session?.user?.id])

  const handleFollowToggle = async () => {
    if (!session?.user?.id || !targetUserId) return
    setFollowError(null)
    setFollowLoading(true)
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('followed_id', targetUserId)
        if (error) throw error
        setIsFollowing(false)
        setFollowerCount((prev) => Math.max(0, (prev || 0) - 1))
      } else {
        const { error } = await supabase
          .from('followers')
          .insert([{ follower_id: session.user.id, followed_id: targetUserId }])
        if (error && error.code !== '23505') throw error
        setIsFollowing(true)
        if (!error) {
          setFollowerCount((prev) => (prev || 0) + 1)
        }
      }
    } catch (err) {
      setFollowError(err.message)
    } finally {
      setFollowLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <NavBar session={session} onSignOut={handleSignOut} />
      {isOwnProfile ? (
        <>
          {/* Unified header + tracks container (same as public layout) */}
          <div className="max-w-4xl mx-auto mt-16 p-6 bg-black bg-opacity-80 rounded-lg text-white">
            {ownHeaderLoading ? (
              <div>Loading profile...</div>
            ) : ownHeaderError ? (
              <div className="bg-red-500 bg-opacity-25 text-red-100 p-3 rounded">{ownHeaderError}</div>
            ) : !ownProfile ? (
              <div className="text-gray-300">Profile not found.</div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row items-start gap-4 mb-6">
                  <img
                    src={ownProfile.avatar_url || '/default-avatar.png'}
                    alt={`${ownProfile.username}'s avatar`}
                    className="w-24 h-24 object-cover"
                    onError={(e) => { e.target.src = '/default-avatar.png' }}
                  />
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-1">{ownProfile.username}</h2>
                    {ownProfile.location && (
                      <p className="text-sm text-gray-300 mb-2">{ownProfile.location}</p>
                    )}
                    {ownProfile.bio && (
                      <p className="text-gray-200 whitespace-pre-line">{ownProfile.bio}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-2 md:ml-auto">
                    <button
                      onClick={() => setShowSettings(true)}
                      className="px-4 py-2 rounded font-semibold bg-gray-700 text-white hover:bg-gray-600"
                    >
                      Settings
                    </button>
                    <span className="text-xs text-gray-400">
                      {ownFollowerCount === 1 ? '1 follower' : `${ownFollowerCount} followers`} • Following {ownFollowingCount}
                    </span>
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-4">Tracks</h3>
                {ownTracksLoading ? (
                  <div>Loading your tracks...</div>
                ) : ownTracksError ? (
                  <div className="bg-red-500 bg-opacity-25 text-red-100 p-3 rounded">
                    {ownTracksError}
                  </div>
                ) : ownTracks.length === 0 ? (
                  <div className="text-gray-300 bg-gray-800 p-4 rounded">
                    You haven't uploaded any tracks yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {ownTracks.map((track) => (
                      <div key={track.id} className="bg-gray-800 bg-opacity-80 p-4 rounded text-white">
                        <div className="flex flex-col md:flex-row justify-between">
                          <div>
                            <h4 className="font-bold text-lg">{track.title}</h4>
                            <p className="text-gray-300">
                              {track.artist} {track.album ? `• ${track.album}` : ''}
                            </p>
                            <div className="flex gap-2 items-center mt-1 flex-wrap">
                              <span className="bg-gray-700 px-2 py-0.5 text-xs rounded">
                                {track.genres ? track.genres.name : 'No genre'}
                              </span>
                              <span className="bg-gray-700 px-2 py-0.5 text-xs rounded">
                                {track.is_public ? 'Public' : 'Private'}
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

          {/* Settings Modal (editable) */}
          {showSettings && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
              <div className="w-full max-w-lg mx-4">
                <UserProfile session={session} isModal onClose={() => setShowSettings(false)} />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="max-w-4xl mx-auto mt-16 p-6 bg-black bg-opacity-80 rounded-lg text-white">
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
                  className="w-24 h-24 object-cover"
                  onError={(e) => { e.target.src = '/default-avatar.png' }}
                />
                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-1">{publicProfile.username}</h2>
                  {publicProfile.location && (
                    <p className="text-sm text-gray-300 mb-2">{publicProfile.location}</p>
                  )}
                  {publicProfile.bio && (
                    <p className="text-gray-200 whitespace-pre-line">{publicProfile.bio}</p>
                  )}
                </div>
                <div className="flex flex-col items-start md:items-end gap-2 md:ml-auto">
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`px-4 py-2 rounded font-semibold transition ${
                      followLoading ? 'opacity-70 cursor-not-allowed' : ''
                    } ${
                      isFollowing
                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                        : 'bg-teal-400 text-black hover:bg-teal-300'
                    }`}
                  >
                    {followLoading ? 'Processing...' : isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                  <span className="text-xs text-gray-400">
                    {followerCount === 1 ? '1 follower' : `${followerCount} followers`} • Following {publicFollowingCount}
                  </span>
                  {followError && (
                    <span className="text-xs text-red-400">{followError}</span>
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
    </div>
  )
}
