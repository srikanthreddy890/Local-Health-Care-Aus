'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { clearDerivedSecretCache } from '@/lib/chatEncryption'
import posthog from 'posthog-js'

interface Props {
  /** Show full label alongside icon (default true) */
  showLabel?: boolean
  className?: string
}

export default function SignOutButton({ showLabel = true, className }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    clearDerivedSecretCache()
    posthog.capture('user_signed_out')
    posthog.reset()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className={
        className ??
        'flex items-center gap-2 text-sm text-lhc-text-muted hover:text-red-500 transition-colors disabled:opacity-50'
      }
      aria-label="Sign out"
    >
      <LogOut className="w-4 h-4 flex-shrink-0" />
      {showLabel && <span>{loading ? 'Signing out…' : 'Sign out'}</span>}
    </button>
  )
}
