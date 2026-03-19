'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Camera, X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CameraCaptureProps {
  onCapture: (blob: Blob, dataUrl: string) => void
  onCancel: () => void
  label?: string
}

export default function CameraCapture({ onCapture, onCancel, label = 'Take Photo' }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setError('Camera permission denied. Please allow camera access and try again.')
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [startCamera])

  function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    setCapturing(true)
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
          onCapture(blob, dataUrl)
        }
        setCapturing(false)
      },
      'image/jpeg',
      0.9
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
          <span className="text-white font-medium">{label}</span>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={onCancel}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <Camera className="w-12 h-12 text-white/50" />
            <p className="text-white/80 text-sm">{error}</p>
            <Button variant="outline" className="text-white border-white/30 hover:bg-white/10" onClick={startCamera}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full aspect-[4/3] object-cover"
          />
        )}

        {/* Capture button */}
        {!error && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center">
            <button
              onClick={capture}
              disabled={capturing}
              className="w-16 h-16 rounded-full bg-white border-4 border-white/50 shadow-lg active:scale-95 transition-transform disabled:opacity-50"
              aria-label="Capture photo"
            />
          </div>
        )}
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
