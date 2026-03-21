'use client'

import { Check, CheckCheck, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DecryptedMessage } from '@/lib/chat/types'

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}

interface ChatMessageProps {
  message: DecryptedMessage
  currentUserId: string
}

export default function ChatMessage({ message, currentUserId }: ChatMessageProps) {
  const isSelf = message.sender_id === currentUserId

  return (
    <div className={cn('flex', isSelf ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2.5',
          isSelf
            ? 'bg-lhc-primary text-white rounded-br-sm'
            : 'bg-lhc-background text-lhc-text-main rounded-bl-sm',
          message.isOptimistic && 'opacity-60'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={cn(
            'text-xs mt-1 flex items-center justify-end gap-1',
            isSelf ? 'text-white/70' : 'text-lhc-text-muted'
          )}
        >
          <Lock className="w-3 h-3 opacity-50" />
          {formatMessageTime(message.created_at)}
          {isSelf && (
            message.is_read
              ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
              : <Check className="w-3.5 h-3.5" />
          )}
        </p>
      </div>
    </div>
  )
}
