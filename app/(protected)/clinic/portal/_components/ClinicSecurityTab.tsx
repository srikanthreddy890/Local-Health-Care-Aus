'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'
export default function ClinicSecurityTab({ userId, userEmail, clinicId }: { userId: string; userEmail: string; clinicId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lhc-text-main flex items-center gap-2"><Shield className="w-5 h-5 text-lhc-primary" />Security</CardTitle></CardHeader>
      <CardContent><p className="text-lhc-text-muted text-sm">Manage MFA, password, and account security. User: {userEmail}</p></CardContent>
    </Card>
  )
}
