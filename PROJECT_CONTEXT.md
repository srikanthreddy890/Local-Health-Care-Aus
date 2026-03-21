# PROJECT_CONTEXT.md — LocalHealthcare

> **Complete context document for rebuilding this project in Next.js (App Router) using the same Supabase backend.**

---

```
┌─────────────────────────────────────────────────────────────────────┐
│  App Name:           LocalHealthcare                                │
│  App Type:           Multi-tenant Healthcare SaaS                   │
│                      (clinic management + patient booking portal)   │
│  Supabase Features:  Auth (email/password, OAuth, MFA/TOTP)         │
│                      PostgreSQL (RLS-enforced)                      │
│                      Edge Functions (51)                            │
│                      Realtime (Postgres Changes + Presence)         │
│                      Storage (multiple buckets)                     │
│  Auth Methods:       Email/Password, Google OAuth, TOTP MFA,        │
│                      Email-link Password Reset                      │
│  Total URL Routes:   15 (14 named + 404 catch-all)                  │
│  Internal Portals:   4 (patient, clinic, admin, profile)            │
│  Edge Functions:     51                                             │
│  Custom Hooks:       41                                             │
│  Languages (i18n):   8 (EN, ZH, ZH-TW, HI, ID, TH, IT, ES)        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## SECTION 1 — Project Overview

### What This App Does

LocalHealthcare is a **multi-tenant healthcare platform** that connects patients with clinics and healthcare providers. It serves two distinct audiences simultaneously:

1. **Clinics / Healthcare Providers** — manage their clinic profile, roster of doctors, appointment schedules, bookings, documents, prescriptions, referrals, staff, and billing.
2. **Patients** — search for clinics near them, book appointments (including emergency slots), manage their health records, chat with clinics, request quotes, share documents, and track prescriptions.

A third role, **platform admin**, oversees the entire platform: approves clinic claims, manages content, reviews billing, and performs data imports.

### App Type

Multi-tenant healthcare SaaS. Each **clinic** is a tenant. Clinics own their doctors, appointments, and data. Patients interact with multiple clinics. Staff members belong to one clinic and act on its behalf.

### User Roles

| Role | Description |
|------|-------------|
| `patient` | Default authenticated user. Books appointments, manages health records. |
| `clinic` (owner) | Owns a clinic. Full control over clinic data, doctors, staff, settings. |
| `staff` (sub-role) | Belongs to a specific clinic. Access governed by 4 permission tiers: `owner`, `manager`, `staff`, `receptionist`. Permissions include `can_manage_doctors`, `can_manage_appointments`, `can_view_chat`, `can_manage_billing`, etc. |
| `admin` | Platform superuser. Accessed via `user_roles` table with `role = 'admin'`. Can see all clinics, approve claims, manage content. |

### Primary User Flows

**Patient flow:**
1. Land on home page (public) → browse clinic directory or use search
2. Sign up (email or Google) → accept Terms & Conditions → land on Patient Dashboard
3. Search clinics by postcode → view public clinic profile → book appointment
4. Manage profile: health fund, family members, documents, prescriptions, treatment plans
5. Chat with clinics (end-to-end encrypted)
6. Request quotes from multiple clinics

**Clinic flow:**
1. Sign up with `user_type = 'clinic'` → accept Terms → auto-redirect to Clinic Portal
2. Complete clinic onboarding (profile, address, operating hours, images)
3. Add doctors → assign services → generate appointment slots
4. Manage incoming bookings (standard, Centaur-integrated, or custom API)
5. Share documents / prescriptions with patients
6. Send and receive referrals to/from other clinics
7. Manage staff with role-based permissions

**Admin flow:**
1. Log in → auto-redirect to Admin Panel (role detected via `user_roles` table)
2. Review clinic claims, approve/reject
3. Manage all clinics, patients, appointments, blog posts, billing

### Multi-Tenancy Pattern

Clinic-based. Every doctor, appointment, booking, service, staff member, and document is scoped to a `clinic_id`. The RLS policies on the database enforce that clinic users can only see and mutate their own clinic's data. Patients are not scoped to a clinic — they interact with any clinic they choose.

---

## SECTION 2 — Supabase Project Configuration

### Project URL and Anon Key

The Supabase client is initialized in `src/integrations/supabase/client.ts`. The URL and anon (publishable) key are **hardcoded** in this auto-generated file (not read from environment variables at runtime). The values are safe to expose as the anon key is the public key designed for browser-side use.

### Client Initialization

A single browser-side Supabase client is created using `createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)` and exported as a named singleton `supabase`. It is typed with an auto-generated `Database` type from `src/integrations/supabase/types.ts`.

```
Pattern: Browser-only singleton
File: src/integrations/supabase/client.ts
Import alias: import { supabase } from "@/integrations/supabase/client"
```

No SSR client (no `createServerClient` or `@supabase/ssr` package) is used anywhere in the current codebase. All data fetching is client-side.

### Custom Configurations

No custom headers, storage settings, or auth options are passed to `createClient`. Default auth configuration is used (JWT auto-refresh enabled by default in the JS client).

### Service Role Key

The service role key is **not used anywhere in the frontend codebase**. All privileged operations that require bypassing RLS are delegated to Supabase Edge Functions (which access the service role key via Deno environment variables server-side).

### Environment Variables

The following environment variables are present in the project's `.env` file (VITE prefix means they are exposed to the browser bundle):

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project API endpoint |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project reference ID |
| `VITE_PUBLIC_POSTHOG_KEY` | PostHog product analytics API key |
| `VITE_PUBLIC_POSTHOG_HOST` | PostHog instance URL |

---

## SECTION 3 — Authentication System

### Auth Methods

1. **Email/Password** — Primary method for both patients and clinics
2. **Google OAuth** — Supported for patients; requires phone number completion after first sign-in
3. **TOTP MFA** — Optional second factor; enforced at login if enrolled; QR-code based enrollment
4. **Email-link Password Reset** — Sends reset link via Supabase Auth email

### Sign-Up Flow

The sign-up form collects different fields based on selected user type:

**Patient sign-up fields:** email, password (+ confirm), first name, last name, phone, terms acceptance checkbox

**Clinic sign-up fields:** email, password (+ confirm), clinic name (stored as first_name), phone, terms acceptance checkbox

**Steps:**
1. Client-side validation: passwords match, password ≥ 6 chars, terms checkbox checked
2. Call `supabase.auth.signUp()` with email, password, and `options.data` containing: `user_type`, `first_name`, `last_name`, `phone`, `terms_accepted: true`, `terms_accepted_at: ISO timestamp`
3. Supabase creates the auth user and triggers a database trigger that creates a `profiles` row
4. On success, show confirmation screen

### Sign-In Flow

1. User enters email + password
2. Call `supabase.auth.signInWithPassword({ email, password })`
3. Check MFA status: `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`
   - If `nextLevel === 'aal2'` AND `currentLevel !== 'aal2'`: show TOTP verification screen, save pending session in local state
   - If MFA satisfied or not enrolled: continue
4. Fetch user profile from `profiles` table
5. Determine user role (see Role Routing below)
6. Redirect to appropriate portal

### Google OAuth Flow

1. Call `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`
2. Supabase handles the OAuth redirect
3. On return, `onAuthStateChange` fires with `SIGNED_IN` event
4. Check if profile has a phone number — if missing, show `GoogleProfileCompletion` dialog to collect phone
5. Continue to portal

### Role Routing (Post Sign-In)

After sign-in, the root page (`/`) checks the authenticated user's profile and determines which portal to show:

1. Check `user_roles` table for `role = 'admin'` → show Admin Panel
2. Check `clinic_users` table for membership → treat as staff member, show Clinic Portal with `staffClinicId`
3. Check `profiles.user_type === 'clinic'` → show Clinic Portal
4. Default → show Patient Dashboard

### MFA (TOTP)

**Enrollment:**
- User navigates to Security settings
- Call `supabase.auth.mfa.enroll({ factorType: 'totp' })` to get QR code and secret
- User scans QR code with authenticator app
- User enters 6-digit code to verify enrollment
- `supabase.auth.mfa.challengeAndVerify({ factorId, code })`

**Verification at login:**
- `supabase.auth.mfa.challenge({ factorId })` → get challenge ID
- `supabase.auth.mfa.verify({ factorId, challengeId, code })` → verify
- On success, session is upgraded to `aal2`

**Unenrollment:**
- Requires verification code before calling `supabase.auth.mfa.unenroll({ factorId })`

### Password Reset Flow

1. User enters email on Forgot Password screen
2. Call `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`
3. User clicks link in email → lands on `/reset-password`
4. `onAuthStateChange` fires with `PASSWORD_RECOVERY` event — app stores recovery mode flag
5. User enters new password → `supabase.auth.updateUser({ password: newPassword })`
6. Redirect to home on success

### Session Management

- The `onAuthStateChange` listener is registered in the root page (`Index.tsx`) on mount
- Session events handled: `SIGNED_IN`, `SIGNED_OUT`, `PASSWORD_RECOVERY`, `USER_UPDATED`, `TOKEN_REFRESHED`
- Sessions are stored in localStorage by the Supabase JS client (default behavior)
- No server-side session management; all auth is browser-side
- The listener is cleaned up (unsubscribed) on component unmount

### Terms & Conditions Gate

After sign-in (any method), if `profiles.terms_accepted` is falsy, the user is shown a Terms & Conditions modal/gate before accessing any portal. They must accept to proceed. Admin users bypass this gate.

### Sign-Out

Call `supabase.auth.signOut()` → `onAuthStateChange` fires `SIGNED_OUT` → clear user state → show home page.

### Protected Route Strategy

Routes are not middleware-protected at the router level. Instead, the root page (`/`) acts as the auth dispatcher:
- If unauthenticated and trying to access a portal view → show the public home page
- Portal views (patient/clinic/admin) are rendered conditionally based on `user` state
- Public routes (`/clinics`, `/blog`, `/clinic/:clinicId`, etc.) are fully public

---

## SECTION 4 — Database Schema & RLS

### Tables

#### `profiles`
Core user profile, one row per authenticated user.
- **Columns used:** `id` (FK to auth.users), `first_name`, `last_name`, `phone`, `date_of_birth`, `user_type` ('patient'|'clinic'), `terms_accepted`, `terms_accepted_at`, `avatar_url`, `postcode`, `address`
- **RLS:** Users can read/update their own profile (`id = auth.uid()`)

#### `clinics`
Clinic entity — the primary tenant table.
- **Columns used:** `id`, `user_id` (FK to auth.users/clinic owner), `name`, `clinic_type`, `description`, `address`, `city`, `state`, `postcode`, `phone`, `email`, `website`, `logo_url`, `banner_image_url`, `operating_hours` (JSONB), `services_offered`, `rating`, `emergency_slots_enabled`, `centaur_api_enabled`, `centaur_practice_id`, `registration_number`, `deleted_at`, `deleted_by`, `deletion_reason`
- **RLS:** Clinic owners read/write own clinic; public read for active clinics

#### `clinics_public` (database VIEW)
A filtered view of clinics for public browsing. Used by the clinic directory and public profile pages. Excludes deleted clinics and sensitive fields.

#### `doctors`
Doctors registered under a clinic.
- **Columns used:** `id`, `clinic_id`, `name`, `specialization`, `qualifications`, `bio`, `photo_url`, `is_active`, `centaur_provider_id`, `provider_number`, `provider_number_verified`, `accepts_health_fund`, `available_days`, `slot_duration_minutes`
- **RLS:** Clinic staff read/write own clinic's doctors; public read for active doctors

#### `appointments`
Individual appointment slots created by clinic staff. Not the same as bookings.
- **Columns used:** `id`, `clinic_id`, `doctor_id`, `date`, `time`, `duration_minutes`, `service_id`, `max_bookings`, `current_bookings`, `is_available`, `is_emergency`, `deleted_at`
- **RLS:** Clinic staff manage their own; patients read available slots

#### `bookings`
A patient booking against an appointment slot (standard — non-Centaur).
- **Columns used:** `id`, `appointment_id`, `patient_id`, `clinic_id`, `doctor_id`, `status` ('pending'|'confirmed'|'cancelled'|'completed'), `booking_date`, `booking_time`, `service_id`, `notes`, `patient_notes`, `clinic_notes`, `family_member_id`, `points_redeemed`, `created_at`
- **RLS:** Patients see their own bookings; clinic staff see bookings for their clinic

#### `centaur_bookings`
Bookings made through the Centaur practice management integration.
- **Columns used:** `id`, `clinic_id`, `patient_id`, `doctor_id`, `centaur_appointment_id`, `status`, `appointment_date`, `appointment_time`, `reason`, `notes`, `clinic_notes`, `created_at`

#### `custom_api_bookings`
Bookings made through a clinic's custom third-party API integration.
- **Columns used:** `id`, `clinic_id`, `patient_id`, `configuration_id`, `external_appointment_id`, `status`, `appointment_date`, `appointment_time`, `notes`, `clinic_notes`

#### `services`
Services offered by a clinic (e.g., "General Consultation", "X-Ray").
- **Columns used:** `id`, `clinic_id`, `name`, `description`, `price`, `duration_minutes`, `is_active`

#### `doctor_services`
Junction table linking doctors to the services they offer.
- **Columns used:** `id`, `doctor_id`, `service_id`

#### `clinic_users`
Staff membership table — links a user to a clinic with a role.
- **Columns used:** `id`, `clinic_id`, `user_id`, `role` ('owner'|'manager'|'staff'|'receptionist'), `is_active`, `can_manage_doctors`, `can_manage_appointments`, `can_view_chat`, `can_manage_billing`, `can_manage_staff`, `invited_at`, `joined_at`
- **RLS:** Clinic owners/managers read/write; staff read own record

#### `clinic_staff_invitations`
Pending invitations for staff to join a clinic.
- **Columns used:** `id`, `clinic_id`, `email`, `role`, `invitation_token`, `invited_by`, `expires_at`, `accepted_at`, `revoked_at`

#### `user_roles`
Admin role assignments.
- **Columns used:** `id`, `user_id`, `role` (only value: 'admin')
- **RLS:** Admin-only read/write (enforced by `has_role` RPC and service role in edge functions)

#### `patient_documents`
Documents uploaded by patients (health records, test results, insurance cards, etc.).
- **Columns used:** `id`, `patient_id`, `document_name`, `document_type`, `file_path`, `description`, `uploaded_at`, `is_shared`

#### `clinic_documents`
Documents uploaded by clinics to share with patients.
- **Columns used:** `id`, `clinic_id`, `title`, `description`, `file_path`, `document_type`, `is_active`, `created_at`, `uploaded_by`

#### `clinic_document_shares`
Junction table tracking which patients have been granted access to which clinic documents.
- **Columns used:** `id`, `document_id`, `patient_id`, `shared_by`, `password_hash`, `download_count`, `max_downloads`, `expires_at`, `revoked_at`

#### `prescriptions`
Prescriptions created by clinic doctors for patients.
- **Columns used:** `id`, `clinic_id`, `patient_id`, `doctor_id`, `booking_id`, `medication_name`, `dosage`, `instructions`, `file_path`, `status` ('active'|'expired'|'revoked'), `created_at`

#### `prescription_shares`
Tracks when a prescription is shared with a pharmacy.
- **Columns used:** `id`, `prescription_id`, `pharmacy_id`, `shared_by`, `password_hash`, `expires_at`

#### `clinic_referrals`
Referral documents sent from one clinic to another.
- **Columns used:** `id`, `from_clinic_id`, `to_clinic_id`, `patient_id`, `doctor_id`, `title`, `description`, `file_path`, `password_hash`, `expires_at`, `revoked_at`, `created_at`

#### `referral_messages`
Messages attached to referrals (reply-thread style).
- **Columns used:** `id`, `referral_id`, `sender_id`, `message`, `created_at`

#### `chat_conversations`
Encrypted chat threads between a patient and a clinic.
- **Columns used:** `id`, `patient_id`, `clinic_id`, `last_message_at`, `archived_at`, `deleted_at`, `created_at`

#### `chat_messages`
Individual messages within a conversation.
- **Columns used:** `id`, `conversation_id`, `sender_id`, `content` (encrypted ciphertext), `is_read`, `created_at`

#### `chat_conversation_keys`
Per-user encryption keys for each conversation (for E2E encryption using Web Crypto).
- **Columns used:** `id`, `conversation_id`, `user_id`, `encrypted_key`, `created_at`

#### `quote_requests`
A patient's request for a price quote from one or more clinics.
- **Columns used:** `id`, `patient_id`, `clinic_id`, `service_description`, `notes`, `status` ('pending'|'responded'|'accepted'|'declined'|'expired'), `valid_until`, `created_at`

#### `quote_items`
Line items within a quote response from a clinic.
- **Columns used:** `id`, `quote_id`, `service_name`, `price`, `notes`

#### `blog_posts`
Blog content managed by clinic owners and approved by admins.
- **Columns used:** `id`, `clinic_id` (nullable for platform-level posts), `title`, `slug`, `content` (rich HTML), `excerpt`, `featured_image_url`, `author_id`, `category_id`, `status` ('draft'|'pending_review'|'published'|'rejected'), `published_at`, `seo_title`, `seo_description`, `tags`

#### `blog_categories`
Categories for blog posts.
- **Columns used:** `id`, `name`, `slug`, `description`

#### `patient_favorites`
Clinics bookmarked by a patient as favorites.
- **Columns used:** `id`, `patient_id`, `clinic_id`, `notes`, `created_at`

#### `doctor_favorites`
Doctors bookmarked by a patient as favorites.
- **Columns used:** `id`, `patient_id`, `doctor_id`, `notes`, `created_at`

#### `family_members`
Patient's family members for booking appointments on behalf of someone else.
- **Columns used:** `id`, `patient_id`, `first_name`, `last_name`, `date_of_birth`, `relationship`, `medicare_number`, `health_fund`, `health_fund_number`

#### `health_fund_cards`
Patient's health insurance/fund card records.
- **Columns used:** `id`, `patient_id`, `fund_name`, `member_number`, `member_name`, `valid_from`, `valid_to`, `card_image_url`

#### `treatment_plans`
Treatment plans shared by clinics with patients.
- **Columns used:** `id`, `clinic_id`, `patient_id`, `doctor_id`, `title`, `content`, `status`, `created_at`

#### `loyalty_accounts`
Patient loyalty point balances (one row per user).
- **Columns used:** `id`, `user_id`, `total_points`, `lifetime_points`, `tier_level`, `referral_code`, `referred_by`, `created_at`, `updated_at`

#### `loyalty_transactions`
History of all loyalty point events. Primary source of truth for balances.
- **Columns used:** `id`, `user_id`, `clinic_id`, `booking_id`, `points` (signed — negative for redemptions), `transaction_type` ('earned'|'redeemed'|'expired'|'bonus'|'refunded'|'referral'), `description`, `expires_at`, `is_expired`, `reference_id`, `created_at`

#### `doctor_unavailability`
Periods when a doctor is unavailable (vacation, sick leave, etc.).
- **Columns used:** `id`, `doctor_id`, `clinic_id`, `start_date`, `end_date`, `reason`, `created_at`

#### `appointment_preferences`
Patient notification preferences for specific appointment types/slots.
- **Columns used:** `id`, `patient_id`, `clinic_id`, `doctor_id`, `service_id`, `preferred_days`, `preferred_times`, `notification_enabled`

#### `api_configurations`
Custom API integration configuration per clinic (credentials, endpoint mappings, field mappings for doctor/slot sync).
- **Columns used:** `id`, `clinic_id`, `api_name`, `base_url`, `auth_type`, `encrypted_credentials`, `doctor_endpoint`, `slots_endpoint`, `booking_endpoint`, `field_mappings` (JSONB), `is_active`, `last_sync_at`

#### `audit_logs`
Platform audit trail for significant events.
- **Columns used:** `id`, `user_id`, `action_type`, `resource_type`, `resource_id`, `status`, `details` (JSONB), `created_at`

#### `clinic_billing`
Clinic subscription/billing configuration and usage stats.
- **Columns used:** `id`, `clinic_id`, `plan_type`, `billing_cycle`, `rate_per_booking`, `bookings_this_cycle`, `billing_amount_due`, `last_billing_date`, `next_billing_date`, `payment_status`

#### `claim_submissions`
Profile claim requests for unclaimed clinic listings.
- **Columns used:** `id`, `clinic_id`, `submitter_id`, `business_name`, `contact_name`, `contact_email`, `contact_phone`, `registration_number`, `status` ('pending'|'approved'|'rejected'), `admin_notes`, `submitted_at`

#### `aphra_verifications`
Australian Health Practitioner Regulation Agency (AHPRA) credential verification requests.
- **Columns used:** `id`, `doctor_id`, `clinic_id`, `ahpra_number`, `status` ('pending'|'verified'|'failed'), `verified_at`

#### `provider_numbers`
Medicare/insurance provider numbers for doctors.
- **Columns used:** `id`, `doctor_id`, `clinic_id`, `provider_number`, `location_specific`, `verified`, `approved_by`, `approved_at`

#### `notification_settings`
Per-user notification preferences.
- **Columns used:** `id`, `user_id`, `email_notifications`, `sms_notifications`, `appointment_reminders`, `marketing_emails`

### Key Join Patterns

- `clinics` → `doctors` (via `doctors.clinic_id`)
- `doctors` → `services` (via `doctor_services` junction, `doctor_id` + `service_id`)
- `appointments` → `doctors`, `clinics`, `services` (direct FK columns)
- `bookings` → `appointments`, `patients (profiles)`, `clinics`, `doctors`, `services`
- `chat_conversations` → `profiles` (patient), `clinics` (clinic)
- `clinic_users` → `profiles` (user), `clinics`
- `blog_posts` → `blog_categories`, `clinics`, `profiles` (author)

### Storage Buckets

| Bucket Name | Access | Contents |
|-------------|--------|----------|
| `clinic-documents` | Private (RLS via shares) | Documents uploaded by clinics for patient sharing |
| `patient-documents` | Private (owner only) | Documents uploaded by patients |
| `prescriptions` | Private (clinic + patient access) | Prescription PDF files |
| `clinic-images` | Public | Clinic logos, banner images |
| `doctor-images` | Public | Doctor profile photos |
| `blog-images` | Public | Blog post featured images |
| `avatars` | Public (owner write) | User avatar images |

### RLS Patterns (Inferred)

- **Own-row access**: Users read/write rows where `user_id = auth.uid()` or `patient_id = auth.uid()`
- **Clinic-tenant access**: Clinic users (owner/staff) access rows where `clinic_id` matches their clinic(s) from `clinic_users`
- **Public read**: `clinics`, `clinics_public` view, `doctors`, `appointments` (available ones), `blog_posts` (published), `services` are readable without auth
- **Admin bypass**: Edge functions use service role to bypass RLS for admin operations

### RPC Functions

| Function | Purpose |
|----------|---------|
| `log_audit_event(user_id, action_type, resource_type, resource_id, status, details)` | Writes an audit log entry |
| `has_role(user_id, role_name)` | Returns boolean — checks `user_roles` table for admin verification |
| `get_doctor_appointment_coverage(doctor_id, start_date, end_date)` | Returns coverage stats: total slots, booked slots, available slots per day |
| `regenerate_conversation_keys(conversation_id, patient_key, clinic_key)` | Atomically replaces both encryption keys in `chat_conversation_keys` |
| `delete_conversation_completely(conversation_id)` | Cascade-deletes messages, keys, and conversation row |
| `get_clinic_patient_info(clinic_id, patient_id)` | Returns patient summary for clinic context (bookings, prescriptions) |
| `get_shared_documents_for_patient(patient_id, clinic_id)` | Returns clinic documents shared with a specific patient |

---

## SECTION 5 — Edge Functions

All 51 edge functions are invoked via `supabase.functions.invoke('function-name', { body: {...}, headers: { Authorization: 'Bearer ' + jwt } })`. Most require an authenticated user JWT.

### Booking & Appointments

#### `book-appointment`
- **Purpose:** Creates a booking, validates availability, applies rate limiting, handles loyalty points, sends confirmation
- **Input:** `{ appointment_id, patient_id, service_id, notes, family_member_id?, points_to_redeem? }`
- **Output:** `{ success, booking_id, error? }`
- **Trigger:** Patient confirms appointment booking
- **Auth:** Required (patient JWT)

#### `cancel-appointment`
- **Purpose:** Cancels a booking, reverses loyalty points, updates appointment availability counter
- **Input:** `{ booking_id, reason? }`
- **Output:** `{ success, error? }`
- **Trigger:** Patient or clinic cancels a booking
- **Auth:** Required

#### `check-appointment-availability`
- **Purpose:** Checks if appointment slots matching patient preferences exist across booking sources (standard, Centaur, custom API)
- **Input:** `{ preference_id, clinic_id, doctor_id?, service_id? }`
- **Output:** `{ available, slots[] }`
- **Trigger:** Appointment preference notification check
- **Auth:** Required

#### `auto-generate-appointments`
- **Purpose:** Automatically generates recurring appointment slots for a doctor based on schedule templates
- **Input:** `{ doctor_id, clinic_id, start_date, end_date, template }`
- **Output:** `{ success, slots_created }`
- **Trigger:** Admin/clinic manually triggers from Doctor Schedule tab
- **Auth:** Required (clinic staff)

#### `find-emergency-slots`
- **Purpose:** Finds available emergency appointment slots across clinics matching query params
- **Input:** `{ clinic_id?, specialization?, postcode? }`
- **Output:** `{ slots[] }` with doctor, clinic, date, time
- **Trigger:** Patient loads `/book` emergency booking page
- **Auth:** Not required for search; required to book

#### `send-appointment-reminders`
- **Purpose:** Sends reminder notifications (email/SMS) to patients about upcoming appointments (runs on cron)
- **Input:** No input (triggered by cron)
- **Output:** `{ sent_count }`
- **Trigger:** Scheduled cron job
- **Auth:** Service role (cron)

#### `send-appointment-alert`
- **Purpose:** Sends an immediate alert to a patient about an appointment change (e.g., cancellation by clinic)
- **Input:** `{ booking_id, alert_type, message }`
- **Output:** `{ success }`
- **Trigger:** Clinic staff action
- **Auth:** Required (clinic staff)

### Clinic Management

#### `clinic-staff-management`
- **Purpose:** Handles staff invite, resend invite, revoke invite, deactivate staff, update permissions
- **Input:** `{ action: 'invite'|'resend'|'revoke'|'deactivate'|'update_permissions', clinic_id, ...actionData }`
- **Output:** `{ success, data?, error? }`
- **Trigger:** Clinic owner/manager actions in Staff Management tab
- **Auth:** Required (clinic owner or manager JWT)

#### `admin-create-clinic`
- **Purpose:** Admin creates a new clinic record (bypasses RLS)
- **Input:** `{ name, clinic_type, address, city, state, postcode, phone, email }`
- **Output:** `{ success, clinic_id }`
- **Trigger:** Admin panel "Add Clinic" action
- **Auth:** Required (admin JWT, verified via `has_role`)

#### `admin-approve-claim`
- **Purpose:** Approves or rejects a clinic profile claim; transfers clinic ownership to claimant on approval
- **Input:** `{ claim_id, action: 'approve'|'reject', admin_notes? }`
- **Output:** `{ success }`
- **Trigger:** Admin reviews claim in Admin Panel
- **Auth:** Required (admin JWT)

#### `verify-and-create-clinic`
- **Purpose:** Validates clinic registration number and creates verified clinic profile
- **Input:** `{ registration_number, clinic_data }`
- **Output:** `{ success, clinic_id, verified }`
- **Trigger:** Clinic registration flow
- **Auth:** Required

#### `delete-clinic`
- **Purpose:** Soft-deletes a clinic with cascading cleanup (marks doctors, appointments, bookings as deleted)
- **Input:** `{ clinic_id, reason }`
- **Output:** `{ success }`
- **Trigger:** Clinic owner or admin deletes clinic
- **Auth:** Required (owner or admin)

#### `clinic-migration`
- **Purpose:** Migrates clinic data between schemas or performs batch data transformation
- **Input:** `{ clinic_id, migration_type }`
- **Output:** `{ success, records_migrated }`
- **Trigger:** Admin utility action
- **Auth:** Required (admin)

### Third-Party Integrations

#### `centaur-integration`
- **Purpose:** Proxy to Centaur practice management software API — sync doctors, get availability, create patient, book appointment, cancel appointment
- **Input:** `{ action: 'sync_doctors'|'get_availability'|'create_patient'|'book'|'cancel'|..., clinic_id, ...actionData }`
- **Output:** Varies by action
- **Trigger:** Various clinic actions when `centaur_api_enabled = true`
- **Auth:** Required (clinic JWT)

#### `custom-api-integration`
- **Purpose:** Generic proxy for clinic's custom third-party API — fetches doctors/slots, maps fields via stored configuration
- **Input:** `{ configuration_id, action: 'get_doctors'|'get_slots'|'book'|'cancel', ...params }`
- **Output:** Normalized data per configuration's field mapping
- **Trigger:** Clinic-configured API integration actions
- **Auth:** Required (clinic JWT)

#### `d4w-integration`
- **Purpose:** Integration with D4W dental practice management software (similar to Centaur but for dental)
- **Input:** `{ clinic_id, action, ...params }`
- **Output:** Varies by action
- **Trigger:** Clinic actions when D4W integration is configured
- **Auth:** Required (clinic JWT)

#### `book-custom-api-appointment`
- **Purpose:** Books an appointment through a clinic's custom API integration and records it in `custom_api_bookings`
- **Input:** `{ configuration_id, patient_id, slot_data, notes }`
- **Output:** `{ success, booking_id, external_appointment_id }`
- **Trigger:** Patient books slot from custom-API sourced availability
- **Auth:** Required

#### `sync-custom-api-doctors`
- **Purpose:** Pulls doctor list from custom API and syncs into the `doctors` table for a clinic
- **Input:** `{ clinic_id, configuration_id }`
- **Output:** `{ success, synced_count }`
- **Trigger:** Clinic triggers manual sync from Integration settings
- **Auth:** Required (clinic JWT)

#### `manage-api-credentials`
- **Purpose:** Stores, retrieves, and rotates encrypted API credentials for custom integrations
- **Input:** `{ action: 'store'|'retrieve'|'rotate', configuration_id, credentials? }`
- **Output:** `{ success, credentials? (for retrieve) }`
- **Trigger:** Clinic configures custom API integration
- **Auth:** Required (clinic JWT)

### Notifications & Email

#### `send-welcome-email`
- **Purpose:** Sends a welcome email to new users after sign-up
- **Input:** `{ user_id, email, name, user_type }`
- **Output:** `{ success }`
- **Trigger:** Fires after successful sign-up (called from auth trigger or client)
- **Auth:** Not required (called with service role from trigger)

#### `send-auth-email`
- **Purpose:** Handles custom auth emails (password reset, magic link, email confirmation) with branded templates
- **Input:** `{ type, email, token, redirect_url }`
- **Output:** `{ success }`
- **Trigger:** Supabase Auth email hook
- **Auth:** Service role

#### `send-chat-notification`
- **Purpose:** Sends push/email notification when a new chat message is received
- **Input:** `{ conversation_id, sender_id, message_preview }`
- **Output:** `{ success }`
- **Trigger:** Chat message INSERT event (called from client after sending message)
- **Auth:** Required

#### `send-appointment-reminders`
- **Purpose:** (see Booking section above)

#### `send-appointment-alert`
- **Purpose:** (see Booking section above)

#### `send-claim-verification-email`
- **Purpose:** Sends verification email during a clinic profile claim submission
- **Input:** `{ claim_id, email, clinic_name }`
- **Output:** `{ success }`
- **Trigger:** Claim submission
- **Auth:** Required

#### `send-claim-submitted-email`
- **Purpose:** Notifies admin that a new profile claim has been submitted
- **Input:** `{ claim_id, clinic_name, contact_name, contact_email }`
- **Output:** `{ success }`
- **Trigger:** Claim submission
- **Auth:** Not required (backend trigger)

#### `send-prescription-notification`
- **Purpose:** Notifies patient that a prescription has been created for them
- **Input:** `{ prescription_id, patient_id, clinic_name, medication_name }`
- **Output:** `{ success }`
- **Trigger:** Clinic creates prescription
- **Auth:** Required

#### `send-quote-request-notification`
- **Purpose:** Notifies clinic(s) of a new quote request from a patient
- **Input:** `{ quote_request_ids[], patient_name, service_description }`
- **Output:** `{ success }`
- **Trigger:** Patient submits quote request
- **Auth:** Required

#### `send-quote-response-notification`
- **Purpose:** Notifies patient that a clinic has responded to their quote request
- **Input:** `{ quote_id, patient_id, clinic_name }`
- **Output:** `{ success }`
- **Trigger:** Clinic responds to a quote
- **Auth:** Required

#### `send-clinic-document-notification`
- **Purpose:** Notifies patient(s) that a clinic has shared a document with them
- **Input:** `{ document_id, patient_ids[], clinic_name, document_title }`
- **Output:** `{ success }`
- **Trigger:** Clinic shares document with patients
- **Auth:** Required

#### `send-document-share-notification`
- **Purpose:** Patient shares a document with a clinic — notifies the clinic
- **Input:** `{ document_id, clinic_id, patient_name, document_name }`
- **Output:** `{ success }`
- **Trigger:** Patient initiates document share
- **Auth:** Required

### Document & Referral Security

#### `share-clinic-document`
- **Purpose:** Creates a share record in `clinic_document_shares`, generates and hashes a one-time password, sends the password to patient via email
- **Input:** `{ document_id, patient_ids[], expiry_hours?, max_downloads? }`
- **Output:** `{ success, share_ids[] }`
- **Trigger:** Clinic shares document with selected patients
- **Auth:** Required (clinic staff)

#### `verify-clinic-document-download`
- **Purpose:** Verifies the password entered by a patient to download a clinic document; returns signed storage URL on success
- **Input:** `{ share_id, password }`
- **Output:** `{ success, download_url?, attempts_remaining? }`
- **Trigger:** Patient enters password on document access page
- **Auth:** Required

#### `share-patient-document`
- **Purpose:** Patient shares a document with a clinic — creates access record and notifies clinic
- **Input:** `{ document_id, clinic_id, message? }`
- **Output:** `{ success }`
- **Trigger:** Patient initiates share from their documents tab
- **Auth:** Required

#### `verify-patient-document-download`
- **Purpose:** Verifies access and returns signed URL for patient document shared with clinic
- **Input:** `{ share_id, clinic_id }`
- **Output:** `{ success, download_url? }`
- **Trigger:** Clinic staff accesses shared patient document
- **Auth:** Required (clinic staff)

#### `share-prescription-to-pharmacy`
- **Purpose:** Creates a share record for a prescription to be accessed by a pharmacy; sends password to pharmacy
- **Input:** `{ prescription_id, pharmacy_id, expiry_hours }`
- **Output:** `{ success }`
- **Trigger:** Clinic shares prescription with pharmacy
- **Auth:** Required

#### `send-clinic-referral`
- **Purpose:** Creates a referral record, generates password, sends referral notification email with password to target clinic
- **Input:** `{ from_clinic_id, to_clinic_id, patient_id, title, description, file_path }`
- **Output:** `{ success, referral_id }`
- **Trigger:** Clinic sends a referral to another clinic
- **Auth:** Required (clinic staff)

#### `verify-referral-download`
- **Purpose:** Verifies password and returns signed storage URL for referral document
- **Input:** `{ referral_id, password }`
- **Output:** `{ success, download_url? }`
- **Trigger:** Target clinic accesses received referral
- **Auth:** Required

#### `resend-referral-password`
- **Purpose:** Regenerates and re-sends the referral access password
- **Input:** `{ referral_id }`
- **Output:** `{ success }`
- **Trigger:** Target clinic requests password re-send
- **Auth:** Required

#### `update-prescription-status`
- **Purpose:** Updates `prescriptions.status` and logs the change (bypasses RLS for atomic operation)
- **Input:** `{ prescription_id, status, notes? }`
- **Output:** `{ success }`
- **Trigger:** Clinic or pharmacy updates prescription status
- **Auth:** Required

### External Data & SEO

#### `apify-places-search`
- **Purpose:** Triggers an Apify actor run to search Google Places for clinics in an area
- **Input:** `{ query, location, max_results }`
- **Output:** `{ run_id }` (async — poll for status)
- **Trigger:** Admin triggers clinic import from Apify
- **Auth:** Required (admin)

#### `apify-poll-status`
- **Purpose:** Polls Apify run status and retrieves results when complete
- **Input:** `{ run_id }`
- **Output:** `{ status, results? }`
- **Trigger:** Admin polls after starting an Apify search
- **Auth:** Required (admin)

#### `apify-fetch-place-details`
- **Purpose:** Fetches detailed place information for a specific Google Places result
- **Input:** `{ place_id }`
- **Output:** `{ place_details }`
- **Trigger:** Admin views a specific Apify result
- **Auth:** Required (admin)

#### `apify-webhook`
- **Purpose:** Webhook endpoint called by Apify when a run completes; stores results to database
- **Input:** Apify webhook payload (run_id, results)
- **Output:** `{ success }`
- **Trigger:** Apify run completion
- **Auth:** Webhook secret validation

#### `blog-og-metadata`
- **Purpose:** Generates Open Graph metadata for blog post social sharing
- **Input:** `{ slug }` (via URL query param)
- **Output:** HTML with OG meta tags or JSON metadata
- **Trigger:** Social media crawler / `<head>` metadata fetch
- **Auth:** Not required (public)

#### `generate-sitemap`
- **Purpose:** Generates XML sitemap including all published blog posts and public clinic pages
- **Input:** None
- **Output:** XML sitemap string
- **Trigger:** SEO crawler or manual trigger
- **Auth:** Not required (public)

### Communication Services

#### `gmail-booking-service`
- **Purpose:** Sends booking confirmation emails via Gmail API integration
- **Input:** `{ booking_id, recipient_email, template_data }`
- **Output:** `{ success, message_id }`
- **Trigger:** Booking confirmed
- **Auth:** Service role

#### `twilio-sms-service`
- **Purpose:** Sends SMS notifications via Twilio for appointment reminders and alerts
- **Input:** `{ phone_number, message, template_type? }`
- **Output:** `{ success, sid }`
- **Trigger:** Appointment reminders, alerts
- **Auth:** Service role

### Loyalty

#### `expire-loyalty-points`
- **Purpose:** Expires loyalty points that are past their expiry date (runs on cron)
- **Input:** None (cron-triggered)
- **Output:** `{ expired_count }`
- **Trigger:** Scheduled cron
- **Auth:** Service role

### Health Check

#### `check-cron-health`
- **Purpose:** Validates that cron-scheduled functions are running properly
- **Input:** None
- **Output:** `{ healthy, last_run_at }`
- **Trigger:** Monitoring
- **Auth:** Service role

---

## SECTION 6 — Realtime Subscriptions

### 1. Chat Messages (`chat_messages` table)

- **Event:** INSERT and UPDATE
- **Filter:** `conversation_id=eq.{conversationId}` — scoped to the active conversation
- **What happens on event:**
  - INSERT: Decrypt the new message using conversation key, append to message list, mark as read if not sent by current user
  - UPDATE: Update read status in message list
- **Location:** `useChatMessages` hook, active when a chat conversation is open
- **Cleanup:** `supabase.removeChannel(channel)` called on hook unmount or when `conversationId` changes

### 2. Chat Conversations (`chat_conversations` table)

- **Event:** INSERT, UPDATE, DELETE
- **Filter:** `patient_id=eq.{userId}` OR `clinic_id=eq.{clinicId}` (depending on role)
- **What happens on event:**
  - INSERT: New conversation appears in conversation list
  - UPDATE: `last_message_at`, archive status updated in list
  - DELETE: Conversation removed from list
- **Location:** `useChatConversations` hook, active on patient/clinic chat panel
- **Cleanup:** Channel removed on unmount

### 3. Typing Presence (Supabase Presence)

- **Channel:** Dynamic channel ID per conversation: `typing-{conversationId}`
- **Config:** `{ config: { presence: { key: userId } } }`
- **Events:** `presence:sync` — reads current presence state; `presence:leave` — user stopped typing
- **What happens on event:**
  - On sync: Extract list of users currently in the channel (= typing)
  - Auto-stop: Typing indicator removed after 3 seconds of no new start-typing calls
  - On leave: Remove user from typing list
- **Location:** `useChatTyping` hook
- **Methods:** `startTyping()` — track presence; `stopTyping()` — untrack presence
- **Cleanup:** Channel removed on unmount

### 4. Doctor Slots / Appointments

- **Event:** INSERT and DELETE
- **Filter:** `clinic_id=eq.{clinicId}` or `doctor_id=eq.{doctorId}` (scoped)
- **What happens on event:** Triggers a refetch of the doctor's slot list to reflect changes made by other staff members
- **Location:** `useDoctorSlots` hook and `DoctorSlotManager` component
- **Cleanup:** Channel removed on unmount or when doctor selection changes

---

## SECTION 7 — Pages & Routing Structure

### Public Routes (No Auth Required)

#### `/`
- **Page:** Home / Portal Dispatcher
- **Purpose:** Public marketing home page. When authenticated, renders the appropriate portal based on user role. Acts as both the public landing page and the authenticated app shell.
- **Auth:** Mixed — public home page when unauthenticated, portal views when authenticated
- **Data fetched:** User profile (auth check), then delegates to portal components
- **Redirects:** Authenticated admin → Admin Portal; authenticated clinic/staff → Clinic Portal; authenticated patient → Patient Dashboard

#### `/clinics`
- **Page:** Clinic Directory
- **Purpose:** Search and browse all clinics; filter by type, location, specialization
- **Auth:** Public
- **Data fetched:** `clinics_public` view filtered by search terms, postcode, clinic_type; `patient_favorites` for logged-in patients
- **Search patterns:** Text search (ilike on name/description), postcode-based sorting, type filter

#### `/clinic/:clinicId`
- **Page:** Public Clinic Profile
- **Purpose:** Full public-facing clinic page showing doctors, services, reviews, operating hours, booking availability
- **Auth:** Public (booking requires auth)
- **Dynamic segment:** `clinicId` — UUID of clinic
- **Data fetched:** clinic details, doctors, services, available appointment slots, reviews, blog posts from this clinic

#### `/local-clinic/:clinicId`
- **Page:** Apify-Sourced Local Clinic View
- **Purpose:** Profile view for clinics imported via Apify/Google Places — may not have a full Supabase record
- **Auth:** Public
- **Dynamic segment:** `clinicId` — Apify place ID or internal ID

#### `/auth`
- **Page:** Authentication
- **Purpose:** Sign-in / sign-up form with tab toggle
- **Auth:** Public (redirects to home if already authenticated)
- **Data fetched:** None on load

#### `/reset-password`
- **Page:** Password Reset
- **Purpose:** Form to set a new password after clicking a reset link from email
- **Auth:** Conditional — requires active `PASSWORD_RECOVERY` session
- **Data fetched:** None

#### `/book`
- **Page:** Emergency Slot Booking
- **Purpose:** Deep-link landing page for booking emergency/urgent care slots. Accepts query params for pre-filtering.
- **Auth:** Public to view slots; auth required to confirm booking
- **Data fetched:** Edge function `find-emergency-slots` with query params; clinic and doctor details

#### `/verify-claim`
- **Page:** Clinic Profile Claim Verification
- **Purpose:** Form for healthcare providers to claim ownership of an unclaimed clinic listing
- **Auth:** Public
- **Data fetched:** Clinic details by registration number

#### `/clinic/invite/:token`
- **Page:** Staff Invitation Acceptance
- **Purpose:** Landing page for staff members clicking an invitation email link
- **Auth:** Conditional — must be authenticated (or sign up) to accept
- **Dynamic segment:** `token` — UUID invitation token
- **Data fetched:** Invitation details by token from `clinic_staff_invitations`

### Blog Routes (Public)

#### `/blog`
- **Page:** Blog Listing
- **Purpose:** All published blog posts with category filter and search
- **Auth:** Public
- **Data fetched:** `blog_posts` (status='published'), `blog_categories`

#### `/blog/category/:slug`
- **Page:** Blog Category
- **Purpose:** Blog posts filtered by category
- **Auth:** Public
- **Dynamic segment:** `slug` — category slug
- **Data fetched:** `blog_posts` filtered by `blog_categories.slug`

#### `/blog/:category/:slug`
- **Page:** Blog Post
- **Purpose:** Full blog post display with SEO, social sharing, related posts
- **Auth:** Public
- **Dynamic segments:** `category` (category slug), `slug` (post slug)
- **Data fetched:** Single `blog_posts` by slug; related posts; OG metadata from `blog-og-metadata` edge function

#### `/blog/:slug`
- **Page:** Blog Post Redirect
- **Purpose:** Redirects legacy single-segment blog URLs to the new two-segment format `/blog/:category/:slug`
- **Auth:** Public
- **Dynamic segment:** `slug`
- **Data fetched:** `blog_posts` by slug to determine category, then redirect

### Legal Routes (Public)

#### `/privacy-policy`
- **Page:** Privacy Policy — static content
- **Auth:** Public

#### `/terms-and-conditions`
- **Page:** Terms and Conditions — static content
- **Auth:** Public

#### `*` (404)
- **Page:** Not Found — 404 error page
- **Auth:** Public

---

### Internal Portals (Rendered on `/`, Not Separate URL Routes)

These are views rendered inside the root `/` page based on the authenticated user's role. They do not have their own URLs in the current implementation.

#### Patient Dashboard (`activeView = 'patient'`)
- **Auth:** Required (patient role)
- **Tabs/sections:** Appointments (upcoming/past), Favorites (clinics + doctors), Messages (chat), Quote Requests, Profile → sub-tabs: Personal Info, Documents, Prescriptions, Health Fund Cards, Family Members, Treatment Plans, Security (MFA)
- **Data fetched:** bookings (all sources), chat conversations, quote requests, profile, family members, favorites, prescriptions, health fund cards

#### Clinic Portal (`activeView = 'clinic'`)
- **Auth:** Required (clinic owner or staff member)
- **Tabs/sections:** Dashboard overview, Doctors management, Appointments/Bookings, Services, Staff, Blog Manager, Referrals, Documents, Prescriptions, Quote Requests, Billing, Security, Settings (onboarding, about, images, reviews)
- **Data fetched:** clinic details, doctors, bookings (all 3 sources), services, staff list, blog posts, referrals, clinic documents, prescriptions, billing

#### Admin Panel (`activeView = 'admin'`)
- **Auth:** Required (admin role via `user_roles`)
- **Tabs/sections:** Clinics list, Claims review, Patients, All appointments, Blog review, Billing, Doctor management, Imports, Centaur sync, Reminder stats
- **Data fetched:** All clinics with billing and booking stats, all claim submissions, all users, platform-wide appointments, blog posts pending review

#### Patient Profile (`activeView = 'profile'`)
- **Auth:** Required (patient role)
- **Purpose:** Dedicated profile editing view (launched from patient dashboard)
- **Data fetched:** profile, family members, health fund cards, documents

---

## SECTION 8 — Data Fetching Patterns

### Primary Pattern: React Query + Supabase Client

The dominant data fetching pattern wraps Supabase queries in TanStack React Query `useQuery` and `useMutation` hooks. This provides automatic caching, deduplication, background refetching, and loading/error states.

```
Pattern:
1. Custom hook wraps useQuery or useMutation
2. queryKey is an array: ['resource-name', ...params]
3. queryFn calls supabase.from('table').select(...)
4. Mutations call supabase.from('table').insert/update/delete(...)
   then invalidate relevant queryKeys
