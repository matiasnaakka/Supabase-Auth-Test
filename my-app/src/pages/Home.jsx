import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseclient'
import NavBar from '../components/NavBar'

// Reuse the SignedAudioPlayer from Upload.jsx
const SignedAudioPlayer = ({ audioPath, trackId }) => {
  const [signedUrl, setSignedUrl] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const getUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('audio')
          .createSignedUrl(audioPath, 300) // 5 min expiry

        if (error) throw error
        
        if (isMounted) {
          setSignedUrl(data.signedUrl)
        }
      } catch (err) {
        console.error(`Error signing URL for track ${trackId}:`, err.message)
        if (isMounted) {
          setError(err.message)
        }
      }
    }
    
    getUrl()
    
    return () => { isMounted = false }
  }, [audioPath, trackId])

  if (error) return <span className="text-red-400">Error: {error}</span>
  if (!signedUrl) return <span className="text-gray-400">Loading...</span>

  return (
    <audio
      controls
      src={signedUrl}
      className="h-8 max-w-full"
      onError={(e) => console.error(`Error loading audio for ${trackId}`, e)}
    />
  )
}

export default function Home({ session }) {
  const [tracks, setTracks] = useState([])
  const [filteredTracks, setFilteredTracks] = useState([])
  const [genres, setGenres] = useState([])
  const [selectedGenreIds, setSelectedGenreIds] = useState([]) // was selectedGenreId
  const [showGenres, setShowGenres] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [displayName, setDisplayName] = useState('user')

  // Fetch tracks and genres on component mount
  useEffect(() => {
    fetchGenres()
    fetchTracks()
  }, [])

  // Fetch display name (username) of the logged-in user
  useEffect(() => {
    const loadName = async () => {
      try {
        if (session?.user?.id) {
          const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', session.user.id)
            .single()
          if (!error && data?.username) {
            setDisplayName(data.username)
          } else {
            setDisplayName(session?.user?.email ?? 'user')
          }
        } else {
          setDisplayName('user')
        }
      } catch {
        setDisplayName(session?.user?.email ?? 'user')
      }
    }
    loadName()
  }, [session?.user?.id])

  const fetchGenres = async () => {
    try {
      const { data, error } = await supabase
        .from('genres')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) throw error
      setGenres(data || [])
    } catch (err) {
      console.error('Error fetching genres:', err)
      setError('Failed to load genres')
    }
  }

  const fetchTracks = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          profiles (username, avatar_url),
          genres (name)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      
      console.log('Tracks loaded:', data)
      setTracks(data || [])
      setFilteredTracks(data || [])
    } catch (err) {
      console.error('Error fetching tracks:', err)
      setError('Failed to load tracks')
    } finally {
      setLoading(false)
    }
  }

  // Filter tracks when genre selection changes (now supports multi-select)
  useEffect(() => {
    if (selectedGenreIds.length > 0) {
      setFilteredTracks(tracks.filter(track => selectedGenreIds.includes(track.genre_id)))
    } else {
      setFilteredTracks(tracks)
    }
  }, [selectedGenreIds, tracks])

  const handleGenreToggle = (genreId) => {
    setSelectedGenreIds((prev) =>
      prev.includes(genreId) ? prev.filter(id => id !== genreId) : [...prev, genreId]
    )
  }

  const handleClearGenres = () => {
    setSelectedGenreIds([])
  }

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

  return (
    <div className="min-h-screen bg-black text-white">
      <NavBar session={session} onSignOut={handleSignOut} />
      <div className="max-w-5xl mx-auto mt-16 p-6">
        <h1 className="text-3xl font-bold mb-6 text-white">Welcome, {displayName}</h1>

        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3 text-white">Filter by Genre</h2>
          <div
            className="relative inline-block"
            onMouseEnter={() => setShowGenres(true)}
            onMouseLeave={() => setShowGenres(false)}
          >
            <button
              type="button"
              className="px-3 py-1 rounded text-sm bg-gray-700 text-white hover:bg-gray-600"
            >
              Filter{selectedGenreIds.length > 0 ? ` (${selectedGenreIds.length})` : ''}
            </button>

            {showGenres && (
              <div className="absolute z-20 mt-2 w-64 rounded bg-gray-900 border border-gray-700 shadow-lg">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                  <span className="text-sm text-gray-300">Select genres</span>
                  <button
                    type="button"
                    onClick={handleClearGenres}
                    className="text-xs text-teal-300 hover:underline"
                  >
                    Clear
                  </button>
                </div>
                <ul
                  className="max-h-56 overflow-y-auto divide-y divide-gray-800"
                  role="listbox"
                  aria-label="Genres"
                >
                  {genres.map((genre) => {
                    const selected = selectedGenreIds.includes(genre.id)
                    return (
                      <li
                        key={genre.id}
                        role="option"
                        aria-selected={selected}
                        onClick={() => handleGenreToggle(genre.id)}
                        className={`cursor-pointer px-3 py-2 flex items-center justify-between ${
                          selected ? 'bg-teal-500/20 text-teal-300' : 'hover:bg-gray-800'
                        }`}
                        title={genre.description}
                      >
                        <span>{genre.name}</span>
                        {selected && <span className="text-teal-300">✓</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4 text-white">Recent Tracks</h2>
        
        {error && (
          <div className="bg-red-500 bg-opacity-25 text-red-100 p-3 rounded mb-4">
            {error}
            <button 
              onClick={fetchTracks}
              className="ml-4 bg-red-700 px-2 py-1 rounded text-white"
            >
              Retry
            </button>
          </div>
        )}
        
        {loading ? (
          <div className="text-white">Loading tracks...</div>
        ) : filteredTracks.length === 0 ? (
          <div className="text-white bg-gray-800 p-6 rounded">
            {selectedGenreIds.length > 0
              ? "No tracks found for the selected genres. Try selecting different genres." 
              : "No tracks available yet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredTracks.map(track => (
              <div key={track.id} className="bg-gray-800 bg-opacity-80 p-4 rounded shadow-lg text-white">
                <div className="flex flex-col md:flex-row justify-between">
                  <div className="mb-3 md:mb-0">
                    <div className="flex items-center gap-3 mb-1">
                      {track.profiles?.avatar_url && (
                        <img 
                          src={track.profiles.avatar_url} 
                          alt="User avatar"
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => e.target.src = '/default-avatar.png'}
                        />
                      )}
                      <h3 className="font-bold text-lg">{track.title}</h3>
                    </div>
                    <p className="text-gray-300">
                      {track.artist} {track.album ? `• ${track.album}` : ''}
                    </p>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="bg-gray-700 px-2 py-0.5 text-xs rounded">
                        {track.genres ? track.genres.name : 'No genre'}
                      </span>
                      <span className="text-xs text-gray-400">
                        Shared by{' '}
                        <Link
                          to={`/profile?user=${track.user_id}`}
                          className="underline hover:text-teal-300"
                        >
                          {track.profiles?.username || 'Anonymous'}
                        </Link>
                        {' '}• {formatDate(track.created_at)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 min-w-[200px] flex items-center">
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
      </div>
    </div>
  )
}