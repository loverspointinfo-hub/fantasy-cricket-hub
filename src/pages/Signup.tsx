import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Mail, Lock, User, Eye, EyeOff, Gift, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, referral_code: referralCode || null },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success("Account created! Check your email to verify.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { id: "username", label: "Username", icon: User, type: "text", placeholder: "CricketKing99", value: username, onChange: setUsername, required: true },
    { id: "email", label: "Email Address", icon: Mail, type: "email", placeholder: "your@email.com", value: email, onChange: setEmail, required: true },
    { id: "referral", label: "Referral Code (Optional)", icon: Gift, type: "text", placeholder: "Enter code for bonus", value: referralCode, onChange: setReferralCode, required: false },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="floating-orb w-72 h-72 bg-neon-purple -top-10 -left-10" />
      <div className="floating-orb w-80 h-80 bg-neon-green bottom-10 -right-20" style={{ animationDelay: "3s" }} />
      <div className="gradient-mesh absolute inset-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center gap-3">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl gradient-primary shadow-lg">
              <Trophy className="h-10 w-10 text-primary-foreground" />
            </div>
            <div className="absolute inset-0 rounded-3xl gradient-primary opacity-30 blur-xl" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold">
            FANTASY<span className="text-gradient">11</span>
          </h1>
          <p className="text-sm text-muted-foreground">Create your account</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="glass-card-premium p-6 space-y-4">
            {fields.map((f) => (
              <div key={f.id} className="space-y-1.5">
                <Label htmlFor={f.id} className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-semibold">
                  {f.label}
                </Label>
                <div className="relative group">
                  <f.icon className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id={f.id}
                    type={f.type}
                    placeholder={f.placeholder}
                    value={f.value}
                    onChange={(e) => f.onChange(e.target.value)}
                    className="pl-11 h-11 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl"
                    required={f.required}
                  />
                </div>
              </div>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-semibold">
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-11 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button type="submit" className="w-full h-12 gradient-primary font-bold text-sm rounded-xl relative overflow-hidden" disabled={loading}>
                <span className="shimmer absolute inset-0" />
                <span className="relative z-10">{loading ? "Creating account..." : "Create Account"}</span>
              </Button>
            </motion.div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default Signup;
