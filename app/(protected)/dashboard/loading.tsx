import { Loader2 } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-lhc-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-lhc-primary" />
    </div>
  )
}
