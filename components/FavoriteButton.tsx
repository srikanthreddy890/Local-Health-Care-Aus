'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Loader2 } from 'lucide-react'
import { useFavoriteClinics } from '@/lib/hooks/useFavoriteClinics'
import AddToFavoritesDialog from '@/components/AddToFavoritesDialog'

interface Props {
  clinicId: string
  clinicName: string
  userId: string | null
  className?: string
  showLabel?: boolean
}

export default function FavoriteButton({ clinicId, clinicName, userId, className = '', showLabel = false }: Props) {
  const router = useRouter()
  const { isFavorite, addFavorite, removeFavorite, loading } = useFavoriteClinics(userId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const favorited = isFavorite(clinicId)

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (!userId) { router.push('/auth'); return }
    if (favorited) {
      setRemoving(true)
      await removeFavorite(clinicId)
      setRemoving(false)
    } else {
      setDialogOpen(true)
    }
  }

  async function handleSave(customName: string, notes: string): Promise<boolean> {
    return await addFavorite(clinicId, customName || undefined, notes || undefined)
  }

  const busy = loading || removing

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={`flex items-center justify-center transition-colors disabled:opacity-60 ${className}`}
        title={favorited ? 'Remove from favorites' : 'Add to favorites'}
        aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        {busy ? (
          <Loader2 className="w-5 h-5 animate-spin text-lhc-text-muted" />
        ) : favorited ? (
          <Heart className="w-5 h-5 fill-red-500 text-red-500" />
        ) : (
          <Heart className="w-5 h-5 text-lhc-text-muted hover:text-red-400 transition-colors" />
        )}
        {showLabel && (
          <span>{favorited ? 'Saved to Favorites' : 'Save to Favorites'}</span>
        )}
      </button>

      <AddToFavoritesDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        clinicName={clinicName}
        onSave={handleSave}
      />
    </>
  )
}
