'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageSquare, X, Search, Stethoscope, Lock } from 'lucide-react'
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
  userId: string
  clinicOwnerId: string
}

export default function ClinicChatTab({ clinicId, userId, clinicOwnerId }: ClinicChatTabProps) {
  const searchParams = useSearchParams()
  const [clinicName, setClinicName] = useState<string>('Clinic')
  const [showNewChat, setShowNewChat] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [eligiblePatients, setEligiblePatients] = useState<EligiblePatient[]>([])
  const [patientsLoading, setPatientsLoading] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')

  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get('conversationId')
  )
  const conversationId = selectedId

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

  const selectedConv: ConversationItem | null =
    conversations.find((c) => c.id === conversationId) ?? null

  // Compute stats for empty state
  const totalConversations = conversations.length
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0)

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
    setPatientSearch('')
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

  // Filter eligible patients by search
  const filteredPatients = patientSearch.trim()
    ? eligiblePatients.filter((p) => {
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ').toLowerCase()
        return name.includes(patientSearch.toLowerCase())
      })
    : eligiblePatients

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
            <div className="w-14 h-14 rounded-full bg-[#F0FDF4] flex items-center justify-center mb-3">
              <Stethoscope className="w-7 h-7 text-[#059669]" />
            </div>
            <p className="font-medium text-[15px] text-lhc-text-main mb-1">Patient messages</p>
            <p className="text-[13px] text-lhc-text-muted max-w-[360px]">
              Select a conversation to view and reply. All messages are end-to-end encrypted between your clinic and patients.
            </p>
            {totalConversations > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 bg-[#F0FDF4] px-3 py-1.5 rounded-full">
                <span className="text-xs text-[#059669] font-medium">
                  {totalConversations} conversation{totalConversations !== 1 ? 's' : ''}
                  {totalUnread > 0 ? ` · ${totalUnread} unread` : ''}
                </span>
              </div>
            )}
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

      {/* New Chat Modal - redesigned as inline search dropdown style */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewChat(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lhc-text-main text-lg">
                Message a Patient
              </h3>
              <button
                onClick={() => setShowNewChat(false)}
                className="p-1.5 rounded-lg hover:bg-lhc-background text-lhc-text-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inline search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search patient by name or booking ref…"
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-lhc-border rounded-xl placeholder-lhc-text-muted focus:outline-none focus:ring-1 focus:ring-lhc-primary/30 focus:border-lhc-primary"
                autoFocus
              />
            </div>

            {patientsLoading ? (
              <div className="text-center py-6">
                <p className="text-sm text-lhc-text-muted">Loading patients...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquare className="w-10 h-10 text-lhc-text-muted/30 mx-auto mb-2" />
                <p className="text-sm text-lhc-text-muted">
                  {patientSearch.trim()
                    ? 'No patients match your search.'
                    : 'No eligible patients found. Patients with bookings in the past 2 years who don\'t already have an active conversation will appear here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {filteredPatients.map((patient) => {
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
