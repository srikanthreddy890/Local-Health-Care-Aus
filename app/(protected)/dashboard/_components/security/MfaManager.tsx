'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { useMfaStatus } from '@/lib/hooks/useMfaStatus'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Loader2, ShieldCheck, ShieldAlert, Smartphone } from 'lucide-react'
import { format } from 'date-fns'
import TotpEnrollment from './TotpEnrollment'

export default function MfaManager() {
  const { isEnrolled, factors, loading, refetch } = useMfaStatus()
  const [showEnrollment, setShowEnrollment] = useState(false)
  const [showUnenroll, setShowUnenroll] = useState(false)
  const [unenrollCode, setUnenrollCode] = useState('')
  const [unenrolling, setUnenrolling] = useState(false)

  async function handleUnenroll() {
    if (unenrollCode.length !== 6 || factors.length === 0) return
    setUnenrolling(true)
    try {
      const supabase = createClient()
      const factorId = factors[0].id

      // Must verify current TOTP before unenrolling
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeErr || !challengeData) throw challengeErr ?? new Error('Challenge failed')

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: unenrollCode,
      })
      if (verifyErr) {
        toast.error('Invalid code — please check your authenticator app.')
        setUnenrollCode('')
        return
      }

      const { error: unenrollErr } = await supabase.auth.mfa.unenroll({ factorId })
      if (unenrollErr) throw unenrollErr

      toast.success('Two-Factor Authentication Disabled')
      setShowUnenroll(false)
      setUnenrollCode('')
      await refetch()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to disable 2FA'
      toast.error(msg)
    } finally {
      setUnenrolling(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-lhc-border">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
        </CardContent>
      </Card>
    )
  }

  if (showEnrollment) {
    return (
      <Card className="border-lhc-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-lhc-primary" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TotpEnrollment
            onSuccess={() => { setShowEnrollment(false); refetch() }}
            onCancel={() => setShowEnrollment(false)}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-lhc-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-lhc-primary" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEnrolled ? (
            <>
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Recommended: Enable two-factor authentication</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                      Add an extra layer of security to protect your account from unauthorised access.
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={() => setShowEnrollment(true)}>
                Set Up Two-Factor Authentication
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                {factors.map((factor) => (
                  <div key={factor.id} className="flex items-center justify-between border border-lhc-border rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-lhc-primary" />
                      <div>
                        <p className="text-sm font-medium text-lhc-text-main">
                          {factor.friendly_name || 'Authenticator App'}
                        </p>
                        <p className="text-xs text-lhc-text-muted">
                          Added {format(new Date(factor.created_at), 'd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-600 text-white border-0">Active</Badge>
                  </div>
                ))}
              </div>
              <Button variant="destructive" onClick={() => setShowUnenroll(true)}>
                Disable Two-Factor Authentication
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Unenroll dialog */}
      <Dialog open={showUnenroll} onOpenChange={(open) => { setShowUnenroll(open); if (!open) setUnenrollCode('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code from your authenticator app to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={unenrollCode}
              onChange={(e) => setUnenrollCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleUnenroll()}
              disabled={unenrolling}
              className="w-full text-center text-2xl tracking-[0.4em] font-mono border border-lhc-border rounded-lg px-4 py-3 bg-lhc-background text-lhc-text-main focus:outline-none focus:ring-2 focus:ring-lhc-primary"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowUnenroll(false)} disabled={unenrolling}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleUnenroll}
                disabled={unenrollCode.length !== 6 || unenrolling}
              >
                {unenrolling ? <><Loader2 className="w-4 h-4 animate-spin" />Disabling…</> : 'Disable 2FA'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
