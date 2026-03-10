import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, Shield, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-4">
        <User className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">Sign in to view your profile</p>
        <Button onClick={() => navigate("/login")} className="gradient-primary font-semibold">
          Sign In
        </Button>
      </div>
    );
  }

  const username = user.user_metadata?.username || "Player";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass-card rounded-none border-x-0 border-t-0 px-4 py-3">
        <div className="mx-auto max-w-lg">
          <h1 className="font-display text-lg font-bold tracking-wider">Profile</h1>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {/* User Card */}
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary">
            <span className="font-display text-xl font-bold text-primary-foreground">
              {username[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-lg">{username}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary text-xs">
            <Shield className="mr-1 h-3 w-3" /> Unverified
          </Badge>
        </div>

        {/* Menu Items */}
        {[
          { label: "KYC Verification", desc: "Complete to enable withdrawals" },
          { label: "Transaction History", desc: "View all deposits & withdrawals" },
          { label: "My Referrals", desc: "Invite friends & earn bonus" },
          { label: "Help & Support", desc: "FAQs and contact us" },
        ].map((item) => (
          <div key={item.label} className="glass-card-hover flex items-center justify-between p-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Profile;
