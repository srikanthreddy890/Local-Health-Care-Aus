'use client'

import { useState } from 'react'
import { Loader2, CheckCircle, Copy, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

const clinicTypeOptions = [
  { value: 'general', label: 'General Practice' },
  { value: 'dental', label: 'Dental' },
  { value: 'physiotherapy', label: 'Physiotherapy' },
  { value: 'psychology', label: 'Psychology' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'allied_health', label: 'Allied Health' },
  { value: 'chiropractic', label: 'Chiropractic' },
  { value: 'optometry', label: 'Optometry' },
]

function generatePassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export default function AdminRegisterClinic() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [autoGenerate, setAutoGenerate] = useState(true)
  const [clinicType, setClinicType] = useState('general')
  const [clinicName, setClinicName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Success state
  const [success, setSuccess] = useState(false)
  const [createdEmail, setCreatedEmail] = useState('')
  const [createdPassword, setCreatedPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email.trim() || !clinicName.trim()) {
      toast.error('Email and clinic name are required')
      return
    }

    const finalPassword = autoGenerate ? generatePassword() : password
    if (!finalPassword) {
      toast.error('Password is required')
      return
    }

    try {
      setSubmitting(true)
      const supabase = createClient()

      const { data, error } = await supabase.functions.invoke('admin-create-clinic', {
        body: {
          clinicType,
          clinicName: clinicName.trim(),
          ownerEmail: email.trim(),
          password: finalPassword,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setCreatedEmail(email.trim())
      setCreatedPassword(finalPassword)
      setSuccess(true)

      // Reset form
      setEmail('')
      setPassword('')
      setClinicName('')
      setClinicType('general')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create clinic')
    } finally {
      setSubmitting(false)
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-lhc-text-main">Clinic Created Successfully</h2>
          <p className="text-sm text-lhc-text-muted mt-1">
            Share the following credentials with the clinic owner.
          </p>
        </div>

        <Card>
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label className="text-xs text-lhc-text-muted">Email</Label>
              <div className="flex items-center gap-2">
                <Input value={createdEmail} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdEmail, 'Email')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-lhc-text-muted">Password</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={createdPassword}
                  readOnly
                  type={showPassword ? 'text' : 'password'}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdPassword, 'Password')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => setSuccess(false)}>
          Register Another Clinic
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-lhc-text-main">Register New Clinic</h2>
        <p className="text-sm text-lhc-text-muted">
          Create a new clinic and owner account in one step.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="text-sm font-medium text-lhc-text-main">Clinic Owner Account</div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@clinic.com"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
              <Label className="text-sm">Auto-generate password</Label>
            </div>

            {!autoGenerate && (
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  minLength={8}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="text-sm font-medium text-lhc-text-main">Clinic Details</div>

            <div>
              <Label>Practice Type</Label>
              <Select value={clinicType} onValueChange={setClinicType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clinicTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Clinic Name *</Label>
              <Input
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="My Clinic"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Create Clinic & Owner Account
        </Button>
      </form>
    </div>
  )
}
