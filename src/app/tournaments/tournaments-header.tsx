"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/Button";

export function TournamentsHeader() {
  const { data: session } = authClient.useSession();

  return (
    <Link href={session ? "/tournaments/new" : "/auth/signin"} className="shrink-0">
      <Button size="sm" variant="secondary">
        <Plus size={16} />
        New
      </Button>
    </Link>
  );
}
