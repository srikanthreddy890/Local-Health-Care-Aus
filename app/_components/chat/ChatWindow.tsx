'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, MoreVertical, Archive, Trash2, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatMessages } from '@/lib/chat/useChatMessages'
import { useChatTyping } from '@/lib/chat/useChatTyping'
import ChatMessage from './ChatMessage'
import TypingIndicator from './TypingIndicator'

interface ChatWindowProps {
  conversationId: string
  currentUserId: string
  currentUserName: string
  keyUserId: string
  senderType: 'patient' | 'clinic'
  headerTitle: string
  onArchive: () => void
  onDelete?: () => void
  showDelete?: boolean
}

export default function ChatWindow({
  conversationId,
  currentUserId,
  currentUserName,
  keyUserId,
  senderType,
  headerTitle,
  onArchive,
  onDelete,
  showDelete,
}: ChatWindowProps) {
  const [input, setInput] = useState('')
  const [showKebab, setShowKebab] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, isLoading, isSending, sendMessage, markAsRead } = useChatMessages({
    conversationId,
    currentUserId,
    keyUserId,
    senderType,
  })

  const { typingUsers, startTyping, stopTyping } = useChatTyping({
    conversationId,
    currentUserId,
    currentUserName,
  })

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Mark as read on open and when messages arrive
  useEffect(() => {
    markAsRead()
  }, [messages.length, markAsRead])

  const handleSend = async () => {
    const content = input.trim()
    if (!content || isSending) return
    setInput('')
    stopTyping()
    await sendMessage(content)
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-lhc-border">
        <div>
          <p className="font-semibold text-lhc-text-main">{headerTitle}</p>
          <p className="text-xs text-lhc-text-muted flex items-center gap-1">
            <Lock className="w-3 h-3" />
            End-to-end encrypted
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowKebab((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-lhc-background text-lhc-text-muted transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showKebab && (
            <div className="absolute right-0 top-8 bg-white border border-lhc-border rounded-xl shadow-lg z-10 min-w-[150px]">
              <button
                onClick={() => { setShowKebab(false); onArchive() }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-lhc-text-muted hover:text-lhc-text-main hover:bg-lhc-background transition-colors"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
              {showDelete && onDelete && (
                <button
                  onClick={() => { setShowKebab(false); onDelete() }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:text-red-600 hover:bg-lhc-background transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {isLoading ? (
          <div className="text-center text-sm text-lhc-text-muted py-8">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-lhc-text-muted py-8">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} currentUserId={currentUserId} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Input bar */}
      <div className="border-t border-lhc-border px-4 py-3 flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            if (e.target.value.trim()) startTyping()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Type a message…"
          className={cn(
            'flex-1 border border-lhc-border rounded-xl px-3 py-2 text-sm text-lhc-text-main',
            'placeholder-lhc-text-muted focus:outline-none focus:ring-2 focus:ring-lhc-primary/30 focus:border-lhc-primary'
          )}
        />
        <button
          onClick={handleSend}
          disabled={isSending || !input.trim()}
          className="bg-lhc-primary hover:bg-lhc-primary-hover text-white rounded-xl p-2.5 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
