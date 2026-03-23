import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShieldCheck, Clock, XCircle, Eye, Download, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { formatIST } from "@/lib/date-utils";
import { sendTelegramNotification } from "@/lib/telegram";

const AdminKYC = () => {
  const qc = useQueryClient();
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const [tab, setTab] = useState("pending");

  const { data: kycList = [], isLoading } = useQuery({
    queryKey: ["admin-kyc"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("kyc_documents" as any) as any)
        .select("*, profile:profiles!kyc_documents_user_id_fkey(username, full_name)")
        .order("submitted_at", { ascending: false });
      if (error) {
        // Fallback: query without join
        const { data: fallback } = await (supabase.from("kyc_documents" as any) as any)
          .select("*").order("submitted_at", { ascending: false });
        return fallback ?? [];
      }
      return data ?? [];
    },
  });

  // Fetch profiles separately to map usernames
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-kyc-profiles"],
    queryFn: async () => {
      const { data } = await (supabase.from("profiles" as any) as any).select("id, username, full_name");
      return data ?? [];
    },
  });

  const getUsername = (userId: string) => {
    const p = profiles.find((p: any) => p.id === userId);
    return p?.username || p?.full_name || userId.slice(0, 8);
  };

  const updateKyc = useMutation({
    mutationFn: async ({ id, status, userId }: { id: string; status: string; userId: string }) => {
      const { error } = await (supabase.from("kyc_documents" as any) as any)
        .update({ status, admin_note: adminNote || null, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // Update profile kyc_status
      await (supabase.from("profiles" as any) as any)
        .update({ kyc_status: status === "verified" ? "verified" : "rejected" })
        .eq("id", userId);

      // Notify via Telegram
      try {
        await sendTelegramNotification("kyc_review", {
          username: getUsername(userId),
          status,
          admin_note: adminNote,
        });
      } catch {}
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-kyc"] });
      setSelectedKyc(null);
      setAdminNote("");
      toast.success("KYC status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = kycList.filter((k: any) => {
    if (tab === "all") return true;
    return k.status === tab;
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-[9px]"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "verified": return <Badge className="bg-primary/15 text-primary border-primary/25 text-[9px]"><ShieldCheck className="h-3 w-3 mr-1" />Verified</Badge>;
      case "rejected": return <Badge className="bg-destructive/15 text-destructive border-destructive/25 text-[9px]"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="secondary" className="text-[9px]">{status}</Badge>;
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">KYC Verification</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="pending">Pending ({kycList.filter((k: any) => k.status === "pending").length})</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No KYC submissions found</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((kyc: any) => (
            <Card key={kyc.id} className="glass-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{getUsername(kyc.user_id)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Submitted: {kyc.submitted_at ? formatIST(kyc.submitted_at, "dd MMM yyyy, hh:mm a") : "—"}
                  </p>
                </div>
                {statusBadge(kyc.status)}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedKyc(kyc); setAdminNote(kyc.admin_note || ""); }}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* KYC Detail Dialog */}
      <Dialog open={!!selectedKyc} onOpenChange={o => { if (!o) setSelectedKyc(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              KYC Review — {selectedKyc && getUsername(selectedKyc.user_id)}
            </DialogTitle>
          </DialogHeader>
          {selectedKyc && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-2">
                {statusBadge(selectedKyc.status)}
                {selectedKyc.reviewed_at && (
                  <span className="text-[10px] text-muted-foreground">
                    Reviewed: {formatIST(selectedKyc.reviewed_at, "dd MMM yyyy, hh:mm a")}
                  </span>
                )}
              </div>

              {/* Document Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "aadhaar_front_url", label: "Aadhaar Front" },
                  { key: "aadhaar_back_url", label: "Aadhaar Back" },
                  { key: "pan_card_url", label: "PAN Card" },
                  { key: "selfie_url", label: "Selfie" },
                ].map(doc => (
                  <div key={doc.key} className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{doc.label}</p>
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-secondary border border-border/30 group">
                      {selectedKyc[doc.key] ? (
                        <>
                          <img src={selectedKyc[doc.key]} alt={doc.label} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="sm" variant="secondary" className="h-7 text-[10px]" onClick={() => window.open(selectedKyc[doc.key], "_blank")}>
                              <Eye className="h-3 w-3 mr-1" /> View
                            </Button>
                            <Button size="sm" variant="secondary" className="h-7 text-[10px]" onClick={() => downloadImage(selectedKyc[doc.key], `${doc.label}.jpg`)}>
                              <Download className="h-3 w-3 mr-1" /> Save
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-xs">Not uploaded</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Admin Note */}
              <div>
                <p className="text-xs font-medium mb-1">Admin Note (visible to user on rejection)</p>
                <Input value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="e.g. Aadhaar image is blurry, please resubmit" />
              </div>

              {/* Action Buttons */}
              {selectedKyc.status === "pending" && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => updateKyc.mutate({ id: selectedKyc.id, status: "rejected", userId: selectedKyc.user_id })}
                    disabled={updateKyc.isPending}
                    className="gap-1"
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                  <Button
                    onClick={() => updateKyc.mutate({ id: selectedKyc.id, status: "verified", userId: selectedKyc.user_id })}
                    disabled={updateKyc.isPending}
                    className="gradient-primary gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminKYC;
