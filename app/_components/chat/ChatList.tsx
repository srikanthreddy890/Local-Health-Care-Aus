'use client'

import { useState } from 'react'
import { Lock, MessageSquare, Search } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import DefaultAvatar from '@/components/DefaultAvatar'
import type { ConversationItem, UserType } from '@/lib/chat/types'

function formatConvTime(dateStr: string | null) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0)
    return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
}

type SidebarFilter = 'all' | 'unread' | 'today'

interface ChatListProps {
  conversations: ConversationItem[]
  selectedId: string | null
  onSelect: (conv: ConversationItem) => void
  isLoading: boolean
  showNewChatButton?: boolean
  onNewChat?: () => void
  userType: UserType
  hideOnMobile?: boolean
}

export default function ChatList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  showNewChatButton,
  onNewChat,
  userType,
  hideOnMobile,
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>('all')

  const today = new Date().toISOString().split('T')[0]

  let filteredConversations = searchQuery.trim()
    ? conversations.filter((c) =>
        c.display_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations

  // Apply sidebar filter
  if (sidebarFilter === 'unread') {
    filteredConversations = filteredConversations.filter((c) => c.unread_count > 0)
  } else if (sidebarFilter === 'today') {
    filteredConversations = filteredConversations.filter((c) =>
      c.last_message_at?.startsWith(today)
    )
  }

  // Sort: unread first, then by most recent
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.unread_count > 0 && b.unread_count === 0) return -1
    if (a.unread_count === 0 && b.unread_count > 0) return 1
    return (b.last_message_at ?? '').localeCompare(a.last_message_at ?? '')
  })

  // Separate unread and read for visual divider
  const unreadConvs = sortedConversations.filter((c) => c.unread_count > 0)
  const readConvs = sortedConversations.filter((c) => c.unread_count === 0)

  function renderConversationItem(conv: ConversationItem) {
    const isEncrypted = !conv.local_preview && !!conv.last_message_at
    const hasUnread = conv.unread_count > 0
    const previewText = conv.local_preview
      ? conv.local_preview.length > 45
        ? conv.local_preview.slice(0, 45) + '...'
        : conv.local_preview
      : conv.last_message_at
        ? 'Encrypted message'
        : 'No messages yet'

    return (
      <button
        key={conv.id}
        onClick={() => onSelect(conv)}
        className={cn(
          'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-lhc-background transition-colors border-b border-lhc-border/50',
          hasUnread && 'bg-[#F0FDF4]',
          selectedId === conv.id && 'bg-lhc-primary/5 border-l-2 border-l-[#00A86B]'
        )}
      >
        <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden">
          {conv.avatar_url ? (
            <img
              src={conv.avatar_url}
              alt={conv.display_name}
              className="w-9 h-9 rounded-full object-cover"
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
                // Show the default avatar sibling
                const sibling = target.nextElementSibling as HTMLElement | null
                if (sibling) sibling.style.display = 'flex'
              }}
            />
          ) : null}
          <DefaultAvatar
            variant="patient"
            className={cn('w-full h-full rounded-full', conv.avatar_url ? 'hidden' : '')}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className={cn(
              'text-sm truncate',
              hasUnread ? 'font-semibold text-lhc-text-main' : 'font-medium text-lhc-text-main'
            )}>
              {conv.display_name}
            </p>
            <span className="text-xs text-lhc-text-muted flex-shrink-0">
              {formatConvTime(conv.last_message_at)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <p className={cn(
              'text-xs truncate',
              hasUnread ? 'font-medium text-lhc-text-main' : 'text-lhc-text-muted'
            )}>
              {previewText}
            </p>
            {hasUnread && (
              <span className="ml-1 min-w-[18px] h-[18px] rounded-full bg-[#00A86B] text-white text-[9px] flex items-center justify-center font-bold flex-shrink-0 px-1">
                {conv.unread_count > 9 ? '9+' : conv.unread_count}
              </span>
            )}
          </div>
          {isEncrypted && (
            <span
              className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full"
              style={{ background: '#EFF6FF', color: '#1E40AF', fontSize: '9px' }}
            >
              <Lock className="w-2.5 h-2.5" />
              Encrypted
            </span>
          )}
        </div>
      </button>
    )
  }

  return (
    <div
      className={cn(
        'w-full md:w-72 border-r border-lhc-border flex flex-col flex-shrink-0',
        hideOnMobile && 'hidden md:flex'
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-lhc-border">
        <h3 className="font-semibold text-lhc-text-main">Messages</h3>
        {showNewChatButton && onNewChat && (
          <button
            onClick={onNewChat}
            className="border border-lhc-border hover:border-lhc-primary text-lhc-text-muted hover:text-lhc-primary rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
          >
            Message a Patient
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-lhc-border/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lhc-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={userType === 'clinic' ? 'Search patient by name or booking ref...' : 'Search conversations...'}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-lhc-border rounded-lg placeholder-lhc-text-muted focus:outline-none focus:ring-1 focus:ring-lhc-primary/30 focus:border-lhc-primary"
          />
        </div>
      </div>

      {/* Filter pills */}
      {userType === 'clinic' && (
        <div className="px-3 py-1.5 flex gap-1 border-b border-lhc-border/30">
          {(['all', 'unread', 'today'] as SidebarFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setSidebarFilter(f)}
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-medium capitalize transition-colors',
                sidebarFilter === f
                  ? 'bg-[#00A86B] text-white'
                  : 'text-lhc-text-muted hover:bg-lhc-background'
              )}
            >
              {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Today'}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-lhc-text-muted">Loading...</p>
          </div>
        ) : sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageSquare className="w-8 h-8 text-lhc-text-muted/30 mb-2" />
            <p className="text-xs text-lhc-text-muted">
              {searchQuery.trim()
                ? 'No matching conversations'
                : sidebarFilter === 'unread'
                  ? 'No unread messages'
                  : sidebarFilter === 'today'
                    ? 'No messages today'
                    : userType === 'patient'
                      ? 'No conversations yet'
                      : 'No patient messages yet'}
            </p>
          </div>
        ) : (
          <>
            {/* Unread conversations */}
            {unreadConvs.map(renderConversationItem)}

            {/* Divider between unread and read */}
            {unreadConvs.length > 0 && readConvs.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-1.5">
                <div className="flex-1 border-b border-lhc-border/50" />
                <span className="text-[10px] uppercase text-lhc-text-muted tracking-wider font-medium">Earlier</span>
                <div className="flex-1 border-b border-lhc-border/50" />
              </div>
            )}

            {/* Read conversations */}
            {readConvs.map(renderConversationItem)}
          </>
        )}
      </div>
    </div>
  )
}
