'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Download, Trash2, Share2, Loader2, FileText, File, FileImage, Users, History, Check } from 'lucide-react'
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

interface Patient {
  id: string
  first_name: string | null
  last_name: string | null
  email?: string | null
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
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [upTitle, setUpTitle] = useState('')
  const [upType, setUpType] = useState('other')
  const [upDesc, setUpDesc] = useState('')
  const [uploading, setUploading] = useState(false)

  // Share dialog
  const [shareDoc, setShareDoc] = useState<ClinicDocument | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([])
  const [shareNotes, setShareNotes] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareResults, setShareResults] = useState<ShareResult[] | null>(null)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ClinicDocument | null>(null)

  function prepareUpload(file: File) {
    setPendingFile(file)
    setUpTitle(file.name.replace(/\.[^.]+$/, ''))
    setUpType('other')
    setUpDesc('')
    setUploadDialogOpen(true)
  }

  async function confirmUpload() {
    if (!pendingFile || !currentUserId) return
    setUploading(true)
    const ok = await uploadClinicDocument(pendingFile, { title: upTitle, document_type: upType, description: upDesc || null }, currentUserId)
    setUploading(false)
    if (ok) {
      setUploadDialogOpen(false)
      setPendingFile(null)
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
    setShareDialogOpen(true)
    setLoadingPatients(true)
    try {
      // Load patients who have booked with this clinic
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: bookings } = await (supabase as any)
        .from('bookings')
        .select('patient_id')
        .eq('clinic_id', clinicId)
      const patientIds: string[] = [...new Set((bookings ?? []).map((b: { patient_id: string }) => b.patient_id))]
      if (patientIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', patientIds)
        setPatients(data ?? [])
      } else {
        setPatients([])
      }
    } catch {
      setPatients([])
    } finally {
      setLoadingPatients(false)
    }
  }

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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')

      // Build results with patient names
      const results: ShareResult[] = data.results.map((r: { patientId: string; shareId: string; otp: string }) => {
        const p = patients.find((pt) => pt.id === r.patientId)
        return {
          ...r,
          patientName: p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : r.patientId,
        }
      })
      setShareResults(results)
    } catch (err) {
      toast({ title: 'Share failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setSharing(false)
    }
  }

  function togglePatient(id: string) {
    setSelectedPatientIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="our-docs">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="our-docs" className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />Our Documents
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />Shared History
          </TabsTrigger>
        </TabsList>

        {/* ── Our Documents ── */}
        <TabsContent value="our-docs" className="mt-4 space-y-3">
          <div className="flex justify-end">
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
              <div className="space-y-1">
                <Label>Select Patients</Label>
                {loadingPatients ? (
                  <div className="flex items-center gap-2 text-sm text-lhc-text-muted py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />Loading patients…
                  </div>
                ) : patients.length === 0 ? (
                  <p className="text-sm text-lhc-text-muted py-2">No patients found for this clinic.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {patients.map((p) => (
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
              </div>
              <div className="space-y-1">
                <Label>Notes (optional)</Label>
                <Textarea value={shareNotes} onChange={(e) => setShareNotes(e.target.value)} className="h-16 resize-none" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShareDialogOpen(false)}>Cancel</Button>
                <Button
                  className="flex-1"
                  onClick={confirmShare}
                  disabled={sharing || !selectedPatientIds.length || loadingPatients || !currentUserId}
                >
                  {sharing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}
                  Share
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
    </div>
  )
}
