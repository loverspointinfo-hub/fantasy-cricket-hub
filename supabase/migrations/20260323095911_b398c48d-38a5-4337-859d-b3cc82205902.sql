
-- Table to store admin Telegram chat ID and bot config
INSERT INTO public.site_settings (key, value) VALUES 
  ('telegram_admin_chat_id', '')
ON CONFLICT (key) DO NOTHING;

-- Table for pending deposit requests that need Telegram approval
CREATE TABLE public.deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  telegram_message_id bigint,
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deposit requests" ON public.deposit_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create deposit requests" ON public.deposit_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all deposit requests" ON public.deposit_requests
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
