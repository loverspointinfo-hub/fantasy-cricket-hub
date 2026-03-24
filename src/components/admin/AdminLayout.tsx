import { Outlet, Navigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/matches": "Match Management",
  "/admin/players": "Player Database",
  "/admin/contests": "Contest Management",
  "/admin/users": "User Management",
  "/admin/wallet": "Wallet & Transactions",
  "/admin/notifications": "Notifications",
  "/admin/live-scoring": "Live Scoring",
  "/admin/kyc": "KYC Verification",
  "/admin/settings": "Site Settings",
};

const AdminLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: isAdmin, isLoading: roleLoading, isFetched } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      if (error) {
        console.error("Admin role check failed:", error);
        return false;
      }
      return data as boolean;
    },
    enabled: !!user,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  if (authLoading || (!!user && roleLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background gradient-mesh">
        <div className="space-y-4 text-center">
          <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mx-auto animate-pulse">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <Skeleton className="h-4 w-32 rounded mx-auto" />
          <p className="text-xs text-muted-foreground mt-2">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (isFetched && !isAdmin) return <Navigate to="/" replace />;
  if (!isFetched) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Skeleton className="h-10 w-10 rounded-xl mx-auto" />
      </div>
    );
  }

  const currentTitle = pageTitles[location.pathname] || "Admin";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/20 px-4 sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hover:bg-muted/50" />
              <div className="hidden sm:block h-5 w-px bg-border/40" />
              <div className="hidden sm:block">
                <h2 className="font-display text-sm font-bold tracking-wide">{currentTitle}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 relative"
                onClick={() => navigate("/admin/notifications")}
              >
                <Bell className="h-4 w-4" />
              </Button>
              <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                A
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto gradient-mesh">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
