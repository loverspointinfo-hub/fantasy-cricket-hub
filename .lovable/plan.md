

## Fantasy Cricket Platform — Full Build Plan

### Phase 1: Foundation & Auth
- Enable Lovable Cloud (Supabase backend)
- Email/phone signup & login with OTP
- User profile creation with referral code system
- Dark mode with glassmorphic UI theme (neon accents, modern sports aesthetic)
- Responsive layout with bottom navigation (Home, My Matches, Wallet, Profile)

### Phase 2: Match & Player Management (Admin)
- Admin dashboard with role-based access (admin role in separate `user_roles` table)
- Match creation form: teams, date/time, sport, venue, deadline timer
- Player database: name, role (Batsman/Bowler/AR/WK), team, credit value, photo
- Assign players to matches
- Match status management: Upcoming → Live → Completed
- Promotional banner management

### Phase 3: Contest System
- Contest template engine: Mega, Head-to-Head, Practice (free), Winner Takes All
- Entry fee, prize pool, max entries, guaranteed/flexible tags
- Prize pool breakdown & winning zone payout structures
- Private contest creation with shareable invite codes
- Contest listing with filters on match detail page

### Phase 4: Team Creation Engine
- 100-credit budget system with real-time credit tracker
- Role constraints: 1-4 WK, 3-6 BAT, 1-4 AR, 3-6 BOWL (min 11 players)
- Player cards showing credit cost, "Selected By %" stats
- Captain (2x) and Vice-Captain (1.5x) selection screen
- Clone, edit, and create multiple teams per match
- Join contests with created teams

### Phase 5: Tri-Wallet & Payments
- Three-part wallet: Unutilized (deposits), Winnings (withdrawable), Cash Bonus (partial use only)
- Add Cash page (UPI, Card, Netbanking integration — Stripe or Razorpay via edge functions)
- Transaction history with filters
- Withdrawal requests to verified bank accounts
- Bonus usage rules (e.g., max 10% of entry fee from bonus)

### Phase 6: KYC & Compliance
- PAN card upload & verification (manual admin approval initially)
- Bank account verification (name matching)
- Age verification (18+ check)
- TDS calculation on winnings above ₹10,000 (as per Indian tax law)
- KYC status indicators on profile

### Phase 7: Live Match & Scoring
- Admin scoring panel: ball-by-ball manual entry (runs, wickets, catches, etc.)
- Fantasy points calculation engine (configurable point rules per action)
- Real-time leaderboard updates during live matches
- Live points breakdown per player (why they earned each point)
- Simple scorecard view for users

### Phase 8: Second Innings & Pro Features
- Second Innings Fantasy: new team creation window at innings break
- Guru/Expert section: pitch reports, weather info, suggested teams (admin-authored)
- Push notifications for match deadlines, results, and promotions
- Promo code system (WELCOME100, deposit bonuses)
- User ban/suspend functionality in admin

### Phase 9: Admin Analytics & CRM
- Financial dashboard: rake/commission tracking, daily deposits, withdrawals
- User management: search, view profiles, transaction history, match history
- KYC approval queue
- Contest performance analytics
- Daily/weekly active user metrics

### Design Direction
- Dark theme primary with glassmorphic cards
- Neon green/cyan accent colors for live indicators
- Cricket-themed iconography
- Smooth animations on team selection and score updates
- Mobile-first responsive design

