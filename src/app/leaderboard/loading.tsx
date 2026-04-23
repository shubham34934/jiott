import { Loader2 } from "lucide-react";

export default function LeaderboardLoading() {
  return (
    <div
      className="flex min-h-[70vh] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2
          size={32}
          className="animate-spin text-primary"
          aria-hidden
        />
        <p className="text-sm font-medium text-neutral">
          Loading leaderboard...
        </p>
      </div>
    </div>
  );
}
