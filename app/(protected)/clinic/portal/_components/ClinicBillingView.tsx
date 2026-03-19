'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard } from 'lucide-react'
export default function ClinicBillingView({ clinicId }: { clinicId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lhc-text-main flex items-center gap-2"><CreditCard className="w-5 h-5 text-lhc-primary" />Billing</CardTitle></CardHeader>
      <CardContent><p className="text-lhc-text-muted text-sm">Subscription plan, usage, and payment history. Clinic: {clinicId}</p></CardContent>
    </Card>
  )
}
