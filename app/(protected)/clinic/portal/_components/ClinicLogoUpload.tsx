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

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const OUTPUT_SIZE = 400 // px – final logo dimensions
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MIN_SCALE = 1
const MAX_SCALE = 3

interface Props {
  clinicId: string
  logoUrl: string | null
  clinicName: string
  onLogoChange: (url: string | null) => void
}

export default function ClinicLogoUpload({
  clinicId,
  logoUrl,
  clinicName,
  onLogoChange,
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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
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

  useEffect(() => {
    if (!imageSrc) { setImageEl(null); return }
    const img = new Image()
    img.onload = () => setImageEl(img)
    img.src = imageSrc
  }, [imageSrc])

  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current
    const img = imageEl
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = canvas.width
    ctx.clearRect(0, 0, size, size)

    // Rounded rect clip
    ctx.save()
    const r = size * 0.125 // border-radius ratio
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.lineTo(size - r, 0)
    ctx.quadraticCurveTo(size, 0, size, r)
    ctx.lineTo(size, size - r)
    ctx.quadraticCurveTo(size, size, size - r, size)
    ctx.lineTo(r, size)
    ctx.quadraticCurveTo(0, size, 0, size - r)
    ctx.lineTo(0, r)
    ctx.quadraticCurveTo(0, 0, r, 0)
    ctx.closePath()
    ctx.clip()

    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, size, size)

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

  async function handleCropAndUpload() {
    const img = imageEl
    if (!img) return

    setUploading(true)
    try {
      const canvas = canvasRef.current!
      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const ctx = canvas.getContext('2d')!

      const size = OUTPUT_SIZE
      ctx.clearRect(0, 0, size, size)

      ctx.fillStyle = '#ffffff'
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

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
          'image/webp',
          0.9,
        )
      })

      const supabase = createClient()
      const filePath = `${clinicId}/logo.webp`

      const { error: uploadError } = await supabase.storage
        .from('clinic-logos')
        .upload(filePath, blob, {
          contentType: 'image/webp',
          upsert: true,
          cacheControl: '3600',
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('clinic-logos')
        .getPublicUrl(filePath)

      const logoUrlWithCache = `${publicUrl}?t=${Date.now()}`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('clinics')
        .update({ logo_url: logoUrlWithCache })
        .eq('id', clinicId)

      if (updateError) throw updateError

      onLogoChange(logoUrlWithCache)
      setCropOpen(false)
      setImageSrc(null)
      toast.success('Clinic logo updated!')
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

  async function handleRemoveLogo() {
    if (!logoUrl) return
    setRemoving(true)
    try {
      const supabase = createClient()

      const { error: deleteError } = await supabase.storage
        .from('clinic-logos')
        .remove([`${clinicId}/logo.webp`])

      if (deleteError) throw deleteError

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('clinics')
        .update({ logo_url: null })
        .eq('id', clinicId)

      if (updateError) throw updateError

      onLogoChange(null)
      toast.success('Clinic logo removed.')
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

  const initials = clinicName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex items-center gap-4">
        {/* Logo preview */}
        <div className="relative group">
          <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 shadow-md">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={clinicName || 'Clinic logo'}
                className="w-full h-full object-cover"
              />
            ) : (
              <DefaultAvatar variant="clinic" className="w-full h-full rounded-xl" />
            )}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'absolute inset-0 rounded-xl flex items-center justify-center',
              'bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity',
              'cursor-pointer',
            )}
            title="Change logo"
          >
            <Camera className="w-5 h-5 text-white" />
          </button>

          <div
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-lhc-primary border-2 border-white flex items-center justify-center cursor-pointer hover:bg-lhc-primary/90 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="w-3 h-3 text-white" />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-lhc-text-main">Clinic Logo</p>
          <p className="text-xs text-lhc-text-muted">JPEG, PNG, or WebP. Max 2 MB.</p>
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-7"
            >
              <Upload className="w-3 h-3 mr-1" />
              {logoUrl ? 'Change' : 'Upload'}
            </Button>
            {logoUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveLogo}
                disabled={removing}
                className="text-xs h-7 text-red-500 hover:text-red-600"
              >
                {removing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Crop Dialog */}
      <Dialog open={cropOpen} onOpenChange={(open) => {
        if (!open && !uploading) {
          setCropOpen(false)
          setImageSrc(null)
        }
      }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Your Logo</DialogTitle>
            <DialogDescription>
              Drag to reposition and zoom to fit your logo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            <div
              className="relative rounded-xl overflow-hidden border-2 border-lhc-border shadow-inner cursor-grab active:cursor-grabbing touch-none w-[200px] h-[200px] sm:w-[240px] sm:h-[240px]"
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
                <><Upload className="w-4 h-4 mr-1" />Save Logo</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
