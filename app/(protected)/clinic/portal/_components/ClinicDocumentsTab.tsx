'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Upload, Download, Trash2, Share2, Loader2, FileText, File, FileImage, Users, History, Check, Camera, Search, X, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/lib/toast'
import { useClinicDocumentSharing, type ClinicDocument } from '@/lib/hooks/useClinicDocumentSharing'
import { createClient } from '@/lib/supabase/client'
import DocumentViewer from './DocumentViewer'

const CameraCapture = dynamic(
  () => import('@/app/(protected)/dashboard/_components/documents/CameraCapture'),
  { ssr: false }
)

const DOCUMENT_TYPES = ['medical_report', 'prescription', 'lab_result', 'imaging', 'referral', 'insurance', 'other']

function docTypeLabel(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <File className="w-6 h-6 text-lhc-text-muted" />
  if (mimeType.startsWith('image/')) return <FileImage className="w-6 h-6 text-blue-500" />
  if (mimeType === 'application/pdf') return <FileText className="w-6 h-6 text-red-500" />
  return <File className="w-6 h-6 text-lhc-text-muted" />
}

function canPreview(mimeType: string | null): boolean {
  if (!mimeType) return false
  return mimeType === 'application/pdf' || mimeType.startsWith('image/')
}

interface Patient {
  id: string
  first_name: string | null
  last_name: string | null
  email?: string | null
}

interface AlreadyShared {
  shareId: string
  patientId: string
  name: string
}

interface ShareResult {
  patientId: string
  shareId: string
  otp: string
  patientName: string
}

