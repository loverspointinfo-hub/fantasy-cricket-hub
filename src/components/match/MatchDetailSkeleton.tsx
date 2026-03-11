import { Skeleton } from "@/components/ui/skeleton";

export const MatchCardSkeleton = () => (
  <div className="relative rounded-3xl overflow-hidden p-5"
    style={{
      background: "linear-gradient(160deg, hsl(228 16% 12% / 0.95), hsl(228 20% 6% / 0.9))",
      border: "1px solid hsl(228 12% 18% / 0.4)",
    }}
  >
    <div className="flex items-center justify-between">
      <div className="flex flex-col items-center flex-1 gap-2">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <Skeleton className="h-4 w-16 rounded-lg" />
      </div>
      <div className="flex flex-col items-center gap-1.5 mx-2">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-3 w-12 rounded" />
      </div>
      <div className="flex flex-col items-center flex-1 gap-2">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <Skeleton className="h-4 w-16 rounded-lg" />
      </div>
    </div>
    <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/10">
      <Skeleton className="h-3 w-28 rounded" />
      <Skeleton className="h-3 w-20 rounded" />
    </div>
  </div>
);

export const ContestCardSkeleton = () => (
  <div className="rounded-2xl overflow-hidden"
    style={{
      background: "linear-gradient(145deg, hsl(228 16% 10% / 0.9), hsl(228 20% 6% / 0.8))",
      border: "1px solid hsl(228 12% 18% / 0.4)",
    }}
  >
    <div className="px-4 pt-4 pb-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full" />
    </div>
    <div className="px-4 pb-3">
      <div className="flex items-end justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-14 rounded" />
          <Skeleton className="h-7 w-24 rounded-lg" />
        </div>
        <div className="space-y-1.5 flex flex-col items-end">
          <Skeleton className="h-2.5 w-10 rounded" />
          <Skeleton className="h-6 w-14 rounded-lg" />
        </div>
      </div>
    </div>
    <div className="px-4 pb-3">
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex justify-between mt-1.5">
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
    </div>
    <div className="px-4 py-2.5 border-t border-border/10 flex justify-between">
      <Skeleton className="h-3 w-24 rounded" />
      <Skeleton className="h-3 w-16 rounded" />
    </div>
  </div>
);

export const MatchDetailSkeleton = () => (
  <div className="mx-auto max-w-lg px-4 pt-5 pb-24 space-y-5">
    <MatchCardSkeleton />
    <Skeleton className="h-14 w-full rounded-2xl" />
    {/* Contests header */}
    <div className="flex items-center gap-2">
      <Skeleton className="h-5 w-5 rounded" />
      <Skeleton className="h-5 w-24 rounded-lg" />
    </div>
    <div className="space-y-3">
      <ContestCardSkeleton />
      <ContestCardSkeleton />
      <ContestCardSkeleton />
    </div>
  </div>
);