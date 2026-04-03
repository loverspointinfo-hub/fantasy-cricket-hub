
-- Add txn_id column with auto-generated short transaction ID
ALTER TABLE public.transactions ADD COLUMN txn_id text;

-- Create function to generate unique txn_id
CREATE OR REPLACE FUNCTION public.generate_txn_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix text;
  v_seq text;
BEGIN
  -- Set prefix based on type
  IF NEW.type = 'deposit' THEN
    v_prefix := 'DEP';
  ELSIF NEW.type = 'withdrawal' THEN
    v_prefix := 'WDR';
  ELSIF NEW.type = 'contest_entry' THEN
    v_prefix := 'ENT';
  ELSIF NEW.type = 'contest_winning' THEN
    v_prefix := 'WIN';
  ELSIF NEW.type = 'referral_bonus' THEN
    v_prefix := 'REF';
  ELSIF NEW.type = 'signup_bonus' THEN
    v_prefix := 'SBN';
  ELSE
    v_prefix := 'TXN';
  END IF;

  -- Generate unique ID: PREFIX-YYYYMMDD-RANDOM6
  v_seq := UPPER(SUBSTR(MD5(gen_random_uuid()::text), 1, 6));
  NEW.txn_id := v_prefix || '-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || v_seq;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trg_generate_txn_id
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_txn_id();

-- Backfill existing transactions
UPDATE public.transactions
SET txn_id = 
  CASE 
    WHEN type = 'deposit' THEN 'DEP'
    WHEN type = 'withdrawal' THEN 'WDR'
    WHEN type = 'contest_entry' THEN 'ENT'
    WHEN type = 'contest_winning' THEN 'WIN'
    WHEN type = 'referral_bonus' THEN 'REF'
    WHEN type = 'signup_bonus' THEN 'SBN'
    ELSE 'TXN'
  END || '-' || TO_CHAR(created_at, 'YYMMDD') || '-' || UPPER(SUBSTR(MD5(id::text), 1, 6))
WHERE txn_id IS NULL;
