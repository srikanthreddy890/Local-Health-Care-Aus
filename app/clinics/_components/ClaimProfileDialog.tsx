'use client'

import { useState } from 'react'
import { X, Building2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

interface Clinic {
  id: string
  name: string
}

interface Props {
  clinic: Clinic
  onClose: () => void
}

export default function ClaimProfileDialog({ clinic, onClose }: Props) {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    contactName: '',
    email: '',
    phone: '',
    role: '',
    message: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('clinic_claim_requests').insert({
        apify_clinic_id: clinic.id,
        clinic_name: clinic.name,
        contact_name: form.contactName,
        contact_email: form.email,
        contact_phone: form.phone,
        contact_role: form.role,
        message: form.message,
      })
      setStep('success')
    } catch {
      toast({ title: 'Error', description: 'Could not submit your claim. Please try again.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-lhc-border">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-lhc-primary" />
            <h2 className="font-bold text-lhc-text-main">Claim Profile</h2>
          </div>
          <button onClick={onClose} className="text-lhc-text-muted hover:text-lhc-text-main transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'success' ? (
          <div className="px-6 py-10 text-center space-y-4">
            <CheckCircle className="w-14 h-14 text-lhc-primary mx-auto" />
            <h3 className="font-bold text-lhc-text-main text-lg">Claim Submitted!</h3>
            <p className="text-sm text-lhc-text-muted">
              We&apos;ll review your request and contact you within 2–3 business days to verify ownership of <strong>{clinic.name}</strong>.
            </p>
            <button
              onClick={onClose}
              className="mt-2 bg-lhc-primary hover:bg-lhc-primary-hover text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <p className="text-sm text-lhc-text-muted">
              Claim ownership of <strong className="text-lhc-text-main">{clinic.name}</strong> to manage bookings, update info, and respond to reviews.
            </p>

            {[
              { key: 'contactName', label: 'Your Full Name', placeholder: 'Dr. Jane Smith', required: true },
              { key: 'email', label: 'Work Email', placeholder: 'jane@clinic.com.au', required: true, type: 'email' },
              { key: 'phone', label: 'Phone Number', placeholder: '+61 4xx xxx xxx', required: true },
              { key: 'role', label: 'Your Role', placeholder: 'Owner / Practice Manager / Receptionist' },
            ].map(({ key, label, placeholder, required, type }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs font-semibold text-lhc-text-main">{label}</label>
                <input
                  type={type ?? 'text'}
                  required={required}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full h-10 px-3 border border-lhc-border rounded-lg text-sm text-lhc-text-main placeholder:text-lhc-text-muted/50 focus:outline-none focus:border-lhc-primary transition-colors"
                />
              </div>
            ))}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-lhc-text-main">Additional Message (optional)</label>
              <textarea
                rows={3}
                placeholder="Any additional details about your claim…"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full px-3 py-2 border border-lhc-border rounded-lg text-sm text-lhc-text-main placeholder:text-lhc-text-muted/50 focus:outline-none focus:border-lhc-primary transition-colors resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 border border-lhc-border rounded-xl text-sm font-medium text-lhc-text-muted hover:bg-lhc-background transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-10 bg-lhc-primary hover:bg-lhc-primary-hover text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Claim'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
