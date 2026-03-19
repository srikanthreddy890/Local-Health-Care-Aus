'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-lhc-background flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <h2 className="text-xl font-semibold text-lhc-text-main">Something went wrong</h2>
        <p className="text-sm text-lhc-text-muted">
          {error.message || 'An unexpected error occurred loading your dashboard.'}
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
