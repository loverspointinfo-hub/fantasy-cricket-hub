
-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  upi_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own withdrawal requests
CREATE POLICY "Users can create withdrawal requests"
  ON public.withdrawal_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own withdrawal requests
CREATE POLICY "Users can view own withdrawal requests"
  ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all withdrawal requests
CREATE POLICY "Admins can manage all withdrawal requests"
  ON public.withdrawal_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
