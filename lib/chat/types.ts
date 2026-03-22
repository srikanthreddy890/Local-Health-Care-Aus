export type UserType = 'patient' | 'clinic'

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface ConversationItem {
  id: string
  patient_id: string
  clinic_id: string
  created_at: string | null
  updated_at: string | null
  last_message_at: string | null
  last_message_preview_encrypted: string | null
  is_archived_by_patient: boolean | null
  is_archived_by_clinic: boolean | null
  // enriched client-side
  display_name: string
  avatar_url: string | null
  unread_count: number
  local_preview?: string
}

export interface MessageReaction {
  emoji: string
  users: { userId: string; userName?: string }[]
}

export interface MessageAttachment {
  url: string
  type: string // MIME type
  name: string
  sizeBytes: number
}

export interface DecryptedMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_type: string // 'patient' | 'clinic' — string to match DB schema
  content: string     // decrypted plaintext
  is_read: boolean | null
  read_at: string | null
  created_at: string
  isOptimistic?: boolean
  status?: MessageStatus
  delivered_at?: string | null
  // Advanced features
  edited_at?: string | null
  deleted_at?: string | null
  attachment?: MessageAttachment | null
  reactions?: MessageReaction[]
}

export interface TypingUser {
  userId: string
  userName: string
}
