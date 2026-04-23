import { NextResponse } from "next/server";
import { getApiActor } from "@/lib/get-api-actor";
import { sendPushToUser } from "@/lib/push";

export async function POST() {
  const actor = await getApiActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendPushToUser(actor.prismaUserId, {
    body: "Push notifications are working.",
    url: "/profile",
  });

  return NextResponse.json(result);
}
