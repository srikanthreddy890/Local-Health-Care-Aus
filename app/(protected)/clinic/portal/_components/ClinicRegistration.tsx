'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Loader2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { clinicTypeOptions } from '@/lib/utils/specializations'
import posthog from 'posthog-js'

interface Props {
  userId: string
  userEmail: string
}

export default function ClinicRegistration({ userId, userEmail }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    clinic_type: '',
    specialization: '',
    phone: '',
    email: userEmail,
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'Australia',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.clinic_type) {
      toast.error('Clinic name and type are required.')
      return
    }

    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { error } = await supabase.from('clinics').insert({
        name: form.name,
        clinic_type: form.clinic_type,
        specialization: form.specialization || null,
        phone: form.phone || null,
        email: form.email || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        city: form.city || null,
        state: form.state || null,
        zip_code: form.zip_code || null,
        country: form.country,
        user_id: userId,
        is_active: true,
      })

      if (error) throw error

      posthog.capture('clinic_registered', {
        clinic_type: form.clinic_type,
        city: form.city || undefined,
        state: form.state || undefined,
      })
      toast.success('Clinic created! Let\'s set it up.')
      router.refresh()
    } catch (err) {
      posthog.captureException(err)
      toast.error('Failed to create clinic. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-lhc-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-lhc-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-lhc-primary" />
            </div>
          </div>
          <CardTitle className="text-lhc-text-main text-2xl">Register your clinic</CardTitle>
          <CardDescription className="text-lhc-text-muted">
            Create your clinic profile to start managing appointments, staff, and patients.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Clinic name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Clinic name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                placeholder="e.g. Sunrise Medical Centre"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
              />
            </div>

            {/* Clinic type */}
            <div className="space-y-1.5">
              <Label>Clinic type <span className="text-red-500">*</span></Label>
              <Select value={form.clinic_type} onValueChange={(v) => set('clinic_type', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {clinicTypeOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specialization */}
            <div className="space-y-1.5">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                placeholder="e.g. Cardiology, Family Medicine"
                value={form.specialization}
                onChange={(e) => set('specialization', e.target.value)}
              />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(02) 9000 0000"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="clinic@example.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address_line1">Address</Label>
              <Input
                id="address_line1"
                placeholder="Street address"
                value={form.address_line1}
                onChange={(e) => set('address_line1', e.target.value)}
              />
              <Input
                placeholder="Suite / Level (optional)"
                value={form.address_line2}
                onChange={(e) => set('address_line2', e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Sydney"
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="NSW"
                  value={form.state}
                  onChange={(e) => set('state', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zip_code">Postcode</Label>
                <Input
                  id="zip_code"
                  placeholder="2000"
                  value={form.zip_code}
                  onChange={(e) => set('zip_code', e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating clinic…
                </>
              ) : (
                'Create clinic'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
