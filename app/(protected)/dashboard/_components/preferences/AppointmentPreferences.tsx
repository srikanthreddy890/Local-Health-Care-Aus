'use client'

import { useState } from 'react'
import { differenceInDays } from 'date-fns'
import { useAppointmentPreferences } from '@/lib/hooks/useAppointmentPreferences'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, Bell, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import PreferredAppointmentForm from './PreferredAppointmentForm'
import { cn } from '@/lib/utils'

interface Props {
  userId: string
}

function getExpiryStatus(preferredDate: string) {
  const diff = differenceInDays(new Date(preferredDate), new Date())
  if (diff < 0) return { key: 'expired', label: 'Past date', color: 'text-red-600 dark:text-red-400' }
  if (diff === 0) return { key: 'today', label: 'Today', color: 'text-lhc-primary' }
  if (diff <= 3) return { key: 'coming-soon', label: `In ${diff} day${diff === 1 ? '' : 's'}`, color: 'text-orange-600 dark:text-orange-400' }
  if (diff <= 7) return { key: 'upcoming', label: `In ${diff} days`, color: 'text-green-600 dark:text-green-400' }
  return null
}

function getNotifLabel(email: boolean, sms: boolean, push: boolean): string {
  const methods = []
  if (email) methods.push('Email')
  if (sms) methods.push('SMS')
  if (push) methods.push('In-app')
  return methods.join(', ') || 'None'
}

export default function AppointmentPreferences({ userId }: Props) {
  const { preferences, loading, createPreference, deletePreference } = useAppointmentPreferences(userId)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deletePreference(id)
    setDeletingId(null)
  }

  return (
    <>
      <Card className="border-lhc-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-lhc-primary" />
            Appointment Reminders
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Add Reminder
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
            </div>
          ) : preferences.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="w-10 h-10 text-lhc-text-muted mx-auto mb-3 opacity-40" />
              <p className="text-sm text-lhc-text-muted">No active appointment reminders.</p>
              <p className="text-xs text-lhc-text-muted mt-1">
                Set a preferred date and time and we will notify you when a slot becomes available.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {preferences.map((pref) => {
                const expiry = getExpiryStatus(pref.preferred_date)
                return (
                  <div key={pref.id} className="border border-lhc-border rounded-xl p-4 space-y-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-lhc-text-main truncate">
                          {pref.clinic?.name ?? 'Unknown Clinic'}
                        </p>
                        {pref.doctor && (
                          <p className="text-sm text-lhc-text-muted truncate">{pref.doctor.full_name}</p>
                        )}
                        {pref.service && (
                          <p className="text-sm text-lhc-text-muted truncate">{pref.service.name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={pref.status} />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => handleDelete(pref.id)}
                          disabled={deletingId === pref.id}
                        >
                          {deletingId === pref.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>

                    {/* Found alert with Book Now */}
                    {pref.status === 'notified' && pref.clinic_id && (
                      <div className="flex items-center justify-between gap-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                          <p className="text-xs text-green-700 dark:text-green-400">Appointment Found!</p>
                        </div>
                        <Link href={`/dashboard?tab=appointments&appt=book&clinic_id=${pref.clinic_id}&clinic_name=${encodeURIComponent(pref.clinic?.name ?? 'Clinic')}`}>
                          <Button size="sm" variant="default" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700">
                            <ExternalLink className="w-3 h-3" />
                            Book Now
                          </Button>
                        </Link>
                      </div>
                    )}

                    {/* Error alert */}
                    {(pref.last_check_error || pref.consecutive_errors > 0) && (
                      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                        <p className="text-xs text-red-700 dark:text-red-400">
                          {pref.last_check_error ?? `${pref.consecutive_errors} consecutive check error${pref.consecutive_errors === 1 ? '' : 's'}`}
                        </p>
                      </div>
                    )}

                    {/* Detail rows */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-lhc-text-muted">Date: </span>
                        <span className={cn('font-medium', expiry?.color ?? 'text-lhc-text-main')}>
                          {pref.preferred_date}
                          {expiry && ` (${expiry.label})`}
                        </span>
                      </div>
                      <div>
                        <span className="text-lhc-text-muted">Time: </span>
                        <span className="text-lhc-text-main font-medium">{pref.preferred_time}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-lhc-text-muted">Notify via: </span>
                        <span className="text-lhc-text-main">{getNotifLabel(pref.notification_email, pref.notification_sms, pref.notification_push)}</span>
                      </div>
                      {pref.last_checked_at && (
                        <div className="sm:col-span-2 flex items-center gap-1 text-lhc-text-muted">
                          <Clock className="w-3 h-3" />
                          Last checked: {new Date(pref.last_checked_at).toLocaleString()}
                        </div>
                      )}
                      {pref.notes && (
                        <div className="sm:col-span-2">
                          <span className="text-lhc-text-muted">Notes: </span>
                          <span className="text-lhc-text-main">{pref.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <PreferredAppointmentForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={createPreference}
      />
    </>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'notified':
      return (
        <Badge className="bg-green-600 text-white border-0 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />Found & Sent
        </Badge>
      )
    case 'completed':
      return <Badge variant="secondary">Completed</Badge>
    case 'cancelled':
      return <Badge variant="outline">Cancelled</Badge>
    case 'active':
    default:
      return <Badge className="bg-lhc-primary text-white border-0">Waiting</Badge>
  }
}
