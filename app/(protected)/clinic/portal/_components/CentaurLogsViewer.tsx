'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileCode } from 'lucide-react'
export default function CentaurLogsViewer({ clinicId }: { clinicId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lhc-text-main flex items-center gap-2"><FileCode className="w-5 h-5 text-lhc-primary" />Centaur Logs</CardTitle></CardHeader>
      <CardContent><p className="text-lhc-text-muted text-sm">View sync history and error logs for Centaur integration. Clinic: {clinicId}</p></CardContent>
    </Card>
  )
}
