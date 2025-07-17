import { useState, useEffect } from 'react'
import HookConfig from './components/HookConfig'
import SoundManager from './components/SoundManager'
import EventLogger from './components/EventLogger'

function App() {
  const [activeTab, setActiveTab] = useState('hooks')
  const [sounds, setSounds] = useState([])

  useEffect(() => {
    fetchSounds()
  }, [])

  const fetchSounds = async () => {
    try {
      const response = await fetch('/api/sounds')
      const data = await response.json()
      setSounds(data)
    } catch (error) {
      console.error('Failed to fetch sounds:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">🔥 Hotline</h1>
          <p className="text-gray-600 mt-1">Manage Claude Code hooks with sound effects and notifications</p>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'hooks', label: '⚙️ Hook Config', description: 'Configure hooks and sounds' },
              { id: 'sounds', label: '🎵 Sound Manager', description: 'Upload and manage audio files' },
              { id: 'logs', label: '📊 Event Logger', description: 'View real-time hook activity' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'hooks' && (
          <HookConfig sounds={sounds} />
        )}
        {activeTab === 'sounds' && (
          <SoundManager sounds={sounds} onSoundsUpdate={fetchSounds} />
        )}
        {activeTab === 'logs' && (
          <EventLogger />
        )}
      </main>
    </div>
  )
}

export default App