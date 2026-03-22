'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Trash2, Star, Loader2, CreditCard, Camera, FileUp, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useHealthFundCards, type AddCardData } from '@/lib/hooks/useHealthFundCards'

const CameraCapture = dynamic(() => import('./CameraCapture'), {
  ssr: false,
  loading: () => <Loader2 className="w-4 h-4 animate-spin" />,
})

interface CardImageProps {
  path: string | null
  getUrl: (p: string) => Promise<string | null>
  alt: string
  className?: string
}

function CardImage({ path, getUrl, alt, className }: CardImageProps) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (path) getUrl(path).then(setUrl).catch(() => {})
  }, [path, getUrl])
  if (!url) return null
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />
}

interface HealthFundCardsTabProps {
  userId: string
}

export default function HealthFundCardsTab({ userId }: HealthFundCardsTabProps) {
  const { cards, loading, addCard, deleteCard, setPrimary, getImageUrl } = useHealthFundCards(userId)

  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [providerName, setProviderName] = useState('')
  const [memberNumber, setMemberNumber] = useState('')
  const [cardHolderName, setCardHolderName] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [hicapsCompatible, setHicapsCompatible] = useState(false)

  // Images
  const [frontBlob, setFrontBlob] = useState<Blob | null>(null)
  const [frontDataUrl, setFrontDataUrl] = useState<string | null>(null)
  const [backBlob, setBackBlob] = useState<Blob | null>(null)
  const [backDataUrl, setBackDataUrl] = useState<string | null>(null)

  // Camera
  const [cameraTarget, setCameraTarget] = useState<'front' | 'back' | null>(null)

  // Delete confirm
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const frontFileRef = useRef<HTMLInputElement>(null)
  const backFileRef = useRef<HTMLInputElement>(null)

  // beforeunload guard
  useEffect(() => {
    const hasUnsaved = frontBlob || backBlob
    if (!hasUnsaved) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [frontBlob, backBlob])

  function resetForm() {
    setProviderName('')
    setMemberNumber('')
    setCardHolderName('')
    setExpiryDate('')
    setIsPrimary(false)
    setHicapsCompatible(false)
    setFrontBlob(null)
    setFrontDataUrl(null)
    setBackBlob(null)
    setBackDataUrl(null)
  }

  function handleFileCapture(side: 'front' | 'back', file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (side === 'front') { setFrontBlob(file); setFrontDataUrl(dataUrl) }
      else { setBackBlob(file); setBackDataUrl(dataUrl) }
    }
    reader.readAsDataURL(file)
  }

  function handleCameraCapture(blob: Blob, dataUrl: string) {
    if (cameraTarget === 'front') { setFrontBlob(blob); setFrontDataUrl(dataUrl) }
    else if (cameraTarget === 'back') { setBackBlob(blob); setBackDataUrl(dataUrl) }
    setCameraTarget(null)
  }

  async function handleSave() {
    if (!providerName.trim() || !memberNumber.trim() || !cardHolderName.trim()) return
    setSaving(true)
    const data: AddCardData = {
      provider_name: providerName.trim(),
      member_number: memberNumber.trim(),
      card_holder_name: cardHolderName.trim(),
      expiry_date: expiryDate || null,
      is_primary: isPrimary,
      hicaps_compatible: hicapsCompatible,
    }
    const ok = await addCard(data, frontBlob, backBlob)
    setSaving(false)
    if (ok) {
      resetForm()
      setAddOpen(false)
    }
  }

  function handleCloseAdd(v: boolean) {
    if (!v && (frontBlob || backBlob)) {
      if (!confirm('You have captured images that haven\'t been saved. Close anyway?')) return
    }
    if (!v) resetForm()
    setAddOpen(v)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-lhc-text-muted">Manage your health fund membership cards.</p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Card
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-lhc-text-muted" />
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-10">
          <CreditCard className="w-10 h-10 mx-auto mb-3 text-lhc-text-muted opacity-50" />
          <p className="text-sm text-lhc-text-muted">No health fund cards saved yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <Card key={card.id} className={card.is_primary ? 'ring-2 ring-lhc-primary' : ''}>
              <CardContent className="p-4 space-y-3">
                {/* Card visual */}
                {card.card_image_path ? (
                  <CardImage
                    path={card.card_image_path}
                    getUrl={getImageUrl}
                    alt="Card front"
                    className="w-full rounded-lg object-cover aspect-[1.586/1]"
                  />
                ) : (
                  <div className="w-full rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white aspect-[1.586/1] flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm">{card.provider_name}</span>
                      {card.is_primary && <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />}
                    </div>
                    <div>
                      <p className="text-xs opacity-80">Member No.</p>
                      <p className="font-mono text-sm">{card.member_number}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <p className="text-sm">{card.card_holder_name}</p>
                      {card.expiry_date && <p className="text-xs opacity-80">{card.expiry_date}</p>}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {card.is_primary && (
                    <Badge className="bg-lhc-primary/10 text-lhc-primary border-lhc-primary/20 text-xs">Primary</Badge>
                  )}
                  {card.hicaps_compatible && (
                    <Badge variant="outline" className="text-xs">HICAPS</Badge>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-lhc-text-main">{card.provider_name}</p>
                  <p className="text-xs text-lhc-text-muted">{card.member_number}</p>
                  <p className="text-xs text-lhc-text-muted">{card.card_holder_name}</p>
                  {card.expiry_date && <p className="text-xs text-lhc-text-muted">Expires {card.expiry_date}</p>}
                </div>

                {/* Back image thumbnail */}
                {card.back_image_path && (
                  <CardImage
                    path={card.back_image_path}
                    getUrl={getImageUrl}
                    alt="Card back"
                    className="w-full rounded-lg object-cover aspect-[1.586/1]"
                  />
                )}

                <div className="flex gap-2">
                  {!card.is_primary && (
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setPrimary(card.id)}>
                      <Star className="w-3 h-3 mr-1" />Set Primary
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive text-xs"
                    onClick={() => { setDeletingCardId(card.id); setDeleteDialogOpen(true) }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* HICAPS info */}
      <Card className="bg-lhc-surface border-lhc-border">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-lhc-text-main mb-1">About HICAPS</p>
          <p className="text-xs text-lhc-text-muted">
            HICAPS-compatible cards can be used for on-the-spot health fund claims at participating clinics —
            no need to pay and claim separately. Mark your card as HICAPS-compatible if your fund supports this.
          </p>
        </CardContent>
      </Card>

      {/* Add card dialog */}
      <Dialog open={addOpen} onOpenChange={handleCloseAdd}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Health Fund Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Provider Name *</Label>
              <Input placeholder="e.g. Medibank" value={providerName} onChange={(e) => setProviderName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Member Number *</Label>
              <Input placeholder="e.g. 1234567890" value={memberNumber} onChange={(e) => setMemberNumber(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Card Holder Name *</Label>
              <Input placeholder="Full name on card" value={cardHolderName} onChange={(e) => setCardHolderName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Expiry (optional)</Label>
              <Input placeholder="MM/YY" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} maxLength={5} />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="primary" checked={isPrimary} onCheckedChange={(v) => setIsPrimary(!!v)} />
              <Label htmlFor="primary" className="cursor-pointer">Set as primary card</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="hicaps" checked={hicapsCompatible} onCheckedChange={(v) => setHicapsCompatible(!!v)} />
              <Label htmlFor="hicaps" className="cursor-pointer">HICAPS compatible</Label>
            </div>

            {/* Front image */}
            <div className="space-y-1.5">
              <Label>Card Front (optional)</Label>
              {frontDataUrl ? (
                <div className="space-y-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={frontDataUrl} alt="Card front preview" className="w-full rounded-lg object-cover aspect-[1.586/1]" />
                  <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => { setFrontBlob(null); setFrontDataUrl(null) }}>
                    Remove
                  </Button>
                </div>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="w-full text-xs">
                      <ImagePlus className="w-3.5 h-3.5 mr-1.5" />Add Photo
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-48 p-1.5">
                    <button
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-lhc-text-main hover:bg-lhc-background transition-colors"
                      onClick={() => frontFileRef.current?.click()}
                    >
                      <FileUp className="w-4 h-4 text-lhc-text-muted" />
                      Upload from Files
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-lhc-text-main hover:bg-lhc-background transition-colors"
                      onClick={() => setCameraTarget('front')}
                    >
                      <Camera className="w-4 h-4 text-lhc-text-muted" />
                      Take a Photo
                    </button>
                  </PopoverContent>
                </Popover>
              )}
              <input
                ref={frontFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFileCapture('front', e.target.files[0]) }}
              />
            </div>

            {/* Back image */}
            <div className="space-y-1.5">
              <Label>Card Back (optional)</Label>
              {backDataUrl ? (
                <div className="space-y-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={backDataUrl} alt="Card back preview" className="w-full rounded-lg object-cover aspect-[1.586/1]" />
                  <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => { setBackBlob(null); setBackDataUrl(null) }}>
                    Remove
                  </Button>
                </div>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="w-full text-xs">
                      <ImagePlus className="w-3.5 h-3.5 mr-1.5" />Add Photo
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-48 p-1.5">
                    <button
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-lhc-text-main hover:bg-lhc-background transition-colors"
                      onClick={() => backFileRef.current?.click()}
                    >
                      <FileUp className="w-4 h-4 text-lhc-text-muted" />
                      Upload from Files
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-lhc-text-main hover:bg-lhc-background transition-colors"
                      onClick={() => setCameraTarget('back')}
                    >
                      <Camera className="w-4 h-4 text-lhc-text-muted" />
                      Take a Photo
                    </button>
                  </PopoverContent>
                </Popover>
              )}
              <input
                ref={backFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFileCapture('back', e.target.files[0]) }}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => handleCloseAdd(false)}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saving || !providerName.trim() || !memberNumber.trim() || !cardHolderName.trim()}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Card
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(v) => { if (!v) { setDeleteDialogOpen(false); setDeletingCardId(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete card?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-lhc-text-muted">
            This health fund card will be permanently deleted. This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeletingCardId(null) }}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deletingCardId) deleteCard(deletingCardId); setDeleteDialogOpen(false); setDeletingCardId(null) }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera overlay */}
      {cameraTarget && (
        <CameraCapture
          label={cameraTarget === 'front' ? 'Scan Card Front' : 'Scan Card Back'}
          onCapture={handleCameraCapture}
          onCancel={() => setCameraTarget(null)}
        />
      )}
    </div>
  )
}
