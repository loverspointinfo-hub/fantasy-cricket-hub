import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, BellOff, Trophy, Wallet, Zap, Info, CheckCheck, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { useNotifications, useMarkAsRead, useMarkAllAsRead, Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { toIST } from "@/lib/date-utils";
import { Skeleton } from "@/components/ui/skeleton";

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  contest_result: { icon: Trophy, color: "text-[hsl(var(--gold))]", bg: "bg-[hsl(var(--gold)/0.1)]" },
  match_update: { icon: Zap, color: "text-[hsl(var(--neon-cyan))]", bg: "bg-[hsl(var(--neon-cyan)/0.1)]" },
  wallet: { icon: Wallet, color: "text-[hsl(var(--neon-green))]", bg: "bg-[hsl(var(--neon-green)/0.1)]" },
  general: { icon: Info, color: "text-muted-foreground", bg: "bg-secondary/60" },
};

const NotificationItem = ({ notification, onRead }: { notification: Notification; onRead: () => void }) => {
  const config = typeConfig[notification.type] || typeConfig.general;
  const Icon = config.icon;

  return (
    <motion.div
      variants={item}
      onClick={onRead}
      className={cn(
        "relative rounded-2xl p-4 flex items-start gap-3 cursor-pointer transition-all duration-300",
        notification.is_read
          ? "opacity-60"
          : "hover:-translate-y-0.5"
      )}
      style={{
        background: notification.is_read
          ? "hsl(228 16% 8% / 0.5)"
          : "linear-gradient(145deg, hsl(228 16% 10% / 0.9), hsl(228 20% 7% / 0.8))",
        border: `1px solid ${notification.is_read ? "hsl(228 12% 14% / 0.3)" : "hsl(228 12% 18% / 0.5)"}`,
      }}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="absolute top-4 right-4">
          <div className="h-2 w-2 rounded-full"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
              boxShadow: "0 0 6px hsl(var(--primary) / 0.5)",
            }}
          />
        </div>
      )}

      {/* Icon */}
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
        <Icon className={cn("h-5 w-5", config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-4">
        <p className={cn(
          "text-sm leading-snug",
          notification.is_read ? "font-medium" : "font-semibold"
        )}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">
          {notification.message}
        </p>
        <p className="text-[10px] text-muted-foreground/40 mt-1.5">
          {formatDistanceToNow(toIST(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </motion.div>
  );
};

const NotificationSkeleton = () => (
  <div className="rounded-2xl p-4 flex items-start gap-3"
    style={{ background: "hsl(228 16% 8% / 0.5)", border: "1px solid hsl(228 12% 14% / 0.3)" }}
  >
    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-2.5 w-16 rounded" />
    </div>
  </div>
);

const Notifications = () => {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none gradient-mesh opacity-40" />
      <div className="floating-orb w-60 h-60 bg-[hsl(var(--neon-cyan))] -top-20 -right-16" />
      <div className="floating-orb w-40 h-40 bg-[hsl(var(--neon-purple))] bottom-40 -left-10" style={{ animationDelay: "4s" }} />

      {/* Header */}
      <header className="sticky top-0 z-50 relative"
        style={{
          background: "linear-gradient(180deg, hsl(228 18% 5% / 0.97), hsl(228 18% 5% / 0.88))",
          backdropFilter: "blur(24px) saturate(1.8)",
        }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{ background: "linear-gradient(90deg, transparent, hsl(228 12% 18% / 0.6), transparent)" }}
        />
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-1 rounded-xl hover:bg-secondary/80 active:scale-95 transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs font-bold text-primary-foreground rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
                >
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              className="text-[11px] text-primary hover:text-primary/80 h-8 px-3 rounded-xl"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Read all
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-lg px-4 py-5 space-y-2.5 relative z-10"
      >
        {isLoading ? (
          <div className="space-y-2.5">
            <NotificationSkeleton />
            <NotificationSkeleton />
            <NotificationSkeleton />
          </div>
        ) : notifications.length === 0 ? (
          <motion.div variants={item} className="glass-card flex flex-col items-center py-20 text-muted-foreground">
            <div className="h-16 w-16 rounded-2xl bg-secondary/40 flex items-center justify-center mb-4">
              <BellOff className="h-7 w-7 opacity-30" />
            </div>
            <p className="text-sm font-semibold text-foreground/70">No notifications yet</p>
            <p className="text-xs text-muted-foreground/50 mt-1">We'll notify you about contests, matches & more</p>
          </motion.div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={() => {
                if (!notification.is_read) {
                  markAsRead.mutate(notification.id);
                }
              }}
            />
          ))
        )}
      </motion.div>
    </div>
  );
};

export default Notifications;