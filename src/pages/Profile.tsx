import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, Shield, ChevronRight, Fingerprint, History, Users, HelpCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { staggerContainer, fadeInUp } from "@/lib/animations";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-5 relative overflow-hidden">
        <div className="floating-orb w-64 h-64 bg-neon-green top-10 right-0" />
        <div className="gradient-mesh absolute inset-0" />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
              <User className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <div className="absolute inset-0 rounded-full blur-xl bg-primary/10" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Sign in to view your profile</p>
          <Button onClick={() => navigate("/login")} className="gradient-primary font-bold rounded-xl px-8 h-11">
            Sign In
          </Button>
        </motion.div>
      </div>
    );
  }

  const username = user.user_metadata?.username || "Player";

  const menuItems = [
    { label: "KYC Verification", desc: "Complete to enable withdrawals", icon: Fingerprint, badge: "Required" },
    { label: "Transaction History", desc: "View all deposits & withdrawals", icon: History },
    { label: "My Referrals", desc: "Invite friends & earn bonus", icon: Users },
    { label: "Settings", desc: "App preferences", icon: Settings },
    { label: "Help & Support", desc: "FAQs and contact us", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="floating-orb w-64 h-64 bg-neon-cyan -top-10 -right-10" />
      <div className="floating-orb w-48 h-48 bg-neon-purple bottom-40 -left-10" style={{ animationDelay: "3s" }} />

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
        className="mx-auto max-w-lg px-4 py-6 space-y-4 relative z-10"
      >
        {/* User Card */}
        <motion.div variants={item} className="glass-card-premium p-5 flex items-center gap-4 relative overflow-hidden">
          <div className="shimmer absolute inset-0" />
          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-lg flex-shrink-0">
            <span className="font-display text-2xl font-bold text-primary-foreground">
              {username[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 relative z-10 min-w-0">
            <p className="font-display font-bold text-xl truncate">{username}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Badge className="bg-neon-orange/15 text-neon-orange border-neon-orange/25 text-[10px] font-bold flex-shrink-0 relative z-10">
            <Shield className="mr-1 h-3 w-3" /> Unverified
          </Badge>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={item} className="grid grid-cols-3 gap-3">
          {[
            { label: "Matches", value: "0" },
            { label: "Contests Won", value: "0" },
            { label: "Total Winnings", value: "₹0" },
          ].map((s) => (
            <div key={s.label} className="glass-card p-3 text-center">
              <p className="font-display text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Menu */}
        {menuItems.map((mi) => (
          <motion.div
            key={mi.label}
            variants={item}
            className="glass-card-hover flex items-center gap-3 p-4 cursor-pointer group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary flex-shrink-0">
              <mi.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{mi.label}</p>
                {mi.badge && (
                  <Badge className="bg-neon-orange/15 text-neon-orange border-neon-orange/25 text-[9px] font-bold">
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
    </div>
  );
};

export default Profile;
