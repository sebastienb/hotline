import { useState } from 'react'
import { useNotifications } from '../hooks/useNotifications'

export default function NotificationSettings() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { supported, permission, requestPermission, showNotification, canNotify } = useNotifications()

  const testNotification = async () => {
    // Ensure permission is granted first
    if (permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) {
        return
      }
    }
    
    showNotification('🔥 Hotline Test', {
      body: 'This is a test notification from Hotline!',
      tag: 'hotline-test'
    })
  }

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { text: 'Granted', color: 'text-green-600 dark:text-monokai-green bg-green-100 dark:bg-monokai-green/20' }
      case 'denied':
        return { text: 'Denied', color: 'text-red-600 dark:text-monokai-pink bg-red-100 dark:bg-monokai-pink/20' }
      case 'default':
        return { text: 'Not requested', color: 'text-yellow-600 dark:text-monokai-yellow bg-yellow-100 dark:bg-monokai-yellow/20' }
      default:
        return { text: 'Unknown', color: 'text-gray-600 dark:text-monokai-textMuted bg-gray-100 dark:bg-monokai-textMuted/20' }
    }
  }

  if (!supported) {
    return (
      <div className="bg-red-50 dark:bg-monokai-pink/10 border border-red-200 dark:border-monokai-pink/30 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400 dark:text-monokai-pink text-xl mr-3">⚠️</div>
          <div>
            <h3 className="font-medium text-red-800 dark:text-monokai-pink">Notifications Not Supported</h3>
            <p className="text-red-600 dark:text-monokai-pink/80 text-sm mt-1">
              Your browser doesn't support native notifications. Consider updating your browser.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const status = getPermissionStatus()

  return (
    <div className="bg-white dark:bg-monokai-bgLight border border-gray-200 dark:border-monokai-border rounded-lg p-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="font-medium text-gray-900 dark:text-monokai-text flex items-center">
            Browser Notifications
            <span className="ml-2 text-gray-400 dark:text-monokai-textMuted transform transition-transform duration-200">
              {isExpanded ? '▼' : '▶'}
            </span>
          </h3>
          <p className="text-sm text-gray-600 dark:text-monokai-textMuted">
            Get desktop notifications when hooks trigger
          </p>
        </div>
        
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
          {status.text}
        </span>
      </div>

      {isExpanded && (
        <div className="mt-4 border-t pt-4 animate-in slide-in-from-top-2 duration-200">{/* Content container */}

      <div className="space-y-3">
        {permission !== 'granted' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={requestPermission}
              className="px-4 py-2 bg-blue-600 dark:bg-monokai-cyan text-white dark:text-monokai-bg rounded-md hover:bg-blue-700 dark:hover:bg-monokai-cyan/80 text-sm transition-colors"
            >
              Request Permission
            </button>
            
            {permission === 'denied' && (
              <p className="text-sm text-red-600 dark:text-monokai-pink">
                Notifications were denied. Please enable them in your browser settings.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center space-x-3">
          <button
            onClick={testNotification}
            className="px-4 py-2 bg-green-600 dark:bg-monokai-green text-white dark:text-monokai-bg rounded-md hover:bg-green-700 dark:hover:bg-monokai-green/80 text-sm transition-colors"
          >
            Test Notification
          </button>
          
          {canNotify && (
            <p className="text-sm text-green-600 dark:text-monokai-green">
              Notifications are enabled and working!
            </p>
          )}
          
          {!canNotify && (
            <p className="text-sm text-gray-600 dark:text-monokai-textMuted">
              Click to test (will request permission if needed)
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-monokai-bg rounded-md border border-gray-200 dark:border-monokai-border">
        <h4 className="font-medium text-sm text-gray-900 dark:text-monokai-text mb-2">How it works:</h4>
        <ul className="text-sm text-gray-600 dark:text-monokai-textMuted space-y-1">
          <li>• Notifications appear when configured hooks trigger</li>
          <li>• Shows hook type and tool name in the notification</li>
          <li>• Automatically closes after 5 seconds</li>
          <li>• Falls back to browser alerts if notifications fail</li>
        </ul>
      </div>
        </div>
      )}
    </div>
  )
}