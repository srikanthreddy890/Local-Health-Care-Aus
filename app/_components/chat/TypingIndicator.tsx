'use client'

import type { TypingUser } from '@/lib/chat/types'

interface TypingIndicatorProps {
  typingUsers: TypingUser[]
}

export default function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null

  const label =
    typingUsers.length === 1
      ? `${typingUsers[0].userName} is typing`
      : `${typingUsers.length} people are typing`

  return (
    <div className="flex items-center gap-2 px-5 py-1.5 text-xs text-lhc-text-muted">
      <span>{label}</span>
      <span className="flex gap-0.5">
        <span className="w-1 h-1 rounded-full bg-lhc-text-muted animate-bounce [animation-delay:0ms]" />
        <span className="w-1 h-1 rounded-full bg-lhc-text-muted animate-bounce [animation-delay:150ms]" />
        <span className="w-1 h-1 rounded-full bg-lhc-text-muted animate-bounce [animation-delay:300ms]" />
      </span>
    </div>
  )
}
