'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'
export default function EnhancedClinicProfile({ clinicId }: { clinicId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lhc-text-main flex items-center gap-2"><Settings className="w-5 h-5 text-lhc-primary" />Clinic Settings</CardTitle></CardHeader>
      <CardContent><p className="text-lhc-text-muted text-sm">Update clinic profile, operating hours, images, and services. Clinic: {clinicId}</p></CardContent>
    </Card>
  )
}
