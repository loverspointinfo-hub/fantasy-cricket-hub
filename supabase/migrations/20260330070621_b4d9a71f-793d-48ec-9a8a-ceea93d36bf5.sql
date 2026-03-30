
-- Cashback offers table
CREATE TABLE public.cashback_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  min_deposit numeric NOT NULL DEFAULT 100,
  cashback_percent numeric NOT NULL DEFAULT 10,
  max_cashback numeric NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.cashback_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active cashback offers" ON public.cashback_offers
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage cashback offers" ON public.cashback_offers
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Add UPI ID to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS upi_id text;
