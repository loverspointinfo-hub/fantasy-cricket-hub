import { Trophy, Bell, Wallet, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useMatches } from "@/hooks/useMatches";

const AppHeader = () => {
  const navigate = useNavigate();
  const { data: wallet } = useWallet();
  const { data: liveMatches = [] } = useMatches("live");
  const unreadCount = useUnreadCount();
  const totalBalance = (wallet?.deposit_balance ?? 0) + (wallet?.winning_balance ?? 0) + (wallet?.bonus_balance ?? 0);

  return (
    <header className="sticky top-0 z-40 relative overflow-hidden">
      {/* Dynamic diagonal background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, hsl(228 20% 6% / 0.98) 0%, hsl(228 18% 8% / 0.95) 50%, hsl(228 16% 6% / 0.98) 100%)",
          backdropFilter: "blur(24px) saturate(1.8)",
        }}
      />

      {/* Sporty diagonal accent stripe */}
      <div
        className="absolute -top-6 -right-12 w-48 h-32 opacity-20"
        style={{
          background: "linear-gradient(135deg, hsl(var(--neon-green)), hsl(var(--neon-cyan)))",
          transform: "skewY(-12deg)",
          borderRadius: "0 0 0 40px",
        }}
      />
      <div
        className="absolute -top-8 -right-4 w-24 h-28 opacity-10"
        style={{
          background: "linear-gradient(135deg, hsl(var(--neon-cyan)), hsl(var(--neon-purple)))",
          transform: "skewY(-12deg)",
        }}
      />

      {/* Bottom accent line — energetic gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, hsl(var(--neon-green)), hsl(var(--neon-cyan)), hsl(var(--neon-green)))",
          opacity: 0.6,
        }}
      />

      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3 relative z-10">
        {/* Brand — bold sporty treatment */}
        <motion.div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => navigate("/")}
          whileTap={{ scale: 0.97 }}
        >
          <div className="relative">
            {/* Shield-shaped logo container */}
            <div
              className="flex h-11 w-11 items-center justify-center relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(var(--neon-green)), hsl(var(--neon-cyan)))",
                clipPath: "polygon(50% 0%, 100% 15%, 100% 75%, 50% 100%, 0% 75%, 0% 15%)",
                boxShadow: "0 4px 20px hsl(var(--neon-green) / 0.4)",
              }}
            >
              <Trophy className="h-5 w-5 text-primary-foreground relative z-10" strokeWidth={2.5} />
            </div>
            {liveMatches.length > 0 && (
              <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[hsl(var(--neon-red))] border-2 border-background animate-pulse"
                style={{ boxShadow: "0 0 8px hsl(var(--neon-red) / 0.6)" }}
              />
            )}
          </div>
          <div>
            <h1 className="font-display text-xl font-bold leading-none tracking-tight flex items-baseline gap-0.5">
              <span className="text-foreground">FANTASY</span>
              <span
                className="text-2xl"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--neon-green)), hsl(var(--neon-cyan)))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 8px hsl(var(--neon-green) / 0.4))",
                }}
              >
                11
              </span>
            </h1>
            <div className="flex items-center gap-1 mt-0.5">
              <Zap className="h-2 w-2 text-[hsl(var(--neon-yellow))]" fill="hsl(var(--neon-yellow))" />
              <p className="text-[7px] text-muted-foreground/60 tracking-[0.3em] uppercase font-bold">
                Play • Predict • Win
              </p>
            </div>
          </div>
        </motion.div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Wallet chip — sporty angled design */}
          <motion.button
            onClick={() => navigate("/wallet")}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 transition-all relative overflow-hidden"
            whileTap={{ scale: 0.95 }}
            style={{
              background: "linear-gradient(135deg, hsl(228 16% 14%), hsl(228 16% 10%))",
              border: "1px solid hsl(var(--neon-green) / 0.2)",
              boxShadow: "0 2px 12px hsl(228 18% 3% / 0.5)",
            }}
          >
            {/* Sporty accent corner */}
            <div
              className="absolute top-0 right-0 w-6 h-6 opacity-20"
              style={{
                background: "linear-gradient(225deg, hsl(var(--neon-green)), transparent)",
              }}
            />
            <Wallet className="h-3.5 w-3.5 text-[hsl(var(--neon-green))]" strokeWidth={2.5} />
            <span className="text-[11px] font-bold text-foreground font-display">₹{totalBalance.toFixed(0)}</span>
          </motion.button>

          {/* Notification bell — bold ring */}
          <motion.button
            onClick={() => navigate("/notifications")}
            className="relative h-10 w-10 rounded-lg flex items-center justify-center transition-all"
            whileTap={{ scale: 0.9 }}
            style={{
              background: "hsl(228 16% 12%)",
              border: "1px solid hsl(228 12% 18% / 0.6)",
            }}
          >
            <Bell className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={2} />
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full flex items-center justify-center px-1"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--neon-red)), hsl(var(--neon-orange)))",
                  boxShadow: "0 2px 10px hsl(var(--neon-red) / 0.5)",
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "white",
                  fontFamily: "'Rajdhani', sans-serif",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.div>
            )}
          </motion.button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
