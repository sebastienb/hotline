import { useState } from 'react'

export default function SoundManager({ sounds, onSoundsUpdate }) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return
    
    setUploading(true)
    
    try {
      for (const file of files) {
        if (!file.type.match(/audio\/(mpeg|wav|mp3)/)) {
          alert(`${file.name} is not a valid audio file (MP3/WAV only)`)
          continue
        }
        
        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name} is too large (max 10MB)`)
          continue
        }
        
        const formData = new FormData()
        formData.append('sound', file)
        
        const response = await fetch('/api/sounds', {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }
      }
      
      await onSoundsUpdate()
      alert('Files uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload files')
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    handleFileUpload(files)
  }

  const deleteSound = async (filename) => {
    if (!confirm(`Delete ${filename}?`)) return
    
    try {
      const response = await fetch(`/api/sounds/${filename}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await onSoundsUpdate()
      } else {
        throw new Error('Failed to delete file')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete file')
    }
  }

  const playSound = (filename) => {
    const audio = new Audio(`/api/sounds/play/${filename}`)
    audio.play().catch(error => {
      console.error('Failed to play sound:', error)
      alert('Failed to play sound')
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-monokai-bgLight rounded-lg shadow dark:shadow-monokai-border/20 p-6 border border-gray-200 dark:border-monokai-border">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-monokai-text">Sound Manager</h2>
        
        {/* Upload Area */}
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver 
              ? 'border-blue-400 dark:border-monokai-cyan bg-blue-50 dark:bg-monokai-hover' 
              : 'border-gray-300 dark:border-monokai-border hover:border-gray-400 dark:hover:border-monokai-textMuted'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="text-4xl">🎵</div>
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-monokai-text">
                {dragOver ? 'Drop files here' : 'Upload Sound Files'}
              </p>
              <p className="text-gray-600 dark:text-monokai-textMuted">
                Drag & drop MP3 or WAV files, or click to browse
              </p>
              <p className="text-sm text-gray-500 dark:text-monokai-textMuted">
                Max file size: 10MB per file
              </p>
            </div>
            
            <input
              type="file"
              multiple
              accept="audio/mpeg,audio/wav,audio/mp3"
              onChange={(e) => handleFileUpload(Array.from(e.target.files))}
              className="hidden"
              id="sound-upload"
              disabled={uploading}
            />
            
            <label
              htmlFor="sound-upload"
              className={`inline-block px-4 py-2 bg-blue-600 dark:bg-monokai-cyan text-white dark:text-monokai-bg rounded-md cursor-pointer hover:bg-blue-700 dark:hover:bg-monokai-cyan/80 transition-colors ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? 'Uploading...' : 'Browse Files'}
            </label>
          </div>
        </div>
        
        {/* Sound List */}
        <div className="mt-6">
          <h3 className="font-medium mb-3 text-gray-900 dark:text-monokai-text">
            Uploaded Sounds ({sounds.length})
          </h3>
          
          {sounds.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-monokai-textMuted">
              <div className="text-2xl mb-2">🔇</div>
              <p>No sound files uploaded yet</p>
              <p className="text-sm">Upload some MP3 or WAV files to get started</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {sounds.map(sound => (
                <div 
                  key={sound.filename} 
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-monokai-border rounded-lg hover:bg-gray-50 dark:hover:bg-monokai-hover bg-white dark:bg-monokai-bg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-xl">
                      {sound.filename.endsWith('.mp3') ? '🎵' : '🎶'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-monokai-text">{sound.filename}</p>
                      <p className="text-sm text-gray-600 dark:text-monokai-textMuted">
                        {formatFileSize(sound.size)} • Modified {new Date(sound.modified).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => playSound(sound.filename)}
                      className="p-2 text-blue-600 dark:text-monokai-cyan hover:bg-blue-100 dark:hover:bg-monokai-hover rounded-md transition-colors"
                      title="Play sound"
                    >
                      ▶️
                    </button>
                    
                    <button
                      onClick={() => deleteSound(sound.filename)}
                      className="p-2 text-red-600 dark:text-monokai-pink hover:bg-red-100 dark:hover:bg-monokai-hover rounded-md transition-colors"
                      title="Delete sound"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Storage Info */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-monokai-bg rounded-lg border border-gray-200 dark:border-monokai-border">
          <h4 className="font-medium text-sm mb-2 text-gray-900 dark:text-monokai-text">Storage Location</h4>
          <p className="text-sm text-gray-600 dark:text-monokai-textMuted">
            <code className="bg-gray-200 dark:bg-monokai-bgDark px-1 rounded text-gray-800 dark:text-monokai-orange">~/.hotline/sounds/</code>
          </p>
          <p className="text-xs text-gray-500 dark:text-monokai-textMuted mt-1">
            Sound files are stored locally in your home directory
          </p>
        </div>
      </div>
    </div>
  )
}