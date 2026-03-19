'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Stethoscope } from 'lucide-react'

export default function DoctorManagement({ clinicId }: { clinicId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lhc-text-main flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-lhc-primary" />
          Doctor Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lhc-text-muted text-sm">
          Manage your clinic&apos;s doctors, schedules, and appointment slots.
          <br />
          <span className="text-xs opacity-60">Clinic ID: {clinicId}</span>
        </p>
      </CardContent>
    </Card>
  )
}
