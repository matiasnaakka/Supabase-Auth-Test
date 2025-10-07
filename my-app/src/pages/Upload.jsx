import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseclient'
import NavBar from '../components/NavBar'

// Create SignedAudioPlayer component
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

export default function Upload({ session }) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [genreId, setGenreId] = useState(null)
  const [album, setAlbum] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [tracks, setTracks] = useState([])
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [genres, setGenres] = useState([])
  const [loadingGenres, setLoadingGenres] = useState(false)
  
  // Fetch user's tracks and genres
  useEffect(() => {
    if (session) {
      fetchUserTracks()
      fetchGenres()
    }
  }, [session])
  
  const fetchGenres = async () => {
    setLoadingGenres(true)
    try {
      const { data, error } = await supabase
        .from('genres')
        .select('id, name, description')
        .order('name', { ascending: true })
      
      if (error) {
        console.error('Error fetching genres:', error)
        setError(`Error loading genres: ${error.message}`)
      } else {
        console.log('Genres fetched successfully:', data)
        setGenres(data || [])
      }
    } catch (err) {
      console.error('Exception when fetching genres:', err)
      setError(`Failed to load genres: ${err.message}`)
    } finally {
      setLoadingGenres(false)
    }
  }
  
  const fetchUserTracks = async () => {
    setLoadingTracks(true)
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          genres (
            name,
            description
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching tracks:', error)
        setError(`Error loading tracks: ${error.message}`)
      } else {
        console.log('Tracks fetched successfully:', data)
        setTracks(data || [])
      }
    } catch (err) {
      console.error('Exception when fetching tracks:', err)
      setError(`Failed to load tracks: ${err.message}`)
    } finally {
      setLoadingTracks(false)
    }
  }
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    console.log('isFile', selectedFile instanceof File)
    setFile(selectedFile)
  }
  
  const handleGenreSelect = (id) => {
    setGenreId(id === genreId ? null : id) // Toggle selection
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!file) {
      setError('Please select an audio file to upload')
      return
    }
    
    if (!title || !artist) {
      setError('Title and artist are required')
      return
    }
    
    if (!genreId) {
      setError('Please select a genre for your track')
      return
    }
    
    // Verify user is authenticated
    console.log('User ID:', session?.user?.id)
    if (!session?.user?.id) {
      setError('Authentication required')
      return
    }
    
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      // 1. Sanitize filename more thoroughly
      const sanitizedName = file.name
        .replace(/[^a-z0-9.\-_]/gi, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
      const fileName = `${Date.now()}-${sanitizedName}`
      const filePath = `${session.user.id}/${fileName}`
      
      console.log('Uploading file:', { filePath, fileType: file.type, fileSize: file.size })
      
      // 2. Upload with upsert option and log complete response
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio')
        .upload(filePath, file, { upsert: true })
      
      console.log('Upload response:', { uploadData, uploadError })
      
      if (uploadError) {
        throw new Error(`Upload error: ${uploadError.message}`)
      }
      
      // 3. Create a record in the tracks table with the path only
      const trackData = {
        user_id: session.user.id,
        title,
        artist,
        genre_id: genreId, // Use the selected genre ID
        album,
        audio_path: filePath,
        mime_type: file.type,
        file_size: file.size,
        is_public: isPublic
      }
      
      console.log('Inserting track data:', trackData)
      
      const { error: insertError } = await supabase
        .from('tracks')
        .insert(trackData)
      
      if (insertError) {
        throw new Error(`Database error: ${insertError.message}`)
      }
      
      // 4. Reset form and show success message
      setTitle('')
      setArtist('')
      setGenreId(null)
      setAlbum('')
      setFile(null)
      setSuccess('Track uploaded successfully!')
      
      // 5. Refresh tracks list
      fetchUserTracks()
      
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const handleDeleteTrack = async (trackId) => {
    if (!confirm('Are you sure you want to delete this track?')) {
      return
    }
    
    setLoading(true)
    
    // 1. Get the track details
    const { data: trackData, error: fetchError } = await supabase
      .from('tracks')
      .select('audio_path')
      .eq('id', trackId)
      .single()
    
    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }
    
    // 2. Delete the record from the tracks table
    const { error: deleteError } = await supabase
      .from('tracks')
      .delete()
      .eq('id', trackId)
    
    if (deleteError) {
      setError(deleteError.message)
      setLoading(false)
      return
    }
    
    // 3. Delete the file from storage using the path directly
    try {
      console.log('Deleting file from path:', trackData.audio_path)
      
      const { data, error } = await supabase.storage
        .from('audio')
        .remove([trackData.audio_path])
        
      console.log('Storage delete response:', { data, error })
      
      if (error) {
        console.error('Error deleting file from storage:', error)
      }
    } catch (err) {
      console.error('Could not delete file from storage:', err)
    }
    
    // 4. Refresh tracks list
    fetchUserTracks()
    setLoading(false)
    setSuccess('Track deleted successfully!')
  }
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }
  
  // Add this new function to handle audio errors
  const handleAudioError = (event, trackId) => {
    console.error(`Error loading audio for track ${trackId}:`, event)
  }
  
  return (
    <>
      <NavBar session={session} onSignOut={handleSignOut} />
      <div className="max-w-4xl mx-auto mt-20 p-6 bg-black bg-opacity-80 rounded-lg text-white">
        <h2 className="text-2xl font-bold mb-6">Upload Track</h2>
        
        {error && <div className="bg-red-500 bg-opacity-25 text-red-100 p-3 rounded mb-4">{error}</div>}
        {success && <div className="bg-green-500 bg-opacity-25 text-green-100 p-3 rounded mb-4">{success}</div>}
        
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 rounded bg-gray-800 text-white"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Artist *</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full p-2 rounded bg-gray-800 text-white"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Album</label>
              <input
                type="text"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                className="w-full p-2 rounded bg-gray-800 text-white"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block mb-2">Genre *</label>
            {loadingGenres ? (
              <div className="p-2 rounded bg-gray-800 text-gray-400">Loading genres...</div>
            ) : genres.length === 0 ? (
              <div className="p-2 rounded bg-gray-800 text-gray-400">No genres available</div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 rounded bg-gray-800">
                {genres.map((genre) => (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => handleGenreSelect(genre.id)}
                    className={`px-3 py-1 rounded text-sm ${
                      genreId === genre.id
                        ? 'bg-teal-400 text-black'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                    title={genre.description}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            )}
            {!loadingGenres && genreId === null && (
              <p className="text-red-400 text-sm mt-1">Please select a genre</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block mb-1">Audio File *</label>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="w-full p-2 rounded bg-gray-800 text-white"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mr-2"
              />
              Make this track public
            </label>
          </div>
          
          <button
            type="submit"
            className="bg-teal-400 text-white px-4 py-2 rounded font-bold hover:bg-teal-300"
            disabled={loading || genreId === null}
          >
            {loading ? 'Uploading...' : 'Upload Track'}
          </button>
        </form>
        
        <h2 className="text-2xl font-bold mb-4">Your Tracks</h2>
        
        {loadingTracks ? (
          <div>Loading your tracks...</div>
        ) : tracks.length === 0 ? (
          <div>You haven't uploaded any tracks yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {tracks.map(track => (
              <div key={track.id} className="bg-gray-800 p-4 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <h3 className="font-bold">{track.title}</h3>
                  <p>{track.artist} {track.album ? `• ${track.album}` : ''}</p>
                  <p className="text-sm text-gray-400">
                    {track.genres ? track.genres.name : 'No genre'} • {track.is_public ? 'Public' : 'Private'}
                    {track.mime_type && ` • ${track.mime_type.split('/')[1]}`}
                    {track.file_size && ` • ${Math.round(track.file_size / 1024)} KB`}
                  </p>
                  {!track.audio_path && <p className="text-red-400 text-sm">Audio path missing</p>}
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  {track.audio_path ? (
                    <SignedAudioPlayer audioPath={track.audio_path} trackId={track.id} />
                  ) : (
                    <span className="text-red-400">Audio unavailable</span>
                  )}
                  <button
                    onClick={() => handleDeleteTrack(track.id)}
                    className="bg-red-500 text-white p-1 rounded"
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Button to refresh tracks if there was an error */}
        {error && !loading && (
          <button 
            onClick={() => fetchUserTracks()}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          >
            Retry loading tracks
          </button>
        )}
      </div>
    </>
  )
}