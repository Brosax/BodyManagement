import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { trainingLogs } from "@/lib/schema";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const personId = Number(req.nextUrl.searchParams.get("personId"));
  if (!Number.isInteger(personId) || personId <= 0) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  const rows = await getDb()
    .select()
    .from(trainingLogs)
    .where(eq(trainingLogs.personId, personId))
    .orderBy(desc(trainingLogs.date), desc(trainingLogs.id))
    .limit(60);
  return NextResponse.json(rows);
}

const postSchema = z.object({
  personId: z.number().int().positive(),
  date: z.string().regex(DATE_RE),
  content: z.string().min(1).max(5000),
  planWeekday: z.number().int().min(1).max(7).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数不合法" },
      { status: 400 }
    );
  }
  const [row] = await getDb()
    .insert(trainingLogs)
    .values({ ...parsed.data, planWeekday: parsed.data.planWeekday ?? null })
    .returning();
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  await getDb().delete(trainingLogs).where(eq(trainingLogs.id, id));
  return NextResponse.json({ ok: true });
}
