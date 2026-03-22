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
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

  // Fetch message counts for all referrals
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

  // Realtime subscription for message count badge updates
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lhc-text-main flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-lhc-primary" />
            Referrals
          </CardTitle>
          <Button onClick={() => setShareDialogOpen(true)}>
            <Send className="w-4 h-4 mr-2" />
            Send Referral
          </Button>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="received">
        <TabsList>
          <TabsTrigger value="received" className="gap-1.5">
            <Inbox className="w-4 h-4" />
            Received
            {receivedReferrals.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                {receivedReferrals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-1.5">
            <SendHorizonal className="w-4 h-4" />
            Sent
            {sentReferrals.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                {sentReferrals.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Received Tab */}
        <TabsContent value="received" className="space-y-3 mt-3">
          {receivedReferrals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Inbox className="w-8 h-8 text-lhc-text-muted mx-auto mb-2" />
                <p className="text-lhc-text-muted text-sm">No received referrals.</p>
              </CardContent>
            </Card>
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
                    {/* Header row */}
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

                    {/* Meta row */}
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

                    {/* Actions */}
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

                    {/* Thread Panel */}
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
        </TabsContent>

        {/* Sent Tab */}
        <TabsContent value="sent" className="space-y-3 mt-3">
          {sentReferrals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <SendHorizonal className="w-8 h-8 text-lhc-text-muted mx-auto mb-2" />
                <p className="text-lhc-text-muted text-sm">No sent referrals yet.</p>
              </CardContent>
            </Card>
          ) : (
            sentReferrals.map(referral => {
              const status = getStatusBadge(referral)
              const canManage = !referral.access_revoked && isReferralActive(referral)
              const msgCount = messageCounts[referral.id] ?? 0

              return (
                <Card key={referral.id}>
                  <CardContent className="py-4 space-y-3">
                    {/* Header row */}
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

                    {/* Meta row */}
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

                    {/* Actions */}
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

                    {/* Thread Panel */}
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
        </TabsContent>
      </Tabs>

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
