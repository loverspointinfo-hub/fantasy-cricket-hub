import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, TrendingUp, TrendingDown } from "lucide-react";

interface PointEvent {
  id: string;
  player_name: string;
  player_team: string | null;
  event_type: string;
  description: string;
  points_change: number;
  created_at: string;
}

interface PointEventTickerProps {
  matchId: string;
}

const PointEventTicker = ({ matchId }: PointEventTickerProps) => {
  const [events, setEvents] = useState<PointEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchEvents = async () => {
    const { data, error } = await (supabase
      .from("point_events" as any) as any)
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setEvents(data as unknown as PointEvent[]);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Subscribe to realtime inserts
    const channel = supabase
      .channel(`point-events-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "point_events", filter: `match_id=eq.${matchId}` },
        (payload: any) => {
          setEvents(prev => [payload.new as PointEvent, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    // Poll every 30 seconds as backup
    const interval = setInterval(fetchEvents, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [matchId]);

  if (events.length === 0) return null;

  const displayEvents = isExpanded ? events : events.slice(0, 4);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "six": return "🔥";
      case "four": return "💥";
      case "century": return "💯";
      case "half_century": return "🔥";
      case "wicket": return "🎯";
      case "catch": return "🧤";
      case "duck": return "🦆";
      default: return "⚡";
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border/20" style={{ background: "hsl(228 16% 9%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/10" style={{ background: "hsl(228 16% 7%)" }}>
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-[hsl(var(--neon-orange))] animate-pulse" />
          <span className="text-xs font-bold text-foreground">Ball-by-Ball Updates</span>
        </div>
        <span className="text-[9px] text-muted-foreground">{events.length} events</span>
      </div>

      {/* Events list */}
      <div className="px-3 py-2 space-y-0.5 max-h-[280px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {displayEvents.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: i * 0.03, type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors",
                i === 0 && "bg-primary/5 border border-primary/10"
              )}
            >
              <span className="text-base shrink-0">{getEventIcon(event.event_type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">
                  {event.player_name}
                  {event.player_team && (
                    <span className="text-muted-foreground/50 font-normal ml-1">({event.player_team})</span>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{event.description}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {event.points_change > 0 ? (
                  <TrendingUp className="h-3 w-3 text-primary" />
                ) : event.points_change < 0 ? (
                  <TrendingDown className="h-3 w-3 text-[hsl(var(--neon-red))]" />
                ) : null}
                <span className={cn(
                  "text-xs font-display font-bold tabular-nums",
                  event.points_change > 0 ? "text-primary" : event.points_change < 0 ? "text-[hsl(var(--neon-red))]" : "text-muted-foreground"
                )}>
                  {event.points_change > 0 ? "+" : ""}{event.points_change}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Show more / less */}
      {events.length > 4 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 text-[10px] font-semibold text-primary hover:text-primary/80 border-t border-border/10 transition-colors"
        >
          {isExpanded ? "Show Less" : `Show All ${events.length} Events`}
        </button>
      )}
    </div>
  );
};

export default PointEventTicker;
