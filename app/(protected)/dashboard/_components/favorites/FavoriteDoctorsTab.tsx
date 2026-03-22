'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Pencil, Trash2, Calendar, Heart, X, Loader2, Stethoscope, Eye, GraduationCap, Search } from 'lucide-react'
import { useFavoriteDoctors, type DoctorFavorite } from '@/lib/hooks/useFavoriteDoctors'
import { getInitials } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Props {
  userId: string
  onBookAppointment: (clinicId: string | null, doctorId: string, doctorName: string) => void
}

export default function FavoriteDoctorsTab({ userId, onBookAppointment }: Props) {
  const router = useRouter()
  const { favorites, loading, updateFavorite, removeFavorite } = useFavoriteDoctors(userId)

  const [editTarget, setEditTarget] = useState<DoctorFavorite | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DoctorFavorite | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editCustomName, setEditCustomName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function openEdit(fav: DoctorFavorite) {
    setEditCustomName(fav.custom_name ?? '')
    setEditNotes(fav.notes ?? '')
    setEditTarget(fav)
  }

  async function handleSaveEdit() {
    if (!editTarget) return
    setSaving(true)
    await updateFavorite(editTarget.id, editCustomName.trim(), editNotes.trim())
    setSaving(false)
    setEditTarget(null)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await removeFavorite(deleteTarget.doctor_id)
    setDeleting(false)
    setDeleteTarget(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
      </div>
    )
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-lhc-primary/15 to-lhc-primary/5 flex items-center justify-center">
          <Heart className="w-10 h-10 text-lhc-primary/40" />
        </div>
        <div className="text-center max-w-sm">
          <p className="font-bold text-lhc-text-main text-lg">No favorite doctors yet</p>
          <p className="text-sm text-lhc-text-muted mt-2 leading-relaxed">
            Visit a clinic page and tap the heart next to a doctor to save them here for easy appointment booking.
          </p>
        </div>
        <Button onClick={() => router.push('/clinics')} className="gap-2 px-6">
          <Search className="w-4 h-4" />
          Browse Clinics
        </Button>
        <p className="text-xs text-lhc-text-muted/70">
          Tip: You can save doctors from any clinic&apos;s detail page
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {favorites.map((fav) => {
          const realName = [fav.doctor?.first_name, fav.doctor?.last_name].filter(Boolean).join(' ')
          const doctorName = fav.custom_name ?? (realName || 'Doctor')
          const hasCustomName = !!fav.custom_name
          const clinicId = fav.clinic_id ?? fav.doctor?.clinic_id ?? null
          const clinicName = fav.clinic?.name ?? null
          const clinicType = fav.clinic?.clinic_type ?? null
          const initials = getInitials(realName || doctorName)
          const avatarUrl = fav.doctor?.avatar_url

          return (
            <div
              key={fav.id}
              className="bg-white rounded-2xl border border-lhc-border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden bg-lhc-primary/10 flex items-center justify-center ring-2 ring-lhc-primary/20">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={realName || 'Doctor'} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lhc-primary font-bold text-sm">{initials}</span>
                  )}
                </div>

                {/* Name block */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-lhc-text-main text-sm leading-tight truncate">{doctorName}</p>
                    {hasCustomName && (
                      <Badge variant="purple" className="text-[10px] px-1.5 py-0">Custom</Badge>
                    )}
                  </div>
                  {hasCustomName && realName && (
                    <p className="text-xs text-lhc-text-muted mt-0.5 truncate">{realName}</p>
                  )}
                  {fav.doctor?.specialty && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Stethoscope className="w-3.5 h-3.5 text-lhc-primary flex-shrink-0" />
                      <p className="text-xs text-lhc-primary font-semibold truncate">{fav.doctor.specialty}</p>
                    </div>
                  )}
                </div>

                {/* Action icons */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => openEdit(fav)}
                    className="p-2 rounded-lg text-lhc-text-muted hover:text-lhc-primary hover:bg-lhc-primary/10 transition-colors cursor-pointer"
                    title="Edit favorite"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(fav)}
                    className="p-2 rounded-lg text-lhc-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Remove favorite"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Qualification */}
              {fav.doctor?.qualifications && (
                <div className="flex items-center gap-1.5 text-xs text-lhc-text-muted">
                  <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{fav.doctor.qualifications}</span>
                </div>
              )}

              {/* Clinic context */}
              {clinicName && (
                <div className="flex items-center gap-2 text-xs text-lhc-text-muted">
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{clinicName}</span>
                  {clinicType && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto flex-shrink-0">
                      {clinicType}
                    </Badge>
                  )}
                </div>
              )}

              {/* Notes */}
              {fav.notes && (
                <div className="bg-amber-50/60 border border-amber-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-800 italic leading-relaxed">{fav.notes}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2.5 mt-auto pt-2">
                {clinicId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/clinic/${clinicId}`)}
                    className="flex-1 h-10 rounded-xl gap-1.5 cursor-pointer hover:border-lhc-primary hover:text-lhc-primary transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Clinic
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => onBookAppointment(clinicId, fav.doctor_id, realName || 'Doctor')}
                  className={`h-10 rounded-xl gap-1.5 cursor-pointer ${clinicId ? 'flex-1' : 'w-full'}`}
                >
                  <Calendar className="w-4 h-4" />
                  Book Appointment
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit dialog */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lhc-text-main">Edit Favorite Doctor</h2>
              <button onClick={() => setEditTarget(null)} disabled={saving} className="text-lhc-text-muted hover:text-lhc-text-main transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wider">Custom Label</label>
              <input
                type="text"
                value={editCustomName}
                onChange={(e) => setEditCustomName(e.target.value)}
                maxLength={60}
                className="w-full border border-lhc-border rounded-xl px-4 py-2.5 text-sm text-lhc-text-main focus:outline-none focus:border-lhc-primary focus:ring-2 focus:ring-lhc-primary/20 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wider">Notes</label>
                <span className="text-xs text-lhc-text-muted">{editNotes.length}/200</span>
              </div>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value.slice(0, 200))}
                rows={3}
                className="w-full border border-lhc-border rounded-xl px-4 py-2.5 text-sm text-lhc-text-main focus:outline-none focus:border-lhc-primary focus:ring-2 focus:ring-lhc-primary/20 transition-all resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
              <Button className="flex-1" onClick={handleSaveEdit} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm overlay */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lhc-text-main">Remove Favorite?</h2>
              <button onClick={() => setDeleteTarget(null)} className="text-lhc-text-muted hover:text-lhc-text-main transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-lhc-text-muted">
              Remove <strong className="text-lhc-text-main">
                {(deleteTarget.custom_name ?? [deleteTarget.doctor?.first_name, deleteTarget.doctor?.last_name].filter(Boolean).join(' ')) || 'this doctor'}
              </strong> from your favorites?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleConfirmDelete} disabled={deleting}>
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
