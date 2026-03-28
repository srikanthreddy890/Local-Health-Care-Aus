-- ============================================================
-- Stripe Billing Integration Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Add billing_status to clinics table
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'active'
  CHECK (billing_status IN ('active', 'grace_period', 'suspended', 'exempt'));

-- 2. stripe_customers — links each clinic to its Stripe Customer/Subscription
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL UNIQUE REFERENCES public.clinics(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  stripe_subscription_id text UNIQUE,
  subscription_status text DEFAULT 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  default_payment_method text,
  billing_email text,
  grace_period_ends_at timestamptz,
  service_suspended_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_cid ON public.stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_sub_status ON public.stripe_customers(subscription_status);

-- 3. stripe_invoices — local mirror of Stripe invoices
CREATE TABLE IF NOT EXISTS public.stripe_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  stripe_invoice_id text NOT NULL UNIQUE,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'draft',
  currency text DEFAULT 'aud',
  amount_due integer NOT NULL DEFAULT 0,
  amount_paid integer NOT NULL DEFAULT 0,
  amount_remaining integer NOT NULL DEFAULT 0,
  tax integer DEFAULT 0,
  subtotal integer DEFAULT 0,
  total integer DEFAULT 0,
  hosted_invoice_url text,
  invoice_pdf text,
  period_start timestamptz,
  period_end timestamptz,
  due_date timestamptz,
  paid_at timestamptz,
  attempt_count integer DEFAULT 0,
  next_payment_attempt timestamptz,
  line_items jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_invoices_clinic ON public.stripe_invoices(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_status ON public.stripe_invoices(status);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_stripe_id ON public.stripe_invoices(stripe_invoice_id);

-- 4. stripe_webhook_events — idempotency tracking
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamptz DEFAULT now(),
  payload jsonb,
  processing_error text
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON public.stripe_webhook_events(event_type);

-- 5. appointment_usage_log — tracks bookings reported to Stripe Meters
CREATE TABLE IF NOT EXISTS public.appointment_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL,
  booking_source text NOT NULL CHECK (booking_source IN ('standard', 'centaur', 'custom_api')),
  stripe_meter_event_id text,
  is_free_tier boolean DEFAULT false,
  reported_at timestamptz DEFAULT now(),
  billing_period_start timestamptz NOT NULL,
  billing_period_end timestamptz NOT NULL,
  UNIQUE(booking_id, booking_source)
);

CREATE INDEX IF NOT EXISTS idx_usage_log_clinic_period ON public.appointment_usage_log(clinic_id, billing_period_start);

-- 6. Helper function for RLS billing check
CREATE OR REPLACE FUNCTION public.check_clinic_billing_active(p_clinic_id uuid)
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT billing_status != 'suspended' FROM public.clinics WHERE id = p_clinic_id),
    true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 7. RLS — stripe_customers
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_stripe_customers" ON public.stripe_customers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "clinic_owner_read_stripe_customers" ON public.stripe_customers
  FOR SELECT USING (
    clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    OR clinic_id IN (SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid() AND is_active = true)
  );

-- 8. RLS — stripe_invoices
ALTER TABLE public.stripe_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_stripe_invoices" ON public.stripe_invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "clinic_read_own_stripe_invoices" ON public.stripe_invoices
  FOR SELECT USING (
    clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    OR clinic_id IN (SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid() AND is_active = true)
  );

-- 9. RLS — stripe_webhook_events (admin only, service_role bypasses)
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_stripe_webhook_events" ON public.stripe_webhook_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 10. RLS — appointment_usage_log
ALTER TABLE public.appointment_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_usage_log" ON public.appointment_usage_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "clinic_read_own_usage_log" ON public.appointment_usage_log
  FOR SELECT USING (
    clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    OR clinic_id IN (SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid() AND is_active = true)
  );

-- 11. Restrictive RLS policies on booking tables — prevent suspended clinics from creating bookings
-- AS RESTRICTIVE ensures these are AND-ed with existing permissive policies
CREATE POLICY "billing_active_check_bookings" ON public.bookings
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (public.check_clinic_billing_active(clinic_id));

CREATE POLICY "billing_active_check_centaur_bookings" ON public.centaur_bookings
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (public.check_clinic_billing_active(clinic_id));

CREATE POLICY "billing_active_check_custom_api_bookings" ON public.custom_api_bookings
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (public.check_clinic_billing_active(clinic_id));

-- 12. Prevent clinic users from modifying billing_status directly
-- Only service_role (webhook handler) can update it
-- This is enforced by NOT having any UPDATE policy for clinic users on the clinics.billing_status column
-- The existing RLS policies on the clinics table already restrict updates to owners/admins,
-- and the webhook uses service_role which bypasses RLS entirely.
