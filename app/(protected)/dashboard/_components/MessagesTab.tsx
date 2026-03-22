'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageSquare, X } from 'lucide-react'
import { toast } from '@/lib/toast'
import { getInitials } from '@/lib/utils'
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
  const searchParams = useSearchParams()

  // Client-side conversation selection — avoids server component re-render
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get('conversationId')
  )

  const [showNewChat, setShowNewChat] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const { conversations, isLoading, createConversation, archiveConversation, updateLocalPreview } =
    useChatConversations({ userType: 'patient', userId })

  // Derive selected conversation from client state + loaded list
  const selectedConv: ConversationItem | null =
    conversations.find((c) => c.id === selectedId) ?? null

  function selectConversation(conv: ConversationItem | null) {
    setSelectedId(conv?.id ?? null)
    // Update URL for bookmarkability without triggering server re-render
    const p = new URLSearchParams(window.location.search)
    if (conv) {
      p.set('conversationId', conv.id)
    } else {
      p.delete('conversationId')
    }
    window.history.replaceState(null, '', `?${p.toString()}`)
  }

  const handleStartConversation = async (clinic: EligibleClinic) => {
    if (isCreating) return
    setIsCreating(true)

    const conv = await createConversation(clinic.id)
    if (!conv) {
      toast({ title: 'Failed to start conversation', variant: 'destructive' })
      setIsCreating(false)
      return
    }

    toast.success(`Started conversation with ${clinic.name}`)
    setShowNewChat(false)
    setIsCreating(false)
    // Select the new conversation (client-side, no server round-trip)
    setSelectedId(conv.id)
    const p = new URLSearchParams(window.location.search)
    p.set('conversationId', conv.id)
    window.history.replaceState(null, '', `?${p.toString()}`)
  }

  const handleArchive = async () => {
    if (!selectedConv) return
    if (!window.confirm('Archive this conversation?')) return
    await archiveConversation(selectedConv.id)
    toast.success('Conversation archived')
    selectConversation(null)
  }

  return (
    <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden h-[calc(100vh-12rem)] min-h-[400px]">
      <div className="flex h-full">
        <ChatList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={selectConversation}
          isLoading={isLoading}
          showNewChatButton
          onNewChat={() => setShowNewChat(true)}
          userType="patient"
          hideOnMobile={!!selectedConv}
        />

        {/* Right panel — patient keyUserId is always their own userId */}
        {!selectedConv ? (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center px-6">
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
            onBack={() => selectConversation(null)}
            onNewMessage={updateLocalPreview}
          />
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewChat(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
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
                    disabled={isCreating}
                    className="w-full flex items-center gap-3 p-3 border border-lhc-border rounded-xl hover:border-lhc-primary hover:bg-lhc-primary/5 transition-all text-left disabled:opacity-50 disabled:pointer-events-none"
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
