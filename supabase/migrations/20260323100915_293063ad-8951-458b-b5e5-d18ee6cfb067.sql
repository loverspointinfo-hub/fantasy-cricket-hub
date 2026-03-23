
-- Create kyc_documents table
CREATE TABLE public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  aadhaar_front_url text,
  aadhaar_back_url text,
  pan_card_url text,
  selfie_url text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Users can insert their own KYC
CREATE POLICY "Users can insert own kyc" ON public.kyc_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can view own KYC
CREATE POLICY "Users can view own kyc" ON public.kyc_documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can update own pending KYC
CREATE POLICY "Users can update own pending kyc" ON public.kyc_documents
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'pending');

-- Admins full access
CREATE POLICY "Admins can manage all kyc" ON public.kyc_documents
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create kyc-documents storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);

-- Storage policies for kyc-documents bucket
CREATE POLICY "Users can upload own kyc docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own kyc docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all kyc docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete kyc docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));
