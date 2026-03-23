
-- Function to give signup welcome bonus (₹100 bonus balance)
CREATE OR REPLACE FUNCTION public.process_signup_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bonus_amount numeric := 100;
  v_already_given boolean;
BEGIN
  -- Check if signup bonus already given
  SELECT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE user_id = NEW.id AND type = 'signup_bonus'
  ) INTO v_already_given;

  IF v_already_given THEN
    RETURN NEW;
  END IF;

  -- Credit signup bonus to wallet
  UPDATE public.wallets
  SET bonus_balance = COALESCE(bonus_balance, 0) + v_bonus_amount,
      updated_at = now()
  WHERE user_id = NEW.id;

  -- Record transaction
  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (NEW.id, 'signup_bonus', v_bonus_amount, 'Welcome bonus on signup!', 'completed');

  -- Also process referral bonus immediately if referred
  IF NEW.referred_by IS NOT NULL AND NEW.referred_by != '' THEN
    PERFORM public.process_referral_bonus(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: after profile is created (which happens on signup via handle_new_user)
CREATE TRIGGER on_profile_created_bonus
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.process_signup_bonus();
