'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Phone, Pencil, Trash2, Eye, Calendar, Heart, X, Loader2 } from 'lucide-react'
import { useFavoriteClinics, type ClinicFavorite } from '@/lib/hooks/useFavoriteClinics'
import { getInitials } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import AddToFavoritesDialog from '@/components/AddToFavoritesDialog'

interface Props {
  userId: string
  onBookAppointment: (clinicId: string) => void
}

export default function FavoriteClinicsTab({ userId, onBookAppointment }: Props) {
  const router = useRouter()
  const { favorites, loading, updateFavorite, removeFavorite } = useFavoriteClinics(userId)

  const [editTarget, setEditTarget] = useState<ClinicFavorite | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClinicFavorite | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleSaveEdit(customName: string, notes: string): Promise<boolean> {
    if (!editTarget) return false
    const ok = await updateFavorite(editTarget.id, customName, notes)
    if (ok) setEditTarget(null)
    return ok
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await removeFavorite(deleteTarget.clinic_id)
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
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-lhc-primary/10 flex items-center justify-center">
          <Heart className="w-8 h-8 text-lhc-primary/50" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-lhc-text-main">No favorite clinics yet</p>
          <p className="text-sm text-lhc-text-muted mt-1">Browse clinics and tap the heart icon to save them here.</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/clinics')}>
          Browse Clinics
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {favorites.map((fav) => (
          <ClinicFavoriteCard
            key={fav.id}
            fav={fav}
            onView={() => router.push(`/clinic/${fav.clinic_id}`)}
            onBook={() => onBookAppointment(fav.clinic_id)}
            onEdit={() => setEditTarget(fav)}
            onDelete={() => setDeleteTarget(fav)}
          />
        ))}
      </div>

      {/* Edit dialog */}
      {editTarget && (
        <AddToFavoritesDialog
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          clinicName={editTarget.clinic?.name ?? ''}
          initialCustomName={editTarget.custom_name ?? ''}
          initialNotes={editTarget.notes ?? ''}
          onSave={handleSaveEdit}
          isEditing
        />
      )}

      {/* Delete confirm overlay */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lhc-text-main">Remove Favorite?</h2>
              <button onClick={() => setDeleteTarget(null)} className="text-lhc-text-muted hover:text-lhc-text-main">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-lhc-text-muted">
              Remove <strong className="text-lhc-text-main">{deleteTarget.custom_name ?? deleteTarget.clinic?.name ?? 'this clinic'}</strong> from your favorites?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
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

// ── Clinic Favorite Card ───────────────────────────────────────────────────────
interface CardProps {
  fav: ClinicFavorite
  onView: () => void
  onBook: () => void
  onEdit: () => void
  onDelete: () => void
}

function ClinicFavoriteCard({ fav, onView, onBook, onEdit, onDelete }: CardProps) {
  const displayName = fav.custom_name ?? fav.clinic?.name ?? 'Clinic'
  const hasCustomName = !!fav.custom_name
  const cityState = [fav.clinic?.city, fav.clinic?.state].filter(Boolean).join(', ')
  const initials = getInitials(fav.clinic?.name ?? displayName)

  return (
    <div className="bg-white rounded-2xl border border-lhc-border shadow-sm p-5 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden bg-lhc-primary/10 flex items-center justify-center">
          {fav.clinic?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fav.clinic.logo_url} alt={fav.clinic.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lhc-primary font-bold text-sm">{initials}</span>
          )}
        </div>

        {/* Name block */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-lhc-text-main text-sm leading-tight truncate">{displayName}</p>
            {hasCustomName && (
              <Badge variant="purple" className="text-[10px] px-1.5 py-0">Custom</Badge>
            )}
          </div>
          {hasCustomName && fav.clinic?.name && (
            <p className="text-xs text-lhc-text-muted mt-0.5 truncate">{fav.clinic.name}</p>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-lhc-text-muted hover:text-lhc-primary hover:bg-lhc-primary/10 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-lhc-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notes */}
      {fav.notes && (
        <p className="text-xs text-lhc-text-muted italic leading-relaxed">{fav.notes}</p>
      )}

      {/* Metadata */}
      <div className="flex flex-col gap-1">
        {cityState && (
          <div className="flex items-center gap-1.5 text-xs text-lhc-text-muted">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            {cityState}
          </div>
        )}
        {fav.clinic?.phone && (
          <div className="flex items-center gap-1.5 text-xs text-lhc-text-muted">
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
            {fav.clinic.phone}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-auto pt-1">
        <button
          onClick={onView}
          className="flex-1 h-9 border border-lhc-border rounded-xl text-xs font-semibold text-lhc-text-muted hover:border-lhc-primary hover:text-lhc-primary transition-colors flex items-center justify-center gap-1.5"
        >
          <Eye className="w-3.5 h-3.5" />
          View
        </button>
        <button
          onClick={onBook}
          className="flex-1 h-9 bg-lhc-primary hover:bg-lhc-primary-hover text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
        >
          <Calendar className="w-3.5 h-3.5" />
          Book
        </button>
      </div>
    </div>
  )
}
