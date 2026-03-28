import { cn } from "@/lib/utils";

interface TeamLogoProps {
  logo?: string | null;
  shortName: string;
  colorClass?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-10 w-10 text-[9px]",
  md: "h-14 w-14 text-lg",
  lg: "h-16 w-16 text-xl",
};

const TeamLogo = ({ logo, shortName, colorClass, size = "md", className }: TeamLogoProps) => {
  if (logo) {
    return (
      <img
        src={logo}
        alt={shortName}
        className={cn("rounded-full object-cover border-2 border-border/30", sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold font-display border-2 border-border/30",
        sizeMap[size],
        className
      )}
      style={{
        background: colorClass?.startsWith("from-")
          ? undefined
          : `linear-gradient(135deg, ${colorClass || "hsl(220, 70%, 50%)"})`,
      }}
    >
      <span className={cn(
        colorClass?.startsWith("from-") ? `bg-gradient-to-br ${colorClass} bg-clip-text text-transparent` : "text-white"
      )}>
        {shortName?.charAt(0)}
      </span>
    </div>
  );
};

export default TeamLogo;
