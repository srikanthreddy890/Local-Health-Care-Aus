'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  isCryptoAvailable,
  generateConversationKey,
  encryptMessage,
  decryptMessage,
  prepareKeyForStorage,
  retrieveKeyFromStorage,
} from '@/lib/chatEncryption'
import type { DecryptedMessage } from './types'

interface UseChatMessagesOptions {
  conversationId: string
  currentUserId: string
  // keyUserId = clinicOwnerId on clinic side, same as currentUserId for patients
  keyUserId: string
  senderType: 'patient' | 'clinic'
}

async function decryptOne(
  key: CryptoKey,
  row: { id: string; conversation_id: string; sender_id: string; sender_type: string; content_encrypted: string; content_iv: string; is_read: boolean | null; read_at: string | null; created_at: string }
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
    content,
    is_read: row.is_read,
    read_at: row.read_at,
    created_at: row.created_at,
  }
}

export function useChatMessages({
  conversationId,
  currentUserId,
  keyUserId,
  senderType,
}: UseChatMessagesOptions) {
  const [messages, setMessages] = useState<DecryptedMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const keyCache = useRef<{ convId: string; key: CryptoKey } | null>(null)

  const getEncryptionKey = useCallback(async (): Promise<CryptoKey> => {
    // Return cached key if same conversation
    if (keyCache.current?.convId === conversationId) {
      return keyCache.current.key
    }

    if (!isCryptoAvailable()) throw new Error('Web Crypto API not available')

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: keyRow } = await (supabase as any)
      .from('chat_encryption_keys')
      .select('encrypted_key')
      .eq('conversation_id', conversationId)
      .eq('user_id', keyUserId)
      .maybeSingle()

    let key: CryptoKey
    if (keyRow?.encrypted_key) {
      key = await retrieveKeyFromStorage(keyRow.encrypted_key, keyUserId)
    } else {
      // Generate new key and store for this user only
      key = await generateConversationKey()
      const storedKey = await prepareKeyForStorage(key, keyUserId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('chat_encryption_keys')
        .upsert(
          { conversation_id: conversationId, user_id: keyUserId, encrypted_key: storedKey },
          { onConflict: 'conversation_id,user_id' }
        )
    }

    keyCache.current = { convId: conversationId, key }
    return key
  }, [conversationId, keyUserId])

  const fetchMessages = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('chat_messages')
      .select('id, conversation_id, sender_id, sender_type, content_encrypted, content_iv, is_read, read_at, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (!data) { setIsLoading(false); return }

    if (!isCryptoAvailable()) {
      // Fallback: show legacy plaintext or redacted
      const fallback: DecryptedMessage[] = data.map((row: { id: string; conversation_id: string; sender_id: string; sender_type: string; content_encrypted: string; content_iv: string; is_read: boolean | null; read_at: string | null; created_at: string }) => ({
        ...row,
        content: row.content_iv === 'plain' ? row.content_encrypted : '[Encrypted message]',
      }))
      setMessages(fallback)
      setIsLoading(false)
      return
    }

    try {
      const key = await getEncryptionKey()
      const decrypted = await Promise.all(data.map((row: { id: string; conversation_id: string; sender_id: string; sender_type: string; content_encrypted: string; content_iv: string; is_read: boolean | null; read_at: string | null; created_at: string }) => decryptOne(key, row)))
      setMessages(decrypted)
    } catch {
      // If key retrieval fails, show what we can
      const fallback: DecryptedMessage[] = data.map((row: { id: string; conversation_id: string; sender_id: string; sender_type: string; content_encrypted: string; content_iv: string; is_read: boolean | null; read_at: string | null; created_at: string }) => ({
        ...row,
        content: row.content_iv === 'plain' ? row.content_encrypted : '[Encrypted message]',
      }))
      setMessages(fallback)
    }
    setIsLoading(false)
  }, [conversationId, getEncryptionKey])

  // Reset key cache and fetch when conversation changes
  useEffect(() => {
    keyCache.current = null
    fetchMessages()
  }, [conversationId, fetchMessages])

  // Realtime subscription for new messages
  useEffect(() => {
    const supabase = createClient()
    const channelName = `chat-messages-${conversationId}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload: { new: { id: string; conversation_id: string; sender_id: string; sender_type: string; content_encrypted: string; content_iv: string; is_read: boolean | null; read_at: string | null; created_at: string } }) => {
        const row = payload.new

        let decryptedMsg: DecryptedMessage
        if (!isCryptoAvailable() || row.content_iv === 'plain') {
          decryptedMsg = { ...row, content: row.content_encrypted }
        } else {
          try {
            const key = await getEncryptionKey()
            decryptedMsg = await decryptOne(key, row)
          } catch {
            decryptedMsg = { ...row, content: '[Encrypted message]' }
          }
        }

        setMessages((prev) => {
          // Replace optimistic entry if temp id exists, otherwise dedup by real id
          const hasReal = prev.some((m) => m.id === row.id && !m.isOptimistic)
          if (hasReal) return prev
          // Remove any optimistic placeholder with same sender + approximate timestamp (within 5s)
          const filtered = prev.filter((m) => {
            if (!m.isOptimistic) return true
            if (m.sender_id !== row.sender_id) return true
            const timeDiff = Math.abs(
              new Date(m.created_at).getTime() - new Date(row.created_at).getTime()
            )
            return timeDiff > 5000
          })
          return [...filtered, decryptedMsg]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, getEncryptionKey])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !conversationId) return
    if (!isCryptoAvailable()) return

    setIsSending(true)
    const tempId = `temp-${Date.now()}`
    const now = new Date().toISOString()

    // Optimistic update
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
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const key = await getEncryptionKey()
      const { encrypted, iv } = await encryptMessage(key, content.trim())

      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: inserted, error } = await (supabase as any)
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          sender_type: senderType,
          content_encrypted: encrypted,
          content_iv: iv,
          is_read: false,
        })
        .select('id')
        .single()

      if (error) {
        // Remove optimistic on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        setIsSending(false)
        return
      }

      // Replace temp id with real id
      if (inserted?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: inserted.id, isOptimistic: false } : m))
        )
      }

      // Update conversation preview
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('chat_conversations')
        .update({
          last_message_at: now,
          last_message_preview_encrypted: content.trim().slice(0, 80),
        })
        .eq('id', conversationId)

      // Fire-and-forget notification
      fetch('/api/chat/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, senderType }),
      }).catch(() => {})
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    }

    setIsSending(false)
  }, [conversationId, currentUserId, senderType, getEncryptionKey])

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

  return { messages, isLoading, isSending, sendMessage, markAsRead }
}
