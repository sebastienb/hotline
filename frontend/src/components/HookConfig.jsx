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
      const response = await fetch('/api/hooks')
      const data = await response.json()
      setHooks(data)
      
      // Convert to UI format
      const uiConfig = {}
      HOOK_TYPES.forEach(hookType => {
        uiConfig[hookType] = {
          enabled: !!data[hookType],
          sound: '',
          notifications: false,
          timeout: 60,
          matcher: ''
        }
        
        if (data[hookType] && data[hookType][0]) {
          const hookData = data[hookType][0]
          if (hookData.matcher) {
            uiConfig[hookType].matcher = hookData.matcher
          }
          // Extract sound and notification settings from command
          // This is a simplified approach - in reality you'd parse the command
        }
      })
      setConfig(uiConfig)
    } catch (error) {
      console.error('Failed to fetch hooks:', error)
    }
  }

  const updateHookConfig = (hookType, field, value) => {
    setConfig(prev => ({
      ...prev,
      [hookType]: {
        ...prev[hookType],
        [field]: value
      }
    }))
  }

  const generateHooksConfig = () => {
    const hooksConfig = {}
    
    Object.entries(config).forEach(([hookType, settings]) => {
      if (!settings.enabled) return
      
      const commands = []
      
      // Get the backend URL dynamically
      const backendUrl = window.location.origin
      
      // Add sound command if sound is selected
      if (settings.sound) {
        commands.push({
          type: "command",
          command: `curl -s ${backendUrl}/api/sounds/play/${settings.sound} | aplay -q || afplay /dev/stdin 2>/dev/null`,
          timeout: 5
        })
      }
      
      // Add notification command if enabled
      if (settings.notifications) {
        commands.push({
          type: "command", 
          command: `curl -X POST ${backendUrl}/api/logs -H "Content-Type: application/json" -d '{"hookType":"${hookType}","toolName":"${settings.matcher || 'All'}","message":"Hook triggered","sessionId":"'$session_id'"}'`,
          timeout: 5
        })
      }
      
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
      
      const response = await fetch('/api/hooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hooks: hooksConfig,
          target
        })
      })
      
      if (response.ok) {
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
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Hook Configuration</h2>
        
        <div className="space-y-6">
          {HOOK_TYPES.map(hookType => (
            <div key={hookType} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-lg">{hookType}</h3>
                  <p className="text-sm text-gray-600">
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
                  <span className="text-sm">Enable</span>
                </label>
              </div>
              
              {config[hookType]?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(hookType === 'PreToolUse' || hookType === 'PostToolUse') && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Tool Matcher</label>
                      <input
                        type="text"
                        placeholder="e.g., Write, Edit|Write, Bash.*"
                        value={config[hookType]?.matcher || ''}
                        onChange={(e) => updateHookConfig(hookType, 'matcher', e.target.value)}
                        className="w-full p-2 border rounded-md text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty to match all tools</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Sound Effect</label>
                    <select
                      value={config[hookType]?.sound || ''}
                      onChange={(e) => updateHookConfig(hookType, 'sound', e.target.value)}
                      className="w-full p-2 border rounded-md text-sm"
                    >
                      <option value="">No sound</option>
                      {sounds.map(sound => (
                        <option key={sound.filename} value={sound.filename}>
                          {sound.filename}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config[hookType]?.notifications || false}
                        onChange={(e) => updateHookConfig(hookType, 'notifications', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">Browser Notifications</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Timeout (seconds)</label>
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
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {showPreview ? 'Hide' : 'Show'} JSON Preview
          </button>
          
          <button
            onClick={() => saveConfig('global')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save to Global (~/.claude/settings.json)
          </button>
          
          <button
            onClick={() => saveConfig('project')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Save to Project (.claude/settings.json)
          </button>
        </div>
        
        {showPreview && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Generated Configuration</h3>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify({ hooks: previewConfig }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}