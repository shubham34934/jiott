"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export interface TournamentListCardProps {
  href: string;
  title: string;
  /** When set, shows draft / in progress / completed badge like the tournaments list. */
  status?: string;
  /** Primary subtitle (format, counts, placement, etc.). */
  meta: string;
  /** Optional accent line (e.g. list page champion). */
  highlight?: string | null;
}

/**
 * Shared row card for tournament lists (global list + player profile).
 */
export function TournamentListCard({
  href,
  title,
  status,
  meta,
  highlight,
}: TournamentListCardProps) {
  return (
    <Link href={href} className="block w-full">
      <div className="bg-surface rounded-xl border border-border p-4 flex items-center gap-3 active:scale-[0.99] transition-transform">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-sm text-text-primary truncate">
              {title}
            </p>
            {status ? <StatusBadge status={status} /> : null}
          </div>
          <p className="text-xs text-neutral">{meta}</p>
          {highlight ? (
            <p className="text-xs font-medium text-success mt-2">{highlight}</p>
          ) : null}
        </div>
        <ChevronRight
          size={20}
          className="text-neutral shrink-0"
          aria-hidden
        />
      </div>
    </Link>
  );
}
