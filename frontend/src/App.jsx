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
  const hookConfigRef = useRef({})
  const { showNotification, requestPermission, permission } = useNotifications()

  useEffect(() => {
    fetchSounds()
    fetchHookConfig()
    const cleanup = setupWebSocket()
    return cleanup
  }, [])

  const fetchHookConfig = async () => {
    try {
      const response = await fetch('/api/hook-ui-config')
      if (response.ok) {
        const config = await response.json()
        console.log('Loaded hook config:', config)
        setHookConfig(config)
        hookConfigRef.current = config
      } else {
        console.log('No hook config found, using empty config')
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
    console.log('🔌 Setting up WebSocket connection to:', wsUrl)
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected successfully to:', wsUrl)
    }
    
    ws.onmessage = (event) => {
      console.log('📨 WebSocket message received:', event.data)
      try {
        const message = JSON.parse(event.data)
        console.log('📦 Parsed WebSocket message:', message)
        
        if (message.type === 'newLog' && message.data) {
          console.log('🎯 Processing newLog message with data (real hook)')
          handleNewLogEntry(message.data)
        } else if (message.type === 'clearLogs') {
          console.log('🗑️ Processing clearLogs message')
          // Handle clear logs if needed
        } else if (message.hook_type) {
          console.log('🎯 Processing direct hook message')
          handleNewLogEntry(message)
        } else {
          console.log('⚠️ Unknown message format, ignoring:', message)
        }
      } catch (error) {
        console.error('💥 Error parsing WebSocket message:', error)
      }
    }
    
    ws.onclose = (event) => {
      console.log('❌ WebSocket disconnected. Code:', event.code, 'Reason:', event.reason)
    }
    
    ws.onerror = (error) => {
      console.error('💥 WebSocket error:', error)
      console.error('Failed to connect to:', wsUrl)
    }
    
    return () => {
      console.log('🔌 Closing WebSocket connection')
      ws.close()
    }
  }

  const playSound = async (filename) => {
    console.log('🎵 PLAY SOUND - Attempting to play sound file:', filename)
    console.log('🎵 PLAY SOUND - Sound URL will be:', `/api/sounds/play/${filename}`)
    try {
      const audio = new Audio(`/api/sounds/play/${filename}`)
      console.log('🎵 PLAY SOUND - Audio object created successfully')
      
      audio.addEventListener('loadstart', () => console.log('🎵 AUDIO EVENT - loadstart'))
      audio.addEventListener('loadeddata', () => console.log('🎵 AUDIO EVENT - loadeddata'))
      audio.addEventListener('canplay', () => console.log('🎵 AUDIO EVENT - canplay'))
      audio.addEventListener('play', () => console.log('🎵 AUDIO EVENT - play started'))
      audio.addEventListener('error', (e) => console.error('🎵 AUDIO ERROR:', e.error))
      
      console.log('🎵 PLAY SOUND - Calling audio.play()...')
      await audio.play()
      console.log('✅ PLAY SOUND - Sound played successfully!')
    } catch (error) {
      console.error('❌ PLAY SOUND - Failed to play sound:', error)
      console.error('❌ PLAY SOUND - Error details:', error.message)
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
    console.log('🎯 HANDLE LOG ENTRY - New log entry received:', log)
    console.log('🎯 HANDLE LOG ENTRY - Current hook config state:', hookConfig)
    console.log('🎯 HANDLE LOG ENTRY - Current hook config ref:', hookConfigRef.current)
    console.log('🎯 HANDLE LOG ENTRY - Available hook types in config:', Object.keys(hookConfigRef.current))
    console.log('🎯 HANDLE LOG ENTRY - Looking for config for hook type:', log.hook_type)
    
    // Check if this hook type has sound configured
    const config = hookConfigRef.current[log.hook_type]
    console.log(`🎯 HANDLE LOG ENTRY - Config for hook type "${log.hook_type}":`, config)
    
    if (config && config.enabled && config.sound) {
      console.log('✅ HANDLE LOG ENTRY - Sound is configured and enabled, playing:', config.sound)
      playSound(config.sound)
    } else {
      console.log('❌ HANDLE LOG ENTRY - No sound configured or hook disabled')
      if (!config) {
        console.log('   - No config found for hook type:', log.hook_type)
      } else if (!config.enabled) {
        console.log('   - Hook type is disabled')
      } else if (!config.sound) {
        console.log('   - No sound file assigned to hook type')
      }
    }
    
    // Check if notifications are enabled for this hook type
    if (config && config.enabled && config.notifications) {
      console.log('🔔 HANDLE LOG ENTRY - Showing notification for hook type:', log.hook_type)
      ensureNotificationPermission().then(() => {
        showNotification(`Hook Triggered: ${log.hook_type}`, {
          body: `Tool: ${log.tool_name || 'N/A'}\nMessage: ${log.message || 'N/A'}`,
          icon: '/favicon.ico'
        })
      })
    } else {
      console.log('🔕 HANDLE LOG ENTRY - No notifications configured or hook disabled for:', log.hook_type)
    }

    // Pass the log entry to EventLogger if it's active
    console.log('📋 HANDLE LOG ENTRY - Passing to EventLogger component')
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
          <EventLogger newLogEntry={newLogEntry} />
        )}
      </main>
    </div>
  )
}

export default App