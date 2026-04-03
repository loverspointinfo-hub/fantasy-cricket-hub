import { Home, Trophy, Wallet, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
        <div
          className="h-8 pointer-events-none"
          style={{
            background: "linear-gradient(to top, hsl(0 0% 4%), transparent)",
          }}
        />
        <div
          className="mx-3 flex items-center justify-around rounded-[20px] py-2 px-1 relative overflow-hidden"
          style={{
            marginBottom: `max(12px, env(safe-area-inset-bottom, 12px))`,
            background: "hsl(0 0% 6% / 0.95)",
            backdropFilter: "blur(30px) saturate(1.8)",
            border: "1px solid hsl(0 0% 14% / 0.6)",
            boxShadow:
              "0 -4px 30px hsl(0 0% 0% / 0.5), 0 0 0 0.5px hsl(0 0% 100% / 0.03) inset",
          }}
        >
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className="relative flex flex-col items-center gap-1 px-5 py-1.5 group"
              >
                {/* Animated pill background */}
                {isActive && (
                  <motion.div
                    layoutId="nav-bg"
                    className="absolute inset-1 rounded-xl"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    style={{
                      background: "hsl(0 85% 50% / 0.12)",
                      border: "1px solid hsl(0 85% 50% / 0.2)",
                    }}
                  />
                )}

                {/* Animated bottom dot indicator */}
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    className="absolute -bottom-0.5 h-[3px] w-5 rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    style={{
                      background: "hsl(0 85% 50%)",
                      boxShadow: "0 0 10px hsl(0 85% 50% / 0.6), 0 0 20px hsl(0 85% 50% / 0.3)",
                    }}
                  />
                )}

                {/* Icon with bounce on active */}
                <motion.div
                  className="relative z-10"
                  animate={isActive ? { y: -2, scale: 1.15 } : { y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Icon
                    className={cn(
                      "h-[22px] w-[22px] transition-colors duration-300",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground/50 group-hover:text-muted-foreground"
                    )}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </motion.div>

                {/* Label with fade-in */}
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.2 }}
                      className="text-[9px] font-bold relative z-10 tracking-wider text-primary"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!isActive && (
                  <span className="text-[9px] font-semibold relative z-10 tracking-wide text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors duration-300">
                    {label}
                  </span>
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
