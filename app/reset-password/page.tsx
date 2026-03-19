'use client'

/**
 * Reset Password page.
 *
 * The user lands here after clicking the password-reset link in their email.
 * Supabase fires an onAuthStateChange event with type PASSWORD_RECOVERY which
 * grants a temporary session. We then let the user set a new password.
 *
 * After success the session is updated and we redirect to / (home page routes
 * the user to their portal).
 */

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { CheckCircle, Loader2 } from 'lucide-react'

type Stage = 'waiting' | 'ready' | 'success' | 'error'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('waiting')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // onAuthStateChange fires PASSWORD_RECOVERY when the user follows
    // the reset link. We wait for that event before showing the form.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setStage('ready')
        }
      },
    )

    // If the user somehow arrives here already authenticated (e.g. browser back),
    // show the form anyway — updateUser will use the current session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStage('ready')
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Must be at least 6 characters.', variant: 'destructive' })
      return
    }
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', description: 'Please re-enter your new password.', variant: 'destructive' })
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      toast({ title: 'Reset failed', description: error.message, variant: 'destructive' })
      return
    }

    setStage('success')
    toast.success('Password updated successfully!')
    setTimeout(() => router.replace('/'), 2000)
  }

  return (
    <div className="min-h-screen bg-lhc-background flex flex-col">
      <header className="border-b border-lhc-border bg-lhc-surface">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center">
          <Link href="/" className="font-bold text-lhc-primary text-lg">
            Local Health Care
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
            <CardDescription>Enter a strong password for your account.</CardDescription>
          </CardHeader>

          <CardContent>
            {stage === 'waiting' && (
              <div className="text-center py-8 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-lhc-primary mx-auto" />
                <p className="text-sm text-lhc-text-muted">Verifying your reset link…</p>
              </div>
            )}

            {stage === 'ready' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter your new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Updating…</>
                  ) : 'Update password'}
                </Button>
              </form>
            )}

            {stage === 'success' && (
              <div className="text-center py-8 space-y-3">
                <CheckCircle className="w-14 h-14 text-lhc-primary mx-auto" />
                <p className="font-semibold text-lhc-text-main">Password updated!</p>
                <p className="text-sm text-lhc-text-muted">Redirecting you to the app…</p>
              </div>
            )}

            {stage === 'error' && (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-destructive">
                  This reset link is invalid or has expired.
                </p>
                <Link href="/auth" className="text-sm text-lhc-primary underline">
                  Request a new link
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
