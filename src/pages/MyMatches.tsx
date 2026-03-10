import { Trophy, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

const MyMatches = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="floating-orb w-64 h-64 bg-neon-green -top-10 -left-10" />
      <div className="floating-orb w-48 h-48 bg-neon-cyan bottom-40 right-0" style={{ animationDelay: "3s" }} />

      <header className="sticky top-0 z-40 border-b border-border/30" style={{
        background: "linear-gradient(180deg, hsl(228 18% 5% / 0.95), hsl(228 18% 5% / 0.8))",
        backdropFilter: "blur(20px)",
      }}>
        <div className="mx-auto max-w-lg px-4 py-3">
          <h1 className="font-display text-xl font-bold">My Matches</h1>
        </div>
      </header>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-lg flex flex-col items-center justify-center py-24 px-4 relative z-10"
      >
        <motion.div variants={item} className="relative mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary">
            <Gamepad2 className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <div className="absolute inset-0 rounded-3xl blur-xl bg-primary/10" />
        </motion.div>
        <motion.p variants={item} className="font-display text-lg font-bold text-muted-foreground">
          No Matches Yet
        </motion.p>
        <motion.p variants={item} className="text-xs text-muted-foreground/60 mt-1 text-center max-w-[200px]">
          Join a contest in an upcoming match to see your entries here
        </motion.p>
        <motion.div variants={item} whileTap={{ scale: 0.95 }} className="mt-5">
          <Button
            onClick={() => navigate("/")}
            className="gradient-primary font-bold rounded-xl px-8 h-11"
          >
            <Trophy className="h-4 w-4 mr-2" /> Browse Matches
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default MyMatches;
