'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, Building, Mail } from 'lucide-react'
import type { StaffRole } from '@/lib/clinic/staffTypes'
import { ROLE_BADGE_VARIANT } from '@/lib/clinic/staffTypes'

interface InvitationDetails {
  clinic_name: string
  clinic_id: string
  email: string
  role: StaffRole
  first_name: string | null
  last_name: string | null
}

type PageState =
  | { step: 'loading' }
  | { step: 'invalid'; message: string }
  | { step: 'details'; invitation: InvitationDetails }
  | { step: 'completing' }
  | { step: 'done' }

export default function AcceptInvitation({ token }: { token: string | null }) {
  const router = useRouter()
  const [state, setState] = useState<PageState>({ step: 'loading' })
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)

  // Step 1: Validate token via edge function (no auth required)
  const validateToken = useCallback(async () => {
    if (!token) {
      setState({ step: 'invalid', message: 'No invitation token provided.' })
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase.functions.invoke('clinic-staff-management', {
      body: { action: 'accept', invite_token: token },
    })

    if (error || data?.error) {
      setState({
        step: 'invalid',
        message: data?.error ?? error?.message ?? 'This invitation is invalid or has expired.',
      })
      return
    }

    // Check if user is already logged in
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser?.email) {
      setUser({ id: authUser.id, email: authUser.email })
    }

    setState({ step: 'details', invitation: data as InvitationDetails })
  }, [token])

  useEffect(() => {
    validateToken()
  }, [validateToken])

  // Step 2: Complete the invitation (requires auth with matching email)
  async function completeInvitation() {
    if (state.step !== 'details') return

    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      // Not logged in — redirect to auth with return URL
      const returnUrl = `/invite/accept?token=${token}`
      router.push(`/auth?next=${encodeURIComponent(returnUrl)}`)
      return
    }

    setState({ step: 'completing' })

    const { data, error } = await supabase.functions.invoke('clinic-staff-management', {
      body: { action: 'complete-invitation', invite_token: token },
    })

    if (error || data?.error) {
      setState({
        step: 'invalid',
        message: data?.error ?? error?.message ?? 'Failed to accept invitation. Please try again.',
      })
      return
    }

    setState({ step: 'done' })
    // Redirect to clinic portal after a brief pause
    setTimeout(() => router.push('/clinic/portal'), 1500)
  }

  // ── No token ──────────────────────────────────────────────────────────────
  if (state.step === 'loading') {
    return (
      <PageShell>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-lhc-primary mb-3" />
            <p className="text-sm text-lhc-text-muted">Validating invitation...</p>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  // ── Invalid / expired ─────────────────────────────────────────────────────
  if (state.step === 'invalid') {
    return (
      <PageShell>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <XCircle className="w-10 h-10 text-red-500 mb-3" />
            <h2 className="text-lg font-semibold text-lhc-text-main mb-1">Invalid Invitation</h2>
            <p className="text-sm text-lhc-text-muted max-w-sm">{state.message}</p>
            <Link href="/" className="mt-4">
              <Button variant="outline">Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  // ── Completing ────────────────────────────────────────────────────────────
  if (state.step === 'completing') {
    return (
      <PageShell>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-lhc-primary mb-3" />
            <p className="text-sm text-lhc-text-muted">Setting up your access...</p>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (state.step === 'done') {
    return (
      <PageShell>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
            <h2 className="text-lg font-semibold text-lhc-text-main mb-1">You&apos;re in!</h2>
            <p className="text-sm text-lhc-text-muted">Redirecting to your clinic portal...</p>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  // ── Invitation details ────────────────────────────────────────────────────
  const { invitation } = state
  const emailMatch = user?.email?.toLowerCase() === invitation.email.toLowerCase()
  const isLoggedIn = !!user

  return (
    <PageShell>
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-lhc-primary/10 flex items-center justify-center mb-4">
              <Building className="w-7 h-7 text-lhc-primary" />
            </div>
            <h2 className="text-xl font-semibold text-lhc-text-main">You&apos;ve been invited</h2>
            <p className="text-sm text-lhc-text-muted mt-1">
              to join <span className="font-medium text-lhc-text-main">{invitation.clinic_name}</span>
            </p>
          </div>

          <div className="space-y-3 bg-lhc-background rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-lhc-text-muted">Role</span>
              <Badge variant={ROLE_BADGE_VARIANT[invitation.role] as 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'purple' | 'orange'}>
                {invitation.role}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-lhc-text-muted">Invited as</span>
              <span className="text-sm font-medium text-lhc-text-main flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {invitation.email}
              </span>
            </div>
          </div>

          {/* Not logged in */}
          {!isLoggedIn && (
            <div className="space-y-3">
              <p className="text-sm text-lhc-text-muted text-center">
                Sign in or create an account with <span className="font-medium">{invitation.email}</span> to accept.
              </p>
              <Button className="w-full" onClick={completeInvitation}>
                Sign In to Accept
              </Button>
            </div>
          )}

          {/* Logged in with matching email */}
          {isLoggedIn && emailMatch && (
            <Button className="w-full" onClick={completeInvitation}>
              Accept Invitation
            </Button>
          )}

          {/* Logged in with different email */}
          {isLoggedIn && !emailMatch && (
            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                You&apos;re signed in as <span className="font-medium">{user.email}</span>, but this
                invitation was sent to <span className="font-medium">{invitation.email}</span>.
                Please sign out and sign in with the correct account.
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const supabase = createClient()
                  await supabase.auth.signOut()
                  setUser(null)
                }}
              >
                Sign Out
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-lhc-background flex flex-col">
      <header className="border-b border-lhc-border bg-white">
        <div className="container mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/images/brand/logo.png" alt="Local Health Care" width={32} height={32} />
            <span className="font-bold text-lhc-text-main text-base">Local Health Care</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
