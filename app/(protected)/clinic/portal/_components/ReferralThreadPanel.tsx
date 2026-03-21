'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, LockKeyhole, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useReferralMessages, MAX_MESSAGE_LENGTH } from '@/lib/hooks/useReferralMessages'
import { formatDistanceToNow } from 'date-fns'

interface ReferralThreadPanelProps {
  referralId: string
  clinicId: string
  isActive: boolean
}

export default function ReferralThreadPanel({ referralId, clinicId, isActive }: ReferralThreadPanelProps) {
  const { messages, isLoading, isSending, authClinicId, isAuthLoading, sendMessage } = useReferralMessages(referralId)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend() {
    if (!draft.trim() || isSending) return
    const content = draft
    setDraft('')
    await sendMessage(content)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const charCount = draft.length
  const showCounter = charCount >= MAX_MESSAGE_LENGTH * 0.9
  const atLimit = charCount >= MAX_MESSAGE_LENGTH

  return (
    <div className="border-t border-lhc-border pt-3 mt-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-lhc-text-muted">
        {isActive ? (
          <>
            <MessageSquare className="w-4 h-4" />
            <span>Thread</span>
          </>
        ) : (
          <>
            <LockKeyhole className="w-4 h-4" />
            <span>Thread closed</span>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="max-h-64 overflow-y-auto space-y-2 px-1">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-lhc-text-muted" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-lhc-text-muted text-center py-4">
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map(msg => {
            const isOwn = msg.sender_clinic_id === (authClinicId ?? clinicId)
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    isOwn
                      ? 'bg-lhc-primary/10 text-lhc-text-main'
                      : 'bg-lhc-surface border border-lhc-border text-lhc-text-main'
                  }`}
                >
                  <p className="text-xs font-medium mb-1 text-lhc-text-muted">
                    {isOwn ? 'You' : msg.sender_clinic_name}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className="text-[11px] text-lhc-text-muted mt-1">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!isActive ? (
        <p className="text-sm text-lhc-text-muted text-center py-2">
          This referral has been revoked or expired — messaging is disabled.
        </p>
      ) : isAuthLoading ? (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-lhc-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex gap-2">
            <Textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Type a message... (Shift+Enter for new line)"
              rows={2}
              className="resize-none text-sm"
              disabled={isSending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!draft.trim() || isSending}
              className="shrink-0 self-end"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          {showCounter && (
            <p className={`text-xs text-right ${atLimit ? 'text-red-500' : 'text-lhc-text-muted'}`}>
              {charCount}/{MAX_MESSAGE_LENGTH}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
