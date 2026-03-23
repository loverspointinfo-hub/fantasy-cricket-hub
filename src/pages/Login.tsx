import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { sendTelegramNotification } from "@/lib/telegram";
import { motion } from "framer-motion";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Check if admin and send notification
      if (authData.user) {
        const { data: roles } = await (supabase.from("user_roles") as any).select("role").eq("user_id", authData.user.id);
        if (roles?.some((r: any) => r.role === 'admin')) {
          sendTelegramNotification('admin_login', { email });
        }
      }
      toast.success("Welcome back!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="floating-orb w-80 h-80 bg-neon-green -top-20 -right-20" />
      <div className="floating-orb w-64 h-64 bg-neon-cyan bottom-20 -left-20" style={{ animationDelay: "4s" }} />
      <div className="gradient-mesh absolute inset-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
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
          <p className="text-sm text-muted-foreground">Play • Predict • Win</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="glass-card-premium p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-semibold">
                Email Address
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-11 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl transition-all"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-semibold">
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-11 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl transition-all"
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
                <span className="relative z-10">{loading ? "Signing in..." : "Sign In"}</span>
              </Button>
            </motion.div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-semibold">
              Sign Up
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
