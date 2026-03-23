import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  site_name: string;
  site_slogan: string;
  banner_url: string;
}

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("site_settings" as any) as any)
        .select("key, value");
      if (error) throw error;

      const settings: SiteSettings = {
        site_name: "FANTASY11",
        site_slogan: "Play • Predict • Win",
        banner_url: "",
      };

      (data || []).forEach((row: any) => {
        if (row.key === "site_name") settings.site_name = row.value;
        if (row.key === "site_slogan") settings.site_slogan = row.value;
        if (row.key === "banner_url") settings.banner_url = row.value;
      });

      return settings;
    },
    staleTime: 60_000,
  });
};
