'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  User, Mail, Phone, Calendar, MapPin, Building2, Globe,
  Pencil, X, Save, Shield, Home, AlertCircle,
} from 'lucide-react'
import PhoneInput, { formatPhoneNumberIntl } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

interface Props {
  profile: Record<string, unknown> | null
  userEmail: string
  onUpdate: () => Promise<void>
}

interface FormData {
  first_name: string
  last_name: string
  phone: string
  date_of_birth: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  postcode: string
  country: string
}

const REQUIRED_FIELDS: { key: keyof FormData; label: string }[] = [
  { key: 'first_name', label: 'First name' },
  { key: 'last_name', label: 'Last name' },
  { key: 'phone', label: 'Phone' },
  { key: 'date_of_birth', label: 'Date of birth' },
]

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function formatDob(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return format(parseISO(dateStr), 'd MMMM yyyy')
  } catch {
    return dateStr
  }
}

function formatAddress(data: FormData): string {
  return [data.address_line1, data.address_line2, data.city, data.state, data.postcode, data.country]
    .filter(Boolean)
    .join(', ')
}

function InfoCard({ icon, label, value, action }: { icon: React.ReactNode; label: string; value: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 bg-lhc-background rounded-xl p-4 border border-lhc-border/50">
      <div className="mt-0.5 text-lhc-primary shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-lhc-text-muted uppercase tracking-wide">{label}</p>
          {action}
        </div>
        <p className="text-sm text-lhc-text-main mt-1 font-medium truncate">
          {value || <span className="italic text-lhc-text-muted font-normal">Not set</span>}
        </p>
      </div>
    </div>
  )
}

function str(v: unknown): string {
  return (v as string) ?? ''
}

