import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  icon?: LucideIcon;
  showBack?: boolean;
}

const PageHeader = ({ title, icon: Icon, showBack = false }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, hsl(228 20% 6% / 0.98) 0%, hsl(228 18% 8% / 0.95) 50%, hsl(228 16% 6% / 0.98) 100%)",
          backdropFilter: "blur(24px) saturate(1.8)",
        }}
      />

      {/* Sporty diagonal accent */}
      <div
        className="absolute -top-4 -right-8 w-32 h-24 opacity-15"
        style={{
          background: "linear-gradient(135deg, hsl(var(--neon-green)), hsl(var(--neon-cyan)))",
          transform: "skewY(-12deg)",
          borderRadius: "0 0 0 30px",
        }}
      />

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, hsl(var(--neon-green)), hsl(var(--neon-cyan)), hsl(var(--neon-green)))",
          opacity: 0.5,
        }}
      />

      <div className="mx-auto max-w-lg px-4 py-3.5 flex items-center gap-3 relative z-10">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-secondary/80 active:scale-95 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        {Icon && (
          <div
            className="flex h-8 w-8 items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(var(--neon-green) / 0.15), hsl(var(--neon-cyan) / 0.1))",
              clipPath: "polygon(50% 0%, 100% 20%, 100% 80%, 50% 100%, 0% 80%, 0% 20%)",
            }}
          >
            <Icon className="h-4 w-4 text-[hsl(var(--neon-green))]" strokeWidth={2.5} />
          </div>
        )}
        <h1 className="font-display text-xl font-bold tracking-tight">{title}</h1>
      </div>
    </header>
  );
};

export default PageHeader;
