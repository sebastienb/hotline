import { useNotifications } from '../hooks/useNotifications'

export default function NotificationSettings() {
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
        return { text: 'Granted', color: 'text-green-600 bg-green-100' }
      case 'denied':
        return { text: 'Denied', color: 'text-red-600 bg-red-100' }
      case 'default':
        return { text: 'Not requested', color: 'text-yellow-600 bg-yellow-100' }
      default:
        return { text: 'Unknown', color: 'text-gray-600 bg-gray-100' }
    }
  }

  if (!supported) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400 text-xl mr-3">⚠️</div>
          <div>
            <h3 className="font-medium text-red-800">Notifications Not Supported</h3>
            <p className="text-red-600 text-sm mt-1">
              Your browser doesn't support native notifications. Consider updating your browser.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const status = getPermissionStatus()

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-gray-900">Browser Notifications</h3>
          <p className="text-sm text-gray-600">
            Get desktop notifications when hooks trigger
          </p>
        </div>
        
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
          {status.text}
        </span>
      </div>

      <div className="space-y-3">
        {permission !== 'granted' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={requestPermission}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Request Permission
            </button>
            
            {permission === 'denied' && (
              <p className="text-sm text-red-600">
                Notifications were denied. Please enable them in your browser settings.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center space-x-3">
          <button
            onClick={testNotification}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            Test Notification
          </button>
          
          {canNotify && (
            <p className="text-sm text-green-600">
              Notifications are enabled and working!
            </p>
          )}
          
          {!canNotify && (
            <p className="text-sm text-gray-600">
              Click to test (will request permission if needed)
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <h4 className="font-medium text-sm text-gray-900 mb-2">How it works:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Notifications appear when configured hooks trigger</li>
          <li>• Shows hook type and tool name in the notification</li>
          <li>• Automatically closes after 5 seconds</li>
          <li>• Falls back to browser alerts if notifications fail</li>
        </ul>
      </div>
    </div>
  )
}