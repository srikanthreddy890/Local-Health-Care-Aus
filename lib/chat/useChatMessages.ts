'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  isCryptoAvailable,
  encryptMessage,
  decryptMessage,
  retrieveKeyFromStorage,
  retrieveKeyFromStorageLegacy,
  fetchDerivedSecret,
  clearDerivedSecretCache,
} from '@/lib/chatEncryption'
import type { DecryptedMessage, MessageAttachment, MessageReaction } from './types'

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

interface UseChatMessagesOptions {
  conversationId: string
  currentUserId: string
  keyUserId: string
  senderType: 'patient' | 'clinic'
  onNewMessage?: (conversationId: string, preview: string) => void
}

interface RawMessageRow {
  id: string
  conversation_id: string
  sender_id: string
  sender_type: string
  content_encrypted: string
  content_iv: string
  is_read: boolean | null
  read_at: string | null
  created_at: string
  status?: string
  delivered_at?: string | null
  edited_at?: string | null
  deleted_at?: string | null
  attachment_url?: string | null
  attachment_type?: string | null
  attachment_name?: string | null
  attachment_size_bytes?: number | null
}

const MSG_SELECT = 'id, conversation_id, sender_id, sender_type, content_encrypted, content_iv, is_read, read_at, created_at, status, delivered_at, edited_at, deleted_at, attachment_url, attachment_type, attachment_name, attachment_size_bytes'

async function decryptOne(
  key: CryptoKey,
  row: RawMessageRow
): Promise<DecryptedMessage> {
  let content: string
  if (row.content_iv === 'plain') {
    content = row.content_encrypted
  } else {
    try {
      content = await decryptMessage(key, row.content_encrypted, row.content_iv)
    } catch {
      content = '[Message could not be decrypted]'
    }
  }
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    sender_type: row.sender_type,
    content: row.deleted_at ? 'This message was deleted' : content,
    is_read: row.is_read,
    read_at: row.read_at,
    created_at: row.created_at,
    status: (row.status as MessageStatus) ?? 'sent',
    delivered_at: row.delivered_at ?? null,
    edited_at: row.edited_at ?? null,
    deleted_at: row.deleted_at ?? null,
    attachment: row.attachment_url ? {
      url: row.attachment_url,
      type: row.attachment_type ?? 'application/octet-stream',
      name: row.attachment_name ?? 'attachment',
      sizeBytes: row.attachment_size_bytes ?? 0,
    } : null,
  }
}

// [Fix 1] Fetch reactions for a batch of message IDs and attach to messages
async function hydrateReactions(messages: DecryptedMessage[]): Promise<DecryptedMessage[]> {
  if (messages.length === 0) return messages
  const ids = messages.map((m) => m.id).filter((id) => !id.startsWith('temp-'))
  if (ids.length === 0) return messages

  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reactions } = await (supabase as any)
    .from('chat_message_reactions')
    .select('message_id, emoji, user_id')
    .in('message_id', ids)

  if (!reactions || reactions.length === 0) return messages

  // Group by message_id → emoji → users
  const reactionMap = new Map<string, MessageReaction[]>()
  for (const r of reactions as { message_id: string; emoji: string; user_id: string }[]) {
    if (!reactionMap.has(r.message_id)) reactionMap.set(r.message_id, [])
    const msgReactions = reactionMap.get(r.message_id)!
    const existing = msgReactions.find((mr) => mr.emoji === r.emoji)
    if (existing) {
      existing.users.push({ userId: r.user_id })
    } else {
      msgReactions.push({ emoji: r.emoji, users: [{ userId: r.user_id }] })
    }
  }

  return messages.map((m) => ({
    ...m,
    reactions: reactionMap.get(m.id) ?? m.reactions,
  }))
}

const PAGE_SIZE = 50

/**
 * Calls the server-side key generation endpoint which generates an AES-256
 * conversation key and wraps it correctly for BOTH participants using each
 * user's own derived secret. Returns the unwrapped CryptoKey for the current user.
 */
