'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import type { DocumentFolder } from './useDocumentFolders'

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export interface PatientDocument {
  id: string
  patient_id: string
  folder_id: string | null
  file_name: string
  file_path: string
  file_size: number | null
  title: string
  description: string | null
  document_type: string
  mime_type: string | null
  tags: unknown | null
  is_verified: boolean | null
  created_at: string
  updated_at: string
  folder?: DocumentFolder | null
}

export interface UploadDocumentMeta {
  title: string
  document_type: string
  description?: string | null
  folder_id?: string | null
}

export function usePatientDocuments(patientId: string | null) {
  const [documents, setDocuments] = useState<PatientDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fetchDocuments = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('patient_documents')
        .select('*, folder:folder_id(*)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setDocuments(data ?? [])
    } catch {
      toast({ title: 'Error', description: 'Could not load documents.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  async function uploadDocument(file: Blob & { name: string }, meta: UploadDocumentMeta): Promise<boolean> {
    if (!patientId) return false

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload a PDF, image, or Word document.', variant: 'destructive' })
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 25MB.', variant: 'destructive' })
      return false
    }

    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${patientId}/${crypto.randomUUID()}.${ext}`

    setUploading(true)
    try {
      const supabase = createClient()
      const { error: storageError } = await supabase.storage
        .from('patient-documents')
        .upload(path, file, { contentType: file.type })
      if (storageError) throw storageError

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase as any)
        .from('patient_documents')
        .insert({
          patient_id: patientId,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type,
          title: meta.title,
          document_type: meta.document_type,
          description: meta.description ?? null,
          folder_id: meta.folder_id ?? null,
        })
      if (dbError) {
        // Rollback storage upload on DB failure
        await supabase.storage.from('patient-documents').remove([path])
        throw dbError
      }

      toast({ title: 'Document uploaded', description: meta.title })
      await fetchDocuments()
      return true
    } catch {
      toast({ title: 'Upload failed', description: 'Could not upload document.', variant: 'destructive' })
      return false
    } finally {
      setUploading(false)
    }
  }

  async function deleteDocument(doc: PatientDocument): Promise<void> {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('patient_documents')
      .delete()
      .eq('id', doc.id)
    if (error) {
      toast({ title: 'Error', description: 'Could not delete document.', variant: 'destructive' })
      return
    }
    await supabase.storage.from('patient-documents').remove([doc.file_path])
    toast({ title: 'Document deleted' })
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
  }

  async function updateDocument(id: string, data: Partial<UploadDocumentMeta>): Promise<boolean> {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('patient_documents')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast({ title: 'Error', description: 'Could not update document.', variant: 'destructive' })
      return false
    }
    await fetchDocuments()
    return true
  }

  async function getSignedUrl(filePath: string): Promise<string | null> {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('patient-documents')
      .createSignedUrl(filePath, 300)
    if (error || !data) return null
    return data.signedUrl
  }

  return {
    documents,
    loading,
    uploading,
    refetch: fetchDocuments,
    uploadDocument,
    deleteDocument,
    updateDocument,
    getSignedUrl,
  }
}
