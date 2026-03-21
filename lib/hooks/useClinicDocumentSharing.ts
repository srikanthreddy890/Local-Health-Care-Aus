'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './usePatientDocuments'

export interface SharedDocumentFromPatient {
  share_id: string
  document_id: string
  file_name: string
  title: string
  document_type: string
  file_size: number | null
  shared_at: string
  expires_at: string | null
  is_downloaded: boolean
  password_attempts: number
  max_password_attempts: number
  access_revoked: boolean
  notes: string | null
  patient_id: string
  first_name: string | null
  last_name: string | null
  file_path: string
  mime_type: string | null
}

export interface ClinicDocument {
  id: string
  clinic_id: string | null
  uploaded_by: string | null
  file_name: string
  file_path: string
  file_size: number | null
  title: string
  description: string | null
  document_type: string
  mime_type: string | null
  tags: unknown | null
  is_verified: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface ClinicDocumentShare {
  id: string
  document_id: string
  patient_id: string
  clinic_id: string
  shared_at: string
  is_downloaded: boolean | null
  expires_at: string | null
  access_revoked: boolean | null
  notes: string | null
  patient?: { id: string; first_name: string | null; last_name: string | null } | null
  document?: { title: string; file_name: string } | null
}

export function useClinicDocumentSharing(clinicId: string | null) {
  const [docsFromPatients, setDocsFromPatients] = useState<SharedDocumentFromPatient[]>([])
  const [clinicDocuments, setClinicDocuments] = useState<ClinicDocument[]>([])
  const [sharedHistory, setSharedHistory] = useState<ClinicDocumentShare[]>([])
  const [loading, setLoading] = useState(false)

  const fetchDocsFromPatients = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_shared_documents_for_clinic', { p_clinic_id: clinicId })
      if (error) throw error
      setDocsFromPatients(data ?? [])
    } catch {
      toast({ title: 'Error', description: 'Could not load patient documents.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [clinicId])

  const fetchClinicDocuments = useCallback(async () => {
    if (!clinicId) return
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clinic_documents')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setClinicDocuments(data ?? [])
    } catch {
      toast({ title: 'Error', description: 'Could not load clinic documents.', variant: 'destructive' })
    }
  }, [clinicId])

  const fetchSharedHistory = useCallback(async () => {
    if (!clinicId) return
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clinic_document_shares')
        .select('*, patient:patient_id(id, first_name, last_name), document:document_id(title, file_name)')
        .eq('clinic_id', clinicId)
        .order('shared_at', { ascending: false })
      if (error) throw error
      setSharedHistory(data ?? [])
    } catch {
      toast({ title: 'Error', description: 'Could not load share history.', variant: 'destructive' })
    }
  }, [clinicId])

  useEffect(() => {
    fetchDocsFromPatients()
    fetchClinicDocuments()
    fetchSharedHistory()
  }, [fetchDocsFromPatients, fetchClinicDocuments, fetchSharedHistory])

  async function uploadClinicDocument(
    file: File,
    meta: { title: string; document_type: string; description?: string | null },
    uploadedBy: string
  ): Promise<boolean> {
    if (!clinicId) return false

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload a PDF, image, or Word document.', variant: 'destructive' })
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 25MB.', variant: 'destructive' })
      return false
    }

    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${clinicId}/${crypto.randomUUID()}.${ext}`

    try {
      const supabase = createClient()
      const { error: storageError } = await supabase.storage
        .from('clinic-documents')
        .upload(path, file, { contentType: file.type })
      if (storageError) throw storageError

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase as any)
        .from('clinic_documents')
        .insert({
          clinic_id: clinicId,
          uploaded_by: uploadedBy,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type,
          title: meta.title,
          document_type: meta.document_type,
          description: meta.description ?? null,
        })
      if (dbError) {
        await supabase.storage.from('clinic-documents').remove([path])
        throw dbError
      }

      toast({ title: 'Document uploaded', description: meta.title })
      await fetchClinicDocuments()
      return true
    } catch {
      toast({ title: 'Upload failed', description: 'Could not upload document.', variant: 'destructive' })
      return false
    }
  }

  async function deleteClinicDocument(doc: ClinicDocument): Promise<void> {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('clinic_documents')
      .delete()
      .eq('id', doc.id)
    if (error) {
      toast({ title: 'Error', description: 'Could not delete document.', variant: 'destructive' })
      return
    }
    await supabase.storage.from('clinic-documents').remove([doc.file_path])
    toast({ title: 'Document deleted' })
    setClinicDocuments((prev) => prev.filter((d) => d.id !== doc.id))
  }

  async function getSignedUrl(filePath: string): Promise<string | null> {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('clinic-documents')
      .createSignedUrl(filePath, 300)
    if (error || !data) return null
    return data.signedUrl
  }

  async function revokePatientAccess(shareId: string): Promise<void> {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('patient_document_shares')
      .update({ access_revoked: true, revoked_at: new Date().toISOString() })
      .eq('id', shareId)
    if (error) {
      toast({ title: 'Error', description: 'Could not revoke access.', variant: 'destructive' })
      return
    }
    toast({ title: 'Access revoked' })
    await fetchDocsFromPatients()
  }

  async function revokeClinicShare(shareId: string): Promise<void> {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('clinic_document_shares')
      .update({ access_revoked: true, revoked_at: new Date().toISOString() })
      .eq('id', shareId)
    if (error) {
      toast({ title: 'Error', description: 'Could not revoke share.', variant: 'destructive' })
      return
    }
    toast({ title: 'Share revoked' })
    await fetchSharedHistory()
  }

  return {
    docsFromPatients,
    clinicDocuments,
    sharedHistory,
    loading,
    refetchPatientDocs: fetchDocsFromPatients,
    refetchClinicDocs: fetchClinicDocuments,
    refetchHistory: fetchSharedHistory,
    uploadClinicDocument,
    deleteClinicDocument,
    getSignedUrl,
    revokePatientAccess,
    revokeClinicShare,
  }
}
