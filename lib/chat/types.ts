export type UserType = 'patient' | 'clinic'

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
}

export interface TypingUser {
  userId: string
  userName: string
}
