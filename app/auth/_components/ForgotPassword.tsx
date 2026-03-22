'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Loader2, ChevronLeft, Lock } from 'lucide-react'

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
      {/* Prominent back link — chevron style, 44px min tap target */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-lhc-primary hover:text-lhc-primary-hover hover:underline transition-all min-h-[44px] min-w-[44px] -ml-1 pl-1"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to sign in
      </button>

      {/* Focused heading — no "Welcome back" */}
      <div>
        <h3 className="text-2xl font-bold text-lhc-text-main">Reset your password</h3>
        <p className="text-sm text-lhc-text-muted mt-1">
          Enter your email and we&apos;ll send you a secure reset link.
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
              Sending&hellip;
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
      </form>

      {/* Security reassurance — fills dead space with purpose */}
      <div className="flex items-start gap-2 pt-2">
        <Lock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 leading-relaxed">
          We&apos;ll only send a link if this email matches an existing account.
          Check your spam folder if you don&apos;t see it within 2 minutes.
        </p>
      </div>
    </div>
  )
}
