import { Crown, Star, X, Download, Share2 } from "lucide-react";
import { MatchPlayer } from "@/hooks/useMatchPlayers";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { useRef, useCallback, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<string, string> = {
  WK: "WICKET-KEEPERS",
  BAT: "BATTERS",
  AR: "ALL-ROUNDERS",
  BOWL: "BOWLERS",
};
const ROLE_ORDER = ["WK", "BAT", "AR", "BOWL"];

interface TeamPreviewProps {
  players: MatchPlayer[];
  captainId: string;
  viceCaptainId: string;
  totalCredits: number;
  team1Short?: string;
  team2Short?: string;
  teamName?: string;
  onClose?: () => void;
}

const PlayerAvatar = ({
  player,
  isCaptain,
  isVC,
}: {
  player: MatchPlayer["player"];
  isCaptain: boolean;
  isVC: boolean;
}) => {
  const initials = player.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <motion.div variants={item} className="flex flex-col items-center gap-1 w-[76px]">
      <div className="relative">
        <div
          className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center font-display font-bold text-xs border-2 overflow-hidden shadow-lg",
            isCaptain
              ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold)/0.2)] shadow-[0_0_12px_hsl(var(--gold)/0.3)]"
              : isVC
              ? "border-primary bg-primary/20 shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
              : "border-white/30 bg-secondary/80"
          )}
        >
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.name}
              className="h-full w-full rounded-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <span className={cn("text-foreground", player.photo_url ? "hidden" : "")}>{initials}</span>
        </div>
        {(isCaptain || isVC) && (
          <div
            className={cn(
              "absolute -top-1 -left-1 h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold border",
              isCaptain
                ? "bg-[hsl(var(--gold))] text-primary-foreground border-[hsl(var(--gold))]"
                : "bg-primary text-primary-foreground border-primary"
            )}
          >
            {isCaptain ? "C" : "VC"}
          </div>
        )}
      </div>
      <div
        className={cn(
          "px-2 py-0.5 rounded-md text-[10px] font-semibold text-center whitespace-nowrap max-w-[72px] truncate",
          isCaptain
            ? "bg-[hsl(var(--gold))] text-primary-foreground"
            : isVC
            ? "bg-primary text-primary-foreground"
            : "bg-secondary/90 text-foreground"
        )}
      >
        {player.name.split(" ").length > 1
          ? `${player.name[0]} ${player.name.split(" ").slice(-1)[0]}`
          : player.name}
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">
        {player.credit_value} Cr
      </span>
    </motion.div>
  );
};

