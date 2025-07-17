import { useState, useEffect } from 'react'
import { useNotifications } from '../hooks/useNotifications'

export default function EventLogger({ newLogEntry }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    hookType: '',
    sessionId: '',
    keyword: ''
  })
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    hasMore: true
  })
  const { showNotification } = useNotifications()

  useEffect(() => {
    fetchLogs(true) // Reset on mount
  }, [])

  useEffect(() => {
    if (newLogEntry) {
      setLogs(prev => [newLogEntry, ...prev])
    }
  }, [newLogEntry])

  useEffect(() => {
    fetchLogs(true) // Reset when filters change
  }, [filters])

  const fetchLogs = async (reset = false) => {
    setLoading(true)
    
    try {
      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: reset ? 0 : pagination.offset,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value)
        )
      })
      
      const response = await fetch(`/api/logs?${params}`)
      const data = await response.json()
      
      if (reset) {
        setLogs(data)
        setPagination(prev => ({ ...prev, offset: data.length, hasMore: data.length >= prev.limit }))
      } else {
        setLogs(prev => [...prev, ...data])
        setPagination(prev => ({ 
          ...prev, 
          offset: prev.offset + data.length,
          hasMore: data.length >= prev.limit
        }))
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (!loading && pagination.hasMore) {
      fetchLogs(false)
    }
  }

  const testSound = async () => {
    console.log('🔊 Test Sound Button clicked - sending request to backend...')
    try {
      const response = await fetch('/api/test-hook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      console.log('📡 Backend response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Test hook triggered successfully, response data:', data)
        console.log('⏰ Waiting for WebSocket message and sound to play...')
      } else {
        console.error('❌ Failed to trigger test hook, status:', response.status)
        const errorText = await response.text()
        console.error('Error details:', errorText)
      }
    } catch (error) {
      console.error('💥 Error triggering test hook:', error)
    }
  }

  const clearLogs = async () => {
    if (!confirm('Clear all logs? This cannot be undone.')) return
    
    try {
      const response = await fetch('/api/logs', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const result = await response.json()
        setLogs([])
        setPagination({ limit: 50, offset: 0, hasMore: true })
        console.log(`Cleared ${result.deletedCount} log entries`)
      } else {
        throw new Error('Failed to clear logs')
      }
    } catch (error) {
      console.error('Failed to clear logs:', error)
      alert('Failed to clear logs. Please try again.')
    }
  }

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Hook Type', 'Tool Name', 'Session ID', 'Message'],
      ...logs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.hook_type || '',
        log.tool_name || '',
        log.session_id || '',
        log.message || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hotline-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getHookIcon = (hookType) => {
    switch (hookType) {
      case 'PreToolUse': return '⚡'
      case 'PostToolUse': return '✅'
      case 'Notification': return '🔔'
      case 'Stop': return '🛑'
      case 'SubagentStop': return '🔀'
      case 'PreCompact': return '📦'
      default: return '📝'
    }
  }

  const getHookColor = (hookType) => {
    switch (hookType) {
      case 'PreToolUse': return 'text-blue-600 dark:text-monokai-cyan bg-blue-100 dark:bg-monokai-cyan/20'
      case 'PostToolUse': return 'text-green-600 dark:text-monokai-green bg-green-100 dark:bg-monokai-green/20'
      case 'Notification': return 'text-yellow-600 dark:text-monokai-yellow bg-yellow-100 dark:bg-monokai-yellow/20'
      case 'Stop': return 'text-red-600 dark:text-monokai-pink bg-red-100 dark:bg-monokai-pink/20'
      case 'SubagentStop': return 'text-purple-600 dark:text-monokai-purple bg-purple-100 dark:bg-monokai-purple/20'
      case 'PreCompact': return 'text-gray-600 dark:text-monokai-textMuted bg-gray-100 dark:bg-monokai-textMuted/20'
      default: return 'text-gray-600 dark:text-monokai-textMuted bg-gray-100 dark:bg-monokai-textMuted/20'
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-monokai-bgLight rounded-lg shadow dark:shadow-monokai-border/20 p-6 border border-gray-200 dark:border-monokai-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-monokai-text">Event Logger</h2>
            <div className="flex items-center space-x-2 px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-monokai-green/20 text-green-800 dark:text-monokai-green">
              <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-monokai-green"></div>
              <span>Real-time</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={exportLogs}
              disabled={logs.length === 0}
              className="px-3 py-2 text-sm bg-blue-600 dark:bg-monokai-cyan text-white dark:text-monokai-bg rounded-md hover:bg-blue-700 dark:hover:bg-monokai-cyan/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              📊 Export CSV
            </button>
            
            <button
              onClick={testSound}
              className="px-3 py-2 text-sm bg-green-600 dark:bg-monokai-green text-white dark:text-monokai-bg rounded-md hover:bg-green-700 dark:hover:bg-monokai-green/80 transition-colors"
            >
              🔊 Test Sound
            </button>
            
            <button
              onClick={clearLogs}
              disabled={logs.length === 0}
              className="px-3 py-2 text-sm bg-red-600 dark:bg-monokai-pink text-white dark:text-monokai-bg rounded-md hover:bg-red-700 dark:hover:bg-monokai-pink/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              🗑️ Clear Logs
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-monokai-text">Hook Type</label>
            <select
              value={filters.hookType}
              onChange={(e) => setFilters(prev => ({ ...prev, hookType: e.target.value }))}
              className="w-full p-2 border border-gray-300 dark:border-monokai-border rounded-md text-sm bg-white dark:bg-monokai-bgDark text-gray-900 dark:text-monokai-text placeholder-gray-500 dark:placeholder-monokai-textMuted focus:ring-2 focus:ring-blue-500 dark:focus:ring-monokai-green focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="PreToolUse">PreToolUse</option>
              <option value="PostToolUse">PostToolUse</option>
              <option value="Notification">Notification</option>
              <option value="Stop">Stop</option>
              <option value="SubagentStop">SubagentStop</option>
              <option value="PreCompact">PreCompact</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-monokai-text">Session ID</label>
            <input
              type="text"
              placeholder="Filter by session..."
              value={filters.sessionId}
              onChange={(e) => setFilters(prev => ({ ...prev, sessionId: e.target.value }))}
              className="w-full p-2 border border-gray-300 dark:border-monokai-border rounded-md text-sm bg-white dark:bg-monokai-bgDark text-gray-900 dark:text-monokai-text placeholder-gray-500 dark:placeholder-monokai-textMuted focus:ring-2 focus:ring-blue-500 dark:focus:ring-monokai-green focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-monokai-text">Keyword</label>
            <input
              type="text"
              placeholder="Search message or tool..."
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              className="w-full p-2 border border-gray-300 dark:border-monokai-border rounded-md text-sm bg-white dark:bg-monokai-bgDark text-gray-900 dark:text-monokai-text placeholder-gray-500 dark:placeholder-monokai-textMuted focus:ring-2 focus:ring-blue-500 dark:focus:ring-monokai-green focus:border-transparent"
            />
          </div>
        </div>
        
        {/* Logs Table */}
        <div className="border border-gray-200 dark:border-monokai-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-monokai-bg">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-monokai-textMuted uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-monokai-textMuted uppercase tracking-wider">
                    Hook Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-monokai-textMuted uppercase tracking-wider">
                    Tool Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-monokai-textMuted uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-monokai-textMuted uppercase tracking-wider">
                    Session
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-monokai-bgLight divide-y divide-gray-200 dark:divide-monokai-border">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-monokai-textMuted">
                      <div className="text-2xl mb-2">📝</div>
                      <p>No log entries found</p>
                      <p className="text-sm">Hook events will appear here when they occur</p>
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-monokai-hover transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-monokai-text">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getHookColor(log.hook_type)}`}>
                          <span className="mr-1">{getHookIcon(log.hook_type)}</span>
                          {log.hook_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-monokai-text">
                        <code className="bg-gray-100 dark:bg-monokai-bgDark px-2 py-1 rounded text-xs text-gray-800 dark:text-monokai-orange">
                          {log.tool_name || '-'}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-monokai-text max-w-xs truncate">
                        {log.message || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-monokai-textMuted font-mono">
                        {log.session_id ? log.session_id.substring(0, 8) + '...' : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Load More */}
        {pagination.hasMore && (
          <div className="text-center mt-4">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-4 py-2 text-sm bg-gray-600 dark:bg-monokai-textMuted text-white dark:text-monokai-text rounded-md hover:bg-gray-700 dark:hover:bg-monokai-textMuted/80 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
        
        {/* Stats */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-monokai-bg rounded-lg border border-gray-200 dark:border-monokai-border">
          <h4 className="font-medium text-sm mb-2 text-gray-900 dark:text-monokai-text">Log Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-monokai-textMuted">Total Entries:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-monokai-text">{logs.length}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-monokai-textMuted">Database:</span>
              <span className="ml-2 font-mono text-xs bg-gray-200 dark:bg-monokai-bgDark px-1 rounded text-gray-800 dark:text-monokai-orange">~/.hotline/hooks.db</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}