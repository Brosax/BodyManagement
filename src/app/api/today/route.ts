import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  foodEntries,
  persons,
  proteinCheckins,
  trainingLogs,
  trainingPlans,
  weights,
} from "@/lib/schema";
import { nextSplitPosition, SPLIT_COUNT } from "@/lib/split";
import { computeHealthStats, type BodyProfile } from "@/lib/body";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const personId = Number(sp.get("personId"));
  const date = sp.get("date") ?? "";
  if (!Number.isInteger(personId) || personId <= 0 || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }

  const db = getDb();

  const [person] = await db
    .select({
      id: persons.id,
      dailyCalorieTarget: persons.dailyCalorieTarget,
      heightCm: persons.heightCm,
      age: persons.age,
      sex: persons.sex,
      activityLevel: persons.activityLevel,
      goal: persons.goal,
    })
    .from(persons)
    .where(eq(persons.id, personId));
  if (!person) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  const [calRow] = await db
    .select({
      sum: sql<number>`coalesce(sum(${foodEntries.calories}), 0)::int`,
      proteinG: sql<number>`coalesce(sum(${foodEntries.proteinG}), 0)::float`,
      carbsG: sql<number>`coalesce(sum(${foodEntries.carbsG}), 0)::float`,
      fatG: sql<number>`coalesce(sum(${foodEntries.fatG}), 0)::float`,
    })
    .from(foodEntries)
    .where(and(eq(foodEntries.personId, personId), eq(foodEntries.date, date)));

  const [protein] = await db
    .select({ id: proteinCheckins.id })
    .from(proteinCheckins)
    .where(
      and(
        eq(proteinCheckins.personId, personId),
        eq(proteinCheckins.date, date)
      )
    );

  /** 四分循环：由最近一次计划打卡推导下一个位次，再取该位次的模板内容 */
  const logs = await db
    .select({
      date: trainingLogs.date,
      id: trainingLogs.id,
      planWeekday: trainingLogs.planWeekday,
    })
    .from(trainingLogs)
    .where(eq(trainingLogs.personId, personId))
    .orderBy(desc(trainingLogs.date), desc(trainingLogs.id))
    .limit(120);
  const nextPos = nextSplitPosition(logs);
  const [plan] = await db
    .select({ content: trainingPlans.content })
    .from(trainingPlans)
    .where(eq(trainingPlans.weekday, nextPos));

  const [lastWeight] = await db
    .select({ date: weights.date, weightKg: weights.weightKg })
    .from(weights)
    .where(eq(weights.personId, personId))
    .orderBy(desc(weights.date))
    .limit(1);

  /** 身体信息齐全时计算 BMI/BMR/TDEE 与宏量建议 */
  const profile: BodyProfile = {
    heightCm: person.heightCm,
    age: person.age,
    sex: (person.sex as BodyProfile["sex"]) ?? null,
    activityLevel: (person.activityLevel as BodyProfile["activityLevel"]) ?? null,
    goal: (person.goal as BodyProfile["goal"]) ?? null,
  };
  const health = computeHealthStats(profile, lastWeight?.weightKg ?? null);

  return NextResponse.json({
    calorieSum: calRow?.sum ?? 0,
    calorieTarget: person.dailyCalorieTarget,
    proteinChecked: Boolean(protein),
    planContent: plan?.content ?? "",
    planPosition: nextPos,
    planTotal: SPLIT_COUNT,
    lastWeightDate: lastWeight?.date ?? null,
    latestWeight: lastWeight?.weightKg ?? null,
    todayMacros: {
      proteinG: Math.round(calRow?.proteinG ?? 0),
      carbsG: Math.round(calRow?.carbsG ?? 0),
      fatG: Math.round(calRow?.fatG ?? 0),
    },
    profile,
    health,
  });
}
