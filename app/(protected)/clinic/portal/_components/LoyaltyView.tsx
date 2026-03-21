'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Gift, Users, Calendar, Star, CheckCircle, Loader2 } from 'lucide-react'

const POINTS_PER_DOLLAR = 5

export default function LoyaltyView({ clinicId }: { clinicId: string }) {
  const { data: loyaltyData } = useQuery({
    queryKey: ['clinic-loyalty', clinicId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const [{ data: txns }, { data: redemptions }, { count: monthlyBookings }, { count: monthlyRedemptionCount }] = await Promise.all([
        // All transactions for this clinic (stats)
        supabase
          .from('loyalty_transactions')
          .select('points, transaction_type, user_id')
          .eq('clinic_id', clinicId),

        // Recent redemptions with patient profiles (history list)
        supabase
          .from('loyalty_transactions')
          .select('id, points, created_at, description, booking_id, profiles:user_id(first_name, last_name)')
          .eq('clinic_id', clinicId)
          .eq('transaction_type', 'redeemed')
          .order('created_at', { ascending: false })
          .limit(20),

        // Monthly bookings count
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinicId)
          .gte('created_at', startOfMonth.toISOString()),

        // Properly date-filtered monthly redemptions count
        supabase
          .from('loyalty_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinicId)
          .eq('transaction_type', 'redeemed')
          .gte('created_at', startOfMonth.toISOString()),
      ])

      const all = (txns ?? []) as Record<string, unknown>[]
      const pointsGiven = all
        .filter((t) => t.transaction_type === 'earned')
        .reduce((s: number, t: Record<string, unknown>) => s + ((t.points as number) ?? 0), 0)
      const activePatients = new Set(all.map((t: Record<string, unknown>) => t.user_id)).size

      return {
        pointsGiven,
        activePatients,
        monthlyBookings: monthlyBookings ?? 0,
        monthlyRedemptionCount: monthlyRedemptionCount ?? 0,
        redemptions: redemptions ?? [],
      }
    },
    enabled: !!clinicId,
  })

  const stats = [
    { icon: <Gift className="w-5 h-5 text-lhc-primary" />, label: 'Total Points Given', value: loyaltyData?.pointsGiven?.toLocaleString() ?? '—' },
    { icon: <Users className="w-5 h-5 text-lhc-primary" />, label: 'Active Patients', value: loyaltyData?.activePatients?.toLocaleString() ?? '—' },
    { icon: <Calendar className="w-5 h-5 text-lhc-primary" />, label: 'Monthly Bookings', value: loyaltyData?.monthlyBookings?.toLocaleString() ?? '—' },
    { icon: <Star className="w-5 h-5 text-lhc-primary" />, label: 'Points Redeemed This Month', value: loyaltyData?.monthlyRedemptionCount?.toLocaleString() ?? '—' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0">{s.icon}</div>
                <div className="min-w-0">
                  <p className="text-xs text-lhc-text-muted truncate">{s.label}</p>
                  {!loyaltyData ? (
                    <div className="h-6 w-12 bg-lhc-border rounded animate-pulse mt-0.5" />
                  ) : (
                    <p className="text-xl font-bold text-lhc-text-main">{s.value}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lhc-text-main">Redemption History</CardTitle>
        </CardHeader>
        <CardContent>
          {!loyaltyData ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
            </div>
          ) : (loyaltyData.redemptions ?? []).length === 0 ? (
            <div className="text-center py-8">
              <Gift className="w-10 h-10 text-lhc-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-lhc-text-muted text-sm">No points have been redeemed yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(loyaltyData.redemptions as Array<Record<string, unknown>>).map((r) => {
                const profile = r.profiles as { first_name?: string; last_name?: string } | null
                const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Unknown'
                const pts = Math.abs(r.points as number)
                const discount = (pts / POINTS_PER_DOLLAR).toFixed(2)
                const bookingId = r.booking_id ? (r.booking_id as string).slice(0, 8) : null
                const description = r.description as string | null
                const date = r.created_at
                  ? new Date(r.created_at as string).toLocaleDateString('en-AU')
                  : '—'

                // Time ago display
                const timeAgo = r.created_at ? getTimeAgo(r.created_at as string) : ''

                return (
                  <div
                    key={r.id as string}
                    className="flex items-center justify-between border border-lhc-border rounded-lg p-3 bg-lhc-surface"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-lhc-text-main">{name}</p>
                      <p className="text-xs text-lhc-text-muted">
                        {description ?? `Redeemed ${pts} points for $${discount} discount`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {bookingId && (
                          <span className="text-[10px] font-mono text-lhc-text-muted">
                            Booking: {bookingId}
                          </span>
                        )}
                        <span className="text-[10px] text-lhc-text-muted">{timeAgo || date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline">{pts} pts</Badge>
                      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                        ${discount}
                      </Badge>
                      <Badge variant="success" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Redeemed
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-lhc-surface border-lhc-border">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-lhc-text-main mb-2">How Points Redemption Works</h3>
          <ul className="space-y-1 text-sm text-lhc-text-muted list-disc list-inside">
            <li>Patients earn points for every completed appointment.</li>
            <li>5 points = $1.00 AUD — patients can redeem points for a discount on future bookings.</li>
            <li>Minimum 5 points required to redeem.</li>
            <li>Points are awarded when attendance is marked, not at booking time.</li>
            <li>If a booking is cancelled, any redeemed points are automatically refunded.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return new Date(dateStr).toLocaleDateString('en-AU')
}
