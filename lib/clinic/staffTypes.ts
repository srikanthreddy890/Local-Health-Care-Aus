export type StaffRole = 'owner' | 'manager' | 'staff' | 'receptionist'

export interface ClinicPermissions {
  can_manage_doctors: boolean
  can_manage_appointments: boolean
  can_manage_bookings: boolean
  can_view_reports: boolean
  can_manage_settings: boolean
  can_manage_staff: boolean
  can_manage_loyalty: boolean
  can_view_patients: boolean
  can_view_chat: boolean
  can_send_messages: boolean
  can_manage_prescriptions: boolean
  can_manage_documents: boolean
  can_manage_referrals: boolean
  can_manage_quotes: boolean
  can_manage_billing: boolean
  can_manage_blog: boolean
}

export interface ClinicStaffMember {
  id: string
  user_id: string
  clinic_id: string
  role: StaffRole
  permissions: ClinicPermissions
  is_active: boolean
  invited_by: string | null
  invited_at: string | null
  accepted_at: string | null
  email?: string
  first_name?: string
  last_name?: string
}

export interface ClinicInvitation {
  id: string
  clinic_id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: StaffRole
  permissions: ClinicPermissions
  invited_by: string
  accepted: boolean
  expires_at: string
  created_at: string
}

export const ALL_PERMISSIONS: ClinicPermissions = {
  can_manage_doctors: true,
  can_manage_appointments: true,
  can_manage_bookings: true,
  can_view_reports: true,
  can_manage_settings: true,
  can_manage_staff: true,
  can_manage_loyalty: true,
  can_view_patients: true,
  can_view_chat: true,
  can_send_messages: true,
  can_manage_prescriptions: true,
  can_manage_documents: true,
  can_manage_referrals: true,
  can_manage_quotes: true,
  can_manage_billing: true,
  can_manage_blog: true,
}

/** Default permissions — all false. Used as a base when merging partial DB data. */
const DEFAULT_PERMISSIONS: ClinicPermissions = {
  can_manage_doctors: false,
  can_manage_appointments: false,
  can_manage_bookings: false,
  can_view_reports: false,
  can_manage_settings: false,
  can_manage_staff: false,
  can_manage_loyalty: false,
  can_view_patients: false,
  can_view_chat: false,
  can_send_messages: false,
  can_manage_prescriptions: false,
  can_manage_documents: false,
  can_manage_referrals: false,
  can_manage_quotes: false,
  can_manage_billing: false,
  can_manage_blog: false,
}

/**
 * Merge a partial permissions object from the database with defaults.
 * Handles existing records that only have the original 10 keys — missing
 * keys default to `false`.
 */
export function normalizePermissions(raw: Partial<ClinicPermissions> | null | undefined): ClinicPermissions {
  if (!raw) return { ...DEFAULT_PERMISSIONS }
  return { ...DEFAULT_PERMISSIONS, ...raw }
}

export const ROLE_PRESETS: Record<StaffRole, ClinicPermissions> = {
  owner: { ...ALL_PERMISSIONS },
  manager: {
    can_manage_doctors: true,
    can_manage_appointments: true,
    can_manage_bookings: true,
    can_view_reports: true,
    can_manage_settings: false,
    can_manage_staff: false,
    can_manage_loyalty: true,
    can_view_patients: true,
    can_view_chat: true,
    can_send_messages: true,
    can_manage_prescriptions: true,
    can_manage_documents: true,
    can_manage_referrals: true,
    can_manage_quotes: true,
    can_manage_billing: false,
    can_manage_blog: false,
  },
  staff: {
    can_manage_doctors: false,
    can_manage_appointments: true,
    can_manage_bookings: true,
    can_view_reports: false,
    can_manage_settings: false,
    can_manage_staff: false,
    can_manage_loyalty: false,
    can_view_patients: true,
    can_view_chat: true,
    can_send_messages: false,
    can_manage_prescriptions: true,
    can_manage_documents: true,
    can_manage_referrals: false,
    can_manage_quotes: false,
    can_manage_billing: false,
    can_manage_blog: false,
  },
  receptionist: {
    can_manage_doctors: false,
    can_manage_appointments: true,
    can_manage_bookings: true,
    can_view_reports: false,
    can_manage_settings: false,
    can_manage_staff: false,
    can_manage_loyalty: false,
    can_view_patients: true,
    can_view_chat: false,
    can_send_messages: false,
    can_manage_prescriptions: false,
    can_manage_documents: false,
    can_manage_referrals: false,
    can_manage_quotes: false,
    can_manage_billing: false,
    can_manage_blog: false,
  },
}

export const ROLE_BADGE_VARIANT: Record<StaffRole, string> = {
  owner: 'purple',
  manager: 'default',
  staff: 'success',
  receptionist: 'orange',
}

export const PERMISSION_LABELS: Record<keyof ClinicPermissions, string> = {
  can_manage_doctors: 'Manage Doctors',
  can_manage_appointments: 'Manage Appointments',
  can_manage_bookings: 'Manage Bookings',
  can_view_reports: 'View Reports',
  can_manage_settings: 'Manage Settings',
  can_manage_staff: 'Manage Staff',
  can_manage_loyalty: 'Manage Loyalty',
  can_view_patients: 'View Patients',
  can_view_chat: 'View Chat',
  can_send_messages: 'Send Messages',
  can_manage_prescriptions: 'Manage Prescriptions',
  can_manage_documents: 'Manage Documents',
  can_manage_referrals: 'Manage Referrals',
  can_manage_quotes: 'Manage Quotes',
  can_manage_billing: 'Manage Billing',
  can_manage_blog: 'Manage Blog',
}
