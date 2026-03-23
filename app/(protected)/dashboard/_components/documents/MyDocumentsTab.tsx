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

function docTypeColor(t: string): { bg: string; text: string; border: string; thumbBg: string } {
  switch (t) {
    case 'medical_report':
      return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', thumbBg: '#DBEAFE' }
    case 'prescription':
    case 'lab_result':
      return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', thumbBg: '#DBEAFE' }
    case 'treatment_plan':
      return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', thumbBg: '#FEF3C7' }
    case 'imaging':
    case 'referral':
      return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', thumbBg: '#FEF3C7' }
    case 'insurance':
      return { bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7', thumbBg: '#ECFDF5' }
    default:
      return { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB', thumbBg: '#F3F4F6' }
  }
}

function fileExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toUpperCase() ?? ''
  return ext.length <= 4 ? ext : ''
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

  // Inline new folder
  const [newFolderInline, setNewFolderInline] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

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
        <div className="relative flex-1 min-w-0 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
          <Input
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
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
      {(
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
          {newFolderInline ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    createFolder({ folder_name: newFolderName.trim(), color: '#00A86B' })
                    setNewFolderName('')
                    setNewFolderInline(false)
                  }
                  if (e.key === 'Escape') {
                    setNewFolderName('')
                    setNewFolderInline(false)
                  }
                }}
                placeholder="Folder name"
                className="px-2 py-1 text-xs border border-lhc-border rounded-lg focus:outline-none focus:border-lhc-primary w-full sm:w-28"
              />
              <button
                onClick={() => {
                  if (newFolderName.trim()) {
                    createFolder({ folder_name: newFolderName.trim(), color: '#00A86B' })
                    setNewFolderName('')
                    setNewFolderInline(false)
                  }
                }}
                className="text-lhc-primary text-xs font-medium"
              >
                ✓
              </button>
              <button
                onClick={() => { setNewFolderName(''); setNewFolderInline(false) }}
                className="text-lhc-text-muted text-xs"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setNewFolderInline(true)}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium text-lhc-primary border border-dashed border-emerald-300 hover:bg-green-50 transition-colors"
            >
              + New folder
            </button>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex items-center gap-3 h-11 px-3 border-[1.5px] border-dashed rounded-[10px] cursor-pointer transition-colors ${
          dragOver
            ? 'border-lhc-primary bg-green-50'
            : 'border-lhc-border hover:border-lhc-primary/50'
        }`}
      >
        <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
          <Upload className="w-4 h-4 text-emerald-600" />
        </div>
        <p className="text-xs text-lhc-text-muted flex-1">
          Drop files here, or <span className="text-lhc-primary font-medium">browse to upload</span>
        </p>
        <p className="text-[10px] text-lhc-text-muted hidden sm:block flex-shrink-0">
          PDF, JPG, PNG, DOCX · up to 25 MB
        </p>
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
            <Card key={doc.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-0">
                {/* Thumbnail area */}
                {(() => {
                  const colors = docTypeColor(doc.document_type)
                  const ext = fileExtension(doc.file_name)
                  return (
                    <div className="h-[70px] flex items-center justify-center relative" style={{ backgroundColor: colors.thumbBg }}>
                      <FileIcon mimeType={doc.mime_type} />
                      {ext && (
                        <span
                          className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {ext}
                        </span>
                      )}
                    </div>
                  )
                })()}

                {/* Content */}
                <div className="p-3 space-y-2">
                  <p className="font-medium text-xs text-lhc-text-main truncate">{doc.title}</p>
                  <p className="text-[10px] text-lhc-text-muted">
                    {formatFileSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const colors = docTypeColor(doc.document_type)
                      return (
                        <span
                          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border"
                          style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
                        >
                          {docTypeLabel(doc.document_type)}
                        </span>
                      )
                    })()}
                    {doc.folder && (() => {
                      const f = doc.folder as { color: string; folder_name: string }
                      return (
                        <span
                          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border"
                          style={{ backgroundColor: '#ECFDF5', color: '#065F46', borderColor: '#6EE7B7' }}
                        >
                          {f.folder_name}
                        </span>
                      )
                    })()}
                  </div>
                </div>

                {/* Footer actions */}
                <div className="flex items-center gap-1 px-3 py-2 border-t border-lhc-border">
                  {(doc.mime_type?.startsWith('image/') || doc.mime_type === 'application/pdf') && (
                    <button className="text-[10px] text-lhc-text-muted hover:text-lhc-text-main flex items-center gap-0.5 transition-colors min-w-[44px] min-h-[44px] justify-center" onClick={() => handleView(doc)}>
                      <Eye className="w-4 h-4" />View
                    </button>
                  )}
                  <button className="text-[10px] text-lhc-text-muted hover:text-lhc-text-main flex items-center gap-0.5 transition-colors min-w-[44px] min-h-[44px] justify-center" onClick={() => handleDownload(doc)}>
                    <Download className="w-4 h-4" />Save
                  </button>
                  <button className="text-[10px] text-lhc-text-muted hover:text-lhc-text-main flex items-center gap-0.5 transition-colors min-w-[44px] min-h-[44px] justify-center" onClick={() => { setShareDoc(doc); setShareOpen(true) }}>
                    <Share2 className="w-4 h-4" />Share
                  </button>
                  <button className="text-[10px] text-lhc-text-muted hover:text-lhc-text-main flex items-center gap-0.5 transition-colors ml-auto min-w-[44px] min-h-[44px] justify-center" onClick={() => openEdit(doc)}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button className="text-[10px] text-red-400 hover:text-red-600 flex items-center gap-0.5 transition-colors min-w-[44px] min-h-[44px] justify-center" onClick={() => openDelete(doc)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
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
