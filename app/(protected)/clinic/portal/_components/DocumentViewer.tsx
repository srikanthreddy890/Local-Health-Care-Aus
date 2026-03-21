'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Download, ExternalLink, X, Loader2, FileX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

interface DocumentViewerProps {
  open: boolean
  onClose: () => void
  filePath: string
  fileName: string
  mimeType: string | null
  storageBucket?: string
}

export default function DocumentViewer({
  open,
  onClose,
  filePath,
  fileName,
  mimeType,
  storageBucket = 'patient-documents',
}: DocumentViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setBlobUrl(null)
  }, [])

  useEffect(() => {
    if (!open || !filePath) return

    let cancelled = false
    setLoading(true)
    setError(null)
    revokeBlobUrl()

    const supabase = createClient()
    supabase.storage
      .from(storageBucket)
      .download(filePath)
      .then(({ data, error: dlError }) => {
        if (cancelled) {
          return
        }
        if (dlError || !data) {
          setError(dlError?.message ?? 'Failed to load document')
          setLoading(false)
          return
        }
        const url = URL.createObjectURL(data)
        blobUrlRef.current = url
        setBlobUrl(url)
        setLoading(false)
      })

    return () => {
      cancelled = true
      revokeBlobUrl()
    }
  }, [open, filePath, storageBucket, revokeBlobUrl])

  function handleDownload() {
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName
    a.click()
  }

  function handleOpenInNewTab() {
    if (blobUrl) window.open(blobUrl, '_blank')
  }

  const isPdf = mimeType === 'application/pdf'
  const isImage = mimeType?.startsWith('image/')

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-lhc-border">
          <p className="text-sm font-medium text-lhc-text-main truncate flex-1 mr-4">{fileName}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDownload} disabled={!blobUrl}>
              <Download className="w-3.5 h-3.5 mr-1.5" />Download
            </Button>
            <Button size="sm" variant="outline" onClick={handleOpenInNewTab} disabled={!blobUrl}>
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Open in New Tab
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-lhc-surface/50">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-lhc-text-muted" />
              <p className="text-sm text-lhc-text-muted">Loading document…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3">
              <FileX className="w-10 h-10 text-lhc-text-muted opacity-50" />
              <p className="text-sm text-lhc-text-muted">{error}</p>
            </div>
          ) : isPdf && blobUrl ? (
            <object
              data={blobUrl}
              type="application/pdf"
              className="w-full h-full"
            >
              <div className="flex flex-col items-center gap-3 p-8">
                <p className="text-sm text-lhc-text-muted">PDF preview not supported in this browser.</p>
                <Button size="sm" onClick={handleOpenInNewTab}>Open in New Tab</Button>
              </div>
            </object>
          ) : isImage && blobUrl ? (
            <img
              src={blobUrl}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <FileX className="w-10 h-10 text-lhc-text-muted opacity-50" />
              <p className="text-sm text-lhc-text-muted">Preview not available for this file type.</p>
              <Button size="sm" variant="outline" onClick={handleDownload} disabled={!blobUrl}>
                <Download className="w-3.5 h-3.5 mr-1.5" />Download
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
