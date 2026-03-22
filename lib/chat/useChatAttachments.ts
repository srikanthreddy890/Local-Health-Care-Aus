'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MessageAttachment } from './types'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

export function useChatAttachments() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadAttachment = useCallback(async (
    file: File,
    conversationId: string
  ): Promise<MessageAttachment | null> => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 10MB limit')
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('File type not allowed')
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const supabase = createClient()

      // Verify the user has access to this conversation before uploading
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: hasAccess } = await (supabase as any).rpc('has_chat_access', {
        p_conversation_id: conversationId,
        p_user_id: user.id,
      })
      if (!hasAccess) throw new Error('No access to this conversation')
      const ext = file.name.split('.').pop() || 'bin'
      const path = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      setUploadProgress(30)

      const { error } = await supabase.storage
        .from('chat-attachments')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      setUploadProgress(80)

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(path)

      setUploadProgress(100)

      return {
        url: urlData.publicUrl,
        type: file.type,
        name: file.name,
        sizeBytes: file.size,
      }
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [])

  return { uploadAttachment, isUploading, uploadProgress }
}
