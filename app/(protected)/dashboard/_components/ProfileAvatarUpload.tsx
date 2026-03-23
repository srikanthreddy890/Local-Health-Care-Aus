'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Camera, Upload, Trash2, Loader2, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import DefaultAvatar from '@/components/DefaultAvatar'

// ── Constants ──
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const OUTPUT_SIZE = 256 // px – final avatar dimensions
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MIN_SCALE = 1
const MAX_SCALE = 3

interface Props {
  userId: string
  avatarUrl: string | null
  firstName: string
  lastName: string
  onAvatarChange: (url: string | null) => void
}

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export default function ProfileAvatarUpload({
  userId,
  avatarUrl,
  firstName,
  lastName,
  onAvatarChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)

  // Crop dialog state
  const [cropOpen, setCropOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  // ── File selection ──
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be re-selected
    e.target.value = ''

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload a JPEG, PNG, or WebP image.', variant: 'destructive' })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Image must be under 2 MB.', variant: 'destructive' })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setScale(1)
      setOffset({ x: 0, y: 0 })
      setCropOpen(true)
    }
    reader.readAsDataURL(file)
  }

  // ── Load image element when src changes ──
  useEffect(() => {
    if (!imageSrc) { setImageEl(null); return }
    const img = new Image()
    img.onload = () => setImageEl(img)
    img.src = imageSrc
  }, [imageSrc])

  // ── Draw preview ──
  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current
    const img = imageEl
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = canvas.width
    ctx.clearRect(0, 0, size, size)

    // Clip to circle
    ctx.save()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    // Fill background
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, size, size)

    // Calculate draw dimensions – fit image so shortest side fills the circle
    const aspect = img.width / img.height
    let drawW: number, drawH: number
    if (aspect >= 1) {
      drawH = size * scale
      drawW = drawH * aspect
    } else {
      drawW = size * scale
      drawH = drawW / aspect
    }

    const dx = (size - drawW) / 2 + offset.x
    const dy = (size - drawH) / 2 + offset.y

    ctx.drawImage(img, dx, dy, drawW, drawH)
    ctx.restore()
  }, [imageEl, scale, offset])

  useEffect(() => { drawPreview() }, [drawPreview])

  // ── Drag handlers ──
  function onPointerDown(e: React.PointerEvent) {
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy })
  }

  function onPointerUp() {
    setDragging(false)
  }

  // ── Produce final cropped image & upload ──
  async function handleCropAndUpload() {
    const img = imageEl
    if (!img) return

    setUploading(true)
    try {
      // Draw final output on hidden canvas
      const canvas = canvasRef.current!
      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const ctx = canvas.getContext('2d')!

      // Use same math as preview but at OUTPUT_SIZE
      const size = OUTPUT_SIZE
      ctx.clearRect(0, 0, size, size)
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()

      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(0, 0, size, size)

      const previewSize = previewCanvasRef.current?.width ?? 240
      const ratio = OUTPUT_SIZE / previewSize

      const aspect = img.width / img.height
      let drawW: number, drawH: number
      if (aspect >= 1) {
        drawH = size * scale
        drawW = drawH * aspect
      } else {
        drawW = size * scale
        drawH = drawW / aspect
      }

      const dx = (size - drawW) / 2 + offset.x * ratio
      const dy = (size - drawH) / 2 + offset.y * ratio

      ctx.drawImage(img, dx, dy, drawW, drawH)

      // Export as WebP (fallback to JPEG)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
          'image/webp',
          0.85,
        )
      })

      // Upload to Supabase
      const supabase = createClient()
      const filePath = `${userId}/avatar.webp`

      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(filePath, blob, {
          contentType: 'image/webp',
          upsert: true,
          cacheControl: '3600',
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(filePath)

      // Bust cache by appending timestamp
      const avatarUrlWithCache = `${publicUrl}?t=${Date.now()}`

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrlWithCache })
        .eq('id', userId)

      if (updateError) throw updateError

      onAvatarChange(avatarUrlWithCache)
      setCropOpen(false)
      setImageSrc(null)
      toast.success('Profile picture updated!')
    } catch (err: unknown) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  // ── Remove avatar ──
  async function handleRemoveAvatar() {
    if (!avatarUrl) return
    setRemoving(true)
    try {
      const supabase = createClient()

      const { error: deleteError } = await supabase.storage
        .from('profile-avatars')
        .remove([`${userId}/avatar.webp`])

      if (deleteError) throw deleteError

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId)

      if (updateError) throw updateError

      onAvatarChange(null)
      toast.success('Profile picture removed.')
    } catch (err: unknown) {
      toast({
        title: 'Remove failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setRemoving(false)
    }
  }

  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  return (
    <>
      {/* Hidden canvases */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Avatar display */}
      <div className="relative group">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden shrink-0 shadow-md">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName || 'Profile'}
              className="w-full h-full object-cover"
            />
          ) : (
            <DefaultAvatar variant="patient" className="w-full h-full rounded-full" />
          )}
        </div>

        {/* Overlay button on hover */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'absolute inset-0 rounded-full flex items-center justify-center',
            'bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity',
            'cursor-pointer',
          )}
          title="Change photo"
        >
          <Camera className="w-5 h-5 text-white" />
        </button>

        {/* Upload badge – 44px touch target via padding, visual size stays small */}
        <div
          className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-lhc-primary border-2 border-white flex items-center justify-center cursor-pointer hover:bg-lhc-primary/90 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          style={{ touchAction: 'manipulation' }}
        >
          <Camera className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-white" />
        </div>
      </div>

      {/* Remove button (when avatar exists) */}
      {avatarUrl && (
        <button
          onClick={handleRemoveAvatar}
          disabled={removing}
          className="text-xs text-red-500 hover:text-red-600 hover:underline mt-1 flex items-center gap-1 disabled:opacity-50 py-1.5 min-h-[44px] sm:min-h-0 sm:py-0"
        >
          {removing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          Remove photo
        </button>
      )}

      {/* ── Crop Dialog ── */}
      <Dialog open={cropOpen} onOpenChange={(open) => {
        if (!open && !uploading) {
          setCropOpen(false)
          setImageSrc(null)
        }
      }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Your Photo</DialogTitle>
            <DialogDescription>
              Drag to reposition and zoom to fit your photo in the circle.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {/* Crop preview */}
            <div
              className="relative rounded-full overflow-hidden border-2 border-lhc-border shadow-inner cursor-grab active:cursor-grabbing touch-none w-[200px] h-[200px] sm:w-[240px] sm:h-[240px]"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <canvas
                ref={previewCanvasRef}
                width={240}
                height={240}
                className="w-full h-full"
              />
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-3 w-full max-w-[200px] sm:max-w-[240px]">
              <ZoomOut className="w-4 h-4 text-lhc-text-muted shrink-0" />
              <input
                type="range"
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={0.05}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="flex-1 accent-lhc-primary"
              />
              <ZoomIn className="w-4 h-4 text-lhc-text-muted shrink-0" />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setCropOpen(false); setImageSrc(null) }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={handleCropAndUpload} disabled={uploading}>
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1" />Uploading...</>
              ) : (
                <><Upload className="w-4 h-4 mr-1" />Save Photo</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