```

### Secondary Pattern: Direct State Management

Some older hooks use `useState` + manual `useEffect` with a `fetchData()` function and `isLoading` + `error` state, without React Query. These are typically for complex multi-step data operations.

### All Custom Hooks

#### Core Clinic & Doctor Hooks

**`useClinicData(clinicId?)`**
- Fetches clinics list, individual clinic details, doctors, and services
- Caching: Prevents re-fetch if `lastClinicFetch` was recent
- Returns: `{ clinics, clinic, doctors, services, isLoading, doctorsLoading, servicesLoading, fetchDoctors, fetchServices, refetchClinics }`

**`useDoctorSlots(doctorId, clinicId)`**
- Manages appointment slots for a specific doctor
- Supports standard slots, emergency time slots, date-range deletion
- Returns: `{ fetchSlots, fetchEmergencyTimeSlots, deleteSlot, deleteDateSlots, addCustomSlot, addEmergencyTimeSlot, removeEmergencyTimeSlot, isEmergencyTime }`

**`useDoctorUnavailability(doctorId, clinicId)`**
- Manages periods when a doctor is unavailable
- Checks if a given date falls within an unavailability period
- Returns: `{ unavailabilityPeriods, isLoading, addUnavailability, removeUnavailability, checkDateAvailability, getUnavailableDates }`

**`useDoctorCoverage(doctorId, startDate, endDate)`**
- Calls `get_doctor_appointment_coverage` RPC
- Refetches every 30 seconds automatically
- Returns: `{ data: DoctorCoverage, isLoading, error, refetch }`

**`useClinicPermissions(clinicId, userId)`**
- Checks the current user's role and permission flags in `clinic_users`
- Returns: `{ userData, isLoading, error, hasPermission(permission), isOwnerOrManager, canManageStaff, refetch }`

**`useClinicStaff(clinicId)`**
- Fetches staff members and pending invitations
- All staff mutations call edge function `clinic-staff-management`
- Returns: `{ staff, invitations, isLoading, isActionLoading, inviteStaff, resendInvitation, revokeInvitation, deactivateStaff, updatePermissions, refetch }`

**`useClinicBilling(clinicId)`**
- Fetches and updates clinic billing configuration
- Returns: `{ billing, isLoading, updateBilling, refetch }`

**`useClinicDeletion()`**
- Handles soft-delete of a clinic via `delete-clinic` edge function
- Returns: `{ deleteClinic, isDeleting, error }`

**`useAdminClinics()`**
- Admin-only: fetches all clinics joined with billing data and booking counts across all booking sources
- Includes standard bookings count, Centaur bookings count, custom API bookings count per clinic
- Returns: `{ clinics, isLoading, isFetching, error, refetch }`

#### Appointment & Booking Hooks

**`useBookingService()`**
- Creates bookings; handles validation (date must be in future, not already booked, rate limiting)
- Supports standard bookings, Centaur bookings, and loyalty point redemption
- Calls `book-appointment` edge function
- Returns: `{ bookAppointment, isBooking }`

**`useClinicBookings(clinicId)`**
- Unified view: fetches standard bookings, Centaur bookings, and custom API bookings
- Normalizes all three sources into a common interface
- Supports updating clinic notes on any booking type
- Returns: `{ bookings, isLoading, error, refetch, updateClinicNotes }`

**`useAppointmentPreferences(userId)`**
- CRUD for patient notification preferences on appointment availability
- Returns: `{ createPreference, fetchPreferences, updatePreference, deletePreference, preferences, isLoading }`

#### Chat Hooks

**`useChatConversations(userId, userType)`**
- Fetches and manages chat conversation threads
- Sets up Realtime subscription on `chat_conversations` table
- Returns: `{ conversations, isLoading, error, createConversation, archiveConversation, deleteConversation, refetch }`

**`useChatMessages(conversationId, userId)`**
- Fetches messages for a conversation; decrypts each message using Web Crypto API
- Sets up Realtime subscription on `chat_messages` for live updates
- Calls `regenerate_conversation_keys` RPC if key is missing
- Returns: `{ messages, isLoading, isSending, error, sendMessage, markAsRead, refetch }`

**`useChatTyping(conversationId, userId)`**
- Manages Supabase Presence for typing indicators
- Auto-stops after 3 seconds of inactivity
- Returns: `{ typingUsers, startTyping, stopTyping }`

**`useChatUnreadCount(userId, userType)`**
- Counts unread messages across all conversations
- Returns: `{ unreadCount }`

#### Document Hooks

**`usePrescriptions(clinicId?, patientId?)`**
- CRUD for prescriptions with file upload to `prescriptions` storage bucket
- Returns: `{ isLoading, isUploading, createPrescription, getClinicPrescriptions, getPatientPrescriptions, getPrescriptionsByBooking, downloadPrescriptionFile, deletePrescription, updatePrescriptionStatus }`

**`useClinicDocumentSharing(clinicId)`**
- Upload, manage, and share clinic documents with patients
- Password-protected downloads; tracks attempts
- Calls `share-clinic-document` and `verify-clinic-document-download` edge functions
- Returns: `{ isUploading, isSharing, isLoading, uploadClinicDocument, deleteClinicDocument, shareDocumentWithPatients, revokeDocumentShare, getClinicDocuments, getDocumentShares, getPatientsForSharing, getSharedDocumentsForPatient, verifyAndDownloadClinicDocument, downloadDocument }`

**`usePatientDocumentSharing(patientId)`**
- Patient-side document management; share own documents with clinics
- Calls `share-patient-document` edge function
- Returns: similar interface to clinic version

**`usePrescriptionSharing()`**
- Share prescription to pharmacy with password protection
- Calls `share-prescription-to-pharmacy` edge function

**`useClinicReferrals(clinicId)`**
- Manage outbound and inbound referrals between clinics
- Calls `send-clinic-referral`, `verify-referral-download`, `resend-referral-password` edge functions
- Returns: `{ isLoading, isSending, createReferral, getSentReferrals, getReceivedReferrals, verifyAndDownload, revokeReferral, resendPassword, getAllClinics }`

#### Patient Profile Hooks

**`useFamilyMembers(patientId)`**
- CRUD operations for family members
- Returns: `{ isLoading, fetchFamilyMembers, addFamilyMember, updateFamilyMember, deleteFamilyMember }`

**`useFavoriteClinics(patientId)`**
- Manage favorite/bookmarked clinics with notes
- Returns: `{ favorites, loading, isFavorite, getFavorite, addFavorite, updateFavorite, removeFavorite, toggleFavorite, refetch }`

**`useFavoriteDoctors(patientId)`**
- Manage favorite/bookmarked doctors with notes
- Returns: Same interface as `useFavoriteClinics`

**`useQuoteRequests(userId, userType)`**
- Manage service quote requests/responses
- Supports batch requests to multiple clinics simultaneously
- Returns: `{ isLoading, getPatientQuotes, getClinicQuotes, createQuoteRequest, createBatchQuoteRequests, respondToQuote, updateQuoteStatus }`

#### Clinic Discovery

**`useClinicsByPostcode(userId?)`**
- Fetches clinics with smart sorting: user's favorite clinics first, then clinics in user's postcode, then all others alphabetically
- Gets user postcode from `profiles` table
- Returns: `{ clinics, loading, userPostcode, hasPostcode, refetch }`

#### Integration Hooks

**`useCentaurIntegration(clinicId)`**
- Full wrapper for Centaur practice management API via edge function
- Actions: sync doctors, sync reasons/services, get availability, create patient, book, cancel
- Returns: `{ isLoading, lastSync, syncDoctors, syncReasons, getAvailability, createPatient, bookAppointment, cancelAppointment, checkIntegrationStatus, getDoctors, getDoctorSlots }`

**`useCentaurBookingDetails(bookingId)`**
- Fetches Centaur booking status and details
- Returns: `{ booking, isLoading, refetch }`

**`useCustomApiIntegration(clinicId)`**
- Generic framework for custom API integrations
- Returns: `{ configurations, isLoading, testConfiguration, syncDoctors, getSlots }`

**`useD4WIntegration(clinicId)`**
- D4W dental software integration wrapper
- Similar interface to Centaur integration hook

**`useApiConfigurations(clinicId)`**
- CRUD for custom API configuration records
- Returns: `{ configurations, isLoading, createConfiguration, updateConfiguration, deleteConfiguration, refetch }`

#### Admin & Auth Hooks

**`useAdminClaims()`**
- Fetches pending clinic profile claims; approve/reject actions call `admin-approve-claim`
- Returns: `{ claims, isLoading, approveClaim, rejectClaim, refetch }`

**`useMfaStatus(userId)`**
- Checks MFA enrollment status and current assurance level
- Returns: `{ isEnrolled, factors, currentLevel, nextLevel, isLoading, refetch }`

#### Content Hooks

**`useBlogPosts(clinicId?, categorySlug?, status?)`**
- Fetches blog posts with optional filters
- Returns: `{ posts, isLoading, error, refetch }`

#### UI Utility Hooks

**`useIsMobile()`**
- Returns `boolean` — true when viewport width < 768px
- Uses `window.matchMedia('(max-width: 768px)')` with event listener

**`use-toast()`**
- Legacy toast state management hook with reducer pattern
- Limit: 1 toast visible at a time; auto-dismiss with configurable duration
- Returns: `{ toasts, toast, dismiss }`

### Pagination & Search

- **No cursor or offset pagination UI** — most lists are fetched in full and filtered in-memory or via Supabase `.ilike()` / `.eq()` / `.gte()` / `.lte()` filters
- Search queries use `.ilike('column', '%term%')` pattern
- The `useClinicsByPostcode` hook does client-side sorting after fetching all clinics

### Soft Delete Pattern

Rows are not hard-deleted. Tables use a `deleted_at` timestamp column. All queries filter with `.is('deleted_at', null)`. Restoration sets `deleted_at` back to null.

### Error Handling

- Supabase errors are caught from the returned `{ error }` object
- Errors are displayed via the `toast.error()` utility
- React Query's `onError` callback handles query failures
- Edge function errors return `{ success: false, error: 'message' }` in the response body

---

## SECTION 9 — Global State Management

### State Management Architecture

The app uses three layers of state:

| Layer | Technology | Scope |
|-------|------------|-------|
| Server state | TanStack React Query v5 | Async Supabase data (cache, loading, error) |
| Auth + UI state | React `useState` in root component | User session, active portal view |
| Appointment state | React Context (`AppointmentContext`) | Cross-component appointment data |

### Auth State (Root Component — `Index.tsx`)

The root page (`/`) holds all authentication state in local `useState` and shares it down via props:

| State variable | Type | Purpose |
|----------------|------|---------|
| `user` | Extended User object or null | Current authenticated user with role info |
| `activeView` | `'home'|'patient'|'clinic'|'admin'|'profile'` | Which portal is currently visible |
| `isLoading` | boolean | Auth initialization in progress |
| `authError` | string or null | Auth error to display |
| `showMfaVerification` | boolean | Show TOTP verification screen |
| `pendingSessionUser` | partial user | Temp storage during MFA challenge |
| `needsTermsAcceptance` | boolean | Show terms gate |

The `user` object contains: `id`, `email`, `firstName`, `lastName`, `phone`, `userType`, `staffClinicId` (if staff), `avatarUrl`, `terms_accepted`.

### AppointmentContext

Located at `src/contexts/AppointmentContext.tsx`. Wraps the entire app.

```
State: appointments[]
Methods:
  - setAppointments(appointments[])
  - rescheduleAppointment(id, originalDate, originalTime, doctorName)
  - getAvailableAppointments() → Appointment[]
