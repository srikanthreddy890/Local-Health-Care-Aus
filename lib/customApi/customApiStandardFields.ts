/**
 * Standardized field definitions for the Custom API integration system.
 * Every component and edge function uses these fixed internal field names.
 * Clinics map these to their external API's structure via field_mappings.
 */

// ── Booking fields ──────────────────────────────────────────────────────────

export interface StandardField {
  key: string
  label: string
  required: boolean
}

export const STANDARD_BOOKING_FIELDS: StandardField[] = [
  { key: 'patient_first_name', label: 'Patient First Name', required: true },
  { key: 'patient_last_name', label: 'Patient Last Name', required: true },
  { key: 'patient_email', label: 'Patient Email', required: true },
  { key: 'patient_mobile', label: 'Patient Mobile', required: true },
  { key: 'patient_phone', label: 'Patient Phone (alias)', required: false },
  { key: 'patient_dob', label: 'Date of Birth', required: false },
  { key: 'slot_id', label: 'Slot ID', required: true },
  { key: 'doctor_id', label: 'Doctor ID', required: true },
  { key: 'appointment_date', label: 'Appointment Date', required: false },
  { key: 'appointment_time', label: 'Appointment Time', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: 'patient_notes', label: 'Patient Notes (alias)', required: false },
  { key: 'service_name', label: 'Service Name', required: false },
]

// ── Doctor fields ───────────────────────────────────────────────────────────

export const STANDARD_DOCTOR_FIELDS: StandardField[] = [
  { key: 'id', label: 'Doctor ID', required: true },
  { key: 'name', label: 'Doctor Name', required: true },
  { key: 'specialization', label: 'Specialization', required: false },
  { key: 'duration', label: 'Appointment Duration', required: false },
  { key: 'email', label: 'Doctor Email', required: false },
  { key: 'phone', label: 'Doctor Phone', required: false },
]

// ── Slot / appointment fields ───────────────────────────────────────────────

export const STANDARD_SLOT_FIELDS: StandardField[] = [
  { key: 'appointment_id', label: 'Appointment / Slot ID', required: true },
  { key: 'slot_id', label: 'Slot ID (alias)', required: false },
  { key: 'start_time', label: 'Start Time', required: true },
  { key: 'end_time', label: 'End Time', required: false },
  { key: 'doctor_name', label: 'Doctor Name', required: false },
  { key: 'doctor_id', label: 'Doctor ID', required: true },
  { key: 'available', label: 'Available', required: false },
  { key: 'duration', label: 'Duration (minutes)', required: false },
]

// ── Helper ──────────────────────────────────────────────────────────────────

export interface BookingParamsInput {
  patientFirstName: string
  patientLastName: string
  patientEmail: string
  patientMobile: string
  patientDob?: string
  slotId: string
  doctorId: string
  appointmentDate?: string
  appointmentTime?: string
  notes?: string
  serviceName?: string
}

/**
 * Build a complete standardized params object from patient data + appointment
 * details, ready to send to the `book_appointment` endpoint.
 */
export function createStandardizedBookingParams(data: BookingParamsInput): Record<string, string> {
  const params: Record<string, string> = {
    patient_first_name: data.patientFirstName,
    patient_last_name: data.patientLastName,
    patient_email: data.patientEmail,
    patient_mobile: data.patientMobile,
    patient_phone: data.patientMobile, // alias
    slot_id: data.slotId,
    doctor_id: data.doctorId,
  }

  if (data.patientDob) params.patient_dob = data.patientDob
  if (data.appointmentDate) params.appointment_date = data.appointmentDate
  if (data.appointmentTime) params.appointment_time = data.appointmentTime
  if (data.notes) {
    params.notes = data.notes
    params.patient_notes = data.notes // alias
  }
  if (data.serviceName) params.service_name = data.serviceName

  return params
}
