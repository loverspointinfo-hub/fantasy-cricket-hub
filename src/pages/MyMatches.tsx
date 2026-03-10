import { Trophy } from "lucide-react";

const MyMatches = () => (
  <div className="min-h-screen">
    <header className="sticky top-0 z-40 glass-card rounded-none border-x-0 border-t-0 px-4 py-3">
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-lg font-bold tracking-wider">My Matches</h1>
      </div>
    </header>
    <div className="mx-auto max-w-lg flex flex-col items-center justify-center py-24 text-muted-foreground">
      <Trophy className="mb-4 h-12 w-12 opacity-20" />
      <p className="text-sm">No matches joined yet</p>
      <p className="text-xs mt-1">Join a contest to get started!</p>
    </div>
  </div>
);

export default MyMatches;
