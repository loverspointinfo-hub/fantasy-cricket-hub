import { useState, useRef, useCallback, TouchEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface UsePullToRefreshOptions {
  queryKeys: string[][];
  threshold?: number;
  maxPull?: number;
}

export const usePullToRefresh = ({
  queryKeys,
  threshold = 80,
  maxPull = 120,
}: UsePullToRefreshOptions) => {
  const queryClient = useQueryClient();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop <= 0 && !isRefreshing) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [isRefreshing]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      // Apply diminishing pull (rubber band)
      const dampened = Math.min(diff * 0.5, maxPull);
      setPullDistance(dampened);
    }
  }, [maxPull]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6); // Settle to a smaller position
      await Promise.all(
        queryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
      );
      // Brief delay for visual feedback
      await new Promise((r) => setTimeout(r, 400));
      setIsRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, threshold, queryKeys, queryClient]);

  return {
    pullDistance,
    isRefreshing,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
};