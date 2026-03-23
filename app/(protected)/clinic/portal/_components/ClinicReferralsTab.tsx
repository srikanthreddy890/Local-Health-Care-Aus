'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowRightLeft,
  Send,
  Download,
  RotateCcw,
  ShieldOff,
  KeyRound,
  MessageSquare,
  Loader2,
  Inbox,
  SendHorizonal,
  Clock,
  LockKeyhole,
  Info,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useClinicReferrals, type SentReferral, type ReceivedReferral } from '@/lib/hooks/useClinicReferrals'
import ShareClinicReferralDialog from './ShareClinicReferralDialog'
import DownloadReferralDialog from './DownloadReferralDialog'
import ReferralThreadPanel from './ReferralThreadPanel'

function getStatusBadge(referral: SentReferral | ReceivedReferral) {
  if (referral.access_revoked) return { label: 'Revoked', variant: 'destructive' as const }
  if (referral.expires_at && new Date(referral.expires_at) < new Date()) return { label: 'Expired', variant: 'secondary' as const }
  if (referral.is_downloaded) return { label: 'Downloaded', variant: 'default' as const }
  if (
    referral.password_attempts != null &&
    referral.max_password_attempts != null &&
    referral.password_attempts >= referral.max_password_attempts
  ) {
    return { label: 'Locked', variant: 'destructive' as const }
  }
  return { label: 'Pending', variant: 'outline' as const }
}

function isReferralActive(referral: SentReferral | ReceivedReferral): boolean {
  if (referral.access_revoked) return false
  if (referral.expires_at && new Date(referral.expires_at) < new Date()) return false
  return true
}

type ReferralTab = 'received' | 'sent'

