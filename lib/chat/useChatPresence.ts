'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseChatPresenceOptions {
  userId: string
  userName: string
}

export function useChatPresence({ userId, userName }: UseChatPresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, { userName: string; lastSeen: string }>>(new Map())
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const channel = supabase.channel('presence:chat-global', {
      config: { presence: { key: userId } },
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const users = new Map<string, { userName: string; lastSeen: string }>()
      for (const [key, presences] of Object.entries(state)) {
        if (key === userId) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const latest = (presences as any[])[0]
        if (latest) {
          users.set(key, {
            userName: latest.userName ?? 'User',
            lastSeen: latest.lastSeen ?? new Date().toISOString(),
          })
        }
      }
      setOnlineUsers(users)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId,
          userName,
          lastSeen: new Date().toISOString(),
          online: true,
        })
      }
    })

    channelRef.current = channel

    // Handle visibility changes
    const handleVisibility = () => {
      if (document.hidden) {
        channel.untrack()
      } else {
        channel.track({
          userId,
          userName,
          lastSeen: new Date().toISOString(),
          online: true,
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [userId, userName])

  const isUserOnline = useCallback((targetUserId: string): boolean => {
    return onlineUsers.has(targetUserId)
  }, [onlineUsers])

  const getLastSeen = useCallback((targetUserId: string): string | null => {
    return onlineUsers.get(targetUserId)?.lastSeen ?? null
  }, [onlineUsers])

  return { onlineUsers, isUserOnline, getLastSeen }
}
