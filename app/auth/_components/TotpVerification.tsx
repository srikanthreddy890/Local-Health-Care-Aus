'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Loader2, ArrowLeft } from 'lucide-react'

interface Props {
  onVerified: () => void
  onBack: () => void
  userEmail?: string
}

export default function TotpVerification({ onVerified, onBack, userEmail }: Props) {
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const handleVerify = async () => {
    if (code.length !== 6) return
    setIsVerifying(true)

    const supabase = createClient()

    try {
      const { data: factorsData, error: factorsError } =
        await supabase.auth.mfa.listFactors()

      if (factorsError || !factorsData?.totp?.length) {
        toast.error('No authenticator factor found. Please sign in again.')
        onBack()
        return
      }

      const factorId = factorsData.totp[0].id

      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId })

      if (challengeError || !challenge) {
        toast.error(challengeError?.message ?? 'MFA challenge failed.')
        return
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      })

      if (verifyError) {
        toast.error(verifyError.message ?? 'Invalid code. Please try again.')
        setCode('')
        return
      }

      onVerified()
    } catch (err) {
      console.error('TOTP verify error:', err)
      toast.error('An unexpected error occurred.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-lhc-text-muted hover:text-lhc-text-main transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Cancel and sign out
      </button>

      <div className="text-center space-y-2">
        <ShieldCheck className="w-12 h-12 text-lhc-primary mx-auto" />
        <h3 className="text-xl font-semibold text-lhc-text-main">
          Two-Factor Authentication
        </h3>
        {userEmail && (
          <p className="text-sm text-lhc-text-muted">{userEmail}</p>
        )}
        <p className="text-sm text-lhc-text-muted">
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      <div className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          disabled={isVerifying}
          className="w-full text-center text-3xl tracking-[0.5em] font-mono border border-lhc-border rounded-lg px-4 py-3 bg-lhc-background text-lhc-text-main focus:outline-none focus:ring-2 focus:ring-lhc-primary"
          autoFocus
        />

        <Button
          onClick={handleVerify}
          disabled={code.length !== 6 || isVerifying}
          className="w-full"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying…
            </>
          ) : (
            'Verify'
          )}
        </Button>
      </div>

      <p className="text-center text-xs text-lhc-text-muted">
        Open your authenticator app (Google Authenticator, Authy, etc.) to find
        your 6-digit code.
      </p>
    </div>
  )
}
