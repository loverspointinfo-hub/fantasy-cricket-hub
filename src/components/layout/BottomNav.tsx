import { Home, Trophy, Wallet, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/my-matches", icon: Trophy, label: "Matches" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
  { to: "/profile", icon: User, label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();
  if (["/login", "/signup"].includes(location.pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="mx-auto max-w-lg px-3 pb-3">
        <div
          className="flex items-center justify-around rounded-2xl py-1.5 px-1 relative overflow-hidden"
          style={{
            background: "linear-gradient(145deg, hsl(230 18% 8% / 0.92), hsl(230 18% 5% / 0.88))",
            backdropFilter: "blur(40px) saturate(2)",
            border: "1px solid hsl(230 12% 14% / 0.5)",
            boxShadow: "0 -8px 40px hsl(230 20% 2% / 0.6), 0 0 60px hsl(152 100% 50% / 0.02)",
          }}
        >
          <div className="shimmer absolute inset-0 opacity-20" />
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className="relative flex flex-col items-center gap-0.5 px-5 py-2"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: "linear-gradient(135deg, hsl(152 100% 50% / 0.08), hsl(195 100% 55% / 0.04))",
                      border: "1px solid hsl(152 100% 50% / 0.12)",
                    }}
                    transition={{ type: "spring" as const, stiffness: 400, damping: 30 }}
                  />
                )}
                {isActive && (
                  <motion.div
                    layoutId="nav-glow"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full gradient-primary"
                    transition={{ type: "spring" as const, stiffness: 400, damping: 30 }}
                    style={{ boxShadow: "0 0 12px hsl(152 100% 50% / 0.5)" }}
                  />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all relative z-10",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                <span
                  className={cn(
                    "text-[9px] font-semibold relative z-10 transition-colors tracking-wider",
                    isActive ? "text-primary" : "text-muted-foreground/70"
                  )}
                >
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
