import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Get session first to avoid race condition
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
      initializedRef.current = true;
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      // Only update after initial session is loaded to prevent flash
      if (initializedRef.current) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { user, loading };
};
