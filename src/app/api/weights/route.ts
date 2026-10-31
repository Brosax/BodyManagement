import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { weights } from "@/lib/schema";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10))
  );
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const personId = Number(sp.get("personId"));
  const days = Number(sp.get("days") ?? "90");
  if (!Number.isInteger(personId) || personId <= 0 || !Number.isFinite(days)) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  const from = addDaysStr(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(
      new Date()
    ),
    -Math.min(Math.max(days, 1), 365)
  );
  const rows = await getDb()
    .select({
      id: weights.id,
      personId: weights.personId,
      date: weights.date,
      weightKg: weights.weightKg,
    })
    .from(weights)
    .where(and(eq(weights.personId, personId), gte(weights.date, from)))
    .orderBy(asc(weights.date));
  return NextResponse.json(rows);
}

const postSchema = z.object({
  personId: z.number().int().positive(),
  date: z.string().regex(DATE_RE),
  weightKg: z.number().min(20).max(500),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "体重需为 20–500 kg" }, { status: 400 });
  }
  const [row] = await getDb()
    .insert(weights)
    .values(parsed.data)
    .onConflictDoUpdate({
      target: [weights.personId, weights.date],
      set: { weightKg: parsed.data.weightKg },
    })
    .returning();
  return NextResponse.json(row);
}
