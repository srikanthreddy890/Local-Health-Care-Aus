'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseChatNotificationsOptions {
  enabled?: boolean
}

export function useChatNotifications({ enabled = true }: UseChatNotificationsOptions = {}) {
  const permissionRef = useRef<NotificationPermission>('default')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio and request notification permission
  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    // Pre-load notification sound
    try {
      audioRef.current = new Audio('/sounds/notification.wav')
      audioRef.current.volume = 0.3
    } catch {
      // Audio not supported
    }

    // Check/update permission
    if ('Notification' in window) {
      permissionRef.current = Notification.permission
    }
  }, [enabled])

  // Request permission (should be called from a user gesture)
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted'
      return
    }
    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission()
      permissionRef.current = result
    }
  }, [])

  // Show notification for a new message (HIPAA: no message content)
  const notifyNewMessage = useCallback((senderName: string) => {
    if (!enabled) return
    if (typeof document === 'undefined') return

    // Play sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }

    // Show browser notification only if tab is hidden
    if (!document.hidden) return
    if (permissionRef.current !== 'granted') {
      // Try requesting on first hidden notification
      requestPermission()
      return
    }

    try {
      const notification = new Notification('New message', {
        body: `${senderName} sent you a message`,
        icon: '/favicon.ico',
        tag: 'chat-message', // Collapse multiple notifications
      })
      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000)
      // Focus the tab on click
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    } catch {
      // Notifications not supported
    }
  }, [enabled, requestPermission])

  return { notifyNewMessage, requestPermission }
}