export default function ClinicReferralsTab({ clinicId }: { clinicId: string }) {
  const {
    sentReferrals,
    receivedReferrals,
    allClinics,
    clinicDocuments,
    loading,
    refetchSent,
    refetchReceived,
    fetchAllClinics,
    fetchClinicDocuments,
    createReferral,
    verifyAndDownload,
    revokeReferral,
    resendPassword,
  } = useClinicReferrals(clinicId)

  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [downloadTarget, setDownloadTarget] = useState<ReceivedReferral | null>(null)
  const [openThreadId, setOpenThreadId] = useState<string | null>(null)
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({})
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ReferralTab>('received')

  const fetchMessageCounts = useCallback(async () => {
    const allIds = [
      ...sentReferrals.map(r => r.id),
      ...receivedReferrals.map(r => r.id),
    ]
    if (allIds.length === 0) return

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('referral_messages')
      .select('referral_id')
      .in('referral_id', allIds)
      .limit(10000)
    if (data) {
      const counts: Record<string, number> = {}
      for (const row of data as { referral_id: string }[]) {
        counts[row.referral_id] = (counts[row.referral_id] ?? 0) + 1
      }
      setMessageCounts(counts)
    }
  }, [sentReferrals, receivedReferrals])

  useEffect(() => {
    fetchMessageCounts()
  }, [fetchMessageCounts])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`referral-counts-${clinicId}-${Date.now()}`)
      .on(
        'postgres_changes' as never,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referral_messages',
        },
        (payload: { new: { referral_id: string } }) => {
          const rid = payload.new.referral_id
          setMessageCounts(prev => ({ ...prev, [rid]: (prev[rid] ?? 0) + 1 }))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clinicId])

  function toggleThread(id: string) {
    setOpenThreadId(prev => prev === id ? null : id)
  }

  async function handleResendPassword(referralId: string) {
    if (resendingId) return
    setResendingId(referralId)
    await resendPassword(referralId)
    setResendingId(null)
  }

  async function handleRevoke(referralId: string) {
    if (!window.confirm('Are you sure you want to revoke this referral? The receiving clinic will lose access.')) return
    await revokeReferral(referralId)
  }

  const loadReferrals = useCallback(async () => {
    await Promise.all([refetchSent(), refetchReceived()])
  }, [refetchSent, refetchReceived])

  // Show info strip only when both lists are empty
  const showInfoStrip = sentReferrals.length === 0 && receivedReferrals.length === 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Compact summary header bar */}
      <div className="flex items-center justify-between py-3 border-b border-lhc-border/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-lhc-primary" />
            <h2 className="text-lg font-medium text-lhc-text-main">Referrals</h2>
          </div>
          <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
            Received: {receivedReferrals.length}
          </span>
          <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-medium bg-[#ECFDF5] text-[#065F46]">
            Sent: {sentReferrals.length}
          </span>
        </div>
        <Button onClick={() => setShareDialogOpen(true)} size="sm">
          <Send className="w-4 h-4 mr-2" />
          Send Referral
        </Button>
      </div>

      {/* Pill tab toggle */}
      <div className="bg-gray-100 rounded-[10px] p-[3px] border border-gray-200/80 inline-flex w-fit">
        {([
          { key: 'received' as const, label: 'Received', count: receivedReferrals.length },
          { key: 'sent' as const, label: 'Sent', count: sentReferrals.length },
        ]).map(({ key, label, count }) => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
                isActive
                  ? 'bg-white border border-[#00A86B]/30 shadow-sm text-[#00A86B]'
                  : 'text-gray-500 hover:text-gray-700',
                count === 0 && !isActive && 'opacity-60'
              )}
            >
              {label}
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold',
                  isActive
                    ? 'bg-[#00A86B]/15 text-[#00A86B]'
                    : 'bg-gray-200 text-gray-500'
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Contextual info strip */}
      {showInfoStrip && (
        <div className="flex items-center gap-3 bg-[#F0FDF4] border border-[#A7F3D0] rounded-[10px] px-3.5 py-2.5">
          <Info className="w-4 h-4 text-[#00A86B] flex-shrink-0" />
          <p className="text-xs text-lhc-text-muted flex-1">
            You can refer patients to other Local Health Care clinics directly. They&apos;ll receive the referral and patient details securely.
          </p>
          <span className="text-xs text-[#00A86B] font-medium whitespace-nowrap cursor-pointer hover:underline">
            Learn how referrals work
          </span>
        </div>
      )}

      {/* Received Tab Content */}
      {activeTab === 'received' && (
        <div className="space-y-3">
          {receivedReferrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-14 h-14 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-4">
                <Inbox className="w-7 h-7 text-[#3B82F6]" />
              </div>
              <h3 className="text-[15px] font-medium text-lhc-text-main mb-1.5">No referrals received yet</h3>
              <p className="text-[13px] text-lhc-text-muted text-center max-w-[400px] mb-4">
                When other clinics refer patients to you, those referrals will appear here. Make sure your clinic listing is complete to receive referrals.
              </p>
              <button className="text-xs text-[#00A86B] font-medium hover:underline">
                View your clinic listing →
              </button>
            </div>
          ) : (
            receivedReferrals.map(referral => {
              const status = getStatusBadge(referral)
              const isLocked = referral.password_attempts != null &&
                referral.max_password_attempts != null &&
                referral.password_attempts >= referral.max_password_attempts
              const msgCount = messageCounts[referral.id] ?? 0

              return (
                <Card key={referral.id}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-lhc-text-main truncate">
                            {referral.document_title}
                          </span>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p className="text-sm text-lhc-text-muted">
                          From: <span className="font-medium">{referral.source_clinic_name}</span>
                        </p>
                        {referral.patient_name && (
                          <p className="text-sm text-lhc-text-muted">Patient: {referral.patient_name}</p>
                        )}
                        {referral.referral_notes && (
                          <p className="text-sm text-lhc-text-muted italic">{referral.referral_notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-lhc-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Received {referral.created_at ? formatDistanceToNow(new Date(referral.created_at), { addSuffix: true }) : ''}
                      </span>
                      {referral.expires_at && (
                        <span>
                          Expires {formatDistanceToNow(new Date(referral.expires_at), { addSuffix: true })}
                        </span>
                      )}
                      {referral.password_attempts != null && referral.max_password_attempts != null && !isLocked && (
                        <span className="text-amber-600">
                          {referral.max_password_attempts - referral.password_attempts} attempts left
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {isLocked ? (
                        <span className="text-sm text-red-500 flex items-center gap-1">
                          <LockKeyhole className="w-3.5 h-3.5" />
                          Locked — Contact sender
                        </span>
                      ) : !referral.is_downloaded ? (
                        <Button size="sm" onClick={() => setDownloadTarget(referral)}>
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setDownloadTarget(referral)}>
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Download Again
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleThread(referral.id)}
                        className="gap-1"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Messages
                        {msgCount > 0 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-0.5">
                            {msgCount}
                          </Badge>
                        )}
                      </Button>
                    </div>

                    {openThreadId === referral.id && (
                      <ReferralThreadPanel
                        referralId={referral.id}
                        clinicId={clinicId}
                        isActive={isReferralActive(referral)}
                      />
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Sent Tab Content */}
      {activeTab === 'sent' && (
        <div className="space-y-3">
          {sentReferrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-14 h-14 rounded-full bg-[#F0FDF4] flex items-center justify-center mb-4">
                <SendHorizonal className="w-7 h-7 text-[#059669]" />
              </div>
              <h3 className="text-[15px] font-medium text-lhc-text-main mb-1.5">No sent referrals yet</h3>
              <p className="text-[13px] text-lhc-text-muted text-center max-w-[400px] mb-4">
                Use the &quot;Send Referral&quot; button to refer a patient to another clinic in the Local Health Care network.
              </p>
            </div>
          ) : (
            sentReferrals.map(referral => {
              const status = getStatusBadge(referral)
              const canManage = !referral.access_revoked && isReferralActive(referral)
              const msgCount = messageCounts[referral.id] ?? 0

              return (
                <Card key={referral.id}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-lhc-text-main truncate">
                            {referral.document_title}
                          </span>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p className="text-sm text-lhc-text-muted">
                          To: <span className="font-medium">{referral.target_clinic_name}</span>
                        </p>
                        {referral.patient_name && (
                          <p className="text-sm text-lhc-text-muted">Patient: {referral.patient_name}</p>
                        )}
                        {referral.referral_notes && (
                          <p className="text-sm text-lhc-text-muted italic">{referral.referral_notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-lhc-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Sent {referral.created_at ? formatDistanceToNow(new Date(referral.created_at), { addSuffix: true }) : ''}
                      </span>
                      {referral.expires_at && (
                        <span>
                          Expires {formatDistanceToNow(new Date(referral.expires_at), { addSuffix: true })}
                        </span>
                      )}
                      {referral.downloaded_at && (
                        <span className="text-green-600">
                          Downloaded {formatDistanceToNow(new Date(referral.downloaded_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {canManage && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResendPassword(referral.id)}
                            disabled={resendingId === referral.id}
                          >
                            {resendingId === referral.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <KeyRound className="w-4 h-4 mr-1" />
                            )}
                            Resend Password
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRevoke(referral.id)}
                          >
                            <ShieldOff className="w-4 h-4 mr-1" />
                            Revoke
                          </Button>
                        </>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleThread(referral.id)}
                        className="gap-1"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Messages
                        {msgCount > 0 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-0.5">
                            {msgCount}
                          </Badge>
                        )}
                      </Button>
                    </div>

                    {openThreadId === referral.id && (
                      <ReferralThreadPanel
                        referralId={referral.id}
                        clinicId={clinicId}
                        isActive={isReferralActive(referral)}
                      />
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Dialogs */}
      <ShareClinicReferralDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        allClinics={allClinics}
        clinicDocuments={clinicDocuments}
        onLoadClinics={fetchAllClinics}
        onLoadDocuments={fetchClinicDocuments}
        onSubmit={createReferral}
      />

      <DownloadReferralDialog
        open={downloadTarget !== null}
        onClose={() => setDownloadTarget(null)}
        referral={downloadTarget}
        onVerify={verifyAndDownload}
        onSuccess={loadReferrals}
      />
    </div>
  )
}
