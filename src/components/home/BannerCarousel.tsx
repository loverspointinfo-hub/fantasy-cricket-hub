import { useState, useEffect, useCallback } from "react";
import { useBanners } from "@/hooks/useBanners";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const BannerCarousel = () => {
  const { data: banners = [] } = useBanners(true);
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [banners.length, next]);

  // Reset index if banners change
  useEffect(() => {
    if (current >= banners.length) setCurrent(0);
  }, [banners.length, current]);

  if (banners.length === 0) return null;

  const banner = banners[current];

  const handleClick = () => {
    if (banner?.hyperlink) {
      window.open(banner.hyperlink, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/20">
      <AnimatePresence mode="wait">
        <motion.div
          key={banner?.id}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          onClick={handleClick}
          className={cn("w-full", banner?.hyperlink && "cursor-pointer")}
        >
          <img
            src={banner?.image_url}
            alt="Promotional banner"
            className="w-full h-36 sm:h-44 object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Dots indicator */}
      {banners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === current
                  ? "w-5 bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
                  : "w-1.5 bg-white/40 hover:bg-white/60"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;
