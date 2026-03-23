import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Users, Copy, CheckCircle2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const STORAGE_KEY = "welcome_popup_shown";

const WelcomePopup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["welcome-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase.from("profiles" as any) as any)
        .select("referral_code, username")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: bonusTx } = useQuery({
    queryKey: ["welcome-bonus", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase.from("transactions" as any) as any)
        .select("amount")
        .eq("user_id", user.id)
        .eq("type", "signup_bonus")
        .limit(1)
        .single();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || !profile) return;
    const shown = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (!shown) {
      // Small delay for smooth UX
      const timer = setTimeout(() => setOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, profile]);

  const handleClose = () => {
    setOpen(false);
    if (user) localStorage.setItem(`${STORAGE_KEY}_${user.id}`, "true");
  };

  const copyCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const bonusAmount = bonusTx?.amount ?? 100;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-sm p-0 border-0 bg-transparent shadow-none [&>button]:hidden overflow-hidden rounded-3xl">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative overflow-hidden rounded-3xl"
          style={{
            background: "linear-gradient(180deg, hsl(228 16% 10%), hsl(228 18% 6%))",
            border: "1px solid hsl(152 100% 50% / 0.15)",
          }}
        >
          {/* Top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl opacity-20"
            style={{ background: "linear-gradient(135deg, hsl(152 100% 50%), hsl(195 100% 55%))" }} />

          {/* Confetti dots */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full"
                style={{
                  background: ["hsl(152 100% 50%)", "hsl(45 100% 60%)", "hsl(195 100% 55%)", "hsl(280 100% 65%)"][i % 4],
                  left: `${10 + Math.random() * 80}%`,
                  top: `${5 + Math.random() * 30}%`,
                }}
                animate={{ y: [0, -8, 0], opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
              />
            ))}
          </div>

          <div className="relative z-10 px-6 pt-8 pb-6 text-center space-y-5">
            {/* Icon */}
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="mx-auto h-20 w-20 rounded-3xl flex items-center justify-center relative"
              style={{ background: "linear-gradient(135deg, hsl(152 100% 50%), hsl(195 100% 55%))", boxShadow: "0 8px 32px hsl(152 100% 50% / 0.3)" }}
            >
              <Gift className="h-10 w-10 text-primary-foreground" />
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="h-5 w-5 text-[hsl(var(--gold))]" />
              </motion.div>
            </motion.div>

            {/* Welcome text */}
            <div>
              <h2 className="font-display text-2xl font-bold">
                Welcome, {profile?.username || "Champion"}! 🎉
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Your account is ready. Here's a gift to get started!
              </p>
            </div>

            {/* Bonus card */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(152 100% 50% / 0.1), hsl(45 100% 60% / 0.05))",
                border: "1px solid hsl(152 100% 50% / 0.2)",
              }}
            >
              <div className="shimmer absolute inset-0" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-semibold relative z-10">Signup Bonus Credited</p>
              <p className="font-display text-4xl font-bold text-[hsl(var(--neon-green))] mt-1 relative z-10">
                ₹{bonusAmount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 relative z-10">Added to your bonus balance</p>
            </motion.div>

            {/* Referral section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>Invite friends & earn <strong className="text-[hsl(var(--gold))]">₹50</strong> each!</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 text-center">
                  <span className="font-display text-lg font-bold text-gradient tracking-[0.1em]">
                    {profile?.referral_code || "..."}
                  </span>
                </div>
                <Button onClick={copyCode} size="icon" className="h-10 w-10 rounded-xl gradient-primary shrink-0">
                  {copied ? <CheckCircle2 className="h-4 w-4 text-primary-foreground" /> : <Copy className="h-4 w-4 text-primary-foreground" />}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 rounded-xl h-11 text-sm font-semibold"
                onClick={handleClose}
              >
                Start Playing
              </Button>
              <Button
                className="flex-1 rounded-xl h-11 text-sm font-semibold gradient-primary relative overflow-hidden"
                onClick={() => { handleClose(); navigate("/referrals"); }}
              >
                <span className="shimmer absolute inset-0" />
                <span className="relative z-10 flex items-center gap-1.5 text-primary-foreground">
                  <Users className="h-4 w-4" /> Invite Friends
                </span>
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;
