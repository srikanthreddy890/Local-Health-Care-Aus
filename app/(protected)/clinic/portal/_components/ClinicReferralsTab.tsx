'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRightLeft } from 'lucide-react'
export default function ClinicReferralsTab({ clinicId }: { clinicId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lhc-text-main flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-lhc-primary" />Referrals</CardTitle></CardHeader>
      <CardContent><p className="text-lhc-text-muted text-sm">Send and receive referrals between clinics. Clinic: {clinicId}</p></CardContent>
    </Card>
  )
}
