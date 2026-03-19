'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

export interface DocumentFolder {
  id: string
  patient_id: string
  folder_name: string
  folder_type: string
  description: string | null
  icon: string | null
  color: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface CreateFolderData {
  folder_name: string
  color: string
  description?: string | null
}

export function useDocumentFolders(patientId: string | null) {
  const [folders, setFolders] = useState<DocumentFolder[]>([])
  const [loading, setLoading] = useState(false)

  const fetchFolders = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('document_folders')
        .select('*')
        .eq('patient_id', patientId)
        .order('is_default', { ascending: false })
        .order('folder_name')
      if (error) throw error
      setFolders(data ?? [])
    } catch {
      toast({ title: 'Error', description: 'Could not load folders.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { fetchFolders() }, [fetchFolders])

  async function createFolder(data: CreateFolderData): Promise<boolean> {
    if (!patientId) return false
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('document_folders')
      .insert({
        patient_id: patientId,
        folder_name: data.folder_name,
        color: data.color,
        description: data.description ?? null,
        folder_type: 'custom',
        is_default: false,
      })
    if (error) {
      toast({ title: 'Error', description: 'Could not create folder.', variant: 'destructive' })
      return false
    }
    toast({ title: 'Folder created', description: `"${data.folder_name}" folder created.` })
    await fetchFolders()
    return true
  }

  async function updateFolder(id: string, data: Partial<CreateFolderData>): Promise<boolean> {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('document_folders')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast({ title: 'Error', description: 'Could not update folder.', variant: 'destructive' })
      return false
    }
    await fetchFolders()
    return true
  }

  async function deleteFolder(id: string): Promise<boolean> {
    const supabase = createClient()
    // Unlink documents from this folder first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('patient_documents')
      .update({ folder_id: null })
      .eq('folder_id', id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('document_folders')
      .delete()
      .eq('id', id)
    if (error) {
      toast({ title: 'Error', description: 'Could not delete folder.', variant: 'destructive' })
      return false
    }
    toast({ title: 'Folder deleted' })
    await fetchFolders()
    return true
  }

  return { folders, loading, refetch: fetchFolders, createFolder, updateFolder, deleteFolder }
}
