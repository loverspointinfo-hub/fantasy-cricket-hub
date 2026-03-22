import { X, Download, Share2 } from "lucide-react";
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
  teamSide,
}: {
  player: MatchPlayer["player"];
  isCaptain: boolean;
  isVC: boolean;
  teamSide: "team1" | "team2";
}) => {
  const shortName =
    player.name.split(" ").length > 1
      ? `${player.name[0]} ${player.name.split(" ").slice(-1)[0]}`
      : player.name;

  const initials = player.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <motion.div variants={item} className="flex flex-col items-center gap-0.5 w-[80px] sm:w-[88px]">
      {/* Avatar with badge */}
      <div className="relative mb-1">
        {/* C / VC badge */}
        {(isCaptain || isVC) && (
          <div
            className={cn(
              "absolute -top-1.5 -left-1.5 z-20 h-[22px] w-[22px] rounded-full flex items-center justify-center text-[9px] font-black border-2 shadow-md",
              isCaptain
                ? "bg-[hsl(var(--gold))] border-[hsl(var(--gold))] text-black"
                : "bg-primary border-primary text-primary-foreground"
            )}
          >
            {isCaptain ? "C" : "VC"}
          </div>
        )}

        {/* Player image circle */}
        <div
          className={cn(
            "h-[60px] w-[60px] sm:h-[68px] sm:w-[68px] rounded-full flex items-center justify-center overflow-hidden border-[2.5px] shadow-xl transition-transform hover:scale-105",
            isCaptain
              ? "border-[hsl(var(--gold))] shadow-[0_0_16px_hsl(var(--gold)/0.4)]"
              : isVC
              ? "border-primary shadow-[0_0_16px_hsl(var(--primary)/0.4)]"
              : "border-white/40"
          )}
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
          }}
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
          <span
            className={cn(
              "text-white font-bold text-sm",
              player.photo_url ? "hidden" : ""
            )}
          >
            {initials}
          </span>
        </div>
      </div>

      {/* Name pill */}
      <div
        className={cn(
          "px-2.5 py-[3px] rounded-md text-[10px] sm:text-[11px] font-bold text-center whitespace-nowrap max-w-[80px] truncate shadow-sm",
          teamSide === "team1"
            ? "bg-white text-gray-900"
            : "bg-black/70 text-white border border-white/10"
        )}
      >
        {shortName}
      </div>

      {/* Credits */}
      <span className="text-[10px] text-white/70 font-semibold mt-0.5">
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
      className="flex flex-col rounded-2xl overflow-hidden border border-border/20 shadow-2xl"
    >
      {/* Header */}
      <motion.div
        variants={item}
        className="bg-gradient-to-r from-[hsl(160,30%,12%)] to-[hsl(160,20%,16%)] px-4 py-3 flex items-center gap-3"
      >
        {onClose && (
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
        <h3 className="font-display font-black text-sm flex-1 truncate text-white uppercase tracking-wide">
          {teamName || "MY TEAM"}
        </h3>
        <div className="flex items-center gap-1">
          {canShare && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              disabled={isGenerating}
              className="h-8 w-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
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
            className="h-8 w-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
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
          className="bg-gradient-to-r from-[hsl(160,25%,14%)] to-[hsl(160,20%,18%)] px-5 py-2.5 flex items-center justify-between"
        >
          <div className="text-center">
            <p className="text-[10px] text-emerald-400 font-medium tracking-wide">Players</p>
            <p className="font-display font-black text-base text-white">
              {players.length}<span className="text-white/40">/11</span>
            </p>
          </div>

          {team1Short && team2Short && (
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-black px-2.5 py-1 rounded-md bg-white/10 text-white border border-white/10">
                {team1Short}
              </span>
              <span className="font-display font-black text-lg text-white">
                {team1Count} <span className="text-white/40">:</span> {team2Count}
              </span>
              <span className="text-[11px] font-black px-2.5 py-1 rounded-md bg-white/10 text-white border border-white/10">
                {team2Short}
              </span>
            </div>
          )}

          <div className="text-center">
            <p className="text-[10px] text-emerald-400 font-medium tracking-wide">Credits Left</p>
            <p className="font-display font-black text-base text-white">
              {(100 - totalCredits).toFixed(1)}
            </p>
          </div>
        </motion.div>

        {/* Cricket Field */}
        <div className="relative px-2 py-10 min-h-[460px] overflow-hidden" style={{
          background: "linear-gradient(180deg, #1a5e32 0%, #145228 30%, #0f4420 60%, #0a3618 100%)",
        }}>
          {/* Grass stripes */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 24px, white 24px, white 25px)",
            }}
          />

          {/* Outer boundary */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[92%] h-[94%] rounded-[50%] border-[2px] border-white/8" />
          </div>

          {/* 30-yard circle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[58%] h-[62%] rounded-[50%] border border-dashed border-white/6" />
          </div>

          {/* Pitch */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[30px] h-[130px] border border-white/10 rounded-[3px] bg-[hsl(42,20%,45%,0.08)]">
              {/* Crease lines */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[48px] h-[1.5px] bg-white/12" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[48px] h-[1.5px] bg-white/12" />
              <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[40px] h-[1px] bg-white/8" />
              <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 w-[40px] h-[1px] bg-white/8" />
              {/* Stumps */}
              <div className="absolute top-[3px] left-1/2 -translate-x-1/2 flex gap-[4px]">
                <div className="w-[2px] h-[3px] rounded-full bg-white/20" />
                <div className="w-[2px] h-[3px] rounded-full bg-white/20" />
                <div className="w-[2px] h-[3px] rounded-full bg-white/20" />
              </div>
              <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 flex gap-[4px]">
                <div className="w-[2px] h-[3px] rounded-full bg-white/20" />
                <div className="w-[2px] h-[3px] rounded-full bg-white/20" />
                <div className="w-[2px] h-[3px] rounded-full bg-white/20" />
              </div>
            </div>
          </div>

          {/* Players by role */}
          <div className="relative z-10 flex flex-col gap-8">
            {grouped.map(({ role, label, players: rolePlayers }) =>
              rolePlayers.length > 0 ? (
                <motion.div key={role} variants={item} className="flex flex-col items-center gap-4">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/45 font-bold">
                    {label}
                  </p>
                  <div className="flex items-start justify-center gap-3 sm:gap-4 flex-wrap">
                    {rolePlayers.map((mp) => (
                      <PlayerAvatar
                        key={mp.player_id}
                        player={mp.player}
                        isCaptain={captainId === mp.player_id}
                        isVC={viceCaptainId === mp.player_id}
                        teamSide={mp.player.team === team1Short ? "team1" : "team2"}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : null
            )}
          </div>
        </div>

        {/* Watermark */}
        <div className="bg-gradient-to-r from-[hsl(160,25%,12%)] to-[hsl(160,20%,16%)] px-4 py-2 flex items-center justify-center">
          <span className="text-[10px] text-white/30 font-semibold tracking-wider">Made with BatWiz</span>
        </div>
      </div>
    </motion.div>
  );
};

export default TeamPreview;
