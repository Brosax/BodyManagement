import { NextRequest, NextResponse } from "next/server";
import { desc, eq, ilike, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { exerciseSets } from "@/lib/schema";

/** 历史动作联想词表：按最近使用排序的去重动作名 */
export async function GET(req: NextRequest) {
  const personId = Number(req.nextUrl.searchParams.get("personId"));
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!Number.isInteger(personId) || personId <= 0 || q.length > 50) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  const rows = await getDb()
    .select({
      name: exerciseSets.exerciseName,
      lastDate: sql<string>`max(${exerciseSets.date})`.as("last_date"),
    })
    .from(exerciseSets)
    .where(
      q
        ? sql`${eq(exerciseSets.personId, personId)} and ${ilike(exerciseSets.exerciseName, `%${q}%`)}`
        : eq(exerciseSets.personId, personId)
    )
    .groupBy(exerciseSets.exerciseName)
    .orderBy(desc(sql`max(${exerciseSets.date})`))
    .limit(30);
  return NextResponse.json(rows.map((r) => r.name));
}
