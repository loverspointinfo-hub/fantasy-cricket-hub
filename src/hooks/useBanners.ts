import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Banner {
  id: string;
  image_url: string;
  hyperlink: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export const useBanners = (activeOnly = true) => {
  return useQuery({
    queryKey: ["banners", activeOnly],
    queryFn: async () => {
      let query = (supabase.from("banners" as any) as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (activeOnly) {
        query = query.eq("is_active", true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Banner[];
    },
    staleTime: 30_000,
  });
};
