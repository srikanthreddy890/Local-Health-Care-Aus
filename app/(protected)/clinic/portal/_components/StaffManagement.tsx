'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
export default function StaffManagement({ clinicId }: { clinicId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lhc-text-main flex items-center gap-2"><Users className="w-5 h-5 text-lhc-primary" />Staff Management</CardTitle></CardHeader>
      <CardContent><p className="text-lhc-text-muted text-sm">Invite, manage, and set permissions for staff members. Clinic: {clinicId}</p></CardContent>
    </Card>
  )
}
