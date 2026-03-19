'use client'

/**
 * MFA verification gate.
 *
 * The user has an active session but their AAL is still aal1 while aal2
 * is required. This page challenges them to enter their TOTP code to
 * elevate the session before the home page routes them to their portal.
 *
 * Equivalent to the showMfaVerification branch in the original Index.tsx.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

export default function MfaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const handleVerify = async () => {
    if (code.length !== 6) return
    setIsVerifying(true)

    try {
      // Get enrolled factors
      const { data: factorsData, error: factorsError } =
        await supabase.auth.mfa.listFactors()

      if (factorsError || !factorsData?.totp?.length) {
        toast.error('No MFA factor found. Please sign in again.')
        await handleBack()
        return
      }

      const factorId = factorsData.totp[0].id

      // Challenge then verify
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId })

      if (challengeError || !challengeData) {
        toast.error(challengeError?.message ?? 'MFA challenge failed.')
        return
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      })

      if (verifyError) {
        toast.error(verifyError.message ?? 'Invalid code. Please try again.')
        return
      }

      // Session is now aal2 — home page will route to the correct portal
      router.replace('/')
    } catch (err) {
      console.error('MFA verify error:', err)
      toast.error('An unexpected error occurred.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleBack = async () => {
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  return (
    <div className="min-h-screen bg-lhc-background flex items-center justify-center p-4">
      <div className="bg-lhc-surface border border-lhc-border rounded-xl shadow-xl max-w-sm w-full p-8 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-lhc-text-main">
            Two-Factor Authentication
          </h2>
          <p className="text-sm text-lhc-text-muted">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="w-full text-center text-2xl tracking-widest border border-lhc-border rounded-lg px-4 py-3 bg-lhc-background text-lhc-text-main focus:outline-none focus:ring-2 focus:ring-lhc-primary"
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          disabled={isVerifying}
        />

        <button
          onClick={handleVerify}
          disabled={code.length !== 6 || isVerifying}
          className="w-full bg-lhc-primary hover:bg-lhc-primary-hover disabled:opacity-50 text-white rounded-lg py-3 font-medium transition-colors"
        >
          {isVerifying ? 'Verifying…' : 'Verify'}
        </button>

        <button
          onClick={handleBack}
          className="w-full text-sm text-lhc-text-muted hover:text-lhc-text-main text-center"
        >
          Cancel and sign out
        </button>
      </div>
    </div>
  )
}