export default function ClinicDocumentsTab({ clinicId }: { clinicId: string }) {
  const {
    clinicDocuments,
    sharedHistory,
    loading,
    uploadClinicDocument,
    deleteClinicDocument,
    getSignedUrl,
    revokeClinicShare,
    refetchHistory,
  } = useClinicDocumentSharing(clinicId)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  useEffect(() => {
    createClient().auth.getUser()
      .then(({ data: { user } }) => setCurrentUserId(user?.id ?? null))
      .catch(() => {})
  }, [])

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<globalThis.File | null>(null)
  const [upTitle, setUpTitle] = useState('')
  const [upType, setUpType] = useState('other')
  const [upDesc, setUpDesc] = useState('')
  const [uploading, setUploading] = useState(false)

  // Camera
  const [cameraOpen, setCameraOpen] = useState(false)

  // Share dialog
  const [shareDoc, setShareDoc] = useState<ClinicDocument | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [alreadyShared, setAlreadyShared] = useState<AlreadyShared[]>([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([])
  const [shareNotes, setShareNotes] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareResults, setShareResults] = useState<ShareResult[] | null>(null)
  const [patientSearch, setPatientSearch] = useState('')

  // Preview
  const [previewDoc, setPreviewDoc] = useState<ClinicDocument | null>(null)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ClinicDocument | null>(null)

  function prepareUpload(file: globalThis.File) {
    setPendingFile(file)
    setUpTitle(file.name.replace(/\.[^.]+$/, ''))
    setUpType('other')
    setUpDesc('')
    setUploadDialogOpen(true)
  }

  function handleCameraCapture(blob: Blob, _dataUrl: string) {
    setCameraOpen(false)
    const file = new globalThis.File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
    prepareUpload(file)
  }

  async function confirmUpload() {
    if (!pendingFile || !currentUserId) return
    setUploading(true)
    const ok = await uploadClinicDocument(pendingFile, { title: upTitle, document_type: upType, description: upDesc || null }, currentUserId)
    setUploading(false)
    if (ok) {
      setUploadDialogOpen(false)
      setPendingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDownload(doc: ClinicDocument) {
    const url = await getSignedUrl(doc.file_path)
    if (!url) { toast({ title: 'Error', description: 'Could not get download link.', variant: 'destructive' }); return }
    const a = window.document.createElement('a')
    a.href = url
    a.download = doc.file_name
    a.click()
  }

  async function openShareDialog(doc: ClinicDocument) {
    setShareDoc(doc)
    setSelectedPatientIds([])
    setShareNotes('')
    setShareResults(null)
    setPatientSearch('')
    setAlreadyShared([])
    setShareDialogOpen(true)
    setLoadingPatients(true)
    try {
      const supabase = createClient()

      // Query all 3 booking tables + existing shares in parallel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = supabase as any
      const [
        { data: bookings1 },
        { data: bookings2 },
        { data: bookings3 },
        { data: existingShares },
      ] = await Promise.all([
        s.from('bookings').select('patient_id').eq('clinic_id', clinicId),
        s.from('centaur_bookings').select('local_patient_id').eq('clinic_id', clinicId),
        s.from('custom_api_bookings').select('patient_id').eq('clinic_id', clinicId),
        s.from('clinic_document_shares')
          .select('id, patient_id')
          .eq('document_id', doc.id)
          .eq('clinic_id', clinicId)
          .eq('access_revoked', false),
      ])

      const patientIds: string[] = [...new Set([
        ...(bookings1 ?? []).map((b: { patient_id: string }) => b.patient_id).filter(Boolean),
        ...(bookings2 ?? []).map((b: { local_patient_id: string }) => b.local_patient_id).filter(Boolean),
        ...(bookings3 ?? []).map((b: { patient_id: string }) => b.patient_id).filter(Boolean),
      ])]

      if (patientIds.length > 0) {
        const { data } = await s
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', patientIds)
        const allPatients: Patient[] = data ?? []
        setPatients(allPatients)

        // Build already-shared list
        const sharedPatientIds = new Set((existingShares ?? []).map((sh: { patient_id: string }) => sh.patient_id))
        const shared: AlreadyShared[] = (existingShares ?? []).map((sh: { id: string; patient_id: string }) => {
          const p = allPatients.find((pt) => pt.id === sh.patient_id)
          return {
            shareId: sh.id,
            patientId: sh.patient_id,
            name: p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Patient' : 'Patient',
          }
        })
        setAlreadyShared(shared)
      } else {
        setPatients([])
        setAlreadyShared([])
      }
    } catch {
      setPatients([])
      setAlreadyShared([])
    } finally {
      setLoadingPatients(false)
    }
  }

  // Filter patients: exclude already-shared, apply search
  const selectablePatients = useMemo(() => {
    const sharedIds = new Set(alreadyShared.map((s) => s.patientId))
    let filtered = patients.filter((p) => !sharedIds.has(p.id))
    const q = patientSearch.toLowerCase().trim()
    if (q) {
      filtered = filtered.filter((p) => {
        const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase()
        return name.includes(q)
      })
    }
    return filtered
  }, [patients, alreadyShared, patientSearch])

  async function confirmShare() {
    if (!shareDoc || !selectedPatientIds.length || !currentUserId) return
    setSharing(true)
    try {
      const res = await fetch('/api/documents/share-clinic-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: shareDoc.id,
          clinicId,
          patientIds: selectedPatientIds,
          sharedBy: currentUserId,
          notes: shareNotes || null,
          title: shareDoc.title,
          documentType: shareDoc.document_type,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')

      const results: ShareResult[] = data.results.map((r: { patientId: string; shareId: string; otp: string }) => {
        const p = patients.find((pt) => pt.id === r.patientId)
        return {
          ...r,
          patientName: p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : r.patientId,
        }
      })
      if (results.length < selectedPatientIds.length) {
        const failed = selectedPatientIds.length - results.length
        toast({ title: 'Partial share', description: `${failed} patient${failed > 1 ? 's' : ''} could not be shared with. The rest succeeded.`, variant: 'destructive' })
      }
      setShareResults(results)
      refetchHistory()
    } catch (err) {
      toast({ title: 'Share failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setSharing(false)
    }
  }

  async function handleRevokeFromShareDialog(shareId: string) {
    await revokeClinicShare(shareId)
    setAlreadyShared((prev) => prev.filter((s) => s.shareId !== shareId))
  }

  function togglePatient(id: string) {
    setSelectedPatientIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="our-docs">
        <TabsList className="grid w-full grid-cols-2 rounded-xl border border-gray-200 bg-gray-100 p-1">
          <TabsTrigger value="our-docs" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700">
            <FileText className="w-3.5 h-3.5" />Our Documents
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700">
            <History className="w-3.5 h-3.5" />Shared History
          </TabsTrigger>
        </TabsList>

        {/* ── Our Documents ── */}
        <TabsContent value="our-docs" className="mt-4 space-y-3">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCameraOpen(true)}>
              <Camera className="w-4 h-4 mr-2" />Capture Document
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" />Upload Document
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) prepareUpload(e.target.files[0]) }}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-lhc-text-muted" /></div>
          ) : clinicDocuments.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 mx-auto mb-3 text-lhc-text-muted opacity-40" />
              <p className="text-sm text-lhc-text-muted">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-lhc-border rounded-xl border border-lhc-border">
              {clinicDocuments.map((doc) => (
                <div key={doc.id} className="flex items-start gap-3 p-3">
                  <FileIcon mimeType={doc.mime_type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-lhc-text-main">{doc.title}</p>
                    <p className="text-xs text-lhc-text-muted">{doc.file_name}{doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}</p>
                    <Badge variant="outline" className="text-xs mt-1">{docTypeLabel(doc.document_type)}</Badge>
                  </div>
                  <div className="flex gap-1.5">
                    {canPreview(doc.mime_type) && (
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPreviewDoc(doc)}>
                        <Eye className="w-3 h-3 mr-1" />Preview
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleDownload(doc)}>
                      <Download className="w-3 h-3 mr-1" />Download
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openShareDialog(doc)}>
                      <Share2 className="w-3 h-3 mr-1" />Share
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(doc)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Shared History ── */}
        <TabsContent value="history" className="mt-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-lhc-text-muted" /></div>
          ) : sharedHistory.length === 0 ? (
            <div className="text-center py-10">
              <History className="w-10 h-10 mx-auto mb-3 text-lhc-text-muted opacity-40" />
              <p className="text-sm text-lhc-text-muted">No share history yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-lhc-border rounded-xl border border-lhc-border">
              {sharedHistory.map((share) => {
                const patient = share.patient as { first_name: string | null; last_name: string | null } | null
                const docInfo = share.document as { title: string; file_name: string } | null
                const isRevoked = share.access_revoked
                const isDownloaded = share.is_downloaded
                return (
                  <div key={share.id} className="flex items-start gap-3 p-3">
                    <FileText className="w-5 h-5 text-lhc-text-muted flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-lhc-text-main">{docInfo?.title ?? 'Unknown'}</p>
                      <p className="text-xs text-lhc-text-muted">
                        Shared with: {patient ? `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim() || 'Patient' : 'Patient'}
                      </p>
                      <p className="text-xs text-lhc-text-muted">{new Date(share.shared_at).toLocaleDateString()}</p>
                      <div className="flex gap-1 mt-1">
                        {isDownloaded && (
                          <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                            <Check className="w-3 h-3 mr-1" />Downloaded
                          </Badge>
                        )}
                        {isRevoked && <Badge variant="destructive" className="text-xs">Revoked</Badge>}
                        {!isDownloaded && !isRevoked && <Badge variant="outline" className="text-xs">Pending</Badge>}
                      </div>
                    </div>
                    {!isRevoked && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs text-destructive hover:text-destructive"
                        onClick={() => revokeClinicShare(share.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(v) => { if (!uploading) { setUploadDialogOpen(v); if (!v) setPendingFile(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={upTitle} onChange={(e) => setUpTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Document Type</Label>
              <Select value={upType} onValueChange={setUpType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{docTypeLabel(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Textarea value={upDesc} onChange={(e) => setUpDesc(e.target.value)} className="h-20 resize-none" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setUploadDialogOpen(false)} disabled={uploading}>Cancel</Button>
              <Button className="flex-1" onClick={confirmUpload} disabled={uploading || !upTitle.trim()}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={(v) => { if (!sharing) { setShareDialogOpen(v); if (!v) setShareResults(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share with Patients</DialogTitle>
          </DialogHeader>
          {shareResults ? (
            <div className="space-y-3">
              <p className="text-sm text-lhc-text-main font-medium">Shared! OTPs for each patient:</p>
              <div className="divide-y divide-lhc-border rounded-lg border border-lhc-border">
                {shareResults.map((r) => (
                  <div key={r.patientId} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-lhc-text-main">{r.patientName}</p>
                      <p className="text-xs text-lhc-text-muted">Communicate this code to the patient</p>
                    </div>
                    <span className="font-mono text-xl font-bold text-lhc-primary">{r.otp}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-lhc-text-muted">Each code can only be used once and expires in 48 hours.</p>
              <Button className="w-full" onClick={() => setShareDialogOpen(false)}>Done</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-lhc-text-muted">
                Sharing: <strong>{shareDoc?.title}</strong>
              </p>

              {/* Already shared badges */}
              {alreadyShared.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-lhc-text-muted">Already shared with</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {alreadyShared.map((s) => (
                      <Badge key={s.shareId} variant="secondary" className="text-xs gap-1">
                        {s.name}
                        <button
                          type="button"
                          onClick={() => handleRevokeFromShareDialog(s.shareId)}
                          className="ml-0.5 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label>Select Patients</Label>
                {loadingPatients ? (
                  <div className="flex items-center gap-2 text-sm text-lhc-text-muted py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />Loading patients…
                  </div>
                ) : selectablePatients.length === 0 && patients.length === 0 ? (
                  <p className="text-sm text-lhc-text-muted py-2">No patients found for this clinic.</p>
                ) : (
                  <>
                    {patients.length > 5 && (
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lhc-text-muted" />
                        <Input
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          placeholder="Search patients…"
                          className="pl-8 h-8 text-sm"
                        />
                      </div>
                    )}
                    {selectablePatients.length === 0 ? (
                      <p className="text-sm text-lhc-text-muted py-2">
                        {patientSearch ? 'No patients match your search.' : 'All patients already have access.'}
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {selectablePatients.map((p) => (
                          <label
                            key={p.id}
                            className="flex items-center gap-2 p-2 rounded-lg border border-lhc-border cursor-pointer hover:bg-lhc-surface"
                          >
                            <Checkbox
                              checked={selectedPatientIds.includes(p.id)}
                              onCheckedChange={() => togglePatient(p.id)}
                            />
                            <span className="text-sm text-lhc-text-main">
                              {`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Patient'}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              {selectedPatientIds.length > 0 && (
                <div className="space-y-1">
                  <Label>Notes (optional)</Label>
                  <Textarea value={shareNotes} onChange={(e) => setShareNotes(e.target.value)} className="h-16 resize-none" />
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShareDialogOpen(false)}>Cancel</Button>
                <Button
                  className="flex-1"
                  onClick={confirmShare}
                  disabled={sharing || !selectedPatientIds.length || loadingPatients || !currentUserId}
                >
                  {sharing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}
                  Share with {selectedPatientIds.length || ''} Patient{selectedPatientIds.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete document?</DialogTitle></DialogHeader>
          <p className="text-sm text-lhc-text-muted">&quot;{deleteTarget?.title}&quot; will be permanently deleted.</p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => { if (deleteTarget) { await deleteClinicDocument(deleteTarget); setDeleteTarget(null) } }}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document preview */}
      {previewDoc && (
        <DocumentViewer
          open={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          filePath={previewDoc.file_path}
          fileName={previewDoc.file_name}
          mimeType={previewDoc.mime_type}
          storageBucket="clinic-documents"
        />
      )}

      {/* Camera capture overlay */}
      {cameraOpen && (
        <CameraCapture
          label="Capture Document"
          onCapture={handleCameraCapture}
          onCancel={() => setCameraOpen(false)}
        />
      )}
    </div>
  )
}
