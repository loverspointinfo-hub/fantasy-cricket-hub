import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, CheckCircle2, Gift, Users, TrendingUp, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatIST } from "@/lib/date-utils";

const REFERRAL_BONUS = 50; // ₹50 bonus for each referral

interface ReferralUser {
  id: string;
  username: string;
  created_at: string;
}

const useReferralData = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["referral-data", user?.id],
    queryFn: async () => {
      if (!user) return { code: "", referrals: [], totalEarned: 0 };

      // Get my referral code
      const { data: profile } = await (supabase
        .from("profiles" as any) as any)
        .select("referral_code")
        .eq("id", user.id)
        .single();

      const code = profile?.referral_code || "";

      // Get users who used my referral code
      const { data: referrals } = await (supabase
        .from("profiles" as any) as any)
        .select("id, username, created_at")
        .eq("referred_by", code)
        .order("created_at", { ascending: false });

      // Count referral bonus transactions
      const { data: bonusTxns } = await (supabase
        .from("transactions" as any) as any)
        .select("amount")
        .eq("user_id", user.id)
        .eq("type", "referral_bonus")
        .eq("status", "completed");

      const totalEarned = bonusTxns?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;

      return {
        code,
        referrals: (referrals || []) as ReferralUser[],
        totalEarned,
      };
    },
    enabled: !!user,
  });
};

const Referrals = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useReferralData();
  const [copied, setCopied] = useState(false);

  const referralCode = data?.code || "";
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Fantasy11!",
          text: `Use my referral code ${referralCode} to get ₹${REFERRAL_BONUS} bonus on signup! 🏏`,
          url: referralLink,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied!");
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="fixed inset-0 pointer-events-none gradient-mesh opacity-50" />
      <div className="floating-orb w-64 h-64 bg-[hsl(var(--neon-green))] -top-20 -left-20" />
      <div className="floating-orb w-48 h-48 bg-[hsl(var(--neon-purple))] bottom-20 right-0" style={{ animationDelay: "3s" }} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/20"
        style={{
          background: "linear-gradient(180deg, hsl(228 18% 5% / 0.97), hsl(228 18% 5% / 0.85))",
          backdropFilter: "blur(24px)",
        }}>
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-1 rounded-xl hover:bg-secondary/80 active:scale-95 transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="font-display text-base font-bold">Refer & Earn</p>
        </div>
      </header>

      <motion.div variants={staggerContainer} initial="hidden" animate="show"
        className="mx-auto max-w-lg px-4 py-5 space-y-4 relative z-10 pb-24">

        {/* Hero Card */}
        <motion.div variants={item} className="relative rounded-2xl overflow-hidden p-6 text-center"
          style={{
            background: "linear-gradient(135deg, hsl(152 100% 50% / 0.08), hsl(195 100% 55% / 0.05))",
            border: "1px solid hsl(152 100% 50% / 0.15)",
          }}>
          <div className="shimmer absolute inset-0" />
          <div className="relative z-10">
            <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Gift className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="font-display text-2xl font-bold">Invite & Earn ₹{REFERRAL_BONUS}</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">
              Share your referral code. When your friend signs up, you both instantly get ₹{REFERRAL_BONUS} bonus!
            </p>
          </div>
        </motion.div>

        {/* Referral Code */}
        <motion.div variants={item} className="glass-card p-5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-semibold mb-3">Your Referral Code</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-center">
              <span className="font-display text-2xl font-bold text-gradient tracking-[0.15em]">{referralCode}</span>
            </div>
            <Button
              onClick={copyCode}
              className="h-12 w-12 rounded-xl gradient-primary flex-shrink-0"
              size="icon"
            >
              {copied ? <CheckCircle2 className="h-5 w-5 text-primary-foreground" /> : <Copy className="h-5 w-5 text-primary-foreground" />}
            </Button>
          </div>

          <Button
            onClick={shareReferral}
            className="w-full mt-3 gradient-primary font-bold rounded-xl h-12 text-sm relative overflow-hidden"
          >
            <span className="shimmer absolute inset-0" />
            <span className="relative z-10 flex items-center gap-2 text-primary-foreground">
              <Share2 className="h-4 w-4" /> Share with Friends
            </span>
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-3 gap-2">
          <div className="glass-card p-3 text-center">
            <p className="font-display text-xl font-bold text-primary">{data?.referrals.length || 0}</p>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Referrals</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="font-display text-xl font-bold text-[hsl(var(--neon-green))]">₹{data?.totalEarned || 0}</p>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Earned</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="font-display text-xl font-bold text-[hsl(var(--gold))]">₹{REFERRAL_BONUS}</p>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Per Refer</p>
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div variants={item} className="glass-card p-5">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider mb-4">How it works</h3>
          <div className="space-y-4">
            {[
              { step: 1, title: "Share your code", desc: "Send your referral code to friends" },
              { step: 2, title: "Friend signs up", desc: "They create an account using your code" },
              { step: 3, title: "First deposit", desc: "When they make their first deposit, you both get ₹50 bonus!" },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                  <span className="font-display font-bold text-sm text-primary-foreground">{s.step}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Referral History */}
        <motion.div variants={item} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider">Your Referrals</h3>
          </div>

          {(!data?.referrals || data.referrals.length === 0) ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 opacity-20 mb-2" />
              <p className="text-sm">No referrals yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Share your code to start earning!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.referrals.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                      <span className="font-display font-bold text-xs text-muted-foreground">
                        {(r.username || "P")[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.username || "Player"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Joined {formatIST(r.created_at, "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-[hsl(var(--neon-green)/0.1)] text-[hsl(var(--neon-green))] border-[hsl(var(--neon-green)/0.2)] text-[9px] font-bold">
                    +₹{REFERRAL_BONUS}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Referrals;
