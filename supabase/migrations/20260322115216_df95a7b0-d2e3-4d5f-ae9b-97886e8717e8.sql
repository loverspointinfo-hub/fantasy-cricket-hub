CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    UPPER(SUBSTR(MD5(NEW.id::text), 1, 8)),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'referred_by', '')), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    referred_by = COALESCE(
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'referred_by', '')), ''),
      profiles.referred_by
    );
  RETURN NEW;
END;
$$;