const TeamPreview = ({
  players,
  captainId,
  viceCaptainId,
  totalCredits,
  team1Short,
  team2Short,
  teamName,
  onClose,
}: TeamPreviewProps) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  const generateImage = useCallback(async () => {
    if (!previewRef.current) return null;
    setIsGenerating(true);
    try {
      await toPng(previewRef.current, { quality: 0.8, pixelRatio: 2 });
      const dataUrl = await toPng(previewRef.current, { quality: 0.95, pixelRatio: 2 });
      return dataUrl;
    } catch {
      toast.error("Failed to generate image");
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `${(teamName || "my-team").replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = dataUrl;
    link.click();
    toast.success("Team image downloaded!");
  }, [generateImage, teamName]);

  const handleShare = useCallback(async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${teamName || "my-team"}.png`, { type: "image/png" });
      await navigator.share({ title: teamName || "My Team", files: [file] });
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("Share failed");
    }
  }, [generateImage, teamName]);

  const grouped = ROLE_ORDER.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    players: players.filter((mp) => mp.player.role === role),
  }));

  const team1Count = players.filter((p) => p.player.team === team1Short).length;
  const team2Count = players.filter((p) => p.player.team === team2Short).length;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="flex flex-col rounded-2xl overflow-hidden border border-border/30"
    >
      {/* Header Bar */}
      <motion.div variants={item} className="bg-card px-4 py-3 flex items-center gap-3">
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        )}
        <h3 className="font-display font-bold text-sm flex-1 truncate">
          {teamName || "MY TEAM"}
        </h3>
        <div className="flex items-center gap-1">
          {canShare && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              disabled={isGenerating}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
              title="Share team"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            disabled={isGenerating}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
            title="Download as image"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Capturable area */}
      <div ref={previewRef}>
        {/* Stats Strip */}
        <motion.div
          variants={item}
          className="bg-card/80 px-4 py-2 flex items-center justify-between border-t border-border/20"
        >
          <div className="text-center">
            <p className="text-[10px] text-primary font-medium">Players</p>
            <p className="font-display font-bold text-sm">
              <span className="text-foreground">{players.length}</span>
              <span className="text-muted-foreground">/11</span>
            </p>
          </div>

          {team1Short && team2Short && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-secondary text-foreground">
                {team1Short}
              </span>
              <span className="font-display font-bold text-sm text-foreground">
                {team1Count} : {team2Count}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-secondary text-foreground">
                {team2Short}
              </span>
            </div>
          )}

          <div className="text-center">
            <p className="text-[10px] text-primary font-medium">Credits Left</p>
            <p className="font-display font-bold text-sm text-foreground">
              {(100 - totalCredits).toFixed(1)}
            </p>
          </div>
        </motion.div>

        {/* Cricket Field */}
        <div className="relative bg-gradient-to-b from-[hsl(145,60%,22%)] via-[hsl(145,55%,18%)] to-[hsl(145,50%,14%)] px-3 py-8 min-h-[420px] overflow-hidden">
          {/* Grass stripe pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 20px, white 20px, white 21px)",
            }}
          />

          {/* Outer boundary oval */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[90%] h-[92%] rounded-[50%] border-[1.5px] border-white/10" />
          </div>
          {/* 30-yard circle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[55%] h-[60%] rounded-[50%] border border-dashed border-white/8" />
          </div>

          {/* Pitch strip */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[28px] h-[120px] border border-white/12 rounded-[2px] bg-[hsl(40,30%,50%,0.08)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[44px] h-[1px] bg-white/15" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[44px] h-[1px] bg-white/15" />
              <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-[36px] h-[1px] bg-white/10" />
              <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[36px] h-[1px] bg-white/10" />
              <div className="absolute top-[3px] left-1/2 -translate-x-1/2 flex gap-[3px]">
                <div className="w-[2px] h-[2px] rounded-full bg-white/20" />
                <div className="w-[2px] h-[2px] rounded-full bg-white/20" />
                <div className="w-[2px] h-[2px] rounded-full bg-white/20" />
              </div>
              <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 flex gap-[3px]">
                <div className="w-[2px] h-[2px] rounded-full bg-white/20" />
                <div className="w-[2px] h-[2px] rounded-full bg-white/20" />
                <div className="w-[2px] h-[2px] rounded-full bg-white/20" />
              </div>
            </div>
          </div>

          {/* Corner boundary markers */}
          <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-white/10 rounded-tl-sm pointer-events-none" />
          <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-white/10 rounded-tr-sm pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-white/10 rounded-bl-sm pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-white/10 rounded-br-sm pointer-events-none" />

          {/* Players by role */}
          <div className="relative z-10 flex flex-col gap-6">
            {grouped.map(({ role, label, players: rolePlayers }) =>
              rolePlayers.length > 0 ? (
                <motion.div key={role} variants={item} className="flex flex-col items-center gap-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
                    {label}
                  </p>
                  <div className="flex items-start justify-center gap-2 flex-wrap">
                    {rolePlayers.map((mp) => (
                      <PlayerAvatar
                        key={mp.player_id}
                        player={mp.player}
                        isCaptain={captainId === mp.player_id}
                        isVC={viceCaptainId === mp.player_id}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : null
            )}
          </div>
        </div>

        {/* Watermark for shared image */}
        <div className="bg-card px-4 py-2 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground font-medium">Made with BatWiz</span>
        </div>
      </div>
    </motion.div>
  );
};

export default TeamPreview;