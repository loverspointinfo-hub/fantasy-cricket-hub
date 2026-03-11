
CREATE OR REPLACE FUNCTION public.join_contest_with_fee(
  p_contest_id uuid,
  p_team_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entry_fee numeric;
  v_current_entries integer;
  v_max_entries integer;
  v_deposit numeric;
  v_winning numeric;
  v_bonus numeric;
  v_remaining numeric;
  v_deduct_deposit numeric := 0;
  v_deduct_winning numeric := 0;
  v_deduct_bonus numeric := 0;
BEGIN
  -- Get contest info
  SELECT entry_fee, current_entries, max_entries
  INTO v_entry_fee, v_current_entries, v_max_entries
  FROM public.contests
  WHERE id = p_contest_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contest not found';
  END IF;

  IF v_current_entries >= v_max_entries THEN
    RAISE EXCEPTION 'Contest is full';
  END IF;

  -- Check duplicate entry with same team
  IF EXISTS (
    SELECT 1 FROM public.contest_entries
    WHERE contest_id = p_contest_id AND team_id = p_team_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'You have already joined with this team';
  END IF;

  -- Handle fee deduction if entry_fee > 0
  IF v_entry_fee > 0 THEN
    SELECT COALESCE(deposit_balance, 0), COALESCE(winning_balance, 0), COALESCE(bonus_balance, 0)
    INTO v_deposit, v_winning, v_bonus
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Wallet not found';
    END IF;

    -- Bonus can cover max 10% of entry fee
    v_deduct_bonus := LEAST(v_bonus, ROUND(v_entry_fee * 0.10, 2));
    v_remaining := v_entry_fee - v_deduct_bonus;

    -- Use deposit first, then winnings
    v_deduct_deposit := LEAST(v_deposit, v_remaining);
    v_remaining := v_remaining - v_deduct_deposit;

    v_deduct_winning := LEAST(v_winning, v_remaining);
    v_remaining := v_remaining - v_deduct_winning;

    IF v_remaining > 0 THEN
      RAISE EXCEPTION 'Insufficient balance. You need ₹% more.', v_remaining;
    END IF;

    -- Deduct balances
    UPDATE public.wallets
    SET deposit_balance = deposit_balance - v_deduct_deposit,
        winning_balance = winning_balance - v_deduct_winning,
        bonus_balance = bonus_balance - v_deduct_bonus,
        updated_at = now()
    WHERE user_id = p_user_id;

    -- Record transaction
    INSERT INTO public.transactions (user_id, type, amount, description, status, reference_id)
    VALUES (p_user_id, 'contest_entry', v_entry_fee, 'Entry fee for contest', 'completed', p_contest_id::text);
  END IF;

  -- Create entry
  INSERT INTO public.contest_entries (contest_id, team_id, user_id)
  VALUES (p_contest_id, p_team_id, p_user_id);

  -- Increment current_entries
  UPDATE public.contests
  SET current_entries = current_entries + 1
  WHERE id = p_contest_id;
END;
$$;
