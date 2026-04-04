"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/Button";

export function TournamentsEmptyCta() {
  const { data: session } = authClient.useSession();

  return (
    <Link href={session ? "/tournaments/new" : "/auth/signin"}>
      <Button fullWidth>Create tournament</Button>
    </Link>
  );
}
