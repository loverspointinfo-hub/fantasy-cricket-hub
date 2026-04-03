import { Home, Trophy, Wallet, User, Zap } from "lucide-react";
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom pointer-events-none">
      <div className="mx-auto max-w-lg pointer-events-auto">
        {/* Gradient fade above nav */}
        <div
          className="h-8 pointer-events-none"
          style={{
            background: "linear-gradient(to top, hsl(0 0% 4%), transparent)",
          }}
        />
        <div
          className="mx-3 flex items-center justify-around rounded-[20px] py-1 px-1 relative overflow-hidden"
          style={{
            marginBottom: `max(12px, env(safe-area-inset-bottom, 12px))`,
            background: "linear-gradient(145deg, hsl(228 16% 9% / 0.95), hsl(228 18% 6% / 0.92))",
            backdropFilter: "blur(30px) saturate(1.8)",
            border: "1px solid hsl(228 12% 16% / 0.6)",
            boxShadow:
              "0 -8px 40px hsl(228 18% 3% / 0.6), 0 0 0 0.5px hsl(0 0% 100% / 0.03) inset, 0 1px 0 hsl(0 0% 100% / 0.04) inset",
          }}
        >
          {/* Inner glow line at top */}
          <div
            className="absolute top-0 left-4 right-4 h-[1px]"
            style={{
              background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.06), transparent)",
            }}
          />

          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className="relative flex flex-col items-center gap-0.5 px-5 py-2 group"
              >
                {/* Active background glow */}
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-2xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    style={{
                      background: "linear-gradient(135deg, hsl(152 100% 50% / 0.12), hsl(195 100% 55% / 0.08))",
                      boxShadow: "0 0 20px hsl(152 100% 50% / 0.08)",
                    }}
                  />
                )}

                {/* Active top accent */}
                {isActive && (
                  <motion.div
                    layoutId="nav-accent"
                    className="absolute -top-[1px] h-[2px] w-8 rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    style={{
                      background: "linear-gradient(90deg, hsl(152 100% 50%), hsl(195 100% 55%))",
                      boxShadow: "0 0 8px hsl(152 100% 50% / 0.5)",
                    }}
                  />
                )}

                {/* Icon with glow */}
                <div className="relative z-10">
                  <Icon
                    className={cn(
                      "h-[22px] w-[22px] transition-all duration-300",
                      isActive
                        ? "text-primary drop-shadow-[0_0_8px_hsl(152_100%_50%/0.4)]"
                        : "text-muted-foreground/60 group-hover:text-muted-foreground"
                    )}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-[9px] font-semibold relative z-10 transition-all duration-300 tracking-wide",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground/50 group-hover:text-muted-foreground/70"
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