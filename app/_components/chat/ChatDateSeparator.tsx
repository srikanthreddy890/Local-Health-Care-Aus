'use client'

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today.getTime() - messageDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) {
    return date.toLocaleDateString('en-AU', { weekday: 'long' })
  }
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

interface ChatDateSeparatorProps {
  date: string
}

export default function ChatDateSeparator({ date }: ChatDateSeparatorProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-lhc-border/50" />
      <span className="text-xs text-lhc-text-muted font-medium px-2">
        {formatDateLabel(date)}
      </span>
      <div className="flex-1 h-px bg-lhc-border/50" />
    </div>
  )
}
