"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/Button";

export function TournamentsHeader() {
  const { data: session } = useSession();

  return (
    <Link href={session ? "/tournaments/new" : "/auth/signin"} className="shrink-0">
      <Button size="sm" variant="secondary">
        <Plus size={16} />
        New
      </Button>
    </Link>
  );
}
