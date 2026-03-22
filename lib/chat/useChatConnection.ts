'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

interface QueuedMessage {
  conversationId: string
  content: string
  timestamp: string
}

interface UseChatConnectionOptions {
  userId: string
}

export function useChatConnection({ userId }: UseChatConnectionOptions) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const messageQueue = useRef<QueuedMessage[]>([])
  const lastMessageTimestamp = useRef<string | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  // Track connection health via a heartbeat channel
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const channel = supabase.channel(`connection-health-${userId}-${Date.now()}`)

    channel
      .on('system' as Parameters<typeof channel.on>[0], {} as Parameters<typeof channel.on>[1], (payload: { extension: string; status: string }) => {
        if (payload.status === 'ok') {
          setConnectionStatus('connected')
        } else if (payload.status === 'error') {
          setConnectionStatus('disconnected')
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected')
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('reconnecting')
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected')
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Queue a message when offline
  const queueMessage = useCallback((conversationId: string, content: string) => {
    messageQueue.current.push({
      conversationId,
      content,
      timestamp: new Date().toISOString(),
    })
  }, [])

  // Get and clear queued messages
  const flushQueue = useCallback((): QueuedMessage[] => {
    const queued = [...messageQueue.current]
    messageQueue.current = []
    return queued
  }, [])

  // Update last known message timestamp (for gap recovery)
  const updateLastMessageTimestamp = useCallback((timestamp: string) => {
    if (!lastMessageTimestamp.current || timestamp > lastMessageTimestamp.current) {
      lastMessageTimestamp.current = timestamp
    }
  }, [])

  const getLastMessageTimestamp = useCallback(() => {
    return lastMessageTimestamp.current
  }, [])

  return {
    connectionStatus,
    queueMessage,
    flushQueue,
    updateLastMessageTimestamp,
    getLastMessageTimestamp,
    isConnected: connectionStatus === 'connected',
  }
}
