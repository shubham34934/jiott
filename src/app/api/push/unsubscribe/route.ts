import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActor } from "@/lib/get-api-actor";

export async function POST(req: Request) {
  const actor = await getApiActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const endpoint =
    typeof (body as { endpoint?: unknown })?.endpoint === "string"
      ? (body as { endpoint: string }).endpoint
      : "";
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: actor.prismaUserId },
  });

  return NextResponse.json({ ok: true });
}
