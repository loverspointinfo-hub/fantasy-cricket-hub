
-- Fix permissive UPDATE policy on contests - only allow admins
DROP POLICY "Authenticated can join contests" ON public.contests;

-- Fix permissive SELECT on contest_entries - keep only the user's own entries policy
DROP POLICY "Anyone can view entry counts" ON public.contest_entries;