```

This context is used by components that need to share appointment state across sibling trees without prop drilling.

### React Query

The `QueryClient` is instantiated once in `App.tsx` and provided via `QueryClientProvider`. No custom defaults are set on the client — queries use per-hook configuration. Cache invalidation is done manually after mutations by calling `queryClient.invalidateQueries({ queryKey: [...] })`.

### No Other Global State

There is no Zustand, Redux, or Mobx. Theme state is managed by `next-themes` (persisted to localStorage). Form state is local to each form component via `react-hook-form`.

---

## SECTION 10 — Component Patterns & UI Architecture

### UI Component Library

**shadcn/ui** is the primary component library. Components are installed into `src/components/ui/` and can be customized. The library is built on **Radix UI** headless primitives for accessibility. Over 60 shadcn/ui components are present.

Key components used: `Button`, `Card`, `Dialog`, `Tabs`, `Input`, `Select`, `Table`, `Badge`, `Avatar`, `Sheet`, `Drawer` (via Vaul), `Command` (cmdk), `Calendar` (react-day-picker), `Sonner` (toasts), `Skeleton`, `Tooltip`, `Popover`, `Carousel` (Embla), `ResizablePanelGroup`.

### Styling

- **Tailwind CSS v3** with custom color variables defined in `tailwind.config.ts`
- Custom color palette:
  - `bg-lhc-primary` / `text-lhc-primary` / `hover:bg-lhc-primary-hover` — brand primary color
  - `bg-lhc-surface` — card/panel backgrounds
  - `bg-lhc-background` — page background
  - `text-lhc-text-main` — primary text
  - `text-lhc-text-muted` — secondary/muted text
- Container: `container mx-auto px-4 sm:px-6`
- Dark mode: supported via `next-themes` with CSS variable switching
- Utility: `cn()` from `src/lib/utils.ts` (merges Tailwind classes with `tailwind-merge` + `clsx`)

### Layout Patterns

**Root layout:** `App.tsx` provides global providers but no visual layout. The root page `/` renders either the public home page sections or a portal view.

**Portal layout:** Each portal (patient, clinic, admin) is a large tabbed component with its own header (`GlobalHeader`) and tab navigation.

**Clinic Doctor Sidebar:** `ClinicDoctorSidebar` is a fixed-position panel (420px wide on desktop, full-width on mobile) that slides in from the right edge. It is rendered outside the main container using fixed positioning and a toggle tab on the viewport edge.

**Responsive:** `useIsMobile()` hook returns true at <768px for conditional rendering. Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) are used throughout.

### Form Handling

All forms use **react-hook-form** with **Zod** schema validation:
```
Schema defined with z.object({...})
Form initialized with useForm({ resolver: zodResolver(schema) })
Fields use register() or Controller for controlled components
Errors displayed from formState.errors
```

Phone number input uses **react-phone-number-input** for international formatting.
OTP inputs use **input-otp** component.

### Toast / Notification System

**Sonner** (`sonner` npm package) is the primary toast library. The `<Sonner />` component is rendered in `App.tsx`.

A compatibility wrapper in `src/lib/toast.ts` provides a unified API:
- `toast.success('message')` or `toast({ title, description, variant })`
- `toast.error()`, `toast.info()`, `toast.warning()`, `toast.loading()`, `toast.promise()`
- Accepts both string messages and `{ title, description }` objects for backwards compatibility

### Rich Text Editor

**TipTap** (`@tiptap/react`) is used for the blog post editor (`BlogEditorForm`, `RichTextEditor`). Extensions include: StarterKit, bold, italic, underline, text alignment, links, images, placeholders. Output is HTML stored in `blog_posts.content`.

### Document Scanning

**Tesseract.js** is used in `CameraCapture` component to perform OCR on images captured via device camera, allowing patients to scan physical documents into their digital health records.

### Charts

**Recharts** is used in the Admin Panel for displaying clinic statistics and booking trends.

### Excel Import/Export

**xlsx** library is used for bulk doctor import via Excel template. The `DoctorBulkImporter` utility validates and imports rows from an uploaded `.xlsx` file.

### Internationalization

**i18next** with `react-i18next` handles all user-facing strings. The `useTranslation()` hook returns `t()` translation function. Language is auto-detected from browser settings via `i18next-browser-languagedetector`. Supported locales: `en`, `zh`, `zh-TW`, `hi`, `id`, `th`, `it`, `es`.

---

## SECTION 11 — API & Integration Patterns

### Analytics — PostHog

- **Library:** `posthog-js` + `posthog-js/react`
- **Initialized in:** `src/main.tsx` — `PostHogProvider` wraps the entire app
- **Key from:** `VITE_PUBLIC_POSTHOG_KEY` env var
- **Host from:** `VITE_PUBLIC_POSTHOG_HOST` env var
- **Usage:** Page views are tracked automatically; custom events can be tracked with `posthog.capture('event_name', properties)`

### Practice Management Integrations

These are clinic-specific integrations with external practice management software:

#### Centaur
- Calls edge function `centaur-integration` with action type
- Clinic must have `centaur_api_enabled = true` and `centaur_practice_id` set
- Credentials stored server-side in edge function environment
- Provides: doctor sync, availability lookup, patient creation, appointment booking/cancellation

#### D4W (Dental for Windows)
- Similar pattern to Centaur via `d4w-integration` edge function
- Targeted at dental clinics

#### Custom API Integration
- Generic framework for any REST API
- Clinic configures base URL, auth type, endpoints, and field mappings via the API Integration Wizard
- Credentials stored encrypted via `manage-api-credentials` edge function
- Field mapping is stored as JSONB in `api_configurations` and resolved using `jsonPathResolver` utility

### Email & SMS

- **Gmail API:** `gmail-booking-service` edge function for transactional booking emails
- **Twilio:** `twilio-sms-service` edge function for SMS reminders
- **Resend/Custom SMTP:** `send-auth-email` and `send-welcome-email` edge functions use Supabase's email sending capability with custom branded HTML templates

### Clinic Discovery — Apify

- **Apify** is used to scrape Google Places data for clinic discovery
- Admin triggers searches via `apify-places-search` edge function
- Results polled via `apify-poll-status`; final data stored to database
- The `/local-clinic/:clinicId` route displays Apify-sourced clinic data

### SEO & Metadata

- **react-helmet-async:** `HelmetProvider` wraps app; `<Helmet>` in page components sets `<title>`, `<meta>` tags
- **Blog OG tags:** `blog-og-metadata` edge function generates dynamic Open Graph metadata for social sharing
- **Sitemap:** `generate-sitemap` edge function produces XML sitemap for all public pages

### No Payment Provider

There is no Stripe, Paddle, or other payment SDK integrated on the frontend. Billing is managed internally through `clinic_billing` table records, tracked by booking counts and rates. Payment collection appears to happen outside the platform (invoicing).

---

## SECTION 12 — Next.js Migration Notes

### Recommended App Router Folder Structure

```
/app
├── layout.tsx                    # Root layout — providers, fonts, theme
├── page.tsx                      # Home page (public marketing landing)
├── (auth)/
│   ├── auth/
│   │   └── page.tsx              # Sign-in / Sign-up tabs
│   └── reset-password/
│       └── page.tsx              # Password reset form
├── (public)/
│   ├── clinics/
│   │   └── page.tsx              # Clinic directory
│   ├── clinic/
│   │   └── [clinicId]/
│   │       └── page.tsx          # Public clinic profile
│   ├── local-clinic/
│   │   └── [clinicId]/
│   │       └── page.tsx          # Apify clinic view
│   ├── verify-claim/
│   │   └── page.tsx              # Claim verification form
│   ├── book/
│   │   └── page.tsx              # Emergency slot booking
│   ├── blog/
│   │   ├── page.tsx              # Blog listing
│   │   ├── category/
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # Blog by category
│   │   └── [category]/
│   │       └── [slug]/
│   │           └── page.tsx      # Blog post
│   ├── privacy-policy/
│   │   └── page.tsx
│   └── terms-and-conditions/
│       └── page.tsx
├── (protected)/
│   ├── dashboard/                # Patient dashboard (was inline in /)
│   │   └── page.tsx
│   ├── clinic/
│   │   └── portal/               # Clinic portal (was inline in /)
│   │       └── page.tsx
│   └── admin/                   # Admin panel (was inline in /)
│       └── page.tsx
├── clinic/
│   └── invite/
│       └── [token]/
│           └── page.tsx          # Staff invitation acceptance
├── api/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts          # OAuth callback handler (REQUIRED)
│   └── blog/
│       └── og/
│           └── route.ts          # Optional: OG image generation
└── not-found.tsx                 # 404 page
```

**Note on portals:** The original app renders patient/clinic/admin portals inline on the `/` route based on auth state. In Next.js, these should be separated into dedicated routes under `(protected)/` for clarity, cleaner Server Component boundaries, and proper middleware protection.

### Server Components vs Client Components

| Page / Component | Recommendation | Reason |
|-----------------|----------------|--------|
| Home page static sections (hero, features, footer) | Server Component | No interactivity, no Supabase auth needed |
| Public clinic profile (`/clinic/[id]`) | Server Component (initial data) + Client islands | Can fetch clinic data server-side; booking UI is interactive |
| Blog listing + Blog post | Server Component | Static content, SEO-critical, no auth needed |
| Auth page (`/auth`) | Client Component | Form interactions, `onAuthStateChange` listener |
| Reset password page | Client Component | Form interactions, auth events |
| Clinic directory (`/clinics`) | Mixed — Server for initial list, Client for search/filter | Initial list can be server-rendered; search is interactive |
| Patient dashboard | Client Component | Realtime, auth state, complex interactions |
| Clinic portal | Client Component | Realtime, complex mutations, role-based rendering |
| Admin panel | Client Component | Complex data tables, mutations |
| Chat panels | Client Component (required) | Realtime subscriptions must be client-side |
| Doctor Sidebar | Client Component | Real-time slot updates, interactive CRUD |
| All forms | Client Component | Form state (react-hook-form) |

### Supabase SSR Client Usage

Since the original app uses no SSR, all Supabase calls are currently browser-side. In Next.js with App Router:

**Use `@supabase/ssr` `createBrowserClient` (client-side):**
- All Client Components that currently use `supabase`
- Chat subscriptions (must be client-side)
- Auth event listeners

**Use `@supabase/ssr` `createServerClient` with `cookies()` (server-side):**
- Server Component pages that need authenticated data (e.g., protected routes)
- Route Handlers for OAuth callback
- Middleware for auth gate

**Middleware (`middleware.ts`):**
- Must be created to handle auth for the `(protected)/*` routes
- Checks for active session; redirects to `/auth` if missing
- Pattern: use `createServerClient` with `cookies()`, call `supabase.auth.getUser()`, redirect if null

**OAuth Callback Route (`/api/auth/callback/route.ts`):**
- Required for Google OAuth to work in Next.js
- Handles the `code` exchange: `supabase.auth.exchangeCodeForSession(code)`
- Redirects to the appropriate portal after successful OAuth

### Key Patterns Requiring Special Handling

1. **Realtime must be Client Components** — All chat, typing indicators, and slot subscriptions must be wrapped in `'use client'` components. They cannot be in Server Components.

2. **OAuth callback** — The current implementation uses `signInWithOAuth({ redirectTo: window.location.origin })`. In Next.js, you must create a route handler at `/api/auth/callback` that exchanges the code for a session.

3. **MFA verification flow** — The TOTP verification screen is currently shown inline on the home page after login. In Next.js, consider making this an intermediate `/auth/mfa` page in the `(auth)` group.

4. **Terms gate** — Currently shown as a full-screen overlay on `/`. In Next.js, implement as middleware check after auth: if `profiles.terms_accepted` is false, redirect to `/terms-and-conditions?accept=required`.

5. **Auth state management** — The current approach uses prop-drilling from `Index.tsx`. In Next.js, use a Client Component provider near the root layout that wraps `onAuthStateChange`.

6. **Portal URLs** — The current app has no URL for patient/clinic/admin portals — they all live on `/`. In Next.js, these must have real URLs. This is actually an improvement but requires updating any hardcoded navigation.

7. **Blog URL redirect** — `/blog/:slug` → `/blog/:category/:slug` currently handled client-side. In Next.js, use `redirect()` in a Server Component or route handler.

### Environment Variables for `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://bbsnitobrezbsrsxafoq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
NEXT_PUBLIC_POSTHOG_KEY=<PostHog API key>
NEXT_PUBLIC_POSTHOG_HOST=<PostHog host>
```

Note: `NEXT_PUBLIC_` prefix exposes variables to the browser. The Supabase anon key is designed to be public. Do not add a `NEXT_PUBLIC_` prefix to any server-only secrets (service role key should only be in edge functions).

### Suggested Implementation Order

Build the Next.js app in this order to have a working skeleton as quickly as possible:

1. **Setup** — Initialize Next.js App Router project; install `@supabase/ssr`, Tailwind, shadcn/ui; configure Supabase clients (browser + server); create middleware; copy `src/integrations/supabase/types.ts`

2. **Auth** — Build `/auth` page (sign-in/sign-up), OAuth callback route handler at `/api/auth/callback`, `onAuthStateChange` client provider, Terms gate

3. **Home page** — Public landing page with static Server Component sections (hero, features, CTA)

4. **Clinic Directory + Public Profile** — `/clinics` and `/clinic/[clinicId]` as mostly Server Components with client islands for search and booking

5. **Patient Dashboard** — Protected route, booking list, profile management, favorites

6. **MFA** — TOTP enrollment and verification flow

7. **Clinic Portal** — Doctor management, appointment slots, bookings view

8. **Chat** — End-to-end encrypted chat with realtime (Client Components, migrate encryption logic)

9. **Blog** — Listing, category filter, single post pages (SEO via Next.js metadata API)

10. **Admin Panel** — Claims, clinic management, content review

11. **Advanced features** — Referrals, quotes, document sharing, Centaur/D4W integrations, Apify import

12. **i18n** — Integrate `next-intl` or `i18next` with Next.js App Router

---

*This document was generated from a complete analysis of the LocalHealthcare source code including all 41 custom hooks, 51 edge functions, 15 URL routes, and 4 internal portal views.*
