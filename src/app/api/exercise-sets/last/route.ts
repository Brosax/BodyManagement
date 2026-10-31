import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { exerciseSets } from "@/lib/schema";

/** 某动作的最近一次记录（日期 + 各组明细），没有则返回 null */
export async function GET(req: NextRequest) {
  const personId = Number(req.nextUrl.searchParams.get("personId"));
  const exercise = req.nextUrl.searchParams.get("exercise")?.trim() ?? "";
  if (
    !Number.isInteger(personId) ||
    personId <= 0 ||
    !exercise ||
    exercise.length > 50
  ) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  const db = getDb();
  const [latest] = await db
    .selectDistinct({ date: exerciseSets.date })
    .from(exerciseSets)
    .where(
      and(
        eq(exerciseSets.personId, personId),
        eq(exerciseSets.exerciseName, exercise)
      )
    )
    .orderBy(desc(exerciseSets.date))
    .limit(1);
  if (!latest) return NextResponse.json(null);

  const rows = await db
    .select({
      setIndex: exerciseSets.setIndex,
      reps: exerciseSets.reps,
      weightKg: exerciseSets.weightKg,
    })
    .from(exerciseSets)
    .where(
      and(
        eq(exerciseSets.personId, personId),
        eq(exerciseSets.exerciseName, exercise),
        eq(exerciseSets.date, latest.date)
      )
    )
    .orderBy(asc(exerciseSets.setIndex));
  return NextResponse.json({ date: latest.date, sets: rows });
}
