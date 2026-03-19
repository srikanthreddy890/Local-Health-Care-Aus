'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Newspaper } from 'lucide-react'
export default function ClinicBlogManager({ clinicId, clinicName }: { clinicId: string; clinicName: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lhc-text-main flex items-center gap-2"><Newspaper className="w-5 h-5 text-lhc-primary" />Blog Manager</CardTitle></CardHeader>
      <CardContent><p className="text-lhc-text-muted text-sm">Create and manage blog posts for {clinicName || 'your clinic'}.</p></CardContent>
    </Card>
  )
}
