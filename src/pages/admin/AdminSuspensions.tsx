import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ShieldBan, AlertTriangle, Search, Ban, ShieldCheck, Flag, Eye } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

const AdminSuspensions = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [banDialog, setBanDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [banType, setBanType] = useState("suspended");
  const [banReason, setBanReason] = useState("");
  const [banExpiry, setBanExpiry] = useState("");

  // Fetch active suspensions
  const { data: suspensions, isLoading } = useQuery({
    queryKey: ["suspensions"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("user_suspensions" as any) as any)
        .select("*")
        .eq("is_active", true)
        .order("suspended_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch suspicious flags
  const { data: flags } = useQuery({
    queryKey: ["suspicious-flags"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("suspicious_flags" as any) as any)
        .select("*")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch profiles for user names
  const userIds = [
    ...new Set([
      ...(suspensions || []).map((s: any) => s.user_id),
      ...(flags || []).map((f: any) => f.user_id),
    ]),
  ];
  const { data: profiles } = useQuery({
    queryKey: ["suspension-profiles", userIds],
    queryFn: async () => {
      if (!userIds.length) return {};
      const { data } = await (supabase.from("profiles") as any)
        .select("id, username, full_name, upi_id")
        .in("id", userIds);
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => { map[p.id] = p; });
      return map;
    },
    enabled: userIds.length > 0,
  });

  // Scan for suspicious accounts (duplicate UPI)
  const scanSuspicious = useMutation({
    mutationFn: async () => {
      // Find duplicate UPI IDs
      const { data: allProfiles } = await (supabase.from("profiles") as any)
        .select("id, username, upi_id")
        .not("upi_id", "is", null);

      const upiMap: Record<string, any[]> = {};
      (allProfiles || []).forEach((p: any) => {
        if (p.upi_id && p.upi_id.trim()) {
          const key = p.upi_id.toLowerCase().trim();
          if (!upiMap[key]) upiMap[key] = [];
          upiMap[key].push(p);
        }
      });

      let flagged = 0;
      for (const [upi, users] of Object.entries(upiMap)) {
        if (users.length > 1) {
          for (const u of users) {
            // Check if already flagged
            const { data: existing } = await (supabase.from("suspicious_flags" as any) as any)
              .select("id")
              .eq("user_id", u.id)
              .eq("flag_type", "duplicate_upi")
              .eq("is_resolved", false);

            if (!existing || existing.length === 0) {
              await (supabase.from("suspicious_flags" as any) as any).insert({
                user_id: u.id,
                flag_type: "duplicate_upi",
                details: { upi_id: upi, shared_with: users.filter((x: any) => x.id !== u.id).map((x: any) => x.username) },
              });
              flagged++;
            }
          }
        }
      }

      // Log audit
      await (supabase.from("audit_log" as any) as any).insert({
        admin_id: user?.id,
        action: "scanned",
        entity_type: "suspicious_accounts",
        details: { flagged_count: flagged },
      });

      return flagged;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["suspicious-flags"] });
      toast.success(`Scan complete: ${count} new suspicious accounts flagged`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Suspend/Ban user
  const suspendUser = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || !banReason) throw new Error("User ID and reason required");

      const { error } = await (supabase.from("user_suspensions" as any) as any).insert({
        user_id: selectedUserId,
        type: banType,
        reason: banReason,
        suspended_by: user?.id,
        expires_at: banExpiry || null,
      });
      if (error) throw error;

      await (supabase.from("audit_log" as any) as any).insert({
        admin_id: user?.id,
        action: banType === "banned" ? "banned" : "suspended",
        entity_type: "suspension",
        entity_id: selectedUserId,
        details: { reason: banReason, type: banType },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suspensions"] });
      setBanDialog(false);
      setSelectedUserId("");
      setBanReason("");
      setBanExpiry("");
      toast.success("User suspended successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Lift suspension
  const liftSuspension = useMutation({
    mutationFn: async (suspensionId: string) => {
      const { error } = await (supabase.from("user_suspensions" as any) as any)
        .update({ is_active: false, lifted_at: new Date().toISOString(), lifted_by: user?.id })
        .eq("id", suspensionId);
      if (error) throw error;

      await (supabase.from("audit_log" as any) as any).insert({
        admin_id: user?.id,
        action: "lifted_suspension",
        entity_type: "suspension",
        entity_id: suspensionId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suspensions"] });
      toast.success("Suspension lifted");
    },
  });

  // Resolve flag
  const resolveFlag = useMutation({
    mutationFn: async (flagId: string) => {
      const { error } = await (supabase.from("suspicious_flags" as any) as any)
        .update({ is_resolved: true, resolved_by: user?.id, resolved_at: new Date().toISOString() })
        .eq("id", flagId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suspicious-flags"] });
      toast.success("Flag resolved");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ShieldBan className="h-5 w-5 text-primary" />
            Ban / Suspend & Fraud
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage user restrictions and suspicious activity</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => scanSuspicious.mutate()} disabled={scanSuspicious.isPending} variant="outline" size="sm">
            <Search className="h-3.5 w-3.5 mr-1" />
            {scanSuspicious.isPending ? "Scanning..." : "Scan Suspicious"}
          </Button>
          <Dialog open={banDialog} onOpenChange={setBanDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <Ban className="h-3.5 w-3.5 mr-1" />
                Ban/Suspend User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Suspend or Ban User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">User ID</Label>
                  <Input
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    placeholder="Paste user ID"
                  />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={banType} onValueChange={setBanType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suspended">Temporary Suspension</SelectItem>
                      <SelectItem value="banned">Permanent Ban</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Reason</Label>
                  <Textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Reason for suspension..."
                  />
                </div>
                {banType === "suspended" && (
                  <div>
                    <Label className="text-xs">Expires At (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={banExpiry}
                      onChange={(e) => setBanExpiry(e.target.value)}
                    />
                  </div>
                )}
                <Button
                  onClick={() => suspendUser.mutate()}
                  disabled={suspendUser.isPending || !selectedUserId || !banReason}
                  className="w-full"
                  variant="destructive"
                >
                  {suspendUser.isPending ? "Processing..." : "Confirm"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Suspicious Flags */}
      <Card className="glass-card p-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Suspicious Flags ({flags?.length || 0})
        </h3>
        {(!flags || flags.length === 0) ? (
          <p className="text-xs text-muted-foreground text-center py-4">No unresolved flags. Run a scan to check.</p>
        ) : (
          <div className="space-y-2">
            {flags.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Flag className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-sm font-medium">{profiles?.[f.user_id]?.username || f.user_id.slice(0, 8)}</span>
                    <Badge variant="outline" className="text-[9px] border-amber-500/50 text-amber-400">
                      {f.flag_type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {f.details?.upi_id && `UPI: ${f.details.upi_id}`}
                    {f.details?.shared_with && ` • Shared with: ${f.details.shared_with.join(", ")}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setSelectedUserId(f.user_id);
                    setBanDialog(true);
                  }}>
                    <Ban className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => resolveFlag.mutate(f.id)}>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Active Suspensions */}
      <Card className="glass-card p-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
          <Ban className="h-4 w-4 text-destructive" />
          Active Suspensions ({suspensions?.length || 0})
        </h3>
        {(!suspensions || suspensions.length === 0) ? (
          <p className="text-xs text-muted-foreground text-center py-4">No active suspensions</p>
        ) : (
          <div className="space-y-2">
            {suspensions.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{profiles?.[s.user_id]?.username || s.user_id.slice(0, 8)}</span>
                    <Badge variant={s.type === "banned" ? "destructive" : "outline"} className="text-[9px]">
                      {s.type.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.reason}</p>
                  <p className="text-[9px] text-muted-foreground/60">
                    Since {format(new Date(s.suspended_at), "MMM d, yyyy")}
                    {s.expires_at && ` • Expires: ${format(new Date(s.expires_at), "MMM d, yyyy")}`}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => liftSuspension.mutate(s.id)}>
                  Lift
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminSuspensions;
