import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { exerciseSets } from "@/lib/schema";
import type { ExerciseSetGroup } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function badParams() {
  return NextResponse.json({ error: "参数不合法" }, { status: 400 });
}

/** 把行数组按动作分组，组号升序 */
function groupRows(
  rows: {
    exerciseName: string;
    setIndex: number;
    reps: number;
    weightKg: number;
  }[]
): ExerciseSetGroup[] {
  const map = new Map<string, ExerciseSetGroup>();
  for (const r of rows) {
    let g = map.get(r.exerciseName);
    if (!g) {
      g = { exerciseName: r.exerciseName, sets: [] };
      map.set(r.exerciseName, g);
    }
    g.sets.push({
      setIndex: r.setIndex,
      reps: r.reps,
      weightKg: r.weightKg,
    });
  }
  for (const g of map.values()) g.sets.sort((a, b) => a.setIndex - b.setIndex);
  return [...map.values()];
}

/** 按日查询结构化重量记录 */
export async function GET(req: NextRequest) {
  const personId = Number(req.nextUrl.searchParams.get("personId"));
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!Number.isInteger(personId) || personId <= 0 || !DATE_RE.test(date)) {
    return badParams();
  }
  const rows = await getDb()
    .select({
      exerciseName: exerciseSets.exerciseName,
      setIndex: exerciseSets.setIndex,
      reps: exerciseSets.reps,
      weightKg: exerciseSets.weightKg,
    })
    .from(exerciseSets)
    .where(
      and(eq(exerciseSets.personId, personId), eq(exerciseSets.date, date))
    )
    .orderBy(asc(exerciseSets.id));
  return NextResponse.json(groupRows(rows));
}

const putSchema = z.object({
  personId: z.number().int().positive(),
  date: z.string().regex(DATE_RE),
  exercises: z
    .array(
      z.object({
        exerciseName: z.string().min(1).max(50),
        sets: z
          .array(
            z.object({
              reps: z.number().int().min(1).max(1000),
              weightKg: z.number().min(0).max(1000),
            })
          )
          .min(1)
          .max(20),
      })
    )
    .max(30),
});

/** 批量保存（整体替换当日记录） */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数不合法" },
      { status: 400 }
    );
  }
  const { personId, date, exercises } = parsed.data;
  await getDb().transaction(async (tx) => {
    await tx
      .delete(exerciseSets)
      .where(and(eq(exerciseSets.personId, personId), eq(exerciseSets.date, date)));
    if (exercises.length > 0) {
      await tx.insert(exerciseSets).values(
        exercises.flatMap((e) =>
          e.sets.map((s, i) => ({
            personId,
            date,
            exerciseName: e.exerciseName,
            setIndex: i + 1,
            reps: s.reps,
            weightKg: s.weightKg,
          }))
        )
      );
    }
  });
  return NextResponse.json({ ok: true });
}
