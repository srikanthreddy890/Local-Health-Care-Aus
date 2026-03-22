export interface Medication {
  name: string
  dosage?: string
  frequency?: string
  duration?: string
  notes?: string
}

export type PrescriptionStatus = 'active' | 'dispensed' | 'partially_dispensed' | 'expired' | 'cancelled'

export type ShareStatus = 'pending' | 'viewed' | 'dispensed' | 'rejected'

export interface Prescription {
  id: string
  title: string
  description: string | null
  status: string
  prescription_date: string | null
  prescription_text: string | null
  medications: Medication[]
  doctor_name: string | null
  clinic_name: string | null
  file_path: string | null
  file_name: string | null
  expires_at: string | null
  booking_reference: string | null
  created_at: string
}

export interface PrescriptionShare {
  id: string
  prescription_id: string
  pharmacy_name: string | null
  pharmacy_logo_url: string | null
  pharmacy_phone: string | null
  pharmacy_address: string | null
  status: string
  shared_at: string
  access_revoked: boolean | null
}

export interface ClinicPrescription {
  id: string
  clinic_id: string
  patient_id: string | null
  patient_first_name: string | null
  patient_last_name: string | null
  doctor_id: string | null
  doctor_name: string | null
  booking_type: string | null
  booking_reference: string | null
  title: string
  description: string | null
  prescription_date: string | null
  prescription_text: string | null
  medications: Medication[]
  file_path: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  status: string
  expires_at: string | null
  created_by: string | null
  created_at: string
}

export interface IncomingPrescription {
  // Share fields
  share_id: string
  shared_at: string
  share_status: string
  patient_notes: string | null
  response_notes: string | null
  access_revoked: boolean

  // Prescription fields
  prescription_id: string
  title: string
  description: string | null
  prescription_date: string | null
  prescription_text: string | null
  medications: Medication[]
  doctor_name: string | null
  status: string
  file_path: string | null
  file_name: string | null
  expires_at: string | null
  booking_reference: string | null

  // Related entity fields
  prescribing_clinic_name: string | null
  prescribing_clinic_id: string | null
  patient_first_name: string | null
  patient_last_name: string | null
  patient_id: string | null
}

export interface CreatePrescriptionData {
  clinic_id: string
  patient_id?: string | null
  doctor_id?: string | null
  doctor_name?: string | null
  booking_id?: string | null
  centaur_booking_id?: string | null
  custom_api_booking_id?: string | null
  booking_type?: string
  booking_reference?: string | null
  title: string
  description?: string | null
  prescription_text?: string | null
  medications?: Medication[]
  expires_at?: string | null
  created_by: string
}

export interface RecentBooking {
  id: string
  reference: string
  type: 'standard' | 'centaur' | 'custom_api'
  patientName: string
  patientId?: string
  doctorName: string
  doctorId?: string
  appointmentDate: string
  appointmentTime: string
}

export interface PatientPrescription {
  id: string
  title: string
  description: string | null
  doctor_name: string | null
  prescription_date: string
  status: string | null
  clinic_id: string
  created_at: string | null
}

export interface PharmacyOption {
  id: string
  name: string
  zip_code: string | null
  city: string | null
  address_line1: string | null
  phone: string | null
  logo_url: string | null
  isInPostcode: boolean
}

export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

/** Check if a prescription is expired based on its expires_at field */
export function isPrescriptionExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}
