'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Loader2 } from 'lucide-react'
import { useFavoriteDoctors } from '@/lib/hooks/useFavoriteDoctors'

interface Props {
  doctorId: string
  clinicId?: string | null
  userId: string | null
  className?: string
}

export default function DoctorFavoriteButton({ doctorId, clinicId, userId, className = '' }: Props) {
  const router = useRouter()
  const { isFavorite, addFavorite, removeFavorite, loading } = useFavoriteDoctors(userId)
  const [busy, setBusy] = useState(false)

  const favorited = isFavorite(doctorId)

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (!userId) { router.push('/auth'); return }
    setBusy(true)
    if (favorited) {
      await removeFavorite(doctorId)
    } else {
      await addFavorite(doctorId, clinicId ?? undefined)
    }
    setBusy(false)
  }

  const isBusy = loading || busy

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy}
      className={`flex items-center justify-center rounded-full transition-colors disabled:opacity-60 ${className}`}
      title={favorited ? 'Remove from favorites' : 'Add doctor to favorites'}
      aria-label={favorited ? 'Remove doctor from favorites' : 'Add doctor to favorites'}
    >
      {isBusy ? (
        <Loader2 className="w-5 h-5 animate-spin text-lhc-text-muted" />
      ) : favorited ? (
        <Heart className="w-5 h-5 fill-red-500 text-red-500" />
      ) : (
        <Heart className="w-5 h-5 text-lhc-text-muted hover:text-red-400 transition-colors" />
      )}
    </button>
  )
}
