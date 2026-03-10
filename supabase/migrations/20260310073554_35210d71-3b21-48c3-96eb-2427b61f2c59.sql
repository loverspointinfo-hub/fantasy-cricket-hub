
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    UPPER(SUBSTR(MD5(NEW.id::text), 1, 8))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team1_name TEXT NOT NULL,
  team2_name TEXT NOT NULL,
  team1_short TEXT NOT NULL,
  team2_short TEXT NOT NULL,
  team1_color TEXT DEFAULT 'from-blue-500 to-blue-700',
  team2_color TEXT DEFAULT 'from-red-500 to-red-700',
  league TEXT NOT NULL,
  sport TEXT DEFAULT 'cricket',
  venue TEXT,
  match_time TIMESTAMPTZ NOT NULL,
  entry_deadline TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admins can manage matches" ON public.matches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Players table
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('BAT', 'BOWL', 'AR', 'WK')),
  team TEXT NOT NULL,
  credit_value NUMERIC(4,1) NOT NULL DEFAULT 8.0,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Admins can manage players" ON public.players FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Match-Player assignment
CREATE TABLE public.match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  is_playing BOOLEAN DEFAULT true,
  fantasy_points NUMERIC(6,1) DEFAULT 0,
  selected_by_percent NUMERIC(4,1) DEFAULT 0,
  UNIQUE (match_id, player_id)
);

ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view match players" ON public.match_players FOR SELECT USING (true);
CREATE POLICY "Admins can manage match players" ON public.match_players FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Contests
CREATE TABLE public.contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mega', 'h2h', 'practice', 'winner_takes_all', 'private')),
  entry_fee NUMERIC(10,2) DEFAULT 0,
  prize_pool NUMERIC(12,2) DEFAULT 0,
  max_entries INTEGER NOT NULL,
  current_entries INTEGER DEFAULT 0,
  is_guaranteed BOOLEAN DEFAULT false,
  invite_code TEXT UNIQUE,
  prize_breakdown JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'full', 'live', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view contests" ON public.contests FOR SELECT USING (true);
CREATE POLICY "Authenticated can join contests" ON public.contests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can manage contests" ON public.contests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User teams
CREATE TABLE public.user_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  name TEXT DEFAULT 'Team 1',
  captain_id UUID REFERENCES public.players(id),
  vice_captain_id UUID REFERENCES public.players(id),
  total_credits NUMERIC(5,1) DEFAULT 0,
  total_points NUMERIC(8,1) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own teams" ON public.user_teams FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create teams" ON public.user_teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own teams" ON public.user_teams FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own teams" ON public.user_teams FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Team players (junction)
CREATE TABLE public.team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.user_teams(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (team_id, player_id)
);

ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own team players" ON public.team_players FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_teams WHERE id = team_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage own team players" ON public.team_players FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_teams WHERE id = team_id AND user_id = auth.uid()));

-- Contest entries
CREATE TABLE public.contest_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.user_teams(id) ON DELETE CASCADE NOT NULL,
  rank INTEGER,
  winnings NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (contest_id, team_id)
);

ALTER TABLE public.contest_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own entries" ON public.contest_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create entries" ON public.contest_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can view entry counts" ON public.contest_entries FOR SELECT USING (true);

-- Wallets
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  deposit_balance NUMERIC(12,2) DEFAULT 0,
  winning_balance NUMERIC(12,2) DEFAULT 0,
  bonus_balance NUMERIC(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON public.wallets FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Auto-create wallet on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_wallet();

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'contest_entry', 'contest_winning', 'bonus', 'refund')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  reference_id TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable realtime for live features
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contest_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_players;
