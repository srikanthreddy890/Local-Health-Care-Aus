'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Loader2, ArrowLeft } from 'lucide-react'

interface Props {
  onBack: () => void
}

export default function ForgotPassword({ onBack }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
        return
      }
      setSent(true)
    } catch {
      toast({ title: 'Error', description: 'Could not send reset email. Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-6 space-y-4">
        <CheckCircle className="w-14 h-14 text-lhc-primary mx-auto" />
        <h3 className="text-xl font-semibold text-lhc-text-main">Check your email</h3>
        <p className="text-sm text-lhc-text-muted max-w-xs mx-auto">
          We sent a password reset link to <strong>{email}</strong>. Follow the
          link in the email to set a new password.
        </p>
        <Button variant="outline" onClick={onBack} className="mt-2">
          Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-lhc-text-muted hover:text-lhc-text-main transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sign in
      </button>

      <div>
        <h3 className="text-xl font-semibold text-lhc-text-main">Reset password</h3>
        <p className="text-sm text-lhc-text-muted mt-1">
          Enter your email address and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email address</Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading || !email}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending…
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
      </form>
    </div>
  )
}
