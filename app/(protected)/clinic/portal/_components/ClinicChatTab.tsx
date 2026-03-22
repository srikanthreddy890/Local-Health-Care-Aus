'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageSquare, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { getInitials } from '@/lib/utils'
import { useChatConversations } from '@/lib/chat/useChatConversations'
import { useChatPresence } from '@/lib/chat/useChatPresence'
import type { ConversationItem } from '@/lib/chat/types'
import ChatList from '@/app/_components/chat/ChatList'
import ChatWindow from '@/app/_components/chat/ChatWindow'

interface EligiblePatient {
  id: string
  first_name: string | null
  last_name: string | null
}

interface ClinicChatTabProps {
  clinicId: string
  userId: string // session user (owner or staff)
  clinicOwnerId: string // resolved server-side
}

export default function ClinicChatTab({ clinicId, userId, clinicOwnerId }: ClinicChatTabProps) {
  const searchParams = useSearchParams()
  const [clinicName, setClinicName] = useState<string>('Clinic')
  const [showNewChat, setShowNewChat] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [eligiblePatients, setEligiblePatients] = useState<EligiblePatient[]>([])
  const [patientsLoading, setPatientsLoading] = useState(false)

  // Client-side conversation selection — avoids server re-render
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get('conversationId')
  )
  const conversationId = selectedId

  // Fetch clinic name for display
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('clinics_public')
      .select('name')
      .eq('id', clinicId)
      .single()
      .then(({ data }: { data: { name: string } | null }) => {
        if (!cancelled && data?.name) setClinicName(data.name)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [clinicId])

  const { conversations, isLoading, createConversation, archiveConversation, deleteConversation, updateLocalPreview } =
    useChatConversations({ userType: 'clinic', userId, clinicId })

  const { isUserOnline } = useChatPresence({ userId, userName: clinicName })

  // Derive selected conversation from URL param + loaded list
  const selectedConv: ConversationItem | null =
    conversations.find((c) => c.id === conversationId) ?? null

  function selectConversation(conv: ConversationItem | null) {
    setSelectedId(conv?.id ?? null)
    const p = new URLSearchParams(window.location.search)
    if (conv) {
      p.set('conversationId', conv.id)
    } else {
      p.delete('conversationId')
    }
    window.history.replaceState(null, '', `?${p.toString()}`)
  }

  const handleOpenNewChat = async () => {
    setShowNewChat(true)
    setPatientsLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).rpc('get_clinic_chat_eligible_patients', {
      p_clinic_id: clinicId,
    })
    setEligiblePatients(data ?? [])
    setPatientsLoading(false)
  }

  const handleStartConversation = async (patient: EligiblePatient) => {
    if (isCreating) return
    setIsCreating(true)

    const conv = await createConversation(patient.id)
    if (!conv) {
      toast({ title: 'Failed to start conversation', variant: 'destructive' })
      setIsCreating(false)
      return
    }

    const patientName = [patient.first_name, patient.last_name].filter(Boolean).join(' ') || 'Patient'
    toast.success(`Started conversation with ${patientName}`)
    setShowNewChat(false)
    setIsCreating(false)
    setSelectedId(conv.id)
    const p = new URLSearchParams(window.location.search)
    p.set('conversationId', conv.id)
    window.history.replaceState(null, '', `?${p.toString()}`)
  }

  const handleArchive = async () => {
    if (!selectedConv) return
    if (!window.confirm('Archive this conversation?')) return
    await archiveConversation(selectedConv.id)
    selectConversation(null)
  }

  const handleDelete = async () => {
    if (!selectedConv) return
    if (!window.confirm('Permanently delete this conversation and all its messages? This cannot be undone.')) return
    await deleteConversation(selectedConv.id)
    selectConversation(null)
  }

  return (
    <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden h-[calc(100vh-12rem)] min-h-[400px]">
      <div className="flex h-full">
        <ChatList
          conversations={conversations}
          selectedId={conversationId}
          onSelect={selectConversation}
          isLoading={isLoading}
          showNewChatButton
          onNewChat={handleOpenNewChat}
          userType="clinic"
          hideOnMobile={!!selectedConv}
        />

        {/* Right panel */}
        {!selectedConv ? (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center px-6">
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
            onBack={() => selectConversation(null)}
            onNewMessage={updateLocalPreview}
            isOtherUserOnline={isUserOnline(selectedConv.patient_id)}
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

            {patientsLoading ? (
              <div className="text-center py-6">
                <p className="text-sm text-lhc-text-muted">Loading patients...</p>
              </div>
            ) : eligiblePatients.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquare className="w-10 h-10 text-lhc-text-muted/30 mx-auto mb-2" />
                <p className="text-sm text-lhc-text-muted">
                  No eligible patients found. Patients with bookings in the past 2 years who don&apos;t already have an active conversation will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {eligiblePatients.map((patient) => {
                  const patientName = [patient.first_name, patient.last_name].filter(Boolean).join(' ') || 'Patient'
                  return (
                    <button
                      key={patient.id}
                      onClick={() => handleStartConversation(patient)}
                      disabled={isCreating}
                      className="w-full flex items-center gap-3 p-3 border border-lhc-border rounded-xl hover:border-lhc-primary hover:bg-lhc-primary/5 transition-all text-left disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <div className="w-9 h-9 rounded-full bg-lhc-primary/10 flex items-center justify-center text-lhc-primary font-bold text-xs flex-shrink-0">
                        {getInitials(patientName)}
                      </div>
                      <p className="text-sm font-medium text-lhc-text-main">{patientName}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
