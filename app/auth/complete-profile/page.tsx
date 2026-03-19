'use client'

/**
 * Google Profile Completion — for OAuth users who have no phone number yet.
 *
 * The home page Server Component redirects Google users here when
 * profiles.phone is null. After saving the phone the user is sent back to /
 * which re-routes them to their portal.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import GoogleProfileCompletion from '@/app/auth/_components/GoogleProfileCompletion'

export default function CompleteProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/auth')
        return
      }
      setUser(data.user)
      setLoading(false)
    })
  }, [router])

  const handleComplete = () => router.replace('/')
  const handleBack = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-lhc-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lhc-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-lhc-background flex items-center justify-center p-4">
      <div className="bg-lhc-surface border border-lhc-border rounded-xl shadow-xl max-w-sm w-full p-8">
        <GoogleProfileCompletion
          user={user}
          onComplete={handleComplete}
          onBack={handleBack}
        />
      </div>
    </div>
  )
}
