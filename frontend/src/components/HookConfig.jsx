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
        // Migrate old sound format to new sounds array format and support multiple configurations
        const migratedConfig = {}
        Object.entries(uiConfigData).forEach(([hookType, settings]) => {
          // If it's already an array (multiple configurations), keep it
          if (Array.isArray(settings)) {
            migratedConfig[hookType] = settings.map(config => ({
              ...config,
              sounds: config.sounds || (config.sound ? [config.sound, '', ''] : ['', '', ''])
            }))
          } else {
            // Single configuration - convert to array
            migratedConfig[hookType] = [{
              ...settings,
              sounds: settings.sounds || (settings.sound ? [settings.sound, '', ''] : ['', '', ''])
            }]
          }
          // Remove old sound property if it exists
          migratedConfig[hookType].forEach(config => delete config.sound)
        })
        setConfig(migratedConfig)
      } else {
        // Convert to UI format for initial setup
        const uiConfig = {}
        HOOK_TYPES.forEach(hookType => {
          uiConfig[hookType] = [{
            enabled: !!hooksData[hookType],
            sounds: ['', '', ''],
            notifications: false,
            timeout: 60,
            matcher: ''
          }]
          
          if (hooksData[hookType] && hooksData[hookType][0]) {
            const hookData = hooksData[hookType][0]
            if (hookData.matcher) {
              uiConfig[hookType][0].matcher = hookData.matcher
            }
          }
        })
        setConfig(uiConfig)
      }
    } catch (error) {
      console.error('Failed to fetch hooks:', error)
    }
  }

  const updateHookConfig = (hookType, configIndex, field, value) => {
    const newConfig = {
      ...config,
      [hookType]: config[hookType].map((hookConfig, index) => 
        index === configIndex ? { ...hookConfig, [field]: value } : hookConfig
      )
    }
    
    setConfig(newConfig)
    
    // Auto-save UI config for notification and sound settings
    if (field === 'notifications' || field === 'sounds') {
      saveUIConfig(newConfig)
    }
  }
  
  const updateHookSound = (hookType, configIndex, soundIndex, value) => {
    const currentConfig = config[hookType][configIndex]
    const newSounds = [...(currentConfig?.sounds || ['', '', ''])]
    newSounds[soundIndex] = value
    updateHookConfig(hookType, configIndex, 'sounds', newSounds)
  }
  
  const addHookConfig = (hookType) => {
    const newConfig = {
      ...config,
      [hookType]: [...(config[hookType] || []), {
        enabled: true,
        sounds: ['', '', ''],
        notifications: false,
        timeout: 60,
        matcher: ''
      }]
    }
    setConfig(newConfig)
    saveUIConfig(newConfig)
  }
  
  const removeHookConfig = (hookType, configIndex) => {
    const newConfig = {
      ...config,
      [hookType]: config[hookType].filter((_, index) => index !== configIndex)
    }
    setConfig(newConfig)
    saveUIConfig(newConfig)
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
    
    Object.entries(config).forEach(([hookType, settingsArray]) => {
      const hookConfigs = []
      
      settingsArray.forEach(settings => {
        if (!settings.enabled) return
        
        const commands = []
        
        // Get the backend URL dynamically
        const backendUrl = window.location.origin
        
        // Only add logging command - sounds will be handled by frontend
        commands.push({
          type: "command", 
          command: `curl -X POST ${backendUrl}/api/logs -H "Content-Type: application/json" -d '{"hookType":"${hookType}","toolName":"'"$TOOL_NAME"'","message":"Hook triggered","sessionId":"'"$session_id"'"}'`,
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
          
          hookConfigs.push(hookConfig)
        }
      })
      
      if (hookConfigs.length > 0) {
        hooksConfig[hookType] = hookConfigs
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
                
                <button
                  onClick={() => addHookConfig(hookType)}
                  className="px-3 py-1 bg-blue-600 dark:bg-monokai-blue text-white dark:text-monokai-bg rounded-md hover:bg-blue-700 dark:hover:bg-monokai-blue/80 text-sm transition-colors"
                >
                  + Add Configuration
                </button>
              </div>
              
              {config[hookType] && config[hookType].length > 0 && (
                <div className="space-y-4">
                  {config[hookType].map((hookConfig, configIndex) => (
                    <div key={configIndex} className="border border-gray-300 dark:border-monokai-border rounded-lg p-4 bg-white dark:bg-monokai-bgDark">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={hookConfig.enabled || false}
                              onChange={(e) => updateHookConfig(hookType, configIndex, 'enabled', e.target.checked)}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700 dark:text-monokai-text font-medium">
                              Configuration {configIndex + 1}
                            </span>
                          </label>
                        </div>
                        
                        {config[hookType].length > 1 && (
                          <button
                            onClick={() => removeHookConfig(hookType, configIndex)}
                            className="px-2 py-1 bg-red-600 dark:bg-monokai-red text-white dark:text-monokai-bg rounded-md hover:bg-red-700 dark:hover:bg-monokai-red/80 text-sm transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      {hookConfig.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(hookType === 'PreToolUse' || hookType === 'PostToolUse') && (
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-monokai-text">Tool Matcher</label>
                      <input
                        type="text"
                        placeholder="e.g., Write, Edit|Write, Bash.*"
                        value={hookConfig.matcher || ''}
                        onChange={(e) => updateHookConfig(hookType, configIndex, 'matcher', e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-monokai-border rounded-md text-sm bg-white dark:bg-monokai-bgDark text-gray-900 dark:text-monokai-text placeholder-gray-500 dark:placeholder-monokai-textMuted focus:ring-2 focus:ring-blue-500 dark:focus:ring-monokai-green focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 dark:text-monokai-textMuted mt-1">Leave empty to match all tools</p>
                    </div>
                  )}
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-monokai-text">Sound Effects (Up to 3, plays randomly)</label>
                    <div className="space-y-2">
                      {[0, 1, 2].map((soundIndex) => (
                        <div key={soundIndex} className="flex space-x-2">
                          <select
                            value={hookConfig.sounds?.[soundIndex] || ''}
                            onChange={(e) => {
                              const newSound = e.target.value
                              updateHookSound(hookType, configIndex, soundIndex, newSound)
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
                          
                          {hookConfig.sounds?.[soundIndex] && (
                            <button
                              onClick={() => previewSound(hookConfig.sounds[soundIndex])}
                              className="px-3 py-2 bg-green-600 dark:bg-monokai-green text-white dark:text-monokai-bg rounded-md hover:bg-green-700 dark:hover:bg-monokai-green/80 text-sm flex items-center transition-colors"
                              title="Preview sound"
                            >
                              🔊
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={hookConfig.notifications || false}
                        onChange={(e) => updateHookConfig(hookType, configIndex, 'notifications', e.target.checked)}
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
                      value={hookConfig.timeout || 60}
                      onChange={(e) => updateHookConfig(hookType, configIndex, 'timeout', parseInt(e.target.value))}
                      className="w-full p-2 border rounded-md text-sm"
                    />
                  </div>
                </div>
                      )}
                    </div>
                  ))}
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