async function requestServerKeyGeneration(conversationId: string, keyUserId: string): Promise<CryptoKey> {
  const res = await fetch('/api/chat/generate-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId }),
  })
  if (!res.ok) {
    throw new Error(`Server key generation failed: ${res.status}`)
  }
  const { encryptedKey } = await res.json()
  // Unwrap using the current user's derived secret (fetched from /api/chat/derive-secret)
  return retrieveKeyFromStorage(encryptedKey, keyUserId)
}

export function useChatMessages({
  conversationId,
  currentUserId,
  keyUserId,
  senderType,
  onNewMessage,
}: UseChatMessagesOptions) {
  const [messages, setMessages] = useState<DecryptedMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const keyCache = useRef<{ convId: string; key: CryptoKey } | null>(null)
  const activeConvRef = useRef(conversationId)
  activeConvRef.current = conversationId
  const processedIds = useRef(new Set<string>())
  // [Fix 3] Store broadcast channel ref for reuse in sendMessage
  const broadcastChannelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  // [Fix 5] Ref guard for pagination to prevent double-load
  const loadingMoreRef = useRef(false)
  // [Fix C] Track conversations where key migration already failed to avoid infinite retry
  const migrationFailed = useRef(new Set<string>())

  const getEncryptionKey = useCallback(async (): Promise<CryptoKey> => {
    if (keyCache.current?.convId === conversationId) {
      return keyCache.current.key
    }

    if (!isCryptoAvailable()) throw new Error('Web Crypto API not available')

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: keyRow } = await (supabase as any)
      .from('chat_encryption_keys')
      .select('encrypted_key, key_version')
      .eq('conversation_id', conversationId)
      .eq('user_id', keyUserId)
      .maybeSingle()

    let key: CryptoKey
    if (keyRow?.encrypted_key) {
      const keyVersion = keyRow.key_version ?? 1

      try {
        if (keyVersion >= 2) {
          key = await retrieveKeyFromStorage(keyRow.encrypted_key, keyUserId)
        } else {
          key = await retrieveKeyFromStorageLegacy(keyRow.encrypted_key, keyUserId)
          // Migrate legacy key to v2 format
          if (!migrationFailed.current.has(conversationId)) {
            try {
              const userSecret = await fetchDerivedSecret()
              const { prepareKeyForStorage } = await import('@/lib/chatEncryption')
              const newWrapped = await prepareKeyForStorage(key, keyUserId, userSecret)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase as any)
                .from('chat_encryption_keys')
                .update({ encrypted_key: newWrapped, key_version: 2 })
                .eq('conversation_id', conversationId)
                .eq('user_id', keyUserId)
            } catch {
              migrationFailed.current.add(conversationId)
            }
          }
        }
      } catch {
        // Unwrapping failed — likely stale cached secret. Clear cache and retry.
        clearDerivedSecretCache()
        try {
          key = await retrieveKeyFromStorage(keyRow.encrypted_key, keyUserId)
        } catch {
          // Retry also failed — key is truly broken. Regenerate server-side.
          key = await requestServerKeyGeneration(conversationId, keyUserId)
        }
      }
    } else {
      // No key exists — generate server-side for both participants
      const serverKey = await requestServerKeyGeneration(conversationId, keyUserId)
      key = serverKey
    }

    keyCache.current = { convId: conversationId, key }
    return key
  }, [conversationId, keyUserId])

  const decryptBatch = useCallback(async (data: RawMessageRow[]): Promise<DecryptedMessage[]> => {
    if (!isCryptoAvailable()) {
      return data.map((row) => ({
        ...row,
        content: row.content_iv === 'plain' ? row.content_encrypted : '[Encrypted message]',
        status: (row.status as MessageStatus) ?? 'sent',
        delivered_at: row.delivered_at ?? null,
      }))
    }
    try {
      const key = await getEncryptionKey()
      return await Promise.all(data.map((row) => decryptOne(key, row)))
    } catch {
      return data.map((row) => ({
        ...row,
        content: row.content_iv === 'plain' ? row.content_encrypted : '[Encrypted message]',
        status: (row.status as MessageStatus) ?? 'sent',
        delivered_at: row.delivered_at ?? null,
      }))
    }
  }, [getEncryptionKey])

  // Fetch the most recent PAGE_SIZE messages
  // Tracks last loaded conversation — survives React Strict Mode double-invocation
  const lastLoadedConvRef = useRef<string | null>(null)
  const fetchMessages = useCallback(async () => {
    // Only show loading spinner for a NEW conversation, not re-fetches of the same one
    if (lastLoadedConvRef.current !== conversationId) setIsLoading(true)
    const fetchConvId = conversationId
    processedIds.current.clear()
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('chat_messages')
      .select(MSG_SELECT)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE + 1)

    if (activeConvRef.current !== fetchConvId) return
    if (!data) { setIsLoading(false); return }

    const hasMorePages = data.length > PAGE_SIZE
    const pageData = hasMorePages ? data.slice(0, PAGE_SIZE) : data
    pageData.reverse()

    for (const row of pageData) {
      processedIds.current.add(row.id)
    }

    setHasMore(hasMorePages)
    let decrypted = await decryptBatch(pageData)
    if (activeConvRef.current !== fetchConvId) return
    // [Fix 1] Hydrate reactions
    decrypted = await hydrateReactions(decrypted)
    if (activeConvRef.current !== fetchConvId) return
    setMessages(decrypted)
    setIsLoading(false)
    lastLoadedConvRef.current = conversationId
  }, [conversationId, decryptBatch])

  // [Fix 5] Load older messages with ref guard
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || messages.length === 0) return
    loadingMoreRef.current = true
    setIsLoadingMore(true)

    const oldestTimestamp = messages[0]?.created_at
    if (!oldestTimestamp) {
      loadingMoreRef.current = false
      setIsLoadingMore(false)
      return
    }

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('chat_messages')
      .select(MSG_SELECT)
      .eq('conversation_id', conversationId)
      .lt('created_at', oldestTimestamp)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE + 1)

    if (!data || data.length === 0) {
      setHasMore(false)
      setIsLoadingMore(false)
      loadingMoreRef.current = false
      return
    }

    const hasMorePages = data.length > PAGE_SIZE
    const pageData = hasMorePages ? data.slice(0, PAGE_SIZE) : data
    pageData.reverse()

    for (const row of pageData) {
      processedIds.current.add(row.id)
    }

    setHasMore(hasMorePages)
    let decrypted = await decryptBatch(pageData)
    // [Fix 1] Hydrate reactions for older messages too
    decrypted = await hydrateReactions(decrypted)
    setMessages((prev) => [...decrypted, ...prev])
    setIsLoadingMore(false)
    loadingMoreRef.current = false
  }, [conversationId, messages, hasMore, decryptBatch])

  // Reset key cache and fetch when conversation changes
  useEffect(() => {
    keyCache.current = null
    fetchMessages()
  }, [conversationId, fetchMessages])

  // [Fix 7] Handle incoming message with content-based dedup (no fragile timestamp window)
  const handleIncomingMessage = useCallback(async (row: RawMessageRow) => {
    if (processedIds.current.has(row.id)) return
    processedIds.current.add(row.id)

    let decryptedMsg: DecryptedMessage
    if (!isCryptoAvailable() || row.content_iv === 'plain') {
      decryptedMsg = { ...row, content: row.content_encrypted, status: (row.status as MessageStatus) ?? 'sent', delivered_at: row.delivered_at ?? null }
    } else {
      try {
        const key = await getEncryptionKey()
        decryptedMsg = await decryptOne(key, row)
      } catch {
        decryptedMsg = { ...row, content: '[Encrypted message]', status: (row.status as MessageStatus) ?? 'sent', delivered_at: row.delivered_at ?? null }
      }
    }

    if (onNewMessage) {
      onNewMessage(row.conversation_id, decryptedMsg.content)
    }

    setMessages((prev) => {
      // [Fix 7] Remove optimistic placeholder by matching sender + exact content
      const filtered = prev.filter((m) => {
        if (!m.isOptimistic) return true
        if (m.sender_id !== row.sender_id) return true
        // Match by content equality — much more reliable than timestamp window
        return m.content !== decryptedMsg.content
      })
      if (filtered.some((m) => m.id === row.id)) return filtered
      return [...filtered, decryptedMsg]
    })
  }, [getEncryptionKey, onNewMessage])

  // [Fix 3] Dual-channel: store broadcast channel ref for reuse in sendMessage
  useEffect(() => {
    const supabase = createClient()
    const ts = Date.now()

    // Channel 1: Supabase Broadcast — stored in ref for send reuse
    const broadcastChannel = supabase.channel(`chat-broadcast:${conversationId}`)
    broadcastChannel
      .on('broadcast', { event: 'new_message' }, async (payload) => {
        const row = payload.payload as RawMessageRow
        if (!row || row.conversation_id !== conversationId) return
        await handleIncomingMessage(row)

        if (row.sender_id !== currentUserId) {
          broadcastChannel.send({
            type: 'broadcast',
            event: 'message_delivered',
            payload: { messageId: row.id, deliveredBy: currentUserId, deliveredAt: new Date().toISOString() },
          })
        }
      })
      .on('broadcast', { event: 'message_delivered' }, (payload) => {
        const { messageId, deliveredAt } = payload.payload as { messageId: string; deliveredBy: string; deliveredAt: string }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.sender_id === currentUserId
              ? { ...m, status: 'delivered', delivered_at: deliveredAt }
              : m
          )
        )
      })
      .subscribe((status) => {
        // [Fix B] Only store ref after subscription is confirmed
        if (status === 'SUBSCRIBED') {
          broadcastChannelRef.current = broadcastChannel
        }
      })

    // Channel 2: CDC fallback for consistency
    const cdcChannel = supabase
      .channel(`chat-cdc-${conversationId}-${ts}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload: { new: { id: string; is_read: boolean | null; read_at: string | null; status?: string; delivered_at?: string | null } }) => {
        const updated = payload.new
        setMessages((prev) =>
          prev.map((m) =>
            m.id === updated.id
              ? {
                  ...m,
                  is_read: updated.is_read,
                  read_at: updated.read_at,
                  status: updated.is_read ? 'read' : (updated.status as MessageStatus) ?? m.status,
                  delivered_at: updated.delivered_at ?? m.delivered_at,
                }
              : m
          )
        )
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload: { new: RawMessageRow }) => {
        await handleIncomingMessage(payload.new)
      })
      .subscribe()

    return () => {
      broadcastChannelRef.current = null
      supabase.removeChannel(broadcastChannel)
      supabase.removeChannel(cdcChannel)
    }
  }, [conversationId, currentUserId, handleIncomingMessage])

  // [Fix 2] sendMessage now accepts optional attachment
  const sendMessage = useCallback(async (content: string, attachment?: MessageAttachment) => {
    if (!content.trim() || !conversationId) return
    if (!isCryptoAvailable()) return

    setIsSending(true)
    const tempId = `temp-${Date.now()}`
    const now = new Date().toISOString()

    const optimistic: DecryptedMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      sender_type: senderType,
      content: content.trim(),
      is_read: false,
      read_at: null,
      created_at: now,
      isOptimistic: true,
      status: 'sending',
      delivered_at: null,
      attachment: attachment ?? null,
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const key = await getEncryptionKey()
      const { encrypted, iv } = await encryptMessage(key, content.trim())

      const supabase = createClient()

      // [Fix 2] Include attachment fields in DB insert
      const insertData: Record<string, unknown> = {
        conversation_id: conversationId,
        sender_id: currentUserId,
        sender_type: senderType,
        content_encrypted: encrypted,
        content_iv: iv,
        is_read: false,
        status: 'sent',
      }
      if (attachment) {
        insertData.attachment_url = attachment.url
        insertData.attachment_type = attachment.type
        insertData.attachment_name = attachment.name
        insertData.attachment_size_bytes = attachment.sizeBytes
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: inserted, error } = await (supabase as any)
        .from('chat_messages')
        .insert(insertData)
        .select(MSG_SELECT)
        .single()

      if (error) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as MessageStatus, isOptimistic: false } : m))
        )
        setIsSending(false)
        return
      }

      if (inserted?.id) {
        processedIds.current.add(inserted.id)
      }

      if (inserted?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: inserted.id, isOptimistic: false, status: 'sent' } : m))
        )
      }

      // [Fix 3] Reuse the already-subscribed broadcast channel instead of creating a new one
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.send({
          type: 'broadcast',
          event: 'new_message',
          payload: inserted,
        })
      }

      if (onNewMessage) {
        onNewMessage(conversationId, content.trim())
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('chat_conversations')
        .update({
          last_message_at: now,
          last_message_preview_encrypted: null,
        })
        .eq('id', conversationId)

      fetch('/api/chat/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, senderType }),
      }).catch(() => {})
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as MessageStatus, isOptimistic: false } : m))
      )
    }

    setIsSending(false)
  }, [conversationId, currentUserId, senderType, getEncryptionKey, onNewMessage])

  const retryMessage = useCallback(async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId && m.status === 'failed')
    if (!msg) return
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
    await sendMessage(msg.content, msg.attachment ?? undefined)
  }, [messages, sendMessage])

  const markAsRead = useCallback(async () => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('chat_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .eq('is_read', false)
  }, [conversationId, currentUserId])

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return
    if (!isCryptoAvailable()) return

    const msg = messages.find((m) => m.id === messageId)
    if (!msg || msg.sender_id !== currentUserId) return

    const ageMs = Date.now() - new Date(msg.created_at).getTime()
    if (ageMs > 15 * 60 * 1000) return

    try {
      const key = await getEncryptionKey()
      const { encrypted, iv } = await encryptMessage(key, newContent.trim())

      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('chat_messages')
        .update({
          content_encrypted: encrypted,
          content_iv: iv,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('sender_id', currentUserId)

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: newContent.trim(), edited_at: new Date().toISOString() } : m
        )
      )
    } catch {
      // Edit failed silently
    }
  }, [messages, currentUserId, getEncryptionKey])

  const deleteMessage = useCallback(async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId)
    if (!msg || msg.sender_id !== currentUserId) return

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('chat_messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', currentUserId)

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content: 'This message was deleted', deleted_at: new Date().toISOString() } : m
      )
    )
  }, [messages, currentUserId])

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('chat_message_reactions')
      .upsert(
        { message_id: messageId, user_id: currentUserId, emoji },
        { onConflict: 'message_id,user_id,emoji' }
      )

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m
        const reactions = [...(m.reactions ?? [])]
        const existing = reactions.find((r) => r.emoji === emoji)
        if (existing) {
          if (!existing.users.some((u) => u.userId === currentUserId)) {
            existing.users.push({ userId: currentUserId })
          }
        } else {
          reactions.push({ emoji, users: [{ userId: currentUserId }] })
        }
        return { ...m, reactions }
      })
    )
  }, [currentUserId])

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('chat_message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', currentUserId)
      .eq('emoji', emoji)

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m
        const reactions = (m.reactions ?? [])
          .map((r) => {
            if (r.emoji !== emoji) return r
            return { ...r, users: r.users.filter((u) => u.userId !== currentUserId) }
          })
          .filter((r) => r.users.length > 0)
        return { ...m, reactions }
      })
    )
  }, [currentUserId])

  return {
    messages, isLoading, isLoadingMore, hasMore, isSending,
    sendMessage, retryMessage, markAsRead, loadMore,
    editMessage, deleteMessage, addReaction, removeReaction,
  }
}
