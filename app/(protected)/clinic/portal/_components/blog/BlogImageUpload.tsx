'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface Props {
  clinicId: string
  onUpload: (url: string) => void
}

export default function BlogImageUpload({ clinicId, onUpload }: Props) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP and GIF images are allowed')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('Image must be under 5MB')
      return
    }

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

  return (
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
  )
}
