'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MessageSquare, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { getInitials } from '@/lib/utils'
import {
  isCryptoAvailable,
  generateConversationKey,
  prepareKeyForStorage,
} from '@/lib/chatEncryption'
import { useChatConversations } from '@/lib/chat/useChatConversations'
import type { ConversationItem } from '@/lib/chat/types'
import ChatList from '@/app/_components/chat/ChatList'
import ChatWindow from '@/app/_components/chat/ChatWindow'

interface EligibleClinic {
  id: string
  name: string
  logo_url: string | null
}

interface MessagesTabProps {
  userId: string
  userName: string
  eligibleClinics: EligibleClinic[]
}

export default function MessagesTab({ userId, userName, eligibleClinics }: MessagesTabProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL-driven conversation selection (MPA pattern)
  const conversationId = searchParams.get('conversationId')

  const [showNewChat, setShowNewChat] = useState(false)

  const { conversations, isLoading, archiveConversation, refetch } =
    useChatConversations({ userType: 'patient', userId })

  // Derive selected conversation from the URL param + loaded list
  const selectedConv: ConversationItem | null =
    conversations.find((c) => c.id === conversationId) ?? null

  function selectConversation(conv: ConversationItem | null) {
    const p = new URLSearchParams(searchParams.toString())
    if (conv) {
      p.set('conversationId', conv.id)
    } else {
      p.delete('conversationId')
    }
    router.replace(`?${p.toString()}`)
  }

  const handleOpenNewChat = () => {
    setShowNewChat(true)
  }

  const handleStartConversation = async (clinic: EligibleClinic) => {
    const supabase = createClient()

    // 1. Insert conversation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('chat_conversations')
      .insert({ patient_id: userId, clinic_id: clinic.id })
      .select()
      .single()

    if (error || !data) {
      toast({ title: 'Failed to start conversation', variant: 'destructive' })
      return
    }

    // 2. Generate shared AES key and store for both participants atomically
    if (isCryptoAvailable()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: ownerId } = await (supabase as any)
          .rpc('get_clinic_owner_id', { p_clinic_id: clinic.id })
        if (ownerId) {
          const key = await generateConversationKey()
          const [patientKey, clinicKey] = await Promise.all([
            prepareKeyForStorage(key, userId),
            prepareKeyForStorage(key, ownerId),
          ])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).rpc('regenerate_conversation_keys', {
            p_conversation_id: data.id,
            p_patient_key: patientKey,
            p_clinic_key: clinicKey,
          })
        }
      } catch {
        // Non-fatal — useChatMessages will auto-generate a key on first send
      }
    }

    toast.success(`Started conversation with ${clinic.name}`)
    setShowNewChat(false)
    await refetch()
    // Navigate to the new conversation via URL (MPA pattern)
    const p = new URLSearchParams(searchParams.toString())
    p.set('conversationId', data.id)
    router.replace(`?${p.toString()}`)
  }

  const handleArchive = async () => {
    if (!selectedConv) return
    if (!window.confirm('Archive this conversation?')) return
    await archiveConversation(selectedConv.id)
    toast.success('Conversation archived')
    selectConversation(null)
  }

  return (
    <div
      className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden"
      style={{ height: 600 }}
    >
      <div className="flex h-full">
        <ChatList
          conversations={conversations}
          selectedId={conversationId}
          onSelect={selectConversation}
          isLoading={isLoading}
          showNewChatButton
          onNewChat={handleOpenNewChat}
          userType="patient"
        />

        {/* Right panel — patient keyUserId is always their own userId */}
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <MessageSquare className="w-12 h-12 text-lhc-text-muted/30 mb-3" />
            <p className="font-semibold text-lhc-text-main mb-1">Select a conversation</p>
            <p className="text-sm text-lhc-text-muted">
              Choose a conversation from the list to start messaging
            </p>
          </div>
        ) : (
          <ChatWindow
            conversationId={selectedConv.id}
            currentUserId={userId}
            currentUserName={userName}
            keyUserId={userId}
            senderType="patient"
            headerTitle={selectedConv.display_name}
            onArchive={handleArchive}
          />
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lhc-text-main text-lg">
                Start New Conversation
              </h3>
              <button
                onClick={() => setShowNewChat(false)}
                className="p-1.5 rounded-lg hover:bg-lhc-background text-lhc-text-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {eligibleClinics.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquare className="w-10 h-10 text-lhc-text-muted/30 mx-auto mb-2" />
                <p className="text-sm text-lhc-text-muted">
                  You need a booking with a chat-enabled clinic in the past 2 years to start a conversation.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {eligibleClinics.map((clinic) => (
                  <button
                    key={clinic.id}
                    onClick={() => handleStartConversation(clinic)}
                    className="w-full flex items-center gap-3 p-3 border border-lhc-border rounded-xl hover:border-lhc-primary hover:bg-lhc-primary/5 transition-all text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-lhc-primary/10 flex items-center justify-center text-lhc-primary font-bold text-xs flex-shrink-0 overflow-hidden">
                      {clinic.logo_url ? (
                        <img
                          src={clinic.logo_url}
                          alt={clinic.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        getInitials(clinic.name)
                      )}
                    </div>
                    <p className="text-sm font-medium text-lhc-text-main">{clinic.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
