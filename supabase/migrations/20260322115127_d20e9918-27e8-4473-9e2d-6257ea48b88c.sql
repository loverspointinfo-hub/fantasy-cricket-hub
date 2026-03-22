-- Create a function to handle referral bonuses
-- Called when admin approves a deposit and user has a referrer
CREATE OR REPLACE FUNCTION public.process_referral_bonus(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referral_code text;
  v_referrer_id uuid;
  v_already_rewarded boolean;
  v_bonus_amount numeric := 50;
BEGIN
  -- Get the user's referred_by code
  SELECT referred_by INTO v_referral_code
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_referral_code IS NULL OR v_referral_code = '' THEN
    RETURN;
  END IF;

  -- Find the referrer
  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE referral_code = v_referral_code;

  IF v_referrer_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if bonus already given for this user
  SELECT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE user_id = v_referrer_id
      AND type = 'referral_bonus'
      AND reference_id = p_user_id::text
  ) INTO v_already_rewarded;

  IF v_already_rewarded THEN
    RETURN;
  END IF;

  -- Credit referrer bonus
  UPDATE public.wallets
  SET bonus_balance = COALESCE(bonus_balance, 0) + v_bonus_amount,
      updated_at = now()
  WHERE user_id = v_referrer_id;

  INSERT INTO public.transactions (user_id, type, amount, description, status, reference_id)
  VALUES (v_referrer_id, 'referral_bonus', v_bonus_amount, 'Referral bonus for inviting a friend', 'completed', p_user_id::text);

  -- Credit referred user bonus too
  UPDATE public.wallets
  SET bonus_balance = COALESCE(bonus_balance, 0) + v_bonus_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.transactions (user_id, type, amount, description, status, reference_id)
  VALUES (p_user_id, 'referral_bonus', v_bonus_amount, 'Welcome bonus from referral', 'completed', v_referrer_id::text);
END;
$$;