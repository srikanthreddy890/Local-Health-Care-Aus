'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Copy, CheckCircle, Smartphone } from 'lucide-react'

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

type Step = 'setup' | 'verify'

const SUPPORTED_APPS = [
  'Google Authenticator',
  'Microsoft Authenticator',
  'Authy',
  '1Password',
]

export default function TotpEnrollment({ onSuccess, onCancel }: Props) {
  const [step, setStep] = useState<Step>('setup')
  const [loading, setLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleContinue() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      })
      if (error || !data) throw error ?? new Error('Enrollment failed')
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setFactorId(data.id)
      setStep('verify')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Enrollment failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleEnable() {
    if (code.length !== 6 || !factorId) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeErr || !challengeData) throw challengeErr ?? new Error('Challenge failed')

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      })
      if (verifyErr) {
        toast.error('Verification Failed — please check your code and try again.')
        setCode('')
        return
      }
      toast.success('Two-Factor Authentication Enabled')
      onSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function copySecret() {
    if (!secret) return
    await navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (step === 'setup') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lhc-text-main mb-1">Set Up Two-Factor Authentication</h3>
          <p className="text-sm text-lhc-text-muted">
            You will need an authenticator app on your phone. Supported apps:
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SUPPORTED_APPS.map((app) => (
            <div key={app} className="flex items-center gap-2 text-sm text-lhc-text-main border border-lhc-border rounded-lg px-3 py-2">
              <Smartphone className="w-4 h-4 text-lhc-primary shrink-0" />
              {app}
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button onClick={handleContinue} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Setting up…</> : 'Continue'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lhc-text-main mb-1">Scan QR Code</h3>
        <p className="text-sm text-lhc-text-muted">
          Open your authenticator app and scan the QR code below.
        </p>
      </div>

      {qrCode && (
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-xl border border-lhc-border inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="2FA QR Code" width={192} height={192} />
          </div>
        </div>
      )}

      {secret && (
        <Card className="border-lhc-border">
          <CardContent className="pt-4">
            <p className="text-xs text-lhc-text-muted mb-2">Or enter this key manually:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-lhc-background px-3 py-2 rounded-lg border border-lhc-border break-all">
                {secret}
              </code>
              <Button variant="outline" size="sm" onClick={copySecret}>
                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-lhc-text-main">
          Enter the 6-digit code from your app
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleEnable()}
          disabled={loading}
          className="w-full text-center text-2xl tracking-[0.4em] font-mono border border-lhc-border rounded-lg px-4 py-3 bg-lhc-background text-lhc-text-main focus:outline-none focus:ring-2 focus:ring-lhc-primary"
          autoFocus
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button onClick={handleEnable} disabled={code.length !== 6 || loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</> : 'Enable 2FA'}
        </Button>
      </div>
    </div>
  )
}
