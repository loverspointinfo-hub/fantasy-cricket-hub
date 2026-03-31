import {
  LayoutDashboard, Trophy, Users, Swords, Bell, Wallet, UserCog,
  ChevronLeft, Shield, LogOut, Zap, Settings, ShieldCheck, DollarSign, Upload
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const items = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Matches", url: "/admin/matches", icon: Swords },
  { title: "Players", url: "/admin/players", icon: Users },
  { title: "Contests", url: "/admin/contests", icon: Trophy },
  { title: "Users", url: "/admin/users", icon: UserCog },
  { title: "Wallet / Txns", url: "/admin/wallet", icon: Wallet },
  { title: "Revenue", url: "/admin/revenue", icon: DollarSign },
  { title: "Notifications", url: "/admin/notifications", icon: Bell },
  { title: "Live Scoring", url: "/admin/live-scoring", icon: Zap },
  { title: "KYC Review", url: "/admin/kyc", icon: ShieldCheck },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2 py-1">
              <div className="h-7 w-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                <Shield className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              {!collapsed && (
                <span className="font-display text-xs tracking-widest uppercase font-bold text-gradient">
                  Admin Panel
                </span>
              )}
            </div>
          </SidebarGroupLabel>
          <Separator className="my-2 opacity-20" />
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="hover:bg-primary/5 rounded-xl transition-all duration-200"
                      activeClassName="bg-primary/10 text-primary font-semibold neon-border"
                    >
                      <item.icon className={`mr-2 h-4 w-4 ${isActive(item.url) ? "text-primary" : ""}`} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="space-y-1">
        <Separator className="opacity-20" />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground text-xs hover:text-primary hover:bg-primary/5 rounded-xl"
          onClick={() => navigate("/")}
        >
          <ChevronLeft className="h-4 w-4 mr-1.5" />
          {!collapsed && "Back to App"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
