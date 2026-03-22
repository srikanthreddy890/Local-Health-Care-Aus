'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, Copy, Check, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const LARGE_DIMENSION_THRESHOLD = 4000

interface Props {
  clinicId: string
  onUpload: (url: string) => void
}

export default function BlogImageUpload({ clinicId, onUpload }: Props) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [dimensionWarning, setDimensionWarning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function checkDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new window.Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve({ width: 0, height: 0 })
      }
      img.src = url
    })
  }

  async function handleFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP and GIF images are allowed')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('Image must be under 5MB')
      return
    }

    // Check dimensions
    const dims = await checkDimensions(file)
    setDimensions(dims)
    const isLarge = dims.width > LARGE_DIMENSION_THRESHOLD || dims.height > LARGE_DIMENSION_THRESHOLD
    setDimensionWarning(isLarge)

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${clinicId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
      const { error } = await supabase.storage
        .from('blog-images')
        .upload(path, file)
      if (error) throw error
      const { data: urlData } = supabase.storage
        .from('blog-images')
        .getPublicUrl(path)
      setUploadedUrl(urlData.publicUrl)
      onUpload(urlData.publicUrl)
      toast.success('Image uploaded')
    } catch {
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  async function copyUrl() {
    if (!uploadedUrl) return
    await navigator.clipboard.writeText(uploadedUrl)
    setCopied(true)
    toast.success('URL copied')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-lhc-primary bg-lhc-primary/5' : 'border-lhc-border hover:border-lhc-primary/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onChange}
        />
        {uploading ? (
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-lhc-primary" />
        ) : (
          <>
            <Upload className="w-6 h-6 mx-auto text-lhc-text-muted mb-2" />
            <p className="text-sm text-lhc-text-muted">
              Drag & drop or click to upload (max 5MB)
            </p>
          </>
        )}
      </div>

      {/* Dimension warning */}
      {dimensionWarning && dimensions && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-md text-xs text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Image is {dimensions.width}x{dimensions.height}px. Consider resizing to under {LARGE_DIMENSION_THRESHOLD}px for better performance.
          </span>
        </div>
      )}

      {/* Uploaded image info */}
      {uploadedUrl && (
        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
          <img
            src={uploadedUrl}
            alt="Uploaded"
            className="w-10 h-10 rounded object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-green-700 truncate">{uploadedUrl.split('/').pop()}</p>
            {dimensions && (
              <p className="text-xs text-green-600">{dimensions.width}x{dimensions.height}px</p>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={copyUrl}>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
