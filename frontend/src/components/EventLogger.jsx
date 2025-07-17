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
      // Note: This would need a DELETE endpoint in the backend
      alert('Clear logs functionality would need to be implemented in the backend')
    } catch (error) {
      console.error('Failed to clear logs:', error)
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
      case 'PreToolUse': return 'text-blue-600 bg-blue-100'
      case 'PostToolUse': return 'text-green-600 bg-green-100'
      case 'Notification': return 'text-yellow-600 bg-yellow-100'
      case 'Stop': return 'text-red-600 bg-red-100'
      case 'SubagentStop': return 'text-purple-600 bg-purple-100'
      case 'PreCompact': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold">Event Logger</h2>
            <div className="flex items-center space-x-2 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Real-time</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={exportLogs}
              disabled={logs.length === 0}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📊 Export CSV
            </button>
            
            <button
              onClick={testSound}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              🔊 Test Sound
            </button>
            
            <button
              onClick={clearLogs}
              disabled={logs.length === 0}
              className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗑️ Clear Logs
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Hook Type</label>
            <select
              value={filters.hookType}
              onChange={(e) => setFilters(prev => ({ ...prev, hookType: e.target.value }))}
              className="w-full p-2 border rounded-md text-sm"
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
            <label className="block text-sm font-medium mb-1">Session ID</label>
            <input
              type="text"
              placeholder="Filter by session..."
              value={filters.sessionId}
              onChange={(e) => setFilters(prev => ({ ...prev, sessionId: e.target.value }))}
              className="w-full p-2 border rounded-md text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Keyword</label>
            <input
              type="text"
              placeholder="Search message or tool..."
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              className="w-full p-2 border rounded-md text-sm"
            />
          </div>
        </div>
        
        {/* Logs Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hook Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tool Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                      <div className="text-2xl mb-2">📝</div>
                      <p>No log entries found</p>
                      <p className="text-sm">Hook events will appear here when they occur</p>
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getHookColor(log.hook_type)}`}>
                          <span className="mr-1">{getHookIcon(log.hook_type)}</span>
                          {log.hook_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {log.tool_name || '-'}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {log.message || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">
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
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
        
        {/* Stats */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Log Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Entries:</span>
              <span className="ml-2 font-medium">{logs.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Database:</span>
              <span className="ml-2 font-mono text-xs">~/.hotline/hooks.db</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}