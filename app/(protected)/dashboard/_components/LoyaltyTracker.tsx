'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, Gift, Clock, Award, TrendingUp, AlertTriangle, Loader2, ChevronRight, Calendar } from 'lucide-react'

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

import { POINTS_PER_DOLLAR, pointsToAud } from '@/lib/constants/loyalty'

/**
 * Dynamic milestone: the next multiple of POINTS_PER_DOLLAR above the
 * user's current balance. E.g. if they have 30 pts and POINTS_PER_DOLLAR
 * is 5, the next milestone is 35 (=$7 AUD). This keeps the goal close
 * and motivating rather than an arbitrary big number.
 */
function getNextMilestone(currentPts: number): number {
  return (Math.floor(currentPts / POINTS_PER_DOLLAR) + 1) * POINTS_PER_DOLLAR
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) {
    const h = Math.floor(diffHours)
    return `${h}h ago`
  }

  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return `Today, ${date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}`
  }

  return date.toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) + ', ' + date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}

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

      const [accountRes, expiringRes] = await Promise.all([
        db
          .from('loyalty_accounts')
          .select('total_points, lifetime_points')
          .eq('user_id', userId)
          .maybeSingle(),

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

      if (accountRes.error) throw accountRes.error
      if (expiringRes.error) throw expiringRes.error

      const account = accountRes.data
      const expiringRows = (expiringRes.data ?? []) as { points: number; expires_at: string }[]
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
      const { data, error } = await db
        .from('loyalty_transactions')
        .select('id, points, transaction_type, description, created_at, clinic_id, expires_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
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

  const availablePoints = stats?.availablePoints ?? 0
  const expiringPoints = stats?.expiringPoints ?? 0
  const visibleTxns = (transactions ?? []).slice(0, displayCount)

  // Progress toward next reward milestone
  const nextMilestone = getNextMilestone(availablePoints)
  const currentMilestone = nextMilestone - POINTS_PER_DOLLAR
  const progressInSegment = availablePoints - currentMilestone
  const progressPct = (progressInSegment / POINTS_PER_DOLLAR) * 100
  const pointsNeeded = nextMilestone - availablePoints
  const rewardValue = pointsToAud(nextMilestone)

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
              {expiringPoints} points (${pointsToAud(expiringPoints)} AUD) will expire within 30 days
              {stats?.earliestExpiry && (
                <> — earliest on {new Date(stats.earliestExpiry).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</>
              )}
              .
            </p>
          </div>
        </div>
      )}

      {/* Stats card with progress bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lhc-text-main flex items-center gap-2">
            <Star className="w-5 h-5 text-lhc-primary" />
            Loyalty Points
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold text-lhc-primary">{availablePoints}</p>
              <p className="text-xs text-lhc-text-muted">Available Points</p>
              <p className="text-xs font-medium text-lhc-text-main">
                = ${pointsToAud(availablePoints)} AUD
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

          {/* Progress bar toward next reward */}
          <div className="bg-lhc-background/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-lhc-text-main">
                {pointsNeeded > 0
                  ? `${pointsNeeded} more points to unlock $${rewardValue} off`
                  : `You can redeem $${pointsToAud(availablePoints)} AUD!`
                }
              </p>
              <span className="text-xs text-lhc-text-muted">{availablePoints} / {nextMilestone} pts</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-lhc-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How to Use Points — visual cards */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-3 min-w-max sm:min-w-0 sm:grid sm:grid-cols-3">
          <div className="w-[140px] sm:w-auto bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center space-y-2">
            <div className="w-9 h-9 rounded-full bg-lhc-primary/10 flex items-center justify-center mx-auto">
              <Calendar className="w-4.5 h-4.5 text-lhc-primary" />
            </div>
            <p className="text-xs font-semibold text-lhc-text-main">Visit a Clinic</p>
            <p className="text-[11px] text-lhc-text-muted">Earn points for every completed appointment</p>
          </div>
          <div className="w-[140px] sm:w-auto bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center space-y-2">
            <div className="w-9 h-9 rounded-full bg-lhc-primary/10 flex items-center justify-center mx-auto">
              <TrendingUp className="w-4.5 h-4.5 text-lhc-primary" />
            </div>
            <p className="text-xs font-semibold text-lhc-text-main">Accumulate Points</p>
            <p className="text-[11px] text-lhc-text-muted">{POINTS_PER_DOLLAR} pts = $1.00 AUD discount</p>
          </div>
          <div className="w-[140px] sm:w-auto bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center space-y-2">
            <div className="w-9 h-9 rounded-full bg-lhc-primary/10 flex items-center justify-center mx-auto">
              <Gift className="w-4.5 h-4.5 text-lhc-primary" />
            </div>
            <p className="text-xs font-semibold text-lhc-text-main">Redeem at Checkout</p>
            <p className="text-[11px] text-lhc-text-muted">Apply points as a discount on your next booking</p>
          </div>
        </div>
      </div>

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
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-lhc-text-muted italic">
                Complete your first appointment to start earning points
              </p>
            </div>
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

                const timestamp = formatTimestamp(txn.created_at)

                return (
                  <div key={txn.id} className="flex items-center justify-between py-2.5 border-b border-lhc-border last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-lhc-background flex items-center justify-center shrink-0">
                        {icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-lhc-text-main capitalize">
                          {type}
                        </p>
                        <p className="text-xs text-lhc-text-muted">
                          {txn.description ?? 'Loyalty transaction'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <Badge variant={badgeVariant as 'success' | 'default' | 'warning' | 'destructive'}>
                        {pointsDisplay}
                      </Badge>
                      <p className="text-[11px] text-lhc-text-muted mt-0.5">{timestamp}</p>
                    </div>
                  </div>
                )
              })}

              <div className="flex gap-2 justify-end pt-1">
                {(transactions?.length ?? 0) > displayCount && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-lhc-primary hover:text-lhc-primary-hover"
                    onClick={() => setDisplayCount((n) => n + 5)}
                  >
                    View all activity <ChevronRight className="w-3 h-3 ml-1" />
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