export default function PersonalInfoTab({ profile, userEmail, onUpdate }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Email change state
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailForm, setEmailForm] = useState({ password: '', newEmail: '', confirmEmail: '' })
  const [changingEmail, setChangingEmail] = useState(false)
  const [pendingNewEmail, setPendingNewEmail] = useState<string | null>(null)

  // Phone change state
  const [showPhoneDialog, setShowPhoneDialog] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postcode: '',
    country: '',
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: str(profile.first_name),
        last_name: str(profile.last_name),
        phone: str(profile.phone),
        date_of_birth: str(profile.date_of_birth),
        address_line1: str(profile.address_line1),
        address_line2: str(profile.address_line2),
        city: str(profile.city),
        state: str(profile.state),
        postcode: str(profile.postcode),
        country: str(profile.country),
      })
    }
  }, [profile])

  // Check for pending email change and success flag on mount
  useEffect(() => {
    async function checkPendingEmail() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.new_email) {
        setPendingNewEmail(user.new_email)
      } else {
        setPendingNewEmail(null)
      }
    }
    checkPendingEmail()

    if (searchParams.get('email_changed') === 'true') {
      toast.success('Email address updated successfully.')
      // Clean up the URL param
      const url = new URL(window.location.href)
      url.searchParams.delete('email_changed')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  const filledCount = REQUIRED_FIELDS.filter((f) => !!formData[f.key]).length + (userEmail ? 1 : 0)
  const totalRequired = REQUIRED_FIELDS.length + 1
  const completionPct = Math.round((filledCount / totalRequired) * 100)
  const isProfileComplete = filledCount === totalRequired

  function update(key: keyof FormData, val: string) {
    setFormData((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    if (!profile?.id) return

    const missing = REQUIRED_FIELDS.filter((f) => !formData[f.key]).map((f) => f.label)
    if (missing.length) {
      toast({
        title: 'Missing required fields',
        description: missing.join(', '),
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth || null,
          address_line1: formData.address_line1 || null,
          address_line2: formData.address_line2 || null,
          city: formData.city || null,
          state: formData.state || null,
          postcode: formData.postcode || null,
          country: formData.country || null,
        })
        .eq('id', profile.id as string)

      if (error) throw error

      toast.success('Profile updated successfully.')
      setIsEditing(false)
      await onUpdate()
      router.refresh()
    } catch (err: unknown) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    if (profile) {
      setFormData({
        first_name: str(profile.first_name),
        last_name: str(profile.last_name),
        phone: str(profile.phone),
        date_of_birth: str(profile.date_of_birth),
        address_line1: str(profile.address_line1),
        address_line2: str(profile.address_line2),
        city: str(profile.city),
        state: str(profile.state),
        postcode: str(profile.postcode),
        country: str(profile.country),
      })
    }
    setIsEditing(false)
  }

  // ── Email Change ──
  async function handleEmailChange() {
    const { password, newEmail, confirmEmail } = emailForm

    if (!password) {
      toast({ title: 'Password required', description: 'Enter your current password to verify your identity.', variant: 'destructive' })
      return
    }
    if (!newEmail) {
      toast({ title: 'Email required', description: 'Enter your new email address.', variant: 'destructive' })
      return
    }
    if (newEmail !== confirmEmail) {
      toast({ title: 'Emails do not match', description: 'New email and confirmation must match.', variant: 'destructive' })
      return
    }
    if (newEmail === userEmail) {
      toast({ title: 'Same email', description: 'New email must be different from your current email.', variant: 'destructive' })
      return
    }

    setChangingEmail(true)
    try {
      const supabase = createClient()

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password,
      })
      if (authError) {
        toast({ title: 'Incorrect password', description: 'Please check your password and try again.', variant: 'destructive' })
        return
      }

      const redirectPath = encodeURIComponent('/dashboard?tab=profile&email_changed=true')
      const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${redirectPath}` }
      )

      if (error) {
        if (error.message.includes('already been registered') || error.message.includes('email_exists')) {
          toast({ title: 'Email already in use', description: 'An account with this email address already exists.', variant: 'destructive' })
        } else if (error.status === 429) {
          toast({ title: 'Too many requests', description: 'Please wait a few minutes before trying again.', variant: 'destructive' })
        } else {
          throw error
        }
        return
      }

      setPendingNewEmail(newEmail)
      setShowEmailDialog(false)
      setEmailForm({ password: '', newEmail: '', confirmEmail: '' })
      toast.success(`Confirmation email sent to ${newEmail}. Please check your inbox and click the link to complete the change.`)
    } catch (err: unknown) {
      toast({
        title: 'Email change failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setChangingEmail(false)
    }
  }

  // ── Phone Change ──
  async function handlePhoneChange() {
    if (!profile?.id) return
    if (!newPhone) {
      toast({ title: 'Phone required', description: 'Enter your new phone number.', variant: 'destructive' })
      return
    }
    if (newPhone === formData.phone) {
      toast({ title: 'Same number', description: 'New phone must be different from your current number.', variant: 'destructive' })
      return
    }

    setSavingPhone(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ phone: newPhone })
        .eq('id', profile.id as string)

      if (error) throw error

      setShowPhoneDialog(false)
      setNewPhone('')
      toast.success('Phone number updated successfully.')
      await onUpdate()
      router.refresh()
    } catch (err: unknown) {
      toast({
        title: 'Phone update failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSavingPhone(false)
    }
  }

  const inputClass = 'bg-lhc-surface border-lhc-border text-lhc-text-main'
  const fullName = [formData.first_name, formData.last_name].filter(Boolean).join(' ')

  const changeLink = 'text-xs text-lhc-primary hover:underline cursor-pointer font-medium'

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="bg-gradient-to-br from-lhc-primary/5 via-lhc-primary/10 to-lhc-primary/5 px-6 pt-6 pb-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-lhc-primary text-white flex items-center justify-center text-xl sm:text-2xl font-bold shrink-0 shadow-md">
                {fullName ? getInitials(formData.first_name, formData.last_name) : (
                  <User className="w-8 h-8 sm:w-10 sm:h-10" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-lhc-text-main truncate">
                  {fullName || 'Complete your profile'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5 text-sm text-lhc-text-muted">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{userEmail}</span>
                  </div>
                  <button onClick={() => setShowEmailDialog(true)} className={changeLink}>
                    Change
                  </button>
                </div>
                <Badge variant="secondary" className="mt-2 capitalize">
                  {(profile?.user_type as string) ?? 'Patient'}
                </Badge>
              </div>
            </div>
            <div className="shrink-0 ml-2">
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                    <X className="w-3.5 h-3.5 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex items-center gap-1.5">
                    {isSaving ? 'Saving…' : <><Save className="w-3.5 h-3.5" />Save</>}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Pending email change banner */}
          {pendingNewEmail && (
            <div className="mt-4 flex items-start gap-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Email change pending</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Check <strong>{pendingNewEmail}</strong> for a confirmation link to complete the change.
                </p>
              </div>
            </div>
          )}

          <div className="mt-5 max-w-md">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-lhc-text-muted">Profile completeness</p>
              <p className={cn(
                'text-xs font-semibold',
                isProfileComplete ? 'text-green-600 dark:text-green-400' : 'text-lhc-primary'
              )}>
                {filledCount}/{totalRequired} fields
              </p>
            </div>
            <Progress value={completionPct} />
            {isProfileComplete ? (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 font-medium">
                Profile complete — you&apos;re ready to book appointments.
              </p>
            ) : (
              <p className="text-xs text-lhc-text-muted mt-1.5">
                Complete your profile to book appointments.
              </p>
            )}
          </div>
        </div>
      </Card>

      {!isEditing ? (
        /* ── View Mode ── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Details */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-lhc-text-main mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-lhc-primary" />
                Personal Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoCard icon={<User className="w-4 h-4" />} label="First Name" value={formData.first_name} />
                <InfoCard icon={<User className="w-4 h-4" />} label="Last Name" value={formData.last_name} />
                <InfoCard
                  icon={<Phone className="w-4 h-4" />}
                  label="Phone"
                  value={formData.phone ? (formatPhoneNumberIntl(formData.phone) ?? formData.phone) : ''}
                  action={
                    <button
                      onClick={() => { setNewPhone(formData.phone); setShowPhoneDialog(true) }}
                      className={changeLink}
                    >
                      Change
                    </button>
                  }
                />
                <InfoCard
                  icon={<Calendar className="w-4 h-4" />}
                  label="Date of Birth"
                  value={formatDob(formData.date_of_birth)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-lhc-text-main mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-lhc-primary" />
                Address
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoCard icon={<Home className="w-4 h-4" />} label="Address Line 1" value={formData.address_line1} />
                <InfoCard icon={<Building2 className="w-4 h-4" />} label="Address Line 2" value={formData.address_line2} />
                <InfoCard icon={<Building2 className="w-4 h-4" />} label="City" value={formData.city} />
                <InfoCard icon={<MapPin className="w-4 h-4" />} label="State" value={formData.state} />
                <InfoCard icon={<Globe className="w-4 h-4" />} label="Postcode" value={formData.postcode} />
                <InfoCard icon={<Globe className="w-4 h-4" />} label="Country" value={formData.country} />
              </div>
              {formatAddress(formData) && (
                <div className="mt-4 bg-lhc-background rounded-xl p-3 border border-lhc-border/50">
                  <p className="text-xs font-medium text-lhc-text-muted uppercase tracking-wide mb-1">Full Address</p>
                  <p className="text-sm text-lhc-text-main">{formatAddress(formData)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Sharing */}
          <Card className="hover:shadow-md transition-shadow lg:col-span-2">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-lhc-text-main mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-lhc-primary" />
                Contact Sharing
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between py-2.5 px-4 bg-lhc-background rounded-xl border border-lhc-border/50">
                  <div>
                    <p className="text-sm font-medium text-lhc-text-main">Mobile number</p>
                    <p className="text-xs text-lhc-text-muted">Shared with clinics you book with</p>
                  </div>
                  <Badge variant="success">Always on</Badge>
                </div>
                <div className="flex items-center justify-between py-2.5 px-4 bg-lhc-background rounded-xl border border-lhc-border/50">
                  <div>
                    <p className="text-sm font-medium text-lhc-text-main">Email address</p>
                    <p className="text-xs text-lhc-text-muted">Shared with clinics you book with</p>
                  </div>
                  <Badge variant="success">Always on</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ── Edit Mode ── */
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-8">
            <section>
              <h3 className="text-sm font-semibold text-lhc-text-main mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-lhc-primary" />
                Personal Details
              </h3>
              <div className="bg-lhc-background/50 rounded-xl p-4 border border-lhc-border/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="first-name">First Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="first-name"
                      className={inputClass}
                      value={formData.first_name}
                      onChange={(e) => update('first_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="last-name">Last Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="last-name"
                      className={inputClass}
                      value={formData.last_name}
                      onChange={(e) => update('last_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone <span className="text-destructive">*</span></Label>
                    <PhoneInput
                      id="phone"
                      international
                      defaultCountry="AU"
                      value={formData.phone}
                      onChange={(val) => update('phone', val ?? '')}
                      className="flex h-10 w-full rounded-md border border-lhc-border bg-lhc-surface px-3 py-2 text-sm text-lhc-text-main"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dob">Date of Birth <span className="text-destructive">*</span></Label>
                    <Input
                      id="dob"
                      type="date"
                      className={inputClass}
                      value={formData.date_of_birth}
                      onChange={(e) => update('date_of_birth', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-lhc-text-main mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-lhc-primary" />
                Address
              </h3>
              <div className="bg-lhc-background/50 rounded-xl p-4 border border-lhc-border/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5 lg:col-span-2">
                    <Label htmlFor="address1">Address Line 1</Label>
                    <Input
                      id="address1"
                      className={inputClass}
                      placeholder="Street address"
                      value={formData.address_line1}
                      onChange={(e) => update('address_line1', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address2">Address Line 2</Label>
                    <Input
                      id="address2"
                      className={inputClass}
                      placeholder="Apt, suite, unit, etc."
                      value={formData.address_line2}
                      onChange={(e) => update('address_line2', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City / Suburb</Label>
                    <Input
                      id="city"
                      className={inputClass}
                      value={formData.city}
                      onChange={(e) => update('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      className={inputClass}
                      placeholder="e.g. WA, NSW, VIC"
                      value={formData.state}
                      onChange={(e) => update('state', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      className={inputClass}
                      maxLength={4}
                      value={formData.postcode}
                      onChange={(e) => update('postcode', e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      className={inputClass}
                      placeholder="e.g. Australia"
                      value={formData.country}
                      onChange={(e) => update('country', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
      )}

      {/* ── Email Change Dialog ── */}
      <Dialog open={showEmailDialog} onOpenChange={(open) => {
        setShowEmailDialog(open)
        if (!open) setEmailForm({ password: '', newEmail: '', confirmEmail: '' })
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
            <DialogDescription>
              A confirmation link will be sent to your new email. Your email won&apos;t change until you click that link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-lhc-text-muted">Current Email</Label>
              <Input value={userEmail} disabled className="bg-lhc-surface border-lhc-border opacity-60 cursor-not-allowed" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-change-password">Current Password <span className="text-destructive">*</span></Label>
              <Input
                id="profile-change-password"
                type="password"
                placeholder="Enter your current password"
                value={emailForm.password}
                onChange={(e) => setEmailForm((p) => ({ ...p, password: e.target.value }))}
                className="bg-lhc-surface border-lhc-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-new-email">New Email <span className="text-destructive">*</span></Label>
              <Input
                id="profile-new-email"
                type="email"
                placeholder="Enter your new email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm((p) => ({ ...p, newEmail: e.target.value }))}
                className="bg-lhc-surface border-lhc-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-confirm-email">Confirm New Email <span className="text-destructive">*</span></Label>
              <Input
                id="profile-confirm-email"
                type="email"
                placeholder="Confirm your new email"
                value={emailForm.confirmEmail}
                onChange={(e) => setEmailForm((p) => ({ ...p, confirmEmail: e.target.value }))}
                className="bg-lhc-surface border-lhc-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)} disabled={changingEmail}>Cancel</Button>
            <Button onClick={handleEmailChange} disabled={changingEmail}>
              {changingEmail ? 'Sending…' : 'Send Confirmation Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Phone Change Dialog ── */}
      <Dialog open={showPhoneDialog} onOpenChange={(open) => {
        setShowPhoneDialog(open)
        if (!open) setNewPhone('')
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Phone Number</DialogTitle>
            <DialogDescription>
              Update your contact phone number. This will be shared with clinics you book with.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-lhc-text-muted">Current Phone</Label>
              <Input
                value={formData.phone ? (formatPhoneNumberIntl(formData.phone) ?? formData.phone) : 'Not set'}
                disabled
                className="bg-lhc-surface border-lhc-border opacity-60 cursor-not-allowed"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-new-phone">New Phone Number <span className="text-destructive">*</span></Label>
              <PhoneInput
                id="profile-new-phone"
                international
                defaultCountry="AU"
                value={newPhone}
                onChange={(val) => setNewPhone(val ?? '')}
                className="flex h-10 w-full rounded-md border border-lhc-border bg-lhc-surface px-3 py-2 text-sm text-lhc-text-main"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhoneDialog(false)} disabled={savingPhone}>Cancel</Button>
            <Button onClick={handlePhoneChange} disabled={savingPhone}>
              {savingPhone ? 'Saving…' : 'Update Phone Number'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
