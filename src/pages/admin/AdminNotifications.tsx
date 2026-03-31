import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Bell, Clock, Users, Target, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const SEGMENTS = [
  { value: "all", label: "All Users", desc: "Every registered user" },
  { value: "active", label: "Active Users", desc: "Joined a contest in last 7 days" },
  { value: "new", label: "New Users", desc: "Signed up in last 30 days" },
  { value: "whale", label: "High Spenders", desc: "Deposit balance > ₹500" },
  { value: "inactive", label: "Inactive Users", desc: "No contest in last 14 days" },
];

const AdminNotifications = () => {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("general");
  const [targetUser, setTargetUser] = useState("all");
  const [targetSegment, setTargetSegment] = useState("all");

  // Scheduled notification state
  const [schedTitle, setSchedTitle] = useState("");
  const [schedMessage, setSchedMessage] = useState("");
  const [schedType, setSchedType] = useState("general");
  const [schedSegment, setSchedSegment] = useState("all");
  const [schedAt, setSchedAt] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users-notif"],
    queryFn: async () => {
      const { data } = await (supabase.from("profiles") as any).select("id, username");
      return data ?? [];
    },
  });

  const { data: sentNotifs = [] } = useQuery({
    queryKey: ["admin-sent-notifs"],
    queryFn: async () => {
      const { data } = await (supabase.from("notifications") as any).select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: scheduledNotifs = [] } = useQuery({
    queryKey: ["admin-scheduled-notifs"],
    queryFn: async () => {
      const { data } = await (supabase.from("scheduled_notifications") as any).select("*").order("scheduled_at", { ascending: true });
      return data ?? [];
    },
  });

  // Send now - supports segments
  const send = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !message.trim()) throw new Error("Title and message required");

      if (targetUser !== "all" && targetUser !== "segment") {
        // Send to specific user
        const { error } = await (supabase.from("notifications") as any).insert({ user_id: targetUser, title, message, type });
        if (error) throw error;
        return;
      }

      // Determine user list based on segment
      let userIds: string[] = [];
      const segment = targetUser === "segment" ? targetSegment : "all";

      if (segment === "all") {
        userIds = users.map((u: any) => u.id);
      } else if (segment === "active") {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: entries } = await (supabase.from("contest_entries") as any).select("user_id").gte("created_at", sevenDaysAgo);
        userIds = [...new Set((entries || []).map((e: any) => e.user_id))] as string[];
      } else if (segment === "new") {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: profiles } = await (supabase.from("profiles") as any).select("id").gte("created_at", thirtyDaysAgo);
        userIds = (profiles || []).map((p: any) => p.id);
      } else if (segment === "whale") {
        const { data: wallets } = await (supabase.from("wallets") as any).select("user_id").gt("deposit_balance", 500);
        userIds = (wallets || []).map((w: any) => w.user_id);
      } else if (segment === "inactive") {
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: activeEntries } = await (supabase.from("contest_entries") as any).select("user_id").gte("created_at", fourteenDaysAgo);
        const activeSet = new Set((activeEntries || []).map((e: any) => e.user_id));
        userIds = users.filter((u: any) => !activeSet.has(u.id)).map((u: any) => u.id);
      }

      if (userIds.length === 0) throw new Error("No users found in this segment");

      const rows = userIds.map((uid: string) => ({ user_id: uid, title, message, type }));
      const { error } = await (supabase.from("notifications") as any).insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sent-notifs"] });
      setTitle(""); setMessage(""); setType("general"); setTargetUser("all");
      toast.success("Notification sent!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Schedule notification
  const schedule = useMutation({
    mutationFn: async () => {
      if (!schedTitle.trim() || !schedMessage.trim()) throw new Error("Title and message required");
      if (!schedAt) throw new Error("Schedule time required");

      const { error } = await (supabase.from("scheduled_notifications") as any).insert({
        title: schedTitle,
        message: schedMessage,
        type: schedType,
        target_segment: schedSegment,
        scheduled_at: new Date(schedAt).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-scheduled-notifs"] });
      setSchedTitle(""); setSchedMessage(""); setSchedType("general"); setSchedSegment("all"); setSchedAt("");
      toast.success("Notification scheduled!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteScheduled = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("scheduled_notifications") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-scheduled-notifs"] });
      toast.success("Removed");
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" /> Notifications
      </h1>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="send" className="gap-1"><Send className="h-3 w-3" /> Send Now</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1"><Clock className="h-3 w-3" /> Schedule</TabsTrigger>
          <TabsTrigger value="history" className="gap-1"><Bell className="h-3 w-3" /> History</TabsTrigger>
        </TabsList>

        {/* ───── SEND NOW TAB ───── */}
        <TabsContent value="send">
          <Card className="glass-card p-5 space-y-4">
            <div><Label className="text-xs">Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title" /></div>
            <div><Label className="text-xs">Message</Label><Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Notification message" rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="contest">Contest</SelectItem>
                    <SelectItem value="match">Match</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                    <SelectItem value="promo">Promo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Send To</Label>
                <Select value={targetUser} onValueChange={setTargetUser}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="segment">By Segment ▾</SelectItem>
                    {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.username || u.id.slice(0, 8)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {targetUser === "segment" && (
              <div>
                <Label className="text-xs flex items-center gap-1"><Target className="h-3 w-3" /> User Segment</Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {SEGMENTS.map(seg => (
                    <button
                      key={seg.value}
                      onClick={() => setTargetSegment(seg.value)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        targetSegment === seg.value
                          ? "border-primary bg-primary/10"
                          : "border-border/30 hover:border-border/60"
                      }`}
                    >
                      <p className="text-sm font-semibold">{seg.label}</p>
                      <p className="text-[10px] text-muted-foreground">{seg.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => send.mutate()} disabled={send.isPending} className="w-full gap-2">
              <Send className="h-4 w-4" /> {send.isPending ? "Sending..." : "Send Notification"}
            </Button>
          </Card>
        </TabsContent>

        {/* ───── SCHEDULE TAB ───── */}
        <TabsContent value="schedule">
          <Card className="glass-card p-5 space-y-4">
            <div><Label className="text-xs">Title</Label><Input value={schedTitle} onChange={e => setSchedTitle(e.target.value)} placeholder="e.g. Match starts in 1 hour!" /></div>
            <div><Label className="text-xs">Message</Label><Textarea value={schedMessage} onChange={e => setSchedMessage(e.target.value)} placeholder="Reminder message" rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={schedType} onValueChange={setSchedType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="match">Match Reminder</SelectItem>
                    <SelectItem value="contest">Contest</SelectItem>
                    <SelectItem value="promo">Promotion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Target Segment</Label>
                <Select value={schedSegment} onValueChange={setSchedSegment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map(seg => (
                      <SelectItem key={seg.value} value={seg.value}>{seg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Send At</Label>
              <Input type="datetime-local" value={schedAt} onChange={e => setSchedAt(e.target.value)} />
            </div>
            <Button onClick={() => schedule.mutate()} disabled={schedule.isPending} className="w-full gap-2">
              <Clock className="h-4 w-4" /> {schedule.isPending ? "Scheduling..." : "Schedule Notification"}
            </Button>
          </Card>

          {/* Scheduled list */}
          <div className="mt-4 space-y-2">
            <h3 className="font-display text-sm font-bold">Scheduled Notifications</h3>
            {scheduledNotifs.length === 0 && <p className="text-xs text-muted-foreground">No scheduled notifications</p>}
            {scheduledNotifs.map((n: any) => (
              <Card key={n.id} className="glass-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate">{n.title}</p>
                      {n.is_sent ? (
                        <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary"><CheckCircle2 className="h-3 w-3 mr-0.5" /> Sent</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px]"><Clock className="h-3 w-3 mr-0.5" /> Pending</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground/50">
                        {n.scheduled_at ? format(new Date(n.scheduled_at), "dd MMM h:mm a") : ""}
                      </span>
                      <Badge variant="secondary" className="text-[9px]">
                        <Users className="h-2.5 w-2.5 mr-0.5" /> {SEGMENTS.find(s => s.value === n.target_segment)?.label || n.target_segment}
                      </Badge>
                    </div>
                  </div>
                  {!n.is_sent && (
                    <Button variant="ghost" size="sm" className="text-destructive text-xs h-7"
                      onClick={() => deleteScheduled.mutate(n.id)}>Cancel</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ───── HISTORY TAB ───── */}
        <TabsContent value="history">
          <div className="space-y-2">
            {sentNotifs.map((n: any) => (
              <Card key={n.id} className="glass-card p-3">
                <div className="flex items-start gap-3">
                  <Bell className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">{n.created_at ? format(new Date(n.created_at), "dd MMM h:mm a") : ""}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminNotifications;
