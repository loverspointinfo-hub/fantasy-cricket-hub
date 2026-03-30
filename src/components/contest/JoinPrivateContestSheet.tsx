import { useState } from "react";
import { Lock, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Contest } from "@/hooks/useContests";

interface JoinPrivateContestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  onContestFound: (contest: Contest) => void;
}

const JoinPrivateContestSheet = ({ open, onOpenChange, matchId, onContestFound }: JoinPrivateContestSheetProps) => {
  const [inviteCode, setInviteCode] = useState("");
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!inviteCode.trim()) { toast.error("Enter an invite code"); return; }
    setSearching(true);
    try {
      const { data, error } = await (supabase
        .from("contests" as any) as any)
        .select("*")
        .eq("match_id", matchId)
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .single();

      if (error || !data) {
        toast.error("Contest not found. Check the invite code.");
        return;
      }

      onContestFound(data as Contest);
      onOpenChange(false);
      setInviteCode("");
    } catch {
      toast.error("Failed to find contest");
    } finally {
      setSearching(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/20 bg-background px-5 pb-8 max-h-[50vh]">
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-border/40" />
        </div>
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display text-lg text-left flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Join Private Contest
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Enter the invite code shared by your friend to join their private contest.</p>
          <Input
            placeholder="Enter Invite Code (e.g. ABC123)"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            className="text-center text-lg font-bold tracking-[0.3em] h-14 uppercase"
            maxLength={10}
          />
          <Button
            onClick={handleSearch}
            disabled={searching || !inviteCode.trim()}
            className="w-full font-bold rounded-2xl h-12 text-sm border-0"
            style={{
              background: !inviteCode.trim() ? "hsl(228 14% 15%)" : "linear-gradient(135deg, hsl(152 100% 50%), hsl(195 100% 55%))",
            }}
          >
            <Search className="h-4 w-4 mr-2" />
            {searching ? "Searching..." : "Find Contest"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default JoinPrivateContestSheet;
