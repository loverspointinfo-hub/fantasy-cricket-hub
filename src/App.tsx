import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import MyMatches from "./pages/MyMatches";
import WalletPage from "./pages/WalletPage";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MatchDetail from "./pages/MatchDetail";
import CreateTeam from "./pages/CreateTeam";
import Notifications from "./pages/Notifications";
import ContestLeaderboard from "./pages/ContestLeaderboard";
import PlayerStats from "./pages/PlayerStats";
import Referrals from "./pages/Referrals";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/admin/AdminLayout";

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminMatches = lazy(() => import("./pages/admin/AdminMatches"));
const AdminPlayers = lazy(() => import("./pages/admin/AdminPlayers"));
const AdminContests = lazy(() => import("./pages/admin/AdminContests"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminWallet = lazy(() => import("./pages/admin/AdminWallet"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/my-matches" element={<MyMatches />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/match/:matchId" element={<MatchDetail />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/contest/:contestId/leaderboard" element={<ContestLeaderboard />} />
            <Route path="/player/:playerId" element={<PlayerStats />} />
            <Route path="/referrals" element={<Referrals />} />
            <Route path="/match/:matchId/create-team" element={<CreateTeam />} />
            <Route path="/match/:matchId/edit-team/:teamId" element={<CreateTeam />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Suspense fallback={<div />}><AdminDashboard /></Suspense>} />
            <Route path="matches" element={<Suspense fallback={<div />}><AdminMatches /></Suspense>} />
            <Route path="players" element={<Suspense fallback={<div />}><AdminPlayers /></Suspense>} />
            <Route path="contests" element={<Suspense fallback={<div />}><AdminContests /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<div />}><AdminUsers /></Suspense>} />
            <Route path="wallet" element={<Suspense fallback={<div />}><AdminWallet /></Suspense>} />
            <Route path="notifications" element={<Suspense fallback={<div />}><AdminNotifications /></Suspense>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
