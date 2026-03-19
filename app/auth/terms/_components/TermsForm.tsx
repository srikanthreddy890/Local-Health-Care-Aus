'use client'

/**
 * TermsForm — interactive Client Component island.
 *
 * All auth/profile data is fetched server-side in the parent page and
 * passed as props. This component only handles the checkbox state,
 * the accept mutation, and the sign-out action.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

interface Props {
  userId: string
  userType: string
}

export default function TermsForm({ userId, userType }: Props) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [accepting, setAccepting] = useState(false)

  const handleAccept = async () => {
    if (!checked) return
    setAccepting(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save your acceptance. Please try again.',
        variant: 'destructive',
      })
      setAccepting(false)
      return
    }

    // Refresh the server-side session so the protected layout sees the new value
    router.refresh()
    router.replace(userType === 'clinic' ? '/clinic/portal' : '/dashboard')
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <div className="bg-lhc-surface border border-lhc-border rounded-xl shadow-xl max-w-md w-full p-8 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-lhc-text-main">
          Terms &amp; Privacy
        </h2>
        <p className="text-sm text-lhc-text-muted">
          Before continuing, please review and accept our terms.
        </p>
      </div>

      <div className="bg-lhc-background rounded-lg p-4 text-sm text-lhc-text-muted space-y-2">
        <p>By using Local Health Care, you agree to our:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <a
              href="/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lhc-primary underline hover:text-lhc-primary-hover"
            >
              Terms &amp; Conditions
            </a>
          </li>
          <li>
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lhc-primary underline hover:text-lhc-primary-hover"
            >
              Privacy Policy
            </a>
          </li>
        </ul>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          disabled={accepting}
          className="mt-0.5 h-4 w-4 rounded border-lhc-border accent-lhc-primary"
        />
        <span className="text-sm leading-relaxed text-lhc-text-main">
          I have read and agree to the Terms &amp; Conditions and Privacy
          Policy *
        </span>
      </label>

      <button
        onClick={handleAccept}
        disabled={!checked || accepting}
        className="w-full bg-lhc-primary hover:bg-lhc-primary-hover disabled:opacity-50 text-white rounded-lg py-3 font-medium transition-colors"
      >
        {accepting ? 'Saving…' : 'Accept & Continue'}
      </button>

      <button
        onClick={handleSignOut}
        disabled={accepting}
        className="w-full text-sm text-lhc-text-muted hover:text-lhc-text-main text-center"
      >
        Sign out
      </button>
    </div>
  )
}
