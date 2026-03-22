'use client'

import { useState } from 'react'
import { Check, CheckCheck, Lock, Clock, AlertCircle, Pencil, Trash2, SmilePlus, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DecryptedMessage, MessageReaction } from '@/lib/chat/types'

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

interface ChatMessageProps {
  message: DecryptedMessage
  currentUserId: string
  onRetry?: (messageId: string) => void
  onEdit?: (messageId: string, newContent: string) => void
  onDelete?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onRemoveReaction?: (messageId: string, emoji: string) => void
}

function MessageStatusIcon({ message }: { message: DecryptedMessage }) {
  const status = message.is_read ? 'read' : (message.status ?? 'sent')

  switch (status) {
    case 'sending':
      return <Clock className="w-3 h-3 opacity-50" />
    case 'sent':
      return <Check className="w-3 h-3 opacity-70" />
    case 'delivered':
      return <CheckCheck className="w-3 h-3 opacity-70" />
    case 'read':
      return <CheckCheck className="w-3 h-3 text-sky-200" />
    case 'failed':
      return <AlertCircle className="w-3 h-3 text-red-300" />
    default:
      return <Check className="w-3 h-3 opacity-70" />
  }
}

function AttachmentPreview({ attachment }: { attachment: NonNullable<DecryptedMessage['attachment']> }) {
  const isImage = attachment.type.startsWith('image/')

  if (isImage) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block mt-2">
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-w-full max-h-48 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
        />
      </a>
    )
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
    >
      <Download className="w-4 h-4 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{attachment.name}</p>
        <p className="text-xs opacity-60">{formatFileSize(attachment.sizeBytes)}</p>
      </div>
    </a>
  )
}

function ReactionBar({
  reactions,
  currentUserId,
  onReact,
  onRemoveReaction,
}: {
  reactions: MessageReaction[]
  currentUserId: string
  onReact?: (emoji: string) => void
  onRemoveReaction?: (emoji: string) => void
}) {
  if (!reactions || reactions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((r) => {
        const hasReacted = r.users.some((u) => u.userId === currentUserId)
        return (
          <button
            key={r.emoji}
            onClick={() => {
              if (hasReacted) {
                onRemoveReaction?.(r.emoji)
              } else {
                onReact?.(r.emoji)
              }
            }}
            className={cn(
              'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors',
              hasReacted
                ? 'border-lhc-primary/30 bg-lhc-primary/10'
                : 'border-lhc-border bg-white hover:bg-lhc-background'
            )}
          >
            <span>{r.emoji}</span>
            <span className="text-lhc-text-muted">{r.users.length}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function ChatMessage({
  message,
  currentUserId,
  onRetry,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction,
}: ChatMessageProps) {
  const isSelf = message.sender_id === currentUserId
  const isFailed = message.status === 'failed'
  const isDeleted = !!message.deleted_at
  const isEditable = isSelf && !isDeleted && (Date.now() - new Date(message.created_at).getTime()) < 15 * 60 * 1000
  const [showActions, setShowActions] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)

  const handleEdit = () => {
    if (editContent.trim() && editContent.trim() !== message.content) {
      onEdit?.(message.id, editContent.trim())
    }
    setIsEditing(false)
  }

  return (
    <div
      className={cn('flex group', isSelf ? 'justify-end' : 'justify-start')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactionPicker(false) }}
    >
      <div className="relative max-w-[70%]">
        {/* Action buttons on hover */}
        {showActions && !isDeleted && !message.isOptimistic && (
          <div className={cn(
            'absolute -top-7 flex items-center gap-0.5 bg-white border border-lhc-border rounded-lg shadow-sm px-1 py-0.5 z-10',
            isSelf ? 'right-0' : 'left-0'
          )}>
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="p-1 rounded hover:bg-lhc-background text-lhc-text-muted"
              title="React"
            >
              <SmilePlus className="w-3.5 h-3.5" />
            </button>
            {isEditable && onEdit && (
              <button
                onClick={() => { setIsEditing(true); setEditContent(message.content) }}
                className="p-1 rounded hover:bg-lhc-background text-lhc-text-muted"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {isSelf && onDelete && !isDeleted && (
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 rounded hover:bg-lhc-background text-red-400"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Quick reaction picker */}
        {showReactionPicker && (
          <div className={cn(
            'absolute -top-14 flex items-center gap-1 bg-white border border-lhc-border rounded-xl shadow-lg px-2 py-1.5 z-20',
            isSelf ? 'right-0' : 'left-0'
          )}>
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact?.(message.id, emoji)
                  setShowReactionPicker(false)
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-lhc-background text-base transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            isSelf
              ? 'bg-lhc-primary text-white rounded-br-sm'
              : 'bg-lhc-background text-lhc-text-main rounded-bl-sm',
            message.isOptimistic && 'opacity-60',
            isFailed && 'opacity-80',
            isDeleted && 'opacity-50 italic'
          )}
        >
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-white/20 rounded-lg px-2 py-1 text-sm resize-none focus:outline-none"
                rows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit() }
                  if (e.key === 'Escape') setIsEditing(false)
                }}
              />
              <div className="flex gap-2 text-xs">
                <button onClick={handleEdit} className="underline">Save</button>
                <button onClick={() => setIsEditing(false)} className="underline opacity-70">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              {message.attachment && <AttachmentPreview attachment={message.attachment} />}
            </>
          )}
          <div
            className={cn(
              'flex items-center justify-end gap-1 mt-0.5',
              isSelf ? 'text-white/60' : 'text-lhc-text-muted'
            )}
            style={{ fontSize: '0.65rem', lineHeight: '1rem' }}
          >
            <Lock className="w-2.5 h-2.5" />
            {message.edited_at && <span className="opacity-60">edited</span>}
            <span>{formatMessageTime(message.created_at)}</span>
            {isSelf && <MessageStatusIcon message={message} />}
          </div>
          {isFailed && onRetry && (
            <button
              onClick={() => onRetry(message.id)}
              className="text-xs mt-1 text-red-200 hover:text-white underline"
            >
              Tap to retry
            </button>
          )}
        </div>

        {/* Reactions */}
        <ReactionBar
          reactions={message.reactions ?? []}
          currentUserId={currentUserId}
          onReact={(emoji) => onReact?.(message.id, emoji)}
          onRemoveReaction={(emoji) => onRemoveReaction?.(message.id, emoji)}
        />
      </div>
    </div>
  )
}
