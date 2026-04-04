import { MatchDetailPageClient } from "./match-detail-client";
import { safeReturnPath } from "@/lib/safe-return-path";

function firstReturnToQuery(
  raw: string | string[] | undefined
): string | null {
  if (raw === undefined) return null;
  if (typeof raw === "string") return raw;
  return typeof raw[0] === "string" ? raw[0] : null;
}

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const returnTo = safeReturnPath(firstReturnToQuery(sp.returnTo));
  return <MatchDetailPageClient id={id} returnTo={returnTo} />;
}
