import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const AdminLayout = () => {
  const { user, loading: authLoading } = useAuth();

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

  // Show loading while auth is initializing or role is being checked
  if (authLoading || (!!user && roleLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="h-10 w-10 rounded-xl mx-auto" />
          <Skeleton className="h-4 w-32 rounded mx-auto" />
          <p className="text-xs text-muted-foreground mt-2">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Only redirect after auth is fully loaded
  if (!user) return <Navigate to="/login" replace />;
  
  // Only redirect after role check is complete
  if (isFetched && !isAdmin) return <Navigate to="/" replace />;
  
  // If role hasn't been fetched yet, keep showing loading
  if (!isFetched) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="h-10 w-10 rounded-xl mx-auto" />
          <Skeleton className="h-4 w-32 rounded mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/30 px-4 sticky top-0 z-30 bg-background/95 backdrop-blur-md">
            <SidebarTrigger className="mr-3" />
            <h2 className="font-display text-lg font-bold tracking-wide">Admin Dashboard</h2>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
