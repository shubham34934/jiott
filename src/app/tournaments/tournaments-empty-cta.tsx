"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/Button";

export function TournamentsEmptyCta() {
  const { data: session } = useSession();

  return (
    <Link href={session ? "/tournaments/new" : "/auth/signin"}>
      <Button fullWidth>Create tournament</Button>
    </Link>
  );
}
