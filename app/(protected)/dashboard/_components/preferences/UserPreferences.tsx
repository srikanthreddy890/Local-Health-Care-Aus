'use client'

import { useState, useEffect } from 'react'
import { useUserPreferences } from '@/lib/hooks/useUserPreferences'
import { toast } from '@/lib/toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Bell, Lock, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  userId: string
}

type ToggleRowProps = {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-lhc-border last:border-0">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-lhc-text-main">{label}</p>
        <p className="text-xs text-lhc-text-muted mt-0.5">{description}</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button
          size="sm"
          variant={value ? 'default' : 'outline'}
          className="h-7 px-3 text-xs"
          onClick={() => onChange(true)}
        >
          ON
        </Button>
        <Button
          size="sm"
          variant={!value ? 'default' : 'outline'}
          className="h-7 px-3 text-xs"
          onClick={() => onChange(false)}
        >
          OFF
        </Button>
      </div>
    </div>
  )
}

function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <Button
          key={opt}
          size="sm"
          variant={value === opt ? 'default' : 'outline'}
          className="h-8 px-3 text-xs"
          onClick={() => onChange(opt)}
        >
          {opt}
        </Button>
      ))}
    </div>
  )
}

export default function UserPreferences({ userId }: Props) {
  const { prefs, loading, savePreferences } = useUserPreferences(userId)
  const [saving, setSaving] = useState(false)

  // Local editable state — seeded from DB
  const [notifReminders, setNotifReminders] = useState(true)
  const [notifAlerts, setNotifAlerts] = useState(true)
  const [notifSms, setNotifSms] = useState(true)
  const [notifLoyalty, setNotifLoyalty] = useState(true)
  const [notifPromo, setNotifPromo] = useState(false)

  const [privacyShare, setPrivacyShare] = useState(true)
  const [privacyMarketing, setPrivacyMarketing] = useState(false)
  const [profileVisibility, setProfileVisibility] = useState<'private' | 'public'>('private')

  const [language, setLanguage] = useState('English')
  const [commMethod, setCommMethod] = useState<'Email' | 'SMS' | 'Both'>('Email')

  // Sync from DB once loaded
  useEffect(() => {
    if (loading) return
    setNotifReminders(prefs.notification_appointment_reminders)
    setNotifAlerts(prefs.notification_availability_alerts)
    setNotifSms(prefs.notification_sms)
    setNotifLoyalty(prefs.notification_loyalty_updates)
    setNotifPromo(prefs.notification_promotional_emails)
    setPrivacyShare(prefs.privacy_share_data_with_clinics)
    setPrivacyMarketing(prefs.privacy_allow_marketing)
    setProfileVisibility(prefs.privacy_profile_visibility as 'private' | 'public')
    setLanguage(prefs.communication_preferred_language)
    setCommMethod(prefs.communication_method as 'Email' | 'SMS' | 'Both')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  async function handleSave() {
    setSaving(true)
    const ok = await savePreferences({
      notification_appointment_reminders: notifReminders,
      notification_availability_alerts: notifAlerts,
      notification_promotional_emails: notifPromo,
      notification_sms: notifSms,
      notification_loyalty_updates: notifLoyalty,
      privacy_share_data_with_clinics: privacyShare,
      privacy_allow_marketing: privacyMarketing,
      privacy_profile_visibility: profileVisibility,
      communication_preferred_language: language,
      communication_method: commMethod,
    })
    if (ok) toast.success('Preferences have been updated successfully.')
    setSaving(false)
  }

  if (loading) {
    return (
      <Card className="border-lhc-border">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-lhc-border">
      <CardHeader>
        <CardTitle>User Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="notifications">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="notifications" className="flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" />Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />Privacy
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />Communication
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-0">
            <ToggleRow
              label="Appointment Reminders"
              description="Get notified about your upcoming appointments"
              value={notifReminders}
              onChange={setNotifReminders}
            />
            <ToggleRow
              label="Availability Alerts"
              description="When your preferred appointment slots become available"
              value={notifAlerts}
              onChange={setNotifAlerts}
            />
            <ToggleRow
              label="SMS Notifications"
              description="Text messages for important updates"
              value={notifSms}
              onChange={setNotifSms}
            />
            <ToggleRow
              label="Loyalty Updates"
              description="Points, rewards and loyalty programme notifications"
              value={notifLoyalty}
              onChange={setNotifLoyalty}
            />
            <ToggleRow
              label="Promotional Emails"
              description="Special offers and promotional content"
              value={notifPromo}
              onChange={setNotifPromo}
            />
          </TabsContent>

          <TabsContent value="privacy" className="space-y-0">
            <ToggleRow
              label="Share Data with Clinics"
              description="Allow clinics to access your basic profile information"
              value={privacyShare}
              onChange={setPrivacyShare}
            />
            <ToggleRow
              label="Marketing Communication"
              description="Receive partner offers and marketing messages"
              value={privacyMarketing}
              onChange={setPrivacyMarketing}
            />
            <div className="flex items-center justify-between py-3">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-lhc-text-main">Profile Visibility</p>
                <p className="text-xs text-lhc-text-muted mt-0.5">Control who can view your profile</p>
              </div>
              <ButtonGroup
                options={['private', 'public'] as const}
                value={profileVisibility}
                onChange={setProfileVisibility}
              />
            </div>
          </TabsContent>

          <TabsContent value="communication" className="space-y-5">
            <div>
              <p className="text-sm font-medium text-lhc-text-main mb-2">Preferred Language</p>
              <ButtonGroup
                options={['English', 'Spanish', 'French', 'Chinese'] as const}
                value={language as 'English' | 'Spanish' | 'French' | 'Chinese'}
                onChange={setLanguage}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-lhc-text-main mb-2">Communication Method</p>
              <ButtonGroup
                options={['Email', 'SMS', 'Both'] as const}
                value={commMethod}
                onChange={setCommMethod}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className={cn('mt-6 flex justify-end')}>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
