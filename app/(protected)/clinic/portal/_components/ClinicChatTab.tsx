'use client'

import { useState, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useChatConversations } from '@/lib/chat/useChatConversations'
import type { ConversationItem } from '@/lib/chat/types'
import ChatList from '@/app/_components/chat/ChatList'
import ChatWindow from '@/app/_components/chat/ChatWindow'

interface ClinicChatTabProps {
  clinicId: string
  userId: string // session user (owner or staff)
}

export default function ClinicChatTab({ clinicId, userId }: ClinicChatTabProps) {
  const [clinicOwnerId, setClinicOwnerId] = useState<string | null>(null)
  const [clinicName, setClinicName] = useState<string>('Clinic')
  const [selectedConv, setSelectedConv] = useState<ConversationItem | null>(null)

  // Resolve clinic owner (needed for key operations) and clinic name (for typing indicator)
  useEffect(() => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .rpc('get_clinic_owner_id', { p_clinic_id: clinicId })
      .then(({ data }: { data: string | null }) => setClinicOwnerId(data ?? userId))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('clinics_public')
      .select('name')
      .eq('id', clinicId)
      .single()
      .then(({ data }: { data: { name: string } | null }) => {
        if (data?.name) setClinicName(data.name)
      })
  }, [clinicId, userId])

  const { conversations, isLoading, archiveConversation, deleteConversation } =
    useChatConversations({ userType: 'clinic', userId, clinicId })

  const handleArchive = async () => {
    if (!selectedConv) return
    if (!window.confirm('Archive this conversation?')) return
    await archiveConversation(selectedConv.id)
    setSelectedConv(null)
  }

  const handleDelete = async () => {
    if (!selectedConv) return
    if (!window.confirm('Permanently delete this conversation and all its messages? This cannot be undone.')) return
    await deleteConversation(selectedConv.id)
    setSelectedConv(null)
  }

  if (!clinicOwnerId) {
    return (
      <div className="bg-white rounded-2xl border border-lhc-border shadow-sm flex items-center justify-center" style={{ height: 600 }}>
        <p className="text-sm text-lhc-text-muted">Loading chat…</p>
      </div>
    )
  }

  return (
    <div
      className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden"
      style={{ height: 600 }}
    >
      <div className="flex h-full">
        <ChatList
          conversations={conversations}
          selectedId={selectedConv?.id ?? null}
          onSelect={setSelectedConv}
          isLoading={isLoading}
          showNewChatButton={false}
          userType="clinic"
        />

        {/* Right panel */}
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <MessageSquare className="w-12 h-12 text-lhc-text-muted/30 mb-3" />
            <p className="font-semibold text-lhc-text-main mb-1">Select a conversation</p>
            <p className="text-sm text-lhc-text-muted">
              Choose a patient conversation to reply
            </p>
          </div>
        ) : (
          <ChatWindow
            conversationId={selectedConv.id}
            currentUserId={userId}
            currentUserName={clinicName}
            keyUserId={clinicOwnerId}
            senderType="clinic"
            headerTitle={selectedConv.display_name}
            onArchive={handleArchive}
            onDelete={handleDelete}
            showDelete
          />
        )}
      </div>
    </div>
  )
}
