import { useState, useEffect } from 'react'
import NotificationSettings from './NotificationSettings'

const HOOK_TYPES = [
  'PreToolUse',
  'PostToolUse', 
  'Notification',
  'Stop',
  'SubagentStop',
  'PreCompact'
]

export default function HookConfig({ sounds }) {
  const [hooks, setHooks] = useState({})
  const [config, setConfig] = useState({})
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    fetchHooks()
  }, [])

  const fetchHooks = async () => {
    try {
      const [hooksResponse, uiConfigResponse] = await Promise.all([
        fetch('/api/hooks'),
        fetch('/api/hook-ui-config')
      ])
      
      const hooksData = await hooksResponse.json()
      const uiConfigData = uiConfigResponse.ok ? await uiConfigResponse.json() : {}
      
      setHooks(hooksData)
      
      // Use saved UI config or create default
      if (Object.keys(uiConfigData).length > 0) {
        setConfig(uiConfigData)
      } else {
        // Convert to UI format for initial setup
        const uiConfig = {}
        HOOK_TYPES.forEach(hookType => {
          uiConfig[hookType] = {
            enabled: !!hooksData[hookType],
            sound: '',
            notifications: false,
            timeout: 60,
            matcher: ''
          }
          
          if (hooksData[hookType] && hooksData[hookType][0]) {
            const hookData = hooksData[hookType][0]
            if (hookData.matcher) {
              uiConfig[hookType].matcher = hookData.matcher
            }
          }
        })
        setConfig(uiConfig)
      }
    } catch (error) {
      console.error('Failed to fetch hooks:', error)
    }
  }

  const updateHookConfig = (hookType, field, value) => {
    const newConfig = {
      ...config,
      [hookType]: {
        ...config[hookType],
        [field]: value
      }
    }
    
    setConfig(newConfig)
    
    // Auto-save UI config for notification and sound settings
    if (field === 'notifications' || field === 'sound') {
      saveUIConfig(newConfig)
    }
  }
  
  const saveUIConfig = async (configToSave = config) => {
    try {
      await fetch('/api/hook-ui-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configToSave)
      })
    } catch (error) {
      console.error('Failed to save UI config:', error)
    }
  }

  const previewSound = async (filename) => {
    if (!filename) return
    
    try {
      const audio = new Audio(`/api/sounds/play/${filename}`)
      await audio.play()
    } catch (error) {
      console.error('Failed to preview sound:', error)
    }
  }

  const generateHooksConfig = () => {
    const hooksConfig = {}
    
    Object.entries(config).forEach(([hookType, settings]) => {
      if (!settings.enabled) return
      
      const commands = []
      
      // Get the backend URL dynamically
      const backendUrl = window.location.origin
      
      // Only add logging command - sounds will be handled by frontend
      commands.push({
        type: "command", 
        command: `curl -X POST ${backendUrl}/api/logs -H "Content-Type: application/json" -d '{"hookType":"${hookType}","toolName":"${settings.matcher || 'All'}","message":"Hook triggered","sessionId":"'$session_id'"}'`,
        timeout: 5
      })
      
      if (commands.length > 0) {
        const hookConfig = {
          hooks: commands
        }
        
        // Add matcher for PreToolUse and PostToolUse
        if ((hookType === 'PreToolUse' || hookType === 'PostToolUse') && settings.matcher) {
          hookConfig.matcher = settings.matcher
        }
        
        hooksConfig[hookType] = [hookConfig]
      }
    })
    
    return hooksConfig
  }

  const saveConfig = async (target = 'global') => {
    try {
      const hooksConfig = generateHooksConfig()
      
      // Save Claude hooks configuration
      const hooksResponse = await fetch('/api/hooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hooks: hooksConfig,
          target
        })
      })
      
      // Save UI configuration for frontend sound/notification handling
      const uiConfigResponse = await fetch('/api/hook-ui-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })
      
      if (hooksResponse.ok && uiConfigResponse.ok) {
        alert(`Configuration saved to ${target} settings!`)
        await fetchHooks()
      } else {
        throw new Error('Failed to save configuration')
      }
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Failed to save configuration')
    }
  }

  const previewConfig = generateHooksConfig()

  return (
    <div className="space-y-6">
      <NotificationSettings />
      
      <div className="bg-white dark:bg-monokai-bgLight rounded-lg shadow dark:shadow-monokai-border/20 p-6 border border-gray-200 dark:border-monokai-border">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-monokai-text">Hook Configuration</h2>
        
        <div className="space-y-6">
          {HOOK_TYPES.map(hookType => (
            <div key={hookType} className="border border-gray-200 dark:border-monokai-border rounded-lg p-4 bg-gray-50 dark:bg-monokai-bg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-lg text-gray-900 dark:text-monokai-text">{hookType}</h3>
                  <p className="text-sm text-gray-600 dark:text-monokai-textMuted">
                    {hookType === 'PreToolUse' && 'Runs before tool execution'}
                    {hookType === 'PostToolUse' && 'Runs after tool execution'}
                    {hookType === 'Notification' && 'Runs on Claude Code notifications'}
                    {hookType === 'Stop' && 'Runs when Claude stops responding'}
                    {hookType === 'SubagentStop' && 'Runs when subagent stops'}
                    {hookType === 'PreCompact' && 'Runs before context compaction'}
                  </p>
                </div>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config[hookType]?.enabled || false}
                    onChange={(e) => updateHookConfig(hookType, 'enabled', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-monokai-text">Enable</span>
                </label>
              </div>
              
              {config[hookType]?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(hookType === 'PreToolUse' || hookType === 'PostToolUse') && (
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-monokai-text">Tool Matcher</label>
                      <input
                        type="text"
                        placeholder="e.g., Write, Edit|Write, Bash.*"
                        value={config[hookType]?.matcher || ''}
                        onChange={(e) => updateHookConfig(hookType, 'matcher', e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-monokai-border rounded-md text-sm bg-white dark:bg-monokai-bgDark text-gray-900 dark:text-monokai-text placeholder-gray-500 dark:placeholder-monokai-textMuted focus:ring-2 focus:ring-blue-500 dark:focus:ring-monokai-green focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 dark:text-monokai-textMuted mt-1">Leave empty to match all tools</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-monokai-text">Sound Effect</label>
                    <div className="flex space-x-2">
                      <select
                        value={config[hookType]?.sound || ''}
                        onChange={(e) => {
                          const newSound = e.target.value
                          updateHookConfig(hookType, 'sound', newSound)
                          // Preview the sound when selected
                          if (newSound) {
                            previewSound(newSound)
                          }
                        }}
                        className="flex-1 p-2 border border-gray-300 dark:border-monokai-border rounded-md text-sm bg-white dark:bg-monokai-bgDark text-gray-900 dark:text-monokai-text focus:ring-2 focus:ring-blue-500 dark:focus:ring-monokai-green focus:border-transparent"
                      >
                        <option value="">No sound</option>
                        {sounds.map(sound => (
                          <option key={sound.filename} value={sound.filename}>
                            {sound.filename}
                          </option>
                        ))}
                      </select>
                      
                      {config[hookType]?.sound && (
                        <button
                          onClick={() => previewSound(config[hookType].sound)}
                          className="px-3 py-2 bg-green-600 dark:bg-monokai-green text-white dark:text-monokai-bg rounded-md hover:bg-green-700 dark:hover:bg-monokai-green/80 text-sm flex items-center transition-colors"
                          title="Preview sound"
                        >
                          🔊
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config[hookType]?.notifications || false}
                        onChange={(e) => updateHookConfig(hookType, 'notifications', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-monokai-text">Browser Notifications</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-monokai-text">Timeout (seconds)</label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={config[hookType]?.timeout || 60}
                      onChange={(e) => updateHookConfig(hookType, 'timeout', parseInt(e.target.value))}
                      className="w-full p-2 border rounded-md text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 border border-gray-300 dark:border-monokai-border rounded-md hover:bg-gray-50 dark:hover:bg-monokai-hover text-gray-700 dark:text-monokai-text bg-white dark:bg-monokai-bgLight transition-colors"
          >
            {showPreview ? 'Hide' : 'Show'} JSON Preview
          </button>
          
          <button
            onClick={() => saveConfig('global')}
            className="px-4 py-2 bg-blue-600 dark:bg-monokai-cyan text-white dark:text-monokai-bg rounded-md hover:bg-blue-700 dark:hover:bg-monokai-cyan/80 transition-colors"
          >
            Save to Global (~/.claude/settings.json)
          </button>
          
          <button
            onClick={() => saveConfig('project')}
            className="px-4 py-2 bg-green-600 dark:bg-monokai-green text-white dark:text-monokai-bg rounded-md hover:bg-green-700 dark:hover:bg-monokai-green/80 transition-colors"
          >
            Save to Project (.claude/settings.json)
          </button>
        </div>
        
        {showPreview && (
          <div className="mt-4">
            <h3 className="font-medium mb-2 text-gray-900 dark:text-monokai-text">Generated Configuration</h3>
            <pre className="bg-gray-100 dark:bg-monokai-bgDark p-4 rounded-md overflow-auto text-sm text-gray-800 dark:text-monokai-text border border-gray-200 dark:border-monokai-border">
              {JSON.stringify({ hooks: previewConfig }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}