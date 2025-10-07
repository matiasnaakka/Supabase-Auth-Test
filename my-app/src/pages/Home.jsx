import React, { useState, useEffect } from 'react'
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
  const [selectedGenreId, setSelectedGenreId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const email = session?.user?.email ?? 'user'

  // Fetch tracks and genres on component mount
  useEffect(() => {
    fetchGenres()
    fetchTracks()
  }, [])

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

  // Filter tracks when genre selection changes
  useEffect(() => {
    if (selectedGenreId) {
      setFilteredTracks(tracks.filter(track => track.genre_id === selectedGenreId))
    } else {
      setFilteredTracks(tracks)
    }
  }, [selectedGenreId, tracks])

  const handleGenreSelect = (genreId) => {
    setSelectedGenreId(genreId === selectedGenreId ? null : genreId)
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
    <>
      <NavBar session={session} onSignOut={handleSignOut} />
      <div className="max-w-5xl mx-auto mt-20 p-6">
        <h1 className="text-3xl font-bold mb-6 text-white">Welcome, {email}</h1>
        
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3 text-white">Filter by Genre</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedGenreId(null)}
              className={`px-3 py-1 rounded text-sm ${
                !selectedGenreId
                  ? 'bg-teal-400 text-black'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              All Genres
            </button>
            {genres.map(genre => (
              <button
                key={genre.id}
                onClick={() => handleGenreSelect(genre.id)}
                className={`px-3 py-1 rounded text-sm ${
                  selectedGenreId === genre.id
                    ? 'bg-teal-400 text-black'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {genre.name}
              </button>
            ))}
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
            {selectedGenreId 
              ? "No tracks found for this genre. Try selecting a different genre." 
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
                        Shared by {track.profiles?.username || 'Anonymous'} • {formatDate(track.created_at)}
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
    </>
  )
}