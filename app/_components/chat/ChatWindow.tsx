'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Send, MoreVertical, Archive, Trash2, Lock, ArrowLeft, Paperclip, Search, X, WifiOff, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatMessages } from '@/lib/chat/useChatMessages'
import { useChatTyping } from '@/lib/chat/useChatTyping'
import { useChatNotifications } from '@/lib/chat/useChatNotifications'
import { useChatAttachments } from '@/lib/chat/useChatAttachments'
import { useChatConnection } from '@/lib/chat/useChatConnection'
import ChatMessage from './ChatMessage'
import ChatDateSeparator from './ChatDateSeparator'
import TypingIndicator from './TypingIndicator'
import type { DecryptedMessage } from '@/lib/chat/types'

interface ChatWindowProps {
  conversationId: string
  currentUserId: string
  currentUserName: string
  keyUserId: string
  senderType: 'patient' | 'clinic'
  headerTitle: string
  headerAvatar?: string | null
  headerSubtitle?: string | null
  onArchive: () => void
  onDelete?: () => void
  showDelete?: boolean
  onBack?: () => void
  onNewMessage?: (conversationId: string, preview: string) => void
  isOtherUserOnline?: boolean
  upcomingAppointment?: {
    type: string
    doctorName: string
    date: string
    time: string
    clinicName: string
    appointmentId?: string
  } | null
  onViewAppointment?: (appointmentId: string) => void
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Group messages by date and interleave date separators
function groupMessagesWithDates(messages: DecryptedMessage[]): Array<{ type: 'date'; date: string } | { type: 'message'; message: DecryptedMessage }> {
  const result: Array<{ type: 'date'; date: string } | { type: 'message'; message: DecryptedMessage }> = []
  let lastDateKey = ''

  for (const msg of messages) {
    const dateKey = getDateKey(msg.created_at)
    if (dateKey !== lastDateKey) {
      result.push({ type: 'date', date: msg.created_at })
      lastDateKey = dateKey
    }
    result.push({ type: 'message', message: msg })
  }

  return result
}

export default function ChatWindow({
  conversationId,
  currentUserId,
  currentUserName,
  keyUserId,
  senderType,
  headerTitle,
  headerAvatar,
  headerSubtitle,
  onArchive,
  onDelete,
  showDelete,
  onBack,
  onNewMessage,
  isOtherUserOnline,
  upcomingAppointment,
  onViewAppointment,
}: ChatWindowProps) {
  const [input, setInput] = useState('')
  const [showKebab, setShowKebab] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    messages, isLoading, isLoadingMore, hasMore, isSending,
    sendMessage, retryMessage, markAsRead, loadMore,
    editMessage, deleteMessage, addReaction, removeReaction,
  } = useChatMessages({
    conversationId,
    currentUserId,
    keyUserId,
    senderType,
    onNewMessage,
  })

  const { typingUsers, startTyping, stopTyping } = useChatTyping({
    conversationId,
    currentUserId,
    currentUserName,
  })

  const { notifyNewMessage } = useChatNotifications()
  const { uploadAttachment, isUploading } = useChatAttachments()
  const { connectionStatus, isConnected } = useChatConnection({ userId: currentUserId })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Notify on new messages from others when tab is hidden
  const prevMessagesRef = useRef<string[]>([])
  useEffect(() => {
    const currentIds = messages.map((m) => m.id)
    const newMessages = messages.filter(
      (m) => !prevMessagesRef.current.includes(m.id) && m.sender_id !== currentUserId && !m.isOptimistic
    )
    if (newMessages.length > 0) {
      notifyNewMessage(headerTitle)
    }
    prevMessagesRef.current = currentIds
  }, [messages, currentUserId, headerTitle, notifyNewMessage])

