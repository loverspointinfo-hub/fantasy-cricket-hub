import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ToggleLeft, AlertTriangle, Save, Construction } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const AdminFeatureFlags = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [msgInit, setMsgInit] = useState(false);

  const { data: flags, isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("feature_flags" as any) as any)
        .select("*")
        .order("key");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: siteSettings } = useQuery({
    queryKey: ["admin-maintenance-msg"],
    queryFn: async () => {
      const { data } = await (supabase.from("site_settings" as any) as any)
        .select("key, value")
        .eq("key", "maintenance_message")
        .single();
      if (!msgInit && data) {
        setMaintenanceMsg(data.value || "");
        setMsgInit(true);
      }
      return data;
    },
  });

  const toggleFlag = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const { error } = await (supabase.from("feature_flags" as any) as any)
        .update({ is_enabled: enabled, updated_at: new Date().toISOString(), updated_by: user?.id })
        .eq("key", key);
      if (error) throw error;

      // Log audit
      await (supabase.from("audit_log" as any) as any).insert({
        admin_id: user?.id,
        action: enabled ? "enabled" : "disabled",
        entity_type: "feature_flag",
        entity_id: key,
        details: { flag: key, new_value: enabled },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      toast.success("Feature flag updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMaintenanceMsg = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from("site_settings" as any) as any)
        .update({ value: maintenanceMsg, updated_at: new Date().toISOString() })
        .eq("key", "maintenance_message");
      if (error) throw error;
    },
    onSuccess: () => toast.success("Maintenance message saved"),
    onError: (e: any) => toast.error(e.message),
  });

  const maintenanceEnabled = flags?.find((f: any) => f.key === "maintenance_mode")?.is_enabled;

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <ToggleLeft className="h-5 w-5 text-primary" />
          Feature Flags
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Toggle features on/off without code changes</p>
      </div>

      {/* Maintenance Mode Banner */}
      {maintenanceEnabled && (
        <Card className="border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-400">Maintenance Mode is ON</p>
            <p className="text-xs text-muted-foreground">Users see a maintenance screen</p>
          </div>
        </Card>
      )}

      {/* Feature Flags */}
      <Card className="glass-card p-5 space-y-1">
        {flags?.map((flag: any) => (
          <div key={flag.key} className="flex items-center justify-between py-3 border-b border-border/10 last:border-0">
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{flag.label}</p>
                {flag.key === "maintenance_mode" && (
                  <Badge variant="outline" className="text-[9px] border-amber-500/50 text-amber-400">
                    <Construction className="h-3 w-3 mr-1" />
                    CRITICAL
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">{flag.description}</p>
            </div>
            <Switch
              checked={flag.is_enabled}
              onCheckedChange={(checked) => toggleFlag.mutate({ key: flag.key, enabled: checked })}
            />
          </div>
        ))}
      </Card>

      {/* Maintenance Message Editor */}
      <Card className="glass-card p-5 space-y-3">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Construction className="h-4 w-4 text-amber-400" />
          Maintenance Message
        </h3>
        <Textarea
          value={maintenanceMsg}
          onChange={(e) => setMaintenanceMsg(e.target.value)}
          placeholder="Enter the message shown to users during maintenance..."
          rows={3}
        />
        <Button
          onClick={() => saveMaintenanceMsg.mutate()}
          disabled={saveMaintenanceMsg.isPending}
          size="sm"
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          Save Message
        </Button>
      </Card>
    </div>
  );
};

export default AdminFeatureFlags;
