'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Shield, ShieldCheck, Lock, Eye, KeyRound,
  Loader2, Copy, Monitor, LogOut, Download, Info,
} from 'lucide-react'
import { format } from 'date-fns'
import MfaManager from '@/app/(protected)/dashboard/_components/security/MfaManager'

interface Props {
  userId: string
  userEmail: string
  clinicId: string
  clinicName?: string
}

export default function ClinicSecurityTab({ userId, userEmail, clinicId, clinicName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [resolvedClinicName, setResolvedClinicName] = useState(clinicName ?? '')
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  // Security settings (persisted to clinic_security_settings table)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [loginAlerts, setLoginAlerts] = useState(true)
  const [dataSharing, setDataSharing] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any

        // Get clinic name if not provided
        if (!clinicName) {
          const { data } = await supabase
            .from('clinics')
            .select('name')
            .eq('id', clinicId)
            .single()
          if (data?.name) setResolvedClinicName(data.name)
        }

        // Get user created_at
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.created_at) setCreatedAt(user.created_at)

        // Load persisted security settings
        const { data: settings } = await supabase
          .from('clinic_security_settings')
          .select('email_notifications, login_alerts, data_sharing')
          .eq('clinic_id', clinicId)
          .single()
        if (settings) {
          setEmailNotifications(settings.email_notifications)
          setLoginAlerts(settings.login_alerts)
          setDataSharing(settings.data_sharing)
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clinicId, clinicName])

  async function handleSignOutAll() {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut({ scope: 'global' })
      toast.success('Signed out of all devices.')
      router.replace('/auth')
    } catch {
      toast.error('Failed to sign out.')
      setSigningOut(false)
    }
  }

  async function saveSecuritySettings(updates: {
    email_notifications?: boolean
    login_alerts?: boolean
    data_sharing?: boolean
  }) {
    setSavingSettings(true)
    try {
      const supabase = createClient() as any
      const { error } = await supabase
        .from('clinic_security_settings')
        .upsert({
          clinic_id: clinicId,
          email_notifications: updates.email_notifications ?? emailNotifications,
          login_alerts: updates.login_alerts ?? loginAlerts,
          data_sharing: updates.data_sharing ?? dataSharing,
        }, { onConflict: 'clinic_id' })
      if (error) throw error
    } catch {
      toast.error('Failed to save setting.')
    } finally {
      setSavingSettings(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('Copied!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-lhc-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-lhc-primary" />
        <h1 className="text-2xl font-bold text-lhc-text-main">Security</h1>
      </div>

      {/* ── Section 1: Security Overview ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">Password Protected</p>
              <p className="text-xs text-green-600">Your account is secure</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">Data Encrypted</p>
              <p className="text-xs text-blue-600">All data is encrypted</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-700">HIPAA Compliant</p>
              <p className="text-xs text-purple-600">Privacy protected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section 2: MFA Management ────────────────────────────────── */}
      <MfaManager />

      {/* ── Section 3: Account Information ────────────────────────────── */}
      <Card className="border-lhc-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lhc-text-main">
            <KeyRound className="w-5 h-5 text-lhc-primary" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-lhc-text-muted">User ID</span>
            <div className="flex items-center gap-2">
              <code className="font-mono text-xs bg-lhc-background px-2 py-1 rounded border border-lhc-border">
                {userId.slice(0, 8)}…{userId.slice(-4)}
              </code>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(userId)}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-lhc-text-muted">Email</span>
            <span className="text-lhc-text-main">{userEmail}</span>
          </div>
          {resolvedClinicName && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-lhc-text-muted">Clinic</span>
              <span className="text-lhc-text-main">{resolvedClinicName}</span>
            </div>
          )}
          {createdAt && !isNaN(new Date(createdAt).getTime()) && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-lhc-text-muted">Account Created</span>
              <span className="text-lhc-text-main">{format(new Date(createdAt), 'd MMM yyyy')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 4: Security Settings (local state) ────────────────── */}
      <Card className="border-lhc-border">
        <CardHeader>
          <CardTitle className="text-lhc-text-main text-base">Security Settings</CardTitle>
          <CardDescription>Notification preferences for security events.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Email Notifications', desc: 'Receive security alerts via email', checked: emailNotifications, key: 'email_notifications' as const, onChange: setEmailNotifications },
            { label: 'Login Alerts', desc: 'Get notified of new login attempts', checked: loginAlerts, key: 'login_alerts' as const, onChange: setLoginAlerts },
            { label: 'Data Sharing', desc: 'Share anonymous usage data', checked: dataSharing, key: 'data_sharing' as const, onChange: setDataSharing },
          ].map(toggle => (
            <div key={toggle.label} className="flex items-center justify-between py-2">
              <div>
                <Label className="text-sm">{toggle.label}</Label>
                <p className="text-xs text-lhc-text-muted">{toggle.desc}</p>
              </div>
              <Switch
                checked={toggle.checked}
                disabled={savingSettings}
                onCheckedChange={(v) => {
                  toggle.onChange(v)
                  saveSecuritySettings({ [toggle.key]: v })
                  toast.success(`${toggle.label} ${v ? 'enabled' : 'disabled'}`)
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Section 5: Active Sessions ────────────────────────────────── */}
      <Card className="border-lhc-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lhc-text-main text-base">
            <Monitor className="w-5 h-5 text-lhc-primary" />
            Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 px-3 border border-lhc-border rounded-lg">
            <div className="flex items-center gap-3">
              <Monitor className="w-4 h-4 text-lhc-primary" />
              <div>
                <p className="text-sm font-medium text-lhc-text-main">Current Device</p>
                <p className="text-xs text-lhc-text-muted">This browser session</p>
              </div>
            </div>
            <Badge className="bg-green-600 text-white border-0">Current</Badge>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleSignOutAll}
            disabled={signingOut}
          >
            {signingOut ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <LogOut className="w-4 h-4 mr-1.5" />}
            Sign Out All Devices
          </Button>
        </CardContent>
      </Card>

      {/* ── Section 6: Privacy & Data ────────────────────────────────── */}
      <Card className="border-lhc-border">
        <CardHeader>
          <CardTitle className="text-lhc-text-main text-base">Privacy & Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            disabled={exportLoading}
            onClick={async () => {
              setExportLoading(true)
              try {
                const res = await fetch('/api/clinic/export-data')
                if (!res.ok) throw new Error('Export failed')
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `clinic-export-${clinicId}.json`
                a.click()
                URL.revokeObjectURL(url)
                toast.success('Data exported successfully.')
              } catch {
                toast.error('Failed to export data. Please try again.')
              } finally {
                setExportLoading(false)
              }
            }}
          >
            {exportLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
            {exportLoading ? 'Exporting…' : 'Export Data'}
          </Button>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
            <Info className="w-4 h-4 inline mr-2" />
            We use industry-standard encryption to protect your data. Our platform complies with
            healthcare privacy regulations including HIPAA to ensure your clinic and patient information
            remains secure and confidential.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
