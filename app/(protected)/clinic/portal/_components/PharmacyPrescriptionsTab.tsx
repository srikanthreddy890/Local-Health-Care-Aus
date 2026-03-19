'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Inbox } from 'lucide-react'
export default function PharmacyPrescriptionsTab({ clinicId }: { clinicId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lhc-text-main flex items-center gap-2"><Inbox className="w-5 h-5 text-lhc-primary" />Incoming Prescriptions</CardTitle></CardHeader>
      <CardContent><p className="text-lhc-text-muted text-sm">Prescriptions shared with your pharmacy from clinics. Clinic: {clinicId}</p></CardContent>
    </Card>
  )
}
