import { useState, useEffect, useRef } from 'react'
import HookConfig from './components/HookConfig'
import SoundManager from './components/SoundManager'
import EventLogger from './components/EventLogger'
import { useNotifications } from './hooks/useNotifications'

function App() {
  const [activeTab, setActiveTab] = useState('hooks')
  const [sounds, setSounds] = useState([])
  const [hookConfig, setHookConfig] = useState({})
  const [newLogEntry, setNewLogEntry] = useState(null)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })
  const hookConfigRef = useRef({})
  const { showNotification, requestPermission, permission } = useNotifications()

  useEffect(() => {
    fetchSounds()
    fetchHookConfig()
    const cleanup = setupWebSocket()
    return cleanup
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  const fetchHookConfig = async () => {
    try {
      const response = await fetch('/api/hook-ui-config')
      if (response.ok) {
        const config = await response.json()
        setHookConfig(config)
        hookConfigRef.current = config
      } else {
        setHookConfig({})
        hookConfigRef.current = {}
      }
    } catch (error) {
      console.error('Failed to fetch hook config:', error)
      setHookConfig({})
      hookConfigRef.current = {}
    }
  }

  const setupWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = window.location.port === '3000' ? '3001' : '3001' // Backend always on 3001
    const wsUrl = `${protocol}//${host}:${port}`
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
    }
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        
        if (message.type === 'newLog' && message.data) {
          handleNewLogEntry(message.data)
        } else if (message.type === 'clearLogs') {
          // Handle clear logs if needed
        } else if (message.hook_type) {
          handleNewLogEntry(message)
        } else {
        }
      } catch (error) {
        console.error('💥 Error parsing WebSocket message:', error)
      }
    }
    
    ws.onclose = (event) => {
    }
    
    ws.onerror = (error) => {
      console.error('💥 WebSocket error:', error)
      console.error('Failed to connect to:', wsUrl)
    }
    
    return () => {
      ws.close()
    }
  }

  const playSound = async (filename) => {
    try {
      const audio = new Audio(`/api/sounds/play/${filename}`)
      audio.addEventListener('error', (e) => console.error('Failed to play sound:', e.error))
      await audio.play()
    } catch (error) {
      console.error('Failed to play sound:', error)
    }
  }

  // Request notification permission on first hook that needs it
  const ensureNotificationPermission = async () => {
    if (permission !== 'granted') {
      console.log('🔔 Requesting notification permission...')
      const granted = await requestPermission()
      if (!granted) {
        console.log('🔕 Notification permission denied, will use fallback')
      }
      return granted
    }
    return true
  }

  const handleNewLogEntry = (log) => {
    // Check if this hook type has sound configured - config is now an array
    const configArray = hookConfigRef.current[log.hook_type]
    
    if (configArray && Array.isArray(configArray)) {
      // Process each enabled configuration
      configArray.forEach((config, index) => {
        if (config && config.enabled) {
          // Check for multiple sounds (new format) or single sound (legacy format)
          const availableSounds = config.sounds 
            ? config.sounds.filter(s => s !== '') 
            : (config.sound ? [config.sound] : [])
          
          if (availableSounds.length > 0) {
            // Pick a random sound from available sounds
            const randomSound = availableSounds[Math.floor(Math.random() * availableSounds.length)]
            playSound(randomSound)
          }
          
          // Check if notifications are enabled for this configuration
          if (config.notifications) {
            ensureNotificationPermission().then(() => {
              showNotification(`Hook Triggered: ${log.hook_type}`, {
                body: `Tool: ${log.tool_name || 'N/A'}\nMessage: ${log.message || 'N/A'}`,
                icon: '/favicon.ico'
              })
            })
          }
        }
      })
    }

    // Pass the log entry to EventLogger if it's active
    setNewLogEntry(log)
  }

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
    <div className="min-h-screen bg-gray-50 dark:bg-monokai-bg transition-colors">
      <header className="bg-white dark:bg-monokai-bgLight shadow-sm border-b border-gray-200 dark:border-monokai-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-monokai-text">🔥 Hotline</h1>
            <p className="text-gray-600 dark:text-monokai-textMuted mt-1">Manage Claude Code hooks with sound effects and notifications</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-monokai-hover transition-colors"
            title="Toggle dark mode"
          >
            {darkMode ? (
              <svg className="w-5 h-5 text-monokai-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <nav className="bg-white dark:bg-monokai-bgLight border-b border-gray-200 dark:border-monokai-border">
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
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 dark:border-monokai-green text-blue-600 dark:text-monokai-green'
                    : 'border-transparent text-gray-500 dark:text-monokai-textMuted hover:text-gray-700 dark:hover:text-monokai-text hover:border-gray-300 dark:hover:border-monokai-border'
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
          <EventLogger newLogEntry={newLogEntry} />
        )}
      </main>
    </div>
  )
}

export default App