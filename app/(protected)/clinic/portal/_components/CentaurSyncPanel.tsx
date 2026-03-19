'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw } from 'lucide-react'
export default function CentaurSyncPanel({ practiceId, clinicId }: { practiceId: string; clinicId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lhc-text-main flex items-center gap-2"><RefreshCw className="w-5 h-5 text-lhc-primary" />Centaur Sync</CardTitle></CardHeader>
      <CardContent><p className="text-lhc-text-muted text-sm">Sync doctors, services, and appointments from Centaur. Practice ID: {practiceId || 'Not configured'}</p></CardContent>
    </Card>
  )
}
