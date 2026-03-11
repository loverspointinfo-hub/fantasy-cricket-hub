import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Bell } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const AdminNotifications = () => {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("general");
  const [targetUser, setTargetUser] = useState("all");

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

  const send = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !message.trim()) throw new Error("Title and message required");
      if (targetUser === "all") {
        // Send to all users
        const userIds = users.map((u: any) => u.id);
        const rows = userIds.map((uid: string) => ({ user_id: uid, title, message, type }));
        if (rows.length === 0) throw new Error("No users found");
        const { error } = await (supabase.from("notifications") as any).insert(rows);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("notifications") as any).insert({ user_id: targetUser, title, message, type });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sent-notifs"] });
      setTitle(""); setMessage(""); setType("general"); setTargetUser("all");
      toast.success("Notification sent!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Send Notification</h1>

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
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Send To</Label>
            <Select value={targetUser} onValueChange={setTargetUser}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.username || u.id.slice(0, 8)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={() => send.mutate()} disabled={send.isPending} className="w-full gap-2">
          <Send className="h-4 w-4" /> {send.isPending ? "Sending..." : "Send Notification"}
        </Button>
      </Card>

      <div>
        <h2 className="font-display text-lg font-bold mb-3">Recent Notifications</h2>
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
      </div>
    </div>
  );
};

export default AdminNotifications;
