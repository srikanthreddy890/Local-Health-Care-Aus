'use client'

import { useState, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  Upload, Search, FileText, FileImage, File, Trash2,
  Eye, Download, Share2, Pencil, Loader2, FolderOpen, Settings2, X,
  Camera, FileUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { usePatientDocuments, type PatientDocument, type UploadDocumentMeta } from '@/lib/hooks/usePatientDocuments'
import { useDocumentFolders } from '@/lib/hooks/useDocumentFolders'
import DocumentFolderManager from './DocumentFolderManager'
import ShareDocumentDialog from './ShareDocumentDialog'

const CameraCapture = dynamic(() => import('./CameraCapture'), {
  ssr: false,
  loading: () => <div className="flex items-center gap-2 text-sm text-lhc-text-muted"><Loader2 className="w-4 h-4 animate-spin" />Loading camera…</div>,
})

const DOCUMENT_TYPES = [
  'medical_report',
  'prescription',
  'lab_result',
  'imaging',
  'referral',
  'insurance',
  'other',
]

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function docTypeLabel(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <File className="w-8 h-8 text-lhc-text-muted" />
  if (mimeType.startsWith('image/')) return <FileImage className="w-8 h-8 text-blue-500" />
  if (mimeType === 'application/pdf') return <FileText className="w-8 h-8 text-red-500" />
  return <File className="w-8 h-8 text-lhc-text-muted" />
}

interface PendingUpload {
  file: Blob & { name: string }
  title: string
  document_type: string
  description: string
  folder_id: string
}

interface MyDocumentsTabProps {
  userId: string
}

export default function MyDocumentsTab({ userId }: MyDocumentsTabProps) {
  const { documents, loading, uploading, uploadDocument, deleteDocument, updateDocument, getSignedUrl } = usePatientDocuments(userId)
  const { folders, createFolder, updateFolder, deleteFolder } = useDocumentFolders(userId)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload metadata dialog
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  // Edit dialog
  const [editDoc, setEditDoc] = useState<PatientDocument | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editType, setEditType] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editFolderId, setEditFolderId] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Share dialog
  const [shareDoc, setShareDoc] = useState<PatientDocument | null>(null)
  const [shareOpen, setShareOpen] = useState(false)

  // Camera
  const [cameraOpen, setCameraOpen] = useState(false)

  // Delete confirm
  const [deletingDoc, setDeletingDoc] = useState<PatientDocument | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (selectedFolder && d.folder_id !== selectedFolder) return false
      if (typeFilter !== 'all' && d.document_type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!d.title.toLowerCase().includes(q) && !d.file_name.toLowerCase().includes(q) && !(d.description ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [documents, selectedFolder, typeFilter, search])

  function prepareUpload(file: Blob & { name: string }) {
    const nameWithoutExt = file.name.replace(/\.[^.]+$/, '')
    setPendingUpload({
      file,
      title: nameWithoutExt,
      document_type: 'other',
      description: '',
      folder_id: selectedFolder ?? '',
    })
    setUploadDialogOpen(true)
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    prepareUpload(files[0])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  async function confirmUpload() {
    if (!pendingUpload) return
    const meta: UploadDocumentMeta = {
      title: pendingUpload.title,
      document_type: pendingUpload.document_type,
      description: pendingUpload.description || null,
      folder_id: pendingUpload.folder_id || null,
    }
    const ok = await uploadDocument(pendingUpload.file, meta)
    if (ok) {
      setUploadDialogOpen(false)
      setPendingUpload(null)
    }
  }

  async function handleCameraCapture(blob: Blob) {
    setCameraOpen(false)
    const named = Object.assign(blob, { name: `capture-${Date.now()}.jpg` })
    prepareUpload(named)
  }

  async function handleView(doc: PatientDocument) {
    const url = await getSignedUrl(doc.file_path)
    if (url) window.open(url, '_blank')
  }

  async function handleDownload(doc: PatientDocument) {
    const url = await getSignedUrl(doc.file_path)
    if (!url) return
    const a = window.document.createElement('a')
    a.href = url
    a.download = doc.file_name
    a.click()
  }

  function openEdit(doc: PatientDocument) {
    setEditDoc(doc)
    setEditTitle(doc.title)
    setEditType(doc.document_type)
    setEditDescription(doc.description ?? '')
    setEditFolderId(doc.folder_id ?? '')
  }

  async function saveEdit() {
    if (!editDoc) return
    setEditSaving(true)
    await updateDocument(editDoc.id, {
      title: editTitle,
      document_type: editType,
      description: editDescription || null,
      folder_id: editFolderId || null,
    })
    setEditSaving(false)
    setEditDoc(null)
  }

  function openDelete(doc: PatientDocument) {
    setDeletingDoc(doc)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!deletingDoc) return
    await deleteDocument(deletingDoc)
    setDeleteDialogOpen(false)
    setDeletingDoc(null)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
          <Input
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {DOCUMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{docTypeLabel(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-1.5">
            <button
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-lhc-text-main hover:bg-lhc-background transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="w-4 h-4 text-lhc-text-muted" />
              Upload from Files
            </button>
            <button
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-lhc-text-main hover:bg-lhc-background transition-colors"
              onClick={() => setCameraOpen(true)}
            >
              <Camera className="w-4 h-4 text-lhc-text-muted" />
              Take a Photo
            </button>
          </PopoverContent>
        </Popover>
        <DocumentFolderManager
          folders={folders}
          onCreate={createFolder}
          onUpdate={updateFolder}
          onDelete={deleteFolder}
          trigger={
            <Button variant="outline" size="icon">
              <Settings2 className="w-4 h-4" />
            </Button>
          }
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Folder filter bar */}
      {folders.length > 0 && (
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-xs font-medium text-lhc-text-muted mr-1">Folders:</span>
          <button
            onClick={() => setSelectedFolder(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedFolder === null
                ? 'bg-lhc-primary text-white shadow-sm'
                : 'bg-lhc-surface border border-lhc-border text-lhc-text-muted hover:text-lhc-text-main hover:border-lhc-primary/40'
            }`}
          >
            All
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFolder(selectedFolder === f.id ? null : f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                selectedFolder === f.id
                  ? 'text-white shadow-sm'
                  : 'bg-lhc-surface border border-lhc-border text-lhc-text-muted hover:text-lhc-text-main hover:border-lhc-primary/40'
              }`}
              style={selectedFolder === f.id ? { backgroundColor: f.color } : {}}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: selectedFolder === f.id ? 'white' : f.color }}
              />
              {f.folder_name}
            </button>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-lhc-primary bg-lhc-primary/5'
            : 'border-lhc-border hover:border-lhc-primary/50 hover:bg-lhc-surface'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-lhc-text-muted" />
        <p className="text-sm text-lhc-text-muted">
          Drag &amp; drop a file here, or <span className="text-lhc-primary font-medium">click to upload</span>
        </p>
        <p className="text-xs text-lhc-text-muted mt-1">PDF, images, Word docs — up to 25 MB</p>
      </div>

      {/* Document grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-lhc-text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <FolderOpen className="w-10 h-10 mx-auto mb-3 text-lhc-text-muted opacity-50" />
          <p className="text-sm text-lhc-text-muted">
            {search || typeFilter !== 'all' || selectedFolder ? 'No documents match your filters.' : 'No documents yet. Upload your first document above.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <FileIcon mimeType={doc.mime_type} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-lhc-text-main truncate">{doc.title}</p>
                    <p className="text-xs text-lhc-text-muted truncate">{doc.file_name}</p>
                    {doc.file_size && (
                      <p className="text-xs text-lhc-text-muted">{formatFileSize(doc.file_size)}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">{docTypeLabel(doc.document_type)}</Badge>
                  {doc.folder && (() => {
                    const f = doc.folder as { color: string; folder_name: string }
                    return (
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-transparent"
                        style={{ borderColor: f.color, color: f.color }}
                      >
                        {f.folder_name}
                      </span>
                    )
                  })()}
                </div>

                <p className="text-xs text-lhc-text-muted">
                  {new Date(doc.created_at).toLocaleDateString()}
                </p>

                <div className="flex gap-1 flex-wrap">
                  {(doc.mime_type?.startsWith('image/') || doc.mime_type === 'application/pdf') && (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleView(doc)}>
                      <Eye className="w-3 h-3 mr-1" />View
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleDownload(doc)}>
                    <Download className="w-3 h-3 mr-1" />Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => { setShareDoc(doc); setShareOpen(true) }}
                  >
                    <Share2 className="w-3 h-3 mr-1" />Share
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openEdit(doc)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => openDelete(doc)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Camera capture overlay */}
      {cameraOpen && (
        <CameraCapture
          label="Capture Document"
          onCapture={handleCameraCapture}
          onCancel={() => setCameraOpen(false)}
        />
      )}

      {/* Upload metadata dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(v) => { if (!uploading) { setUploadDialogOpen(v); if (!v) setPendingUpload(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Document Details</DialogTitle>
          </DialogHeader>
          {pendingUpload && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="up-title">Title</Label>
                <Input
                  id="up-title"
                  value={pendingUpload.title}
                  onChange={(e) => setPendingUpload((p) => p ? { ...p, title: e.target.value } : p)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="up-type">Document Type</Label>
                <Select
                  value={pendingUpload.document_type}
                  onValueChange={(v) => setPendingUpload((p) => p ? { ...p, document_type: v } : p)}
                >
                  <SelectTrigger id="up-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{docTypeLabel(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {folders.length > 0 && (
                <div className="space-y-1">
                  <Label htmlFor="up-folder">Folder (optional)</Label>
                  <Select
                    value={pendingUpload.folder_id || 'none'}
                    onValueChange={(v) => setPendingUpload((p) => p ? { ...p, folder_id: v === 'none' ? '' : v } : p)}
                  >
                    <SelectTrigger id="up-folder">
                      <SelectValue placeholder="No folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No folder</SelectItem>
                      {folders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.folder_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="up-desc">Description (optional)</Label>
                <Textarea
                  id="up-desc"
                  value={pendingUpload.description}
                  onChange={(e) => setPendingUpload((p) => p ? { ...p, description: e.target.value } : p)}
                  className="h-20 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setUploadDialogOpen(false); setPendingUpload(null) }} disabled={uploading}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={confirmUpload} disabled={uploading || !pendingUpload.title.trim()}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Upload
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editDoc} onOpenChange={(v) => !v && setEditDoc(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Document Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{docTypeLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {folders.length > 0 && (
              <div className="space-y-1">
                <Label>Folder</Label>
                <Select value={editFolderId || 'none'} onValueChange={(v) => setEditFolderId(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="No folder" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No folder</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.folder_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="h-20 resize-none" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditDoc(null)}>Cancel</Button>
              <Button className="flex-1" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(v) => !v && setDeleteDialogOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-lhc-text-muted">
            &quot;{deletingDoc?.title}&quot; will be permanently deleted. This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <ShareDocumentDialog
        document={shareDoc}
        open={shareOpen}
        onOpenChange={(v) => { setShareOpen(v); if (!v) setShareDoc(null) }}
        patientId={userId}
      />

      {/* Clear filters button */}
      {(search || typeFilter !== 'all' || selectedFolder) && (
        <Button
          variant="ghost"
          size="sm"
          className="text-lhc-text-muted"
          onClick={() => { setSearch(''); setTypeFilter('all'); setSelectedFolder(null) }}
        >
          <X className="w-3.5 h-3.5 mr-1.5" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
