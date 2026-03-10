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
      <div className="mx-auto max-w-lg">
        <div
          className="mx-3 mb-3 flex items-center justify-around rounded-2xl py-2 px-2"
          style={{
            background: "linear-gradient(135deg, hsl(228 16% 10% / 0.9), hsl(228 16% 8% / 0.85))",
            backdropFilter: "blur(24px) saturate(1.5)",
            border: "1px solid hsl(228 12% 18% / 0.5)",
            boxShadow: "0 -4px 30px hsl(228 18% 3% / 0.5)",
          }}
        >
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className="relative flex flex-col items-center gap-0.5 px-4 py-1.5"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl gradient-primary opacity-10"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors relative z-10",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium relative z-10 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    className="absolute -top-1 h-1 w-6 rounded-full gradient-primary"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
