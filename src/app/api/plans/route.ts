import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { trainingPlans } from "@/lib/schema";
import { SPLIT_COUNT } from "@/lib/split";

/** weekday 列存训练位次 1–4；计划两人共用，不按人区分 */
const SLOT_OK = z.number().int().min(1).max(SPLIT_COUNT);

export async function GET() {
  const rows = await getDb()
    .select()
    .from(trainingPlans)
    .orderBy(asc(trainingPlans.weekday));
  return NextResponse.json(rows);
}

const putSchema = z.object({
  weekday: SLOT_OK,
  content: z.string().max(5000),
});

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数不合法" },
      { status: 400 }
    );
  }
  const [row] = await getDb()
    .insert(trainingPlans)
    .values(parsed.data)
    .onConflictDoUpdate({
      target: trainingPlans.weekday,
      set: { content: parsed.data.content },
    })
    .returning();
  return NextResponse.json(row);
}
