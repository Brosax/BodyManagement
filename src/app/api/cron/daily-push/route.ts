import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import webpush from "web-push";
import { getDb } from "@/lib/db";
import {
  persons,
  proteinCheckins,
  pushSubscriptions,
} from "@/lib/schema";
import { selectPushTargets } from "@/lib/push-select";
import { madridHHMM, todayMadrid } from "@/lib/date-server";

const VAPID_SUBJECT = "mailto:body-management@example.com";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "push not configured" }, { status: 503 });
  }

  const today = todayMadrid();
  const madridNow = madridHHMM();
  const db = getDb();

  const allPersons = await db
    .select({
      id: persons.id,
      notifyEnabled: persons.notifyEnabled,
      reminderTime: persons.reminderTime,
    })
    .from(persons);
  const checkins = await db
    .select({ personId: proteinCheckins.personId })
    .from(proteinCheckins)
    .where(eq(proteinCheckins.date, today));
  const subs = await db
    .select({
      id: pushSubscriptions.id,
      personId: pushSubscriptions.personId,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions);

  const targets = selectPushTargets(
    allPersons,
    new Set(checkins.map((c) => c.personId)),
    subs,
    madridNow
  );

  let sent = 0;
  let cleaned = 0;
  const vapidDetails = {
    subject: VAPID_SUBJECT,
    publicKey,
    privateKey,
  };

  await Promise.all(
    targets.map(async (t) => {
      try {
        await webpush.sendNotification(
          { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
          JSON.stringify({
            title: "蛋白粉时间到啦 💊",
            body: "记得今天的蛋白质哦，点我打卡",
            url: "/",
          }),
          { vapidDetails }
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, t.id));
          cleaned++;
        }
      }
    })
  );

  return NextResponse.json({ date: today, madridNow, sent, cleaned });
}
