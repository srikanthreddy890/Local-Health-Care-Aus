'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Lock, Shield, Eye, Monitor, Download, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import MfaManager from './MfaManager'

interface Props {
  userId: string
  userEmail: string
  userType?: string
  createdAt?: string
}

export default function SecurityTab({ userId, userEmail, userType, createdAt }: Props) {
  const router = useRouter()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [loginAlerts, setLoginAlerts] = useState(true)
  const [dataSharing, setDataSharing] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  function handleToggle(name: string, value: boolean) {
    const labels: Record<string, string> = {
      emailNotifications: 'Email Notifications',
      loginAlerts: 'Login Alerts',
      dataSharing: 'Data Sharing',
    }
    toast({ title: `${labels[name]} ${value ? 'enabled' : 'disabled'}` })
  }

  async function handleSignOutAll() {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut({ scope: 'global' })
      toast.success('Signed Out — You have been signed out of all devices.')
      router.push('/auth')
    } catch {
      toast.error('Could not sign out of all devices.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Account Security Overview */}
      <Card className="border-lhc-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-lhc-primary" />
            Account Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 bg-lhc-background border border-lhc-border rounded-lg p-4">
              <Lock className="w-5 h-5 text-lhc-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-lhc-text-main">Password Protected</p>
                <p className="text-xs text-lhc-text-muted mt-0.5">Your account is secure</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-lhc-background border border-lhc-border rounded-lg p-4">
              <Shield className="w-5 h-5 text-lhc-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-lhc-text-main">Data Encrypted</p>
                <p className="text-xs text-lhc-text-muted mt-0.5">All data is encrypted</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-lhc-background border border-lhc-border rounded-lg p-4">
              <Eye className="w-5 h-5 text-lhc-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-lhc-text-main">Privacy Protected</p>
                <p className="text-xs text-lhc-text-muted mt-0.5">HIPAA compliant</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MFA Manager */}
      <MfaManager />

      {/* Account Information */}
      <Card className="border-lhc-border">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <span className="text-sm text-lhc-text-muted w-36 shrink-0">User ID</span>
            <code className="text-xs font-mono text-lhc-text-main bg-lhc-background border border-lhc-border rounded px-2 py-1 break-all">
              {userId}
            </code>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <span className="text-sm text-lhc-text-muted w-36 shrink-0">Email</span>
            <span className="text-sm text-lhc-text-main">{userEmail}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <span className="text-sm text-lhc-text-muted w-36 shrink-0">Account Type</span>
            <span className="text-sm text-lhc-text-main capitalize">{userType ?? 'Patient'}</span>
          </div>
          {createdAt && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="text-sm text-lhc-text-muted w-36 shrink-0">Account Created</span>
              <span className="text-sm text-lhc-text-main">
                {format(new Date(createdAt), 'd MMMM yyyy')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="border-lhc-border">
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications" className="text-sm font-medium text-lhc-text-main">
                Email Notifications
              </Label>
              <p className="text-xs text-lhc-text-muted mt-0.5">Receive security alerts via email</p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={(v) => { setEmailNotifications(v); handleToggle('emailNotifications', v) }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="login-alerts" className="text-sm font-medium text-lhc-text-main">
                Login Alerts
              </Label>
              <p className="text-xs text-lhc-text-muted mt-0.5">Get notified of new sign-ins to your account</p>
            </div>
            <Switch
              id="login-alerts"
              checked={loginAlerts}
              onCheckedChange={(v) => { setLoginAlerts(v); handleToggle('loginAlerts', v) }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="data-sharing" className="text-sm font-medium text-lhc-text-main">
                Data Sharing
              </Label>
              <p className="text-xs text-lhc-text-muted mt-0.5">Allow anonymised data to improve our services</p>
            </div>
            <Switch
              id="data-sharing"
              checked={dataSharing}
              onCheckedChange={(v) => { setDataSharing(v); handleToggle('dataSharing', v) }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card className="border-lhc-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-lhc-primary" />
            Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border border-lhc-border rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <Monitor className="w-4 h-4 text-lhc-text-muted" />
              <div>
                <p className="text-sm font-medium text-lhc-text-main">Current Device</p>
                <p className="text-xs text-lhc-text-muted">Active now</p>
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
              Current
            </span>
          </div>
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            onClick={handleSignOutAll}
            disabled={signingOut}
          >
            {signingOut ? 'Signing out…' : 'Sign Out All Devices'}
          </Button>
        </CardContent>
      </Card>

      {/* Privacy & Data */}
      <Card className="border-lhc-border">
        <CardHeader>
          <CardTitle>Privacy & Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => toast.info('Data export — contact support@localhealthcare.com.au to request a data export.')}
            >
              <Download className="w-4 h-4" />
              Export Data
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              onClick={() => toast.info('To delete your account please contact support@localhealthcare.com.au')}
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="border-lhc-border bg-lhc-primary/5">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-lhc-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-lhc-text-main">Your Data is Secure</p>
              <p className="text-sm text-lhc-text-muted mt-1">
                LocalHealthcare uses industry-standard encryption to protect your personal health information.
                Your data is stored securely and shared only with clinics you explicitly authorise.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
