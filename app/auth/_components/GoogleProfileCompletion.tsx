'use client'

/**
 * GoogleProfileCompletion — collects a phone number from Google OAuth users.
 *
 * Shown inline within Authentication when a Google user's profile is missing
 * a phone number. After the form is submitted the profile is updated and
 * `onComplete` is called so the parent can continue to the portal.
 */

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface Props {
  user: User
  onComplete: () => void
  onBack: () => void
}

export default function GoogleProfileCompletion({ user, onComplete, onBack }: Props) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone) {
      toast({ title: 'Required', description: 'Please enter your phone number.', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ phone })
        .eq('id', user.id)
      if (error) {
        toast({ title: 'Error', description: 'Failed to save phone number. Please try again.', variant: 'destructive' })
        return
      }
      // Set profile_completed in user metadata so middleware can gate without a DB lookup
      await supabase.auth.updateUser({ data: { profile_completed: true, phone } })

      toast.success('Profile updated!')
      onComplete()
    } catch {
      toast({ title: 'Error', description: 'Could not update profile. Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-lhc-text-main">
          Complete your profile
        </h3>
        <p className="text-sm text-lhc-text-muted">
          Welcome{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}! We
          just need your phone number to finish setting up your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="google-phone">Phone number *</Label>
          <PhoneInput
            id="google-phone"
            international
            defaultCountry="AU"
            value={phone}
            onChange={(value) => setPhone(value ?? '')}
            placeholder="+61 400 000 000"
            disabled={loading}
            className="flex h-10 w-full rounded-md border border-lhc-border bg-lhc-surface px-3 py-2 text-sm text-lhc-text-main placeholder:text-lhc-text-muted focus-visible:outline-none"
          />
          <p className="text-xs text-lhc-text-muted">
            Used for appointment reminders. Never shared.
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={loading || !phone}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Continue'
          )}
        </Button>

        <button
          type="button"
          onClick={onBack}
          className="w-full text-sm text-lhc-text-muted hover:text-lhc-text-main text-center"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
