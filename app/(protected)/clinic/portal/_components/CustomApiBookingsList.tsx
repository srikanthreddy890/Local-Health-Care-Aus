'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe } from 'lucide-react'

export default function CustomApiBookingsList({ clinicId: _ }: { clinicId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lhc-text-main flex items-center gap-2">
          <Globe className="w-5 h-5 text-lhc-primary" />
          Custom API Bookings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lhc-text-muted text-sm">
          Bookings received via your custom API integration will appear here.
        </p>
      </CardContent>
    </Card>
  )
}
