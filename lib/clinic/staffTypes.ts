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
}
