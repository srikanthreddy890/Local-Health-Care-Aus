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
  const progressPct = nextMilestone > 0 ? (availablePoints / nextMilestone) * 100 : 0
  const pointsNeeded = nextMilestone - availablePoints
  const rewardValue = pointsToAud(nextMilestone)

  // SVG ring calculations
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPct / 100) * circumference

  // How-it-works steps
  const steps = [
    { icon: <Calendar className="w-3.5 h-3.5 text-lhc-primary" />, title: 'Visit a Clinic', description: 'Earn points for every completed appointment' },
    { icon: <TrendingUp className="w-3.5 h-3.5 text-lhc-primary" />, title: 'Accumulate Points', description: `${POINTS_PER_DOLLAR} pts = $1.00 AUD discount` },
    { icon: <Gift className="w-3.5 h-3.5 text-lhc-primary" />, title: 'Redeem at Checkout', description: 'Apply points as a discount on your next booking' },
  ]

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

      {/* L1 — Points Hero: Ring Progress Arc + Stats */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-5">
            {/* LEFT: SVG circular ring with centered text */}
            <div className="relative shrink-0 w-[88px] h-[88px]">
              <svg width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="44" cy="44" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="7" />
                <circle
                  cx="44"
                  cy="44"
                  r={radius}
                  fill="none"
                  stroke="#00A86B"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-bold text-[#00A86B] text-lg leading-none">{availablePoints}</span>
                <span className="text-gray-400 text-[10px] leading-none mt-0.5">pts</span>
              </div>
            </div>

            {/* RIGHT: Dollar value + progress bar */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lhc-text-main text-xl leading-tight">
                ${pointsToAud(availablePoints)} AUD available
              </p>
              <div className="mt-3">
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#00A86B] transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-lhc-text-muted mt-1.5">
                  {availablePoints} / {nextMilestone} pts · {pointsNeeded} more to unlock ${rewardValue} off
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* L2 — Stats Row: Metric Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-lhc-background/60 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-lhc-primary">{availablePoints}</p>
          <p className="text-[11px] text-lhc-text-muted">Available</p>
        </div>
        <div className="bg-lhc-background/60 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-lhc-text-main">{stats?.lifetimePoints ?? 0}</p>
          <p className="text-[11px] text-lhc-text-muted">Lifetime</p>
        </div>
        <div className="bg-lhc-background/60 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-amber-600">{expiringPoints}</p>
          <p className="text-[11px] text-lhc-text-muted">Expiring (30d)</p>
        </div>
      </div>
      <div className="w-full bg-lhc-primary/10 rounded-lg py-2.5 text-center">
        <p className="text-sm font-medium text-lhc-primary">Redeem points at checkout</p>
      </div>

      {/* L3 — How It Works: Numbered Steps in Single Card */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-lhc-border">
            {steps.map((step, i) => (
              <div key={i} className="flex flex-col items-center py-5 px-2 sm:px-3 text-center gap-2">
                <span className="w-5 h-5 rounded-full bg-lhc-primary text-white text-[9px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                  {step.icon}
                </div>
                <p className="text-[11px] font-semibold text-lhc-text-main">{step.title}</p>
                <p className="text-[10px] text-lhc-text-muted leading-tight">{step.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* L4 — Activity Feed: Richer Rows */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lhc-text-main flex items-center gap-2">
            <Clock className="w-4 h-4 text-lhc-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
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
                  <Gift className="w-4 h-4 text-blue-600" />
                ) : type === 'refunded' ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : type === 'bonus' || type === 'referral' ? (
                  <Award className="w-4 h-4 text-green-600" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-600" />
                )

                const iconBg = type === 'earned' || type === 'bonus' || type === 'referral'
                  ? 'bg-green-50'
                  : type === 'redeemed'
                  ? 'bg-blue-50'
                  : 'bg-amber-50'

                const pointsDisplay = isPositive
                  ? `+${txn.points} pts`
                  : `−${Math.abs(txn.points)} pts`

                const timestamp = formatTimestamp(txn.created_at)

                return (
                  <div key={txn.id} className="flex items-center justify-between py-2.5 border-b border-lhc-border last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-[30px] h-[30px] rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                        {icon}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-lhc-text-main capitalize">
                          {type}
                        </p>
                        <p className="text-[11px] text-lhc-text-muted">
                          {txn.description ?? 'Loyalty transaction'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        isPositive
                          ? 'bg-green-50 text-green-800'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {pointsDisplay}
                      </span>
                      <p className="text-[10px] text-lhc-text-muted mt-0.5">{timestamp}</p>
                    </div>
                  </div>
                )
              })}

              {(transactions?.length ?? 0) > displayCount && (
                <div className="flex justify-end pt-2">
                  <button
                    className="text-lhc-primary text-[11px] font-medium hover:underline"
                    onClick={() => setDisplayCount((n) => n + 5)}
                  >
                    View all activity →
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
