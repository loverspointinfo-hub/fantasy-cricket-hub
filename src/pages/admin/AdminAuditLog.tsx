import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Filter } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const AdminAuditLog = () => {
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-log", entityFilter],
    queryFn: async () => {
      let query = (supabase.from("audit_log" as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (entityFilter !== "all") {
        query = query.eq("entity_type", entityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch admin profiles for names
  const adminIds = [...new Set((logs || []).map((l: any) => l.admin_id))];
  const { data: admins } = useQuery({
    queryKey: ["audit-admins", adminIds],
    queryFn: async () => {
      if (adminIds.length === 0) return {};
      const { data } = await (supabase.from("profiles") as any)
        .select("id, username, full_name")
        .in("id", adminIds);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.full_name || p.username || "Admin"; });
      return map;
    },
    enabled: adminIds.length > 0,
  });

  const getActionColor = (action: string) => {
    if (action.includes("approved") || action.includes("enabled") || action.includes("created")) return "border-emerald-500/50 text-emerald-400";
    if (action.includes("rejected") || action.includes("disabled") || action.includes("banned") || action.includes("deleted")) return "border-destructive/50 text-destructive";
    return "border-primary/50 text-primary";
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading audit log...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            Audit Log
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track all admin actions</p>
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-40 h-9">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="feature_flag">Feature Flags</SelectItem>
            <SelectItem value="kyc">KYC</SelectItem>
            <SelectItem value="contest">Contests</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="suspension">Suspensions</SelectItem>
            <SelectItem value="deposit">Deposits</SelectItem>
            <SelectItem value="withdrawal">Withdrawals</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="glass-card p-5">
        {(!logs || logs.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-8">No audit log entries yet. Admin actions will appear here.</p>
        ) : (
          <div className="space-y-0">
            {logs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 py-3 border-b border-border/10 last:border-0">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium">{admins?.[log.admin_id] || "Admin"}</span>
                    <Badge variant="outline" className={`text-[9px] ${getActionColor(log.action)}`}>
                      {log.action}
                    </Badge>
                    <Badge variant="secondary" className="text-[9px]">{log.entity_type}</Badge>
                  </div>
                  {log.entity_id && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      ID: {log.entity_id}
                    </p>
                  )}
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {JSON.stringify(log.details).slice(0, 120)}
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground shrink-0">
                  {format(new Date(log.created_at), "MMM d, HH:mm")}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminAuditLog;