  // Filter messages for search, then group by date
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages
    const q = searchQuery.toLowerCase()
    return messages.filter((m) => m.content.toLowerCase().includes(q))
  }, [messages, searchQuery])

  const groupedMessages = useMemo(() => groupMessagesWithDates(filteredMessages), [filteredMessages])

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const maxHeight = 5 * 24 // ~5 lines
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`
  }, [])

  // Auto-scroll on new messages (only when near bottom)
  const prevMessageCount = useRef(messages.length)
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      prevMessageCount.current = messages.length
      return
    }
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150
    const isNewMessage = messages.length > prevMessageCount.current
    if (isNearBottom || isNewMessage) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCount.current = messages.length
  }, [messages.length])

  // Infinite scroll: observe sentinel at the top
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) {
          const container = messagesContainerRef.current
          const prevScrollHeight = container?.scrollHeight ?? 0
          loadMore().then(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight
              container.scrollTop = newScrollHeight - prevScrollHeight
            }
          })
        }
      },
      { root: messagesContainerRef.current, threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, loadMore])

  // Mark as read on open and when new messages from others arrive
  const hasUnreadFromOthers = messages.some(
    (m) => m.sender_id !== currentUserId && !m.is_read
  )
  useEffect(() => {
    if (hasUnreadFromOthers) markAsRead()
  }, [hasUnreadFromOthers, markAsRead])

  const handleSend = async () => {
    const content = input.trim()
    if (!content || isSending) return
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    stopTyping()
    await sendMessage(content)
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-lhc-border">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-lhc-background text-lhc-text-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {headerAvatar && (
            <img
              src={headerAvatar}
              alt={headerTitle}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-lhc-text-main truncate">{headerTitle}</p>
              {isOtherUserOnline !== undefined && (
                <span
                  className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    isOtherUserOnline ? 'bg-green-500' : 'bg-gray-300'
                  )}
                />
              )}
            </div>
            {headerSubtitle ? (
              <p className="text-lhc-text-muted" style={{ fontSize: '11px' }}>{headerSubtitle}</p>
            ) : (
              <p className="text-xs text-lhc-text-muted flex items-center gap-1">
                {isOtherUserOnline !== undefined
                  ? isOtherUserOnline
                    ? 'Online'
                    : 'Offline'
                  : null}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1.5 rounded-lg hover:bg-lhc-background text-lhc-text-muted transition-colors"
            title="Search messages"
          >
            <Search className="w-4 h-4" />
          </button>
          <div className="relative">
          <button
            onClick={() => setShowKebab((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-lhc-background text-lhc-text-muted transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showKebab && (
            <>
            <div className="fixed inset-0 z-[9]" onClick={() => setShowKebab(false)} />
            <div className="absolute right-0 top-8 bg-white border border-lhc-border rounded-xl shadow-lg z-10 min-w-[150px] max-w-[calc(100vw-2rem)]">
              <button
                onClick={() => { setShowKebab(false); onArchive() }}
                className={cn(
                  'flex items-center gap-2 w-full px-4 py-2.5 text-sm text-lhc-text-muted hover:text-lhc-text-main hover:bg-lhc-background transition-colors rounded-t-xl',
                  !(showDelete && onDelete) && 'rounded-b-xl'
                )}
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
              {showDelete && onDelete && (
                <button
                  onClick={() => { setShowKebab(false); onDelete() }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:text-red-600 hover:bg-lhc-background transition-colors rounded-b-xl"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
            </>
          )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-lhc-border bg-lhc-background/50">
          <Search className="w-4 h-4 text-lhc-text-muted flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in conversation..."
            className="flex-1 bg-transparent text-sm text-lhc-text-main placeholder-lhc-text-muted focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <span className="text-xs text-lhc-text-muted flex-shrink-0">
              {filteredMessages.length} found
            </span>
          )}
          <button
            onClick={() => { setShowSearch(false); setSearchQuery('') }}
            className="p-1 rounded hover:bg-lhc-background text-lhc-text-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Encryption notice */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-blue-100" style={{ background: '#EFF6FF', fontSize: '11px', color: '#1E40AF' }}>
        <Lock className="w-3 h-3 flex-shrink-0" />
        Messages are end-to-end encrypted between you and your clinic
      </div>

      {/* Connection status banner */}
      {!isConnected && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-700 text-xs">
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          {connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Connection lost. Messages may be delayed.'}
        </div>
      )}

      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 md:px-5 py-4 space-y-3">
        {isLoading ? (
          <div className="text-center text-sm text-lhc-text-muted py-8">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-lhc-text-muted py-8">
            No messages yet. Say hello!
          </div>
        ) : (
          <>
            {hasMore && (
              <div ref={loadMoreSentinelRef} className="text-center py-2">
                {isLoadingMore && (
                  <span className="text-xs text-lhc-text-muted">Loading older messages...</span>
                )}
              </div>
            )}
            {groupedMessages.map((item, idx) => {
              if (item.type === 'date') {
                return <ChatDateSeparator key={`date-${item.date}`} date={item.date} />
              }
              return (
                <ChatMessage
                  key={item.message.id}
                  message={item.message}
                  currentUserId={currentUserId}
                  onRetry={retryMessage}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                  onReact={addReaction}
                  onRemoveReaction={removeReaction}
                />
              )
            })}
          </>
        )}
        <TypingIndicator typingUsers={typingUsers} />
        <div ref={messagesEndRef} />
      </div>

      {/* Pinned appointment card */}
      {upcomingAppointment && (
        <div
          className="mx-3 mb-2 flex items-center justify-between bg-white"
          style={{ border: '0.5px solid #6EE7B7', borderRadius: '10px', padding: '10px 12px' }}
        >
          <div className="min-w-0">
            <p className="font-bold uppercase tracking-wide" style={{ fontSize: '10px', color: '#00A86B' }}>
              Upcoming Appointment
            </p>
            <p className="font-bold text-lhc-text-main truncate" style={{ fontSize: '12px' }}>
              {upcomingAppointment.type} &middot; {upcomingAppointment.doctorName}
            </p>
            <p className="text-lhc-text-muted" style={{ fontSize: '11px' }}>
              {upcomingAppointment.date} at {upcomingAppointment.time}
            </p>
          </div>
          <button
            onClick={() => upcomingAppointment.appointmentId && onViewAppointment?.(upcomingAppointment.appointmentId)}
            className="border border-lhc-primary text-lhc-primary rounded-lg px-3 py-1.5 text-xs font-medium flex-shrink-0 hover:bg-lhc-primary/5 transition-colors"
          >
            View
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="px-3 md:px-4 py-2.5 flex items-end gap-2" style={{ borderTop: '0.5px solid var(--lhc-border, #e5e7eb)' }}>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              const attachment = await uploadAttachment(file, conversationId)
              if (attachment) {
                await sendMessage(attachment.name, attachment)
              }
            } catch {
              // Upload failed — error handled in useChatAttachments
            }
            e.target.value = ''
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[7px] text-lhc-text-muted hover:text-lhc-primary hover:bg-lhc-background transition-colors disabled:opacity-50 flex-shrink-0"
          style={{ border: '0.5px solid var(--lhc-border, #e5e7eb)' }}
          title="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <textarea
          ref={textareaRef}
          value={input}
          rows={1}
          onChange={(e) => {
            setInput(e.target.value)
            resizeTextarea()
            if (e.target.value.trim()) startTyping()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={`Type a message to ${headerTitle}...`}
          className={cn(
            'flex-1 border border-lhc-border rounded-lg px-3 py-2 text-sm text-lhc-text-main resize-none',
            'placeholder-lhc-text-muted focus:outline-none focus:ring-2 focus:ring-lhc-primary/30 focus:border-lhc-primary'
          )}
          style={{ maxHeight: '120px' }}
        />
        <button
          onClick={handleSend}
          disabled={isSending || !input.trim()}
          className="bg-lhc-primary hover:bg-lhc-primary-hover text-white rounded-xl p-2.5 disabled:opacity-50 transition-colors flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
