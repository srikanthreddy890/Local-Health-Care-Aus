'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Phone, Pencil, Trash2, Eye, Calendar, Heart, X, Loader2, Mail, ExternalLink, BadgeCheck, Search } from 'lucide-react'
import { useFavoriteClinics, type ClinicFavorite } from '@/lib/hooks/useFavoriteClinics'
import { getInitials } from '@/lib/utils'
import DefaultAvatar from '@/components/DefaultAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import AddToFavoritesDialog from '@/components/AddToFavoritesDialog'

const CLINIC_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  dental: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-l-sky-400' },
  gp: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-l-emerald-400' },
  'allied health': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-l-violet-400' },
  specialist: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-l-amber-400' },
  'mental health': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-l-pink-400' },
  pharmacy: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-l-teal-400' },
}

function getClinicTypeStyle(type?: string | null) {
  if (!type) return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-l-gray-300' }
  return CLINIC_TYPE_COLORS[type.toLowerCase()] ?? { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-l-gray-300' }
}

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
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-lhc-primary/15 to-lhc-primary/5 flex items-center justify-center">
          <Heart className="w-10 h-10 text-lhc-primary/40" />
        </div>
        <div className="text-center max-w-sm">
          <p className="font-bold text-lhc-text-main text-lg">No favorite clinics yet</p>
          <p className="text-sm text-lhc-text-muted mt-2 leading-relaxed">
            Browse clinics and tap the heart icon to save them here for quick access to booking and contact info.
          </p>
        </div>
        <Button onClick={() => router.push('/clinics')} className="gap-2 px-6">
          <Search className="w-4 h-4" />
          Browse Clinics
        </Button>
        <p className="text-xs text-lhc-text-muted/70">
          Tip: You can add custom labels and notes to your favorites
        </p>
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
              <button onClick={() => setDeleteTarget(null)} className="text-lhc-text-muted hover:text-lhc-text-main transition-colors">
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
  const address = fav.clinic?.address_line1
  const cityState = [fav.clinic?.city, fav.clinic?.state].filter(Boolean).join(', ')
  const fullAddress = [address, cityState].filter(Boolean).join(', ')
  const initials = getInitials(fav.clinic?.name ?? displayName)
  const typeStyle = getClinicTypeStyle(fav.clinic?.clinic_type)

  const specs = Array.isArray(fav.clinic?.specializations) ? fav.clinic.specializations as string[] : []
  const visibleSpecs = specs.slice(0, 3)
  const extraSpecCount = specs.length - 3

  return (
    <div className={`bg-white rounded-2xl border border-lhc-border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 ${typeStyle.border}`}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden">
          {fav.clinic?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fav.clinic.logo_url} alt={fav.clinic.name} className="w-full h-full object-cover" />
          ) : (
            <DefaultAvatar variant="clinic" className="w-full h-full rounded-xl" />
          )}
        </div>

        {/* Name block */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-lhc-text-main text-sm leading-tight truncate">{displayName}</p>
            {fav.clinic?.is_verified && (
              <BadgeCheck className="w-4 h-4 text-lhc-primary flex-shrink-0" />
            )}
            {hasCustomName && (
              <Badge variant="purple" className="text-[10px] px-1.5 py-0">Custom</Badge>
            )}
          </div>
          {hasCustomName && fav.clinic?.name && (
            <p className="text-xs text-lhc-text-muted mt-0.5 truncate">{fav.clinic.name}</p>
          )}
          {fav.clinic?.clinic_type && (
            <Badge className={`mt-1 text-[10px] px-2 py-0.5 font-medium border-0 ${typeStyle.bg} ${typeStyle.text}`}>
              {fav.clinic.clinic_type}
            </Badge>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg text-lhc-text-muted hover:text-lhc-primary hover:bg-lhc-primary/10 transition-colors cursor-pointer"
            title="Edit favorite"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-lhc-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            title="Remove favorite"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description */}
      {fav.clinic?.description && (
        <p className="text-xs text-lhc-text-muted leading-relaxed line-clamp-2">{fav.clinic.description}</p>
      )}

      {/* Notes */}
      {fav.notes && (
        <div className="bg-amber-50/60 border border-amber-100 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-800 italic leading-relaxed">{fav.notes}</p>
        </div>
      )}

      {/* Specialization tags */}
      {visibleSpecs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleSpecs.map((spec, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-lhc-background border border-lhc-border text-lhc-text-muted font-medium">
              {spec}
            </span>
          ))}
          {extraSpecCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-lhc-primary/10 text-lhc-primary font-medium">
              +{extraSpecCount} more
            </span>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="flex flex-col gap-1.5 text-xs text-lhc-text-muted">
        {fullAddress && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{fullAddress}</span>
          </div>
        )}
        {fav.clinic?.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{fav.clinic.phone}</span>
          </div>
        )}
        {fav.clinic?.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{fav.clinic.email}</span>
          </div>
        )}
        {fav.clinic?.website && (
          <div className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate text-lhc-primary">{fav.clinic.website.replace(/^https?:\/\//, '')}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2.5 mt-auto pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          className="flex-1 h-10 rounded-xl gap-1.5 cursor-pointer hover:border-lhc-primary hover:text-lhc-primary transition-colors"
        >
          <Eye className="w-4 h-4" />
          View
        </Button>
        <Button
          size="sm"
          onClick={onBook}
          className="flex-1 h-10 rounded-xl gap-1.5 cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
          Book
        </Button>
      </div>
    </div>
  )
}
