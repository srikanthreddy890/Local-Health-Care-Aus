'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  User, Mail, Phone, Calendar, MapPin, Building2, Globe,
  CheckCircle, AlertCircle, Pencil, X, Save,
} from 'lucide-react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
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
  address: string
  postcode: string
}


function field(label: string): React.ReactNode {
  return <span className="text-xs font-medium text-lhc-text-muted uppercase tracking-wide">{label}</span>
}

function ViewRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-lhc-border last:border-0">
      <div className="mt-0.5 text-lhc-text-muted shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        {field(label)}
        <p className="text-sm text-lhc-text-main mt-0.5 truncate">{value || <span className="italic text-lhc-text-muted">Not set</span>}</p>
      </div>
    </div>
  )
}

export default function PersonalInfoTab({ profile, userEmail, onUpdate }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    address: '',
    postcode: '',
  })

  // Sync form when profile prop changes (e.g. after onUpdate)
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: (profile.first_name as string) ?? '',
        last_name: (profile.last_name as string) ?? '',
        phone: (profile.phone as string) ?? '',
        date_of_birth: (profile.date_of_birth as string) ?? '',
        address: (profile.address as string) ?? '',
        postcode: (profile.postcode as string) ?? '',
      })
    }
  }, [profile])

  const isProfileComplete = !!(
    formData.first_name &&
    formData.last_name &&
    userEmail &&
    formData.phone &&
    formData.date_of_birth
  )

  function update(key: keyof FormData, val: string) {
    setFormData((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    if (!profile?.id) return

    const missing: string[] = []
    if (!formData.first_name) missing.push('First name')
    if (!formData.last_name) missing.push('Last name')
    if (!formData.phone) missing.push('Phone')
    if (!formData.date_of_birth) missing.push('Date of birth')
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
          address: formData.address,
          postcode: formData.postcode,
        })
        .eq('id', profile.id as string)

      if (error) throw error

      toast.success('Profile updated successfully.')
      setIsEditing(false)
      await onUpdate()
      router.refresh() // re-run Server Component to get fresh props
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
        first_name: (profile.first_name as string) ?? '',
        last_name: (profile.last_name as string) ?? '',
        phone: (profile.phone as string) ?? '',
        date_of_birth: (profile.date_of_birth as string) ?? '',
        address: (profile.address as string) ?? '',
        postcode: (profile.postcode as string) ?? '',
      })
    }
    setIsEditing(false)
  }

  const inputClass = 'bg-lhc-surface border-lhc-border text-lhc-text-main'

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lhc-text-main flex items-center gap-2">
            <User className="w-5 h-5 text-lhc-primary" />
            Personal Information
          </CardTitle>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex items-center gap-1.5">
                {isSaving ? (
                  <>Saving…</>
                ) : (
                  <><Save className="w-3.5 h-3.5" />Save</>
                )}
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Profile completeness banner */}
          {isProfileComplete ? (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                Profile complete — you&apos;re ready to book appointments.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">Profile incomplete</p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Required to book: first name, last name, email, phone, date of birth.
                </p>
              </div>
            </div>
          )}

          {/* Personal Info section */}
          {!isEditing ? (
            <div>
              <ViewRow icon={<User className="w-4 h-4" />} label="First Name" value={formData.first_name} />
              <ViewRow icon={<User className="w-4 h-4" />} label="Last Name" value={formData.last_name} />
              <ViewRow icon={<Mail className="w-4 h-4" />} label="Email" value={userEmail} />
              <ViewRow icon={<Phone className="w-4 h-4" />} label="Phone" value={formData.phone} />
              <ViewRow icon={<Calendar className="w-4 h-4" />} label="Date of Birth" value={formData.date_of_birth} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  className={cn(inputClass, 'opacity-60 cursor-not-allowed')}
                  value={userEmail}
                  readOnly
                  disabled
                />
                <p className="text-xs text-lhc-text-muted">Email is managed through your account settings.</p>
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
          )}

          {/* Address section */}
          <div className="border-t border-lhc-border pt-6">
            <h3 className="text-sm font-semibold text-lhc-text-main mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-lhc-primary" />
              Address
            </h3>
            {!isEditing ? (
              <div>
                <ViewRow icon={<Building2 className="w-4 h-4" />} label="Address" value={formData.address} />
                <ViewRow icon={<Globe className="w-4 h-4" />} label="Postcode" value={formData.postcode} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    className={inputClass}
                    value={formData.address}
                    onChange={(e) => update('address', e.target.value)}
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
              </div>
            )}
          </div>

          {/* Contact Sharing — always on */}
          <div className="border-t border-lhc-border pt-6">
            <h3 className="text-sm font-semibold text-lhc-text-main mb-3">Contact Sharing</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-lhc-text-main">Mobile number</p>
                  <p className="text-xs text-lhc-text-muted">Shared with clinics you book with</p>
                </div>
                <Badge variant="success">Always on</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-lhc-text-main">Email address</p>
                  <p className="text-xs text-lhc-text-muted">Shared with clinics you book with</p>
                </div>
                <Badge variant="success">Always on</Badge>
              </div>
            </div>
          </div>

          {/* Account Info — read-only */}
          <div className="border-t border-lhc-border pt-6">
            <h3 className="text-sm font-semibold text-lhc-text-main mb-3">Account Info</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-lhc-surface border border-lhc-border rounded-lg px-3 py-2">
                <p className="text-xs text-lhc-text-muted">User ID</p>
                <p className="text-xs font-mono text-lhc-text-main truncate max-w-[200px]">
                  {profile?.id as string ?? '—'}
                </p>
              </div>
              <div className="flex items-center justify-between bg-lhc-surface border border-lhc-border rounded-lg px-3 py-2">
                <p className="text-xs text-lhc-text-muted">Account Type</p>
                <Badge variant="secondary" className="capitalize">
                  {(profile?.user_type as string) ?? 'patient'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
