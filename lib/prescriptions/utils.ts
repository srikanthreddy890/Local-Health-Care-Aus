'use client'

import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

/**
 * Download a prescription file from Supabase storage.
 * Shared across patient, clinic, and pharmacy views.
 */
export async function downloadPrescriptionFile(filePath: string, fileName: string): Promise<void> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.storage.from('prescriptions').download(filePath)
    if (error) throw error
    const url = URL.createObjectURL(data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    toast.error('Could not download file.')
  }
}
