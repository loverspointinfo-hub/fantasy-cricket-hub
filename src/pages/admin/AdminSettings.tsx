import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Settings, Save, Type, Key, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import AdminBannerManager from "@/components/admin/AdminBannerManager";

const AdminSettings = () => {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [siteName, setSiteName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [cricketApiKey, setCricketApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("site_settings" as any) as any).select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.key] = r.value; });
      if (!initialized) {
        setSiteName(map.site_name || "FANTASY11");
        setSlogan(map.site_slogan || "Play • Predict • Win");
        setBannerUrl(map.banner_url || "");
        setCricketApiKey(map.cricket_api_key || "");
        setInitialized(true);
      }
      return map;
    },
  });

  const saveSetting = async (key: string, value: string) => {
    const { error } = await (supabase.from("site_settings" as any) as any)
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key);
    if (error) throw error;
  };

  const saveAll = useMutation({
    mutationFn: async () => {
      await saveSetting("site_name", siteName);
      await saveSetting("site_slogan", slogan);
      await saveSetting("banner_url", bannerUrl);
      // Upsert cricket API key
      const { error: upsertErr } = await (supabase.from("site_settings" as any) as any)
        .upsert({ key: "cricket_api_key", value: cricketApiKey, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (upsertErr) throw upsertErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-site-settings"] });
      toast.success("Settings saved!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `banner-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("banners")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("banners").getPublicUrl(fileName);
      setBannerUrl(urlData.publicUrl);

      // Auto-save banner URL
      await saveSetting("banner_url", urlData.publicUrl);
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Banner uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeBanner = async () => {
    setBannerUrl("");
    await saveSetting("banner_url", "");
    qc.invalidateQueries({ queryKey: ["site-settings"] });
    toast.success("Banner removed");
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading settings...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Site Settings
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customize your app's branding and banner
          </p>
        </div>
        <Button onClick={() => saveAll.mutate()} disabled={saveAll.isPending} className="gap-1.5 rounded-xl" size="sm">
          {saveAll.isPending ? "Saving..." : <><Save className="h-3.5 w-3.5" /> Save All</>}
        </Button>
      </div>

      {/* Site Name & Slogan */}
      <Card className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Type className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider">Branding</h3>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Website Name</Label>
          <Input
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="e.g. FANTASY11"
            className="h-10 font-display font-bold text-lg"
          />
          <p className="text-[10px] text-muted-foreground">This appears in the header of your app</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Slogan / Tagline</Label>
          <Input
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            placeholder="e.g. Play • Predict • Win"
            className="h-10"
          />
          <p className="text-[10px] text-muted-foreground">Short tagline shown below the name</p>
        </div>

        {/* Live Preview */}
        <div className="rounded-xl p-4 border border-border/20" style={{ background: "hsl(228 16% 8% / 0.8)" }}>
          <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-2">Preview</p>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(152 100% 50%), hsl(195 100% 55%))" }}>
              <span className="text-primary-foreground text-xs font-bold">F</span>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold leading-none">
                {siteName || "FANTASY11"}
              </h1>
              <p className="text-[8px] text-muted-foreground/50 tracking-[0.25em] uppercase font-medium mt-0.5">
                {slogan || "Play • Predict • Win"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* API Keys */}
      <Card className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Key className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider">API Keys</h3>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">CricketData.org API Key</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? "text" : "password"}
                value={cricketApiKey}
                onChange={(e) => setCricketApiKey(e.target.value)}
                placeholder="Enter your CricketData.org API key"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Get your free API key from{" "}
            <a href="https://cricketdata.org" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              cricketdata.org
            </a>
            . Used to auto-import upcoming cricket matches.
          </p>
        </div>
      </Card>

      {/* Banner Management */}
      <Card className="glass-card p-5">
        <AdminBannerManager />
      </Card>
    </div>
  );
};

export default AdminSettings;
