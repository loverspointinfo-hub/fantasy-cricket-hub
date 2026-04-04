
-- Audit Log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert audit log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Feature Flags table
CREATE TABLE public.feature_flags (
  key text PRIMARY KEY,
  label text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage feature flags" ON public.feature_flags
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view feature flags" ON public.feature_flags
  FOR SELECT TO public
  USING (true);

-- Insert default feature flags
INSERT INTO public.feature_flags (key, label, description, is_enabled) VALUES
  ('referrals', 'Referral System', 'Enable referral codes and bonuses', true),
  ('cashback', 'Cashback Offers', 'Enable deposit cashback campaigns', true),
  ('withdrawals', 'Withdrawals', 'Allow users to withdraw winnings', true),
  ('deposits', 'Deposits', 'Allow users to deposit money', true),
  ('contests', 'Contest Joining', 'Allow users to join contests', true),
  ('maintenance_mode', 'Maintenance Mode', 'Put the platform in maintenance mode', false),
  ('signup', 'New Signups', 'Allow new user registrations', true),
  ('kyc', 'KYC Verification', 'Enable KYC document submission', true);

-- Maintenance message in site_settings
INSERT INTO public.site_settings (key, value) VALUES
  ('maintenance_message', 'We are currently performing scheduled maintenance. Please check back soon!')
ON CONFLICT (key) DO NOTHING;

-- User Suspensions table
CREATE TABLE public.user_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'suspended',
  reason text NOT NULL,
  suspended_by uuid NOT NULL,
  suspended_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  lifted_at timestamptz,
  lifted_by uuid
);

ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage suspensions" ON public.user_suspensions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own suspensions" ON public.user_suspensions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Suspicious Flags table
CREATE TABLE public.suspicious_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flag_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suspicious_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage suspicious flags" ON public.suspicious_flags
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_admin ON public.audit_log(admin_id);
CREATE INDEX idx_suspicious_flags_user ON public.suspicious_flags(user_id);
CREATE INDEX idx_user_suspensions_user ON public.user_suspensions(user_id);
CREATE INDEX idx_user_suspensions_active ON public.user_suspensions(is_active) WHERE is_active = true;
