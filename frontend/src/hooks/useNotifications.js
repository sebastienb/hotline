import { useState, useEffect } from 'react'

export function useNotifications() {
  const [permission, setPermission] = useState(Notification.permission)
  const [supported, setSupported] = useState('Notification' in window)

  useEffect(() => {
    if (!supported) return
    
    setPermission(Notification.permission)
  }, [supported])

  const requestPermission = async () => {
    if (!supported) {
      alert('Browser notifications are not supported in this browser')
      return false
    }

    if (permission === 'granted') {
      return true
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return false
    }
  }

  const showNotification = (title, options = {}) => {
    if (!supported || permission !== 'granted') {
      console.warn('Notifications not available, falling back to alert')
      alert(`${title}\n${options.body || ''}`)
      return null
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      })

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close()
      }, 5000)

      return notification
    } catch (error) {
      console.error('Failed to show notification:', error)
      alert(`${title}\n${options.body || ''}`)
      return null
    }
  }

  return {
    supported,
    permission,
    requestPermission,
    showNotification,
    canNotify: permission === 'granted'
  }
}