'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, Gift, Clock, Award, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'

interface Props {
  userId: string
}

interface LoyaltyStats {
  availablePoints: number
  lifetimePoints: number
  expiringPoints: number
  earliestExpiry: string | null
}

type TransactionType = 'earned' | 'redeemed' | 'expired' | 'bonus' | 'refunded' | 'referral'

interface Transaction {
  id: string
  points: number
  transaction_type: TransactionType
  description: string | null
  created_at: string
  clinic_id: string | null
  expires_at: string | null
}

const POINTS_PER_DOLLAR = 5  // 5 loyalty points = $1 AUD
const POINTS_TO_AUD = (pts: number) => (Math.abs(pts) / POINTS_PER_DOLLAR).toFixed(2)

export default function LoyaltyTracker({ userId }: Props) {
  const [displayCount, setDisplayCount] = useState(5)

  const { data: stats, isLoading: statsLoading } = useQuery<LoyaltyStats>({
    queryKey: ['loyalty-stats', userId],
    queryFn: async () => {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      const now = new Date()
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const [{ data: account }, { data: expiring }] = await Promise.all([
        db
          .from('loyalty_accounts')
          .select('total_points, lifetime_points')
          .eq('user_id', userId)
          .maybeSingle(),

        // Points expiring within 30 days: earned transactions where
        // expires_at is between now and now+30days and not yet expired
        db
          .from('loyalty_transactions')
          .select('points, expires_at')
          .eq('user_id', userId)
          .eq('transaction_type', 'earned')
          .eq('is_expired', false)
          .gte('expires_at', now.toISOString())
          .lte('expires_at', thirtyDaysFromNow.toISOString())
          .gt('points', 0)
          .order('expires_at', { ascending: true }),
      ])

      const expiringRows = (expiring ?? []) as { points: number; expires_at: string }[]
      const expiringPoints = expiringRows.reduce((s, r) => s + (r.points ?? 0), 0)
      const earliestExpiry = expiringRows.length > 0 ? expiringRows[0].expires_at : null

      return {
        availablePoints: account?.total_points ?? 0,
        lifetimePoints: account?.lifetime_points ?? 0,
        expiringPoints,
        earliestExpiry,
      }
    },
  })

  const { data: transactions, isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ['loyalty-transactions', userId],
    queryFn: async () => {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { data } = await db
        .from('loyalty_transactions')
        .select('id, points, transaction_type, description, created_at, clinic_id, expires_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      return (data ?? []) as Transaction[]
    },
  })

  const isLoading = statsLoading || txLoading

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
      </div>
    )
  }

  const expiringPoints = stats?.expiringPoints ?? 0
  const visibleTxns = (transactions ?? []).slice(0, displayCount)

  return (
    <div className="space-y-4">
      {/* Expiring soon alert */}
      {expiringPoints > 0 && (
        <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-700 dark:text-orange-300 text-sm">
              Points expiring soon!
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              {expiringPoints} points (${POINTS_TO_AUD(expiringPoints)} AUD) will expire within 30 days
              {stats?.earliestExpiry && (
                <> — earliest on {new Date(stats.earliestExpiry).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</>
              )}
              .
            </p>
          </div>
        </div>
      )}

      {/* Stats card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lhc-text-main flex items-center gap-2">
            <Star className="w-5 h-5 text-lhc-primary" />
            Loyalty Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold text-lhc-primary">{stats?.availablePoints ?? 0}</p>
              <p className="text-xs text-lhc-text-muted">Available Points</p>
              <p className="text-xs font-medium text-lhc-text-main">
                = ${POINTS_TO_AUD(stats?.availablePoints ?? 0)} AUD
              </p>
            </div>
            <div className="text-center space-y-1 border-x border-lhc-border">
              <p className="text-2xl font-bold text-lhc-text-main">{stats?.lifetimePoints ?? 0}</p>
              <p className="text-xs text-lhc-text-muted">Lifetime Points</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold text-orange-500">{expiringPoints}</p>
              <p className="text-xs text-lhc-text-muted">Expiring (30d)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How to Use Points */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-lhc-text-main">How to Use Points</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm text-lhc-text-muted list-disc list-inside">
            <li>Earn points for every completed appointment (rate varies by clinic).</li>
            <li>Redeem points at checkout — 5 pts = $1.00 AUD off your booking.</li>
            <li>First-booking bonus: earn extra points for your first visit to a new clinic.</li>
            <li>Points expire 12 months after they are earned if not redeemed.</li>
            <li>If you cancel a booking, redeemed points are refunded to your account.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lhc-text-main flex items-center gap-2">
            <Clock className="w-4 h-4 text-lhc-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {visibleTxns.length === 0 ? (
            <p className="text-lhc-text-muted text-sm text-center py-4">No transactions yet.</p>
          ) : (
            <>
              {visibleTxns.map((txn) => {
                const type = txn.transaction_type
                const isPositive = type === 'earned' || type === 'refunded' || type === 'bonus' || type === 'referral'

                const icon = type === 'earned' ? (
                  <Star className="w-4 h-4 text-green-600" />
                ) : type === 'redeemed' ? (
                  <Gift className="w-4 h-4 text-lhc-primary" />
                ) : type === 'refunded' ? (
                  <TrendingUp className="w-4 h-4 text-lhc-primary" />
                ) : type === 'bonus' || type === 'referral' ? (
                  <Award className="w-4 h-4 text-yellow-500" />
                ) : (
                  <Clock className="w-4 h-4 text-red-500" />
                )

                const pointsDisplay = isPositive
                  ? `+${txn.points} pts`
                  : `−${Math.abs(txn.points)} pts`

                const badgeVariant = type === 'earned'
                  ? 'success'
                  : type === 'redeemed'
                  ? 'default'
                  : type === 'bonus' || type === 'referral'
                  ? 'warning'
                  : type === 'refunded'
                  ? 'default'
                  : 'destructive'

                const dateStr = new Date(txn.created_at).toLocaleDateString('en-AU', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })

                return (
                  <div key={txn.id} className="flex items-center justify-between py-2 border-b border-lhc-border last:border-0">
                    <div className="flex items-center gap-2">
                      {icon}
                      <div>
                        <p className="text-sm font-medium text-lhc-text-main capitalize">
                          {type}
                        </p>
                        <p className="text-xs text-lhc-text-muted">
                          {txn.description ?? dateStr}
                        </p>
                      </div>
                    </div>
                    <Badge variant={badgeVariant as 'success' | 'default' | 'warning' | 'destructive'}>
                      {pointsDisplay}
                    </Badge>
                  </div>
                )
              })}

              <div className="flex gap-2 justify-center pt-1">
                {(transactions?.length ?? 0) > displayCount && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-lhc-text-muted"
                    onClick={() => setDisplayCount((n) => n + 5)}
                  >
                    View More
                  </Button>
                )}
                {displayCount > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-lhc-text-muted"
                    onClick={() => setDisplayCount(5)}
                  >
                    Show Less
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
