import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { User, LogOut, Shield, ChevronRight, Fingerprint, History, Users, HelpCircle, Settings, Trophy, Gamepad2, TrendingUp, Copy, CheckCircle2, Camera, Pencil } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";

const useProfileStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["profile-stats", userId],
    queryFn: async () => {
      if (!userId) return { matches: 0, contestsWon: 0, totalWinnings: 0, contestsJoined: 0 };
      const { data: teams } = await (supabase.from("user_teams" as any) as any)
        .select("match_id").eq("user_id", userId);
      const uniqueMatches = new Set(teams?.map((t: any) => t.match_id) || []);
      const { data: entries } = await (supabase.from("contest_entries" as any) as any)
        .select("id, rank, winnings").eq("user_id", userId);
      const contestsJoined = entries?.length || 0;
      const contestsWon = entries?.filter((e: any) => e.rank === 1).length || 0;
      const totalWinnings = entries?.reduce((sum: number, e: any) => sum + (e.winnings || 0), 0) || 0;
      return { matches: uniqueMatches.size, contestsWon, totalWinnings, contestsJoined };
    },
    enabled: !!userId,
  });
};

const useProfileData = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["profile-data", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await (supabase.from("profiles" as any) as any)
        .select("*").eq("id", userId).single();
      return data;
    },
    enabled: !!userId,
  });
};

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: wallet } = useWallet();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  const { data: stats } = useProfileStats(user?.id);
  const { data: profile } = useProfileData(user?.id);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/login");
  };

  const copyReferral = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      // Remove old avatar if exists
      await supabase.storage.from("avatars").remove([path]);
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await (supabase.from("profiles" as any) as any).update({ avatar_url: avatarUrl }).eq("id", user.id);
      queryClient.invalidateQueries({ queryKey: ["profile-data"] });
      toast.success("Profile picture updated!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleNameEdit = async () => {
    if (!user || !newName.trim()) return;
    const editCount = profile?.name_edit_count || 0;
    if (editCount >= 2) {
      toast.error("You can only change your name 2 times");
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase.from("profiles" as any) as any)
        .update({ username: newName.trim(), name_edit_count: editCount + 1 })
        .eq("id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile-data"] });
      toast.success(`Name updated! (${2 - editCount - 1} change${2 - editCount - 1 !== 1 ? 's' : ''} remaining)`);
      setEditNameOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-5 relative overflow-hidden">
        <div className="floating-orb w-64 h-64 bg-[hsl(var(--neon-green))] top-10 right-0" />
        <div className="gradient-mesh absolute inset-0" />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
              <User className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <div className="absolute inset-0 rounded-full blur-xl bg-primary/10" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Sign in to view your profile</p>
          <Button onClick={() => navigate("/login")} className="gradient-primary font-bold rounded-xl px-8 h-11">Sign In</Button>
        </motion.div>
      </div>
    );
  }

  const username = profile?.username || user.user_metadata?.username || "Player";
  const kycStatus = profile?.kyc_status || "pending";
  const totalBalance = (wallet?.deposit_balance ?? 0) + (wallet?.winning_balance ?? 0) + (wallet?.bonus_balance ?? 0);
  const nameEditsLeft = 2 - (profile?.name_edit_count || 0);

  const menuItems = [
    { label: "KYC Verification", desc: kycStatus === "verified" ? "Verified ✓" : kycStatus === "pending" ? "Under review" : "Complete to enable withdrawals", icon: Fingerprint, badge: kycStatus === "verified" ? undefined : kycStatus === "pending" ? "Pending" : "Required", onClick: () => navigate("/kyc") },
    { label: "Transaction History", desc: "View all deposits & withdrawals", icon: History, onClick: () => navigate("/wallet") },
    { label: "My Referrals", desc: "Invite friends & earn ₹50 bonus", icon: Users, onClick: () => navigate("/referrals") },
    { label: "Settings", desc: "App preferences", icon: Settings, onClick: undefined },
    { label: "Help & Support", desc: "FAQs and contact us", icon: HelpCircle, onClick: undefined },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="floating-orb w-64 h-64 bg-[hsl(var(--neon-cyan))] -top-10 -right-10" />
      <div className="floating-orb w-48 h-48 bg-[hsl(var(--neon-purple))] bottom-40 -left-10" style={{ animationDelay: "3s" }} />

      <header className="sticky top-0 z-40 border-b border-border/30" style={{
        background: "linear-gradient(180deg, hsl(228 18% 5% / 0.95), hsl(228 18% 5% / 0.8))",
        backdropFilter: "blur(20px)",
      }}>
        <div className="mx-auto max-w-lg px-4 py-3">
          <h1 className="font-display text-xl font-bold">Profile</h1>
        </div>
      </header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-lg px-4 py-6 space-y-4 relative z-10 pb-24"
      >
        {/* User Card */}
        <motion.div variants={item} className="glass-card-premium p-5 flex items-center gap-4 relative overflow-hidden">
          <div className="shimmer absolute inset-0" />
          {/* Avatar with upload */}
          <div className="relative z-10 flex-shrink-0">
            <div
              className="relative h-16 w-16 rounded-2xl overflow-hidden gradient-primary shadow-lg cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <span className="font-display text-2xl font-bold text-primary-foreground">
                    {username[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          <div className="flex-1 relative z-10 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-display font-bold text-xl truncate">{username}</p>
              {nameEditsLeft > 0 && (
                <button
                  onClick={() => { setNewName(username); setEditNameOpen(true); }}
                  className="p-1 rounded-md hover:bg-secondary/50 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            {profile?.referral_code && (
              <button onClick={copyReferral} className="flex items-center gap-1 mt-1 text-[10px] text-primary hover:underline">
                {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {profile.referral_code}
              </button>
            )}
          </div>
          <Badge className={`text-[10px] font-bold flex-shrink-0 relative z-10 ${
            kycStatus === "verified"
              ? "bg-primary/15 text-primary border-primary/25"
              : "bg-[hsl(var(--neon-orange)/0.15)] text-[hsl(var(--neon-orange))] border-[hsl(var(--neon-orange)/0.25)]"
          }`}>
            <Shield className="mr-1 h-3 w-3" /> {kycStatus === "verified" ? "Verified" : "Unverified"}
          </Badge>
        </motion.div>

        {/* Wallet quick view */}
        <motion.div variants={item}
          className="glass-card p-4 flex items-center justify-between cursor-pointer group"
          onClick={() => navigate("/wallet")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Balance</p>
              <p className="font-display text-lg font-bold text-gradient">₹{totalBalance.toFixed(0)}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-0.5" />
        </motion.div>

        {/* Stats row */}
        <motion.div variants={item} className="grid grid-cols-4 gap-2">
          {[
            { label: "Matches", value: String(stats?.matches ?? 0), icon: Gamepad2 },
            { label: "Contests", value: String(stats?.contestsJoined ?? 0), icon: Trophy },
            { label: "Won", value: String(stats?.contestsWon ?? 0), icon: Trophy },
            { label: "Winnings", value: `₹${stats?.totalWinnings ?? 0}`, icon: TrendingUp },
          ].map((s) => (
            <div key={s.label} className="glass-card p-3 text-center">
              <p className="font-display text-lg font-bold">{s.value}</p>
              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Menu */}
        {menuItems.map((mi) => (
          <motion.div
            key={mi.label}
            variants={item}
            className="glass-card-hover flex items-center gap-3 p-4 cursor-pointer group"
            onClick={mi.onClick}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary flex-shrink-0">
              <mi.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{mi.label}</p>
                {mi.badge && (
                  <Badge className="bg-[hsl(var(--neon-orange)/0.15)] text-[hsl(var(--neon-orange))] border-[hsl(var(--neon-orange)/0.25)] text-[9px] font-bold">
                    {mi.badge}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{mi.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-0.5" />
          </motion.div>
        ))}

        <motion.div variants={item}>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl h-12 font-semibold"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </motion.div>
      </motion.div>

      {/* Edit Name Dialog */}
      <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">
              You have <span className="font-bold text-primary">{nameEditsLeft}</span> name change{nameEditsLeft !== 1 ? 's' : ''} remaining
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditNameOpen(false)}>Cancel</Button>
            <Button onClick={handleNameEdit} disabled={saving || !newName.trim()} className="gradient-primary">
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
