import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBanners, Banner } from "@/hooks/useBanners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Upload, Trash2, Link, GripVertical, Plus, Image } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const AdminBannerManager = () => {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: banners = [], isLoading } = useBanners(false);
  const [uploading, setUploading] = useState(false);
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState("");

  const uploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `banner-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("banners").upload(fileName, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("banners").getPublicUrl(fileName);
      const maxOrder = banners.length > 0 ? Math.max(...banners.map(b => b.sort_order)) + 1 : 0;

      const { error } = await (supabase.from("banners" as any) as any).insert({
        image_url: urlData.publicUrl,
        sort_order: maxOrder,
        is_active: true,
        hyperlink: "",
      });
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const deleteBanner = async (banner: Banner) => {
    try {
      const { error } = await (supabase.from("banners" as any) as any).delete().eq("id", banner.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      const { error } = await (supabase.from("banners" as any) as any)
        .update({ is_active: !banner.is_active })
        .eq("id", banner.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["banners"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const saveLink = async (bannerId: string) => {
    try {
      const { error } = await (supabase.from("banners" as any) as any)
        .update({ hyperlink: linkValue })
        .eq("id", bannerId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["banners"] });
      setEditingLink(null);
      toast.success("Link saved");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const moveOrder = async (banner: Banner, direction: -1 | 1) => {
    const idx = banners.findIndex(b => b.id === banner.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= banners.length) return;

    const other = banners[swapIdx];
    try {
      await (supabase.from("banners" as any) as any).update({ sort_order: other.sort_order }).eq("id", banner.id);
      await (supabase.from("banners" as any) as any).update({ sort_order: banner.sort_order }).eq("id", other.id);
      qc.invalidateQueries({ queryKey: ["banners"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading banners...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Image className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-bold uppercase tracking-wider">Header Banners</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Upload promotional banners. They auto-slide on the home page. Add hyperlinks to make them clickable. Recommended: 1200×400px.
      </p>

      {/* Banner list */}
      <AnimatePresence>
        {banners.map((banner, idx) => (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="glass-card p-3 space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <button onClick={() => moveOrder(banner, -1)} disabled={idx === 0}
                    className="text-muted-foreground/50 hover:text-foreground disabled:opacity-20 transition-colors">
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <span className="text-[9px] text-muted-foreground/40 font-bold">#{idx + 1}</span>
                  <button onClick={() => moveOrder(banner, 1)} disabled={idx === banners.length - 1}
                    className="text-muted-foreground/50 hover:text-foreground disabled:opacity-20 transition-colors rotate-180">
                    <GripVertical className="h-4 w-4" />
                  </button>
                </div>
                <img src={banner.image_url} alt="Banner" className="h-20 w-36 object-cover rounded-lg border border-border/20 flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <Switch checked={banner.is_active} onCheckedChange={() => toggleActive(banner)} />
                    <span className="text-[10px] text-muted-foreground">{banner.is_active ? "Active" : "Hidden"}</span>
                  </div>
                  {editingLink === banner.id ? (
                    <div className="flex gap-1.5">
                      <Input value={linkValue} onChange={e => setLinkValue(e.target.value)}
                        placeholder="https://example.com" className="h-7 text-xs" />
                      <Button size="sm" className="h-7 text-[10px]" onClick={() => saveLink(banner.id)}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setEditingLink(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingLink(banner.id); setLinkValue(banner.hyperlink || ""); }}
                      className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <Link className="h-3 w-3" />
                      {banner.hyperlink ? <span className="truncate max-w-[180px]">{banner.hyperlink}</span> : "Add hyperlink"}
                    </button>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                  onClick={() => deleteBanner(banner)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Upload button */}
      <motion.button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full rounded-xl border-2 border-dashed border-border/30 hover:border-primary/30 p-6 flex flex-col items-center gap-2 transition-all"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          {uploading ? <span className="text-xs text-primary font-bold">...</span> : <Plus className="h-5 w-5 text-primary" />}
        </div>
        <p className="text-sm font-semibold">{uploading ? "Uploading..." : "Add Banner"}</p>
        <p className="text-[10px] text-muted-foreground">JPG, PNG, WebP • Max 5MB</p>
      </motion.button>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadBanner} />
    </div>
  );
};

export default AdminBannerManager;
