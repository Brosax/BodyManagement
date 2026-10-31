import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { pushSubscriptions } from "@/lib/schema";

const schema = z.object({
  personId: z.number().int().positive(),
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  const { personId, endpoint, keys } = parsed.data;
  await getDb()
    .insert(pushSubscriptions)
    .values({ personId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        personId,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });
  return NextResponse.json({ ok: true });
}
