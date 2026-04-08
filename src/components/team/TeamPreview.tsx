import { X, Download, Share2, Crown, Shield } from "lucide-react";
import { MatchPlayer } from "@/hooks/useMatchPlayers";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { useRef, useCallback, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const ROLE_LABELS: Record<string, string> = {
  WK: "WICKET-KEEPER",
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
  matchTitle?: string;
  onClose?: () => void;
}

const PlayerAvatar = ({
  player,
  isCaptain,
  isVC,
  teamSide,
  fantasyPoints,
}: {
  player: MatchPlayer["player"];
  isCaptain: boolean;
  isVC: boolean;
  teamSide: "team1" | "team2";
  fantasyPoints: number;
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
    <motion.div variants={item} className="flex flex-col items-center gap-0.5 w-[72px] sm:w-[82px]">
      <div className="relative mb-0.5">
        {/* C / VC badge */}
        {(isCaptain || isVC) && (
          <div
            className={cn(
              "absolute -top-1 -left-1 z-20 h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-black border-[1.5px] shadow-lg",
              isCaptain
                ? "bg-gradient-to-br from-yellow-400 to-amber-500 border-yellow-300 text-black"
                : "bg-gradient-to-br from-blue-400 to-indigo-500 border-blue-300 text-white"
            )}
          >
            {isCaptain ? "C" : "VC"}
          </div>
        )}

        {/* Glow ring for C/VC */}
        {(isCaptain || isVC) && (
          <div
            className={cn(
              "absolute inset-0 rounded-full animate-pulse",
              isCaptain
                ? "shadow-[0_0_20px_4px_rgba(251,191,36,0.35)]"
                : "shadow-[0_0_20px_4px_rgba(96,165,250,0.3)]"
            )}
          />
        )}

        {/* Player image */}
        <div
          className={cn(
            "h-[52px] w-[52px] sm:h-[58px] sm:w-[58px] rounded-full flex items-center justify-center overflow-hidden border-2 transition-transform hover:scale-110",
            isCaptain
              ? "border-yellow-400 ring-2 ring-yellow-400/30"
              : isVC
              ? "border-blue-400 ring-2 ring-blue-400/30"
              : "border-white/30"
          )}
          style={{
            background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), rgba(255,255,255,0.02))",
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
              "text-white font-bold text-xs",
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
          "px-2 py-[2px] rounded-md text-[9px] sm:text-[10px] font-bold text-center whitespace-nowrap max-w-[72px] truncate",
          teamSide === "team1"
            ? "bg-white text-gray-900 shadow-sm"
            : "bg-gray-900/80 text-white border border-white/15 shadow-sm"
        )}
      >
        {shortName}
      </div>

      {/* Points badge */}
      {fantasyPoints > 0 && (
        <span className="text-[9px] font-bold text-primary tabular-nums">
          {isCaptain ? fantasyPoints * 2 : isVC ? fantasyPoints * 1.5 : fantasyPoints} pts
        </span>
      )}

      {/* Credits */}
      <span className="text-[9px] text-white/50 font-semibold">
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
  matchTitle,
  onClose,
}: TeamPreviewProps) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const { data: siteSettings } = useSiteSettings();
  const siteName = siteSettings?.site_name || "FANTASY11";
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

  const captainPlayer = players.find((p) => p.player_id === captainId);
  const vcPlayer = players.find((p) => p.player_id === viceCaptainId);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
    >
      {/* Top action bar */}
      <motion.div
        variants={item}
        className="bg-gradient-to-r from-[hsl(var(--card))] to-[hsl(228,20%,10%)] px-4 py-2.5 flex items-center gap-3"
      >
        {onClose && (
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
        <h3 className="font-display font-black text-sm flex-1 truncate text-white uppercase tracking-wider">
          {teamName || "MY TEAM"}
        </h3>
        <div className="flex items-center gap-1">
          {canShare && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              disabled={isGenerating}
              className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            disabled={isGenerating}
            className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Capturable area */}
      <div ref={previewRef} className="bg-[hsl(228,18%,5%)]">
        {/* Stats strip with C/VC info */}
        <motion.div
          variants={item}
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(160,35%,14%) 0%, hsl(200,30%,12%) 50%, hsl(228,25%,10%) 100%)",
          }}
        >
          {/* Decorative mesh */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: "radial-gradient(ellipse at 20% 50%, hsl(152,100%,50%,0.08), transparent 60%), radial-gradient(ellipse at 80% 30%, hsl(195,100%,55%,0.06), transparent 50%)",
          }} />

          <div className="relative px-4 py-3 flex items-center justify-between">
            {/* Team 1 info */}
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                <span className="text-[10px] font-black text-white">{team1Short || "T1"}</span>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-white leading-none">{team1Count}</p>
                <p className="text-[8px] text-white/40 font-semibold uppercase tracking-wider">Players</p>
              </div>
            </div>

            {/* Center - C & VC pills */}
            <div className="flex flex-col items-center gap-1.5">
              {captainPlayer && (
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-full px-2.5 py-0.5">
                  <Crown className="h-3 w-3 text-yellow-400" />
                  <span className="text-[9px] font-bold text-yellow-300 truncate max-w-[80px]">
                    {captainPlayer.player.name.split(" ").slice(-1)[0]}
                  </span>
                  <span className="text-[8px] font-black bg-yellow-400 text-black px-1 rounded-sm">2x</span>
                </div>
              )}
              {vcPlayer && (
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 rounded-full px-2.5 py-0.5">
                  <Shield className="h-3 w-3 text-blue-400" />
                  <span className="text-[9px] font-bold text-blue-300 truncate max-w-[80px]">
                    {vcPlayer.player.name.split(" ").slice(-1)[0]}
                  </span>
                  <span className="text-[8px] font-black bg-blue-400 text-white px-1 rounded-sm">1.5x</span>
                </div>
              )}
            </div>

            {/* Team 2 info */}
            <div className="flex items-center gap-2">
              <div className="text-center">
                <p className="text-lg font-black text-white leading-none">{team2Count}</p>
                <p className="text-[8px] text-white/40 font-semibold uppercase tracking-wider">Players</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                <span className="text-[10px] font-black text-white">{team2Short || "T2"}</span>
              </div>
            </div>
          </div>

          {/* Credits bar */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-black/20 border-t border-white/5">
            <span className="text-[9px] text-white/40 font-semibold uppercase tracking-wider">Credits Used</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(totalCredits / 100) * 100}%`,
                    background: totalCredits > 95
                      ? "linear-gradient(90deg, hsl(0,85%,55%), hsl(28,100%,58%))"
                      : "linear-gradient(90deg, hsl(152,100%,50%), hsl(195,100%,55%))",
                  }}
                />
              </div>
              <span className="text-[10px] font-black text-white">
                {totalCredits}<span className="text-white/30">/100</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Cricket Field - Realistic ground */}
        <div className="relative px-1 py-8 min-h-[420px] overflow-hidden" style={{
          background: "radial-gradient(ellipse at 50% 40%, #2d8a4e 0%, #1f7a3d 20%, #18632f 40%, #114e24 60%, #0b3a1a 80%, #072d13 100%)",
        }}>
          {/* Realistic grass mowing pattern */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(255,255,255,0.025) 28px, rgba(255,255,255,0.025) 30px, transparent 30px, transparent 58px, rgba(0,0,0,0.03) 58px, rgba(0,0,0,0.03) 60px)",
            }}
          />

          {/* Stadium floodlight glow - top */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[200px] pointer-events-none" style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,230,0.06) 0%, transparent 70%)",
          }} />

          {/* Stadium floodlight glow - bottom */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[400px] h-[150px] pointer-events-none" style={{
            background: "radial-gradient(ellipse at 50% 100%, rgba(255,255,230,0.04) 0%, transparent 70%)",
          }} />

          {/* Side light spill */}
          <div className="absolute top-1/4 -left-10 w-[150px] h-[300px] pointer-events-none" style={{
            background: "radial-gradient(ellipse at 0% 50%, rgba(255,255,200,0.03) 0%, transparent 70%)",
          }} />
          <div className="absolute top-1/4 -right-10 w-[150px] h-[300px] pointer-events-none" style={{
            background: "radial-gradient(ellipse at 100% 50%, rgba(255,255,200,0.03) 0%, transparent 70%)",
          }} />

          {/* Outer boundary rope */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[95%] h-[97%] rounded-[50%]" style={{
              border: "2px solid rgba(255,255,255,0.07)",
              boxShadow: "0 0 8px rgba(255,255,255,0.03), inset 0 0 8px rgba(255,255,255,0.02)",
            }} />
          </div>

          {/* 30-yard circle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[56%] h-[60%] rounded-[50%]" style={{
              border: "1.5px dashed rgba(255,255,255,0.06)",
            }} />
          </div>

          {/* Pitch rectangle - realistic clay color */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[28px] h-[110px] rounded-[2px] relative" style={{
              background: "linear-gradient(180deg, #c4a44a22 0%, #b8953e18 50%, #c4a44a22 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 0 12px rgba(196,164,74,0.08)",
            }}>
              {/* Popping crease */}
              <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-[42px] h-[1.5px]" style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
              }} />
              <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[42px] h-[1.5px]" style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
              }} />
              {/* Bowling crease */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[36px] h-[1px] bg-white/10" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[36px] h-[1px] bg-white/10" />
              {/* Stumps */}
              <div className="absolute top-[2px] left-1/2 -translate-x-1/2 flex gap-[3px]">
                <div className="w-[1.5px] h-[4px] rounded-full bg-white/20" />
                <div className="w-[1.5px] h-[4px] rounded-full bg-white/25" />
                <div className="w-[1.5px] h-[4px] rounded-full bg-white/20" />
              </div>
              <div className="absolute bottom-[2px] left-1/2 -translate-x-1/2 flex gap-[3px]">
                <div className="w-[1.5px] h-[4px] rounded-full bg-white/20" />
                <div className="w-[1.5px] h-[4px] rounded-full bg-white/25" />
                <div className="w-[1.5px] h-[4px] rounded-full bg-white/20" />
              </div>
            </div>
          </div>

          {/* Players by role */}
          <div className="relative z-10 flex flex-col gap-6">
            {grouped.map(({ role, label, players: rolePlayers }) =>
              rolePlayers.length > 0 ? (
                <motion.div key={role} variants={item} className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-white/15" />
                    <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-bold">
                      {label}
                    </p>
                    <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-white/15" />
                  </div>
                  <div className="flex items-start justify-center gap-2 sm:gap-3 flex-wrap">
                    {rolePlayers.map((mp) => (
                      <PlayerAvatar
                        key={mp.player_id}
                        player={mp.player}
                        isCaptain={captainId === mp.player_id}
                        isVC={viceCaptainId === mp.player_id}
                        teamSide={mp.player.team === team1Short ? "team1" : "team2"}
                        fantasyPoints={mp.fantasy_points || 0}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : null
            )}
          </div>
        </div>

        {/* Watermark footer with site name & match info */}
        <div className="px-4 py-3 flex flex-col items-center gap-1.5 border-t border-white/5" style={{
          background: "linear-gradient(135deg, hsl(228,18%,7%) 0%, hsl(228,22%,10%) 100%)",
        }}>
          {matchTitle && (
            <span className="text-[9px] text-white/25 font-semibold tracking-wide uppercase truncate max-w-[90%]">
              {matchTitle}
            </span>
          )}
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))] shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
            <span className="text-[10px] text-white/30 font-bold tracking-[0.25em] uppercase font-display">
              {siteName}
            </span>
            <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))] shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TeamPreview;
