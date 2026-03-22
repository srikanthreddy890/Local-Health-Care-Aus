'use client'

import { useState } from 'react'
import { MessageSquare, Search } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
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

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) =>
        c.display_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations

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
            New Chat
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
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-lhc-border rounded-lg placeholder-lhc-text-muted focus:outline-none focus:ring-1 focus:ring-lhc-primary/30 focus:border-lhc-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-lhc-text-muted">Loading...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageSquare className="w-8 h-8 text-lhc-text-muted/30 mb-2" />
            <p className="text-xs text-lhc-text-muted">
              {searchQuery.trim()
                ? 'No matching conversations'
                : userType === 'patient'
                  ? 'No conversations yet'
                  : 'No patient messages yet'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={cn(
                'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-lhc-background transition-colors border-b border-lhc-border/50',
                selectedId === conv.id && 'bg-lhc-primary/5'
              )}
            >
              <div className="w-9 h-9 rounded-full bg-lhc-primary/10 flex items-center justify-center text-lhc-primary font-bold text-xs flex-shrink-0 overflow-hidden">
                {conv.avatar_url ? (
                  <img
                    src={conv.avatar_url}
                    alt={conv.display_name}
                    className="w-9 h-9 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.display = 'none'
                      target.parentElement!.textContent = getInitials(conv.display_name)
                    }}
                  />
                ) : (
                  getInitials(conv.display_name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-medium text-lhc-text-main truncate">
                    {conv.display_name}
                  </p>
                  <span className="text-xs text-lhc-text-muted flex-shrink-0">
                    {formatConvTime(conv.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-lhc-text-muted truncate">
                    {conv.local_preview
                      ? conv.local_preview
                      : conv.last_message_at
                        ? 'Encrypted message'
                        : 'No messages yet'}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="ml-1 w-4 h-4 rounded-full bg-lhc-primary text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
