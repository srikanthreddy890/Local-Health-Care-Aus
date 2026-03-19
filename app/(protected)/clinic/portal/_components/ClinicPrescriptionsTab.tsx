'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pill } from 'lucide-react'
export default function ClinicPrescriptionsTab({ clinicId }: { clinicId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lhc-text-main flex items-center gap-2"><Pill className="w-5 h-5 text-lhc-primary" />Prescriptions</CardTitle></CardHeader>
      <CardContent><p className="text-lhc-text-muted text-sm">Create and manage prescriptions for patients. Clinic: {clinicId}</p></CardContent>
    </Card>
  )
}
