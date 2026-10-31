import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { persons } from "@/lib/schema";

const patchSchema = z.object({
  dailyCalorieTarget: z.number().int().min(500).max(10000).optional(),
  notifyEnabled: z.boolean().optional(),
  name: z.string().trim().min(1).max(10).optional(),
  /** 蛋白粉提醒时间，马德里 HH:MM；null=清除 */
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
  /** 每次蛋白粉克数 */
  proteinServingG: z.number().int().min(5).max(500).optional(),
  /** 蛋白粉每100g热量 kcal */
  proteinKcalPer100G: z.number().int().min(100).max(1000).optional(),
  /** 蛋白粉每100g蛋白质 g */
  proteinProteinPer100G: z.number().int().min(20).max(100).optional(),
  /** 身高 cm；null=清除 */
  heightCm: z.number().min(50).max(250).nullable().optional(),
  /** 年龄 */
  age: z.number().int().min(5).max(120).nullable().optional(),
  /** 性别 */
  sex: z.enum(["male", "female"]).nullable().optional(),
  /** 日常活动量 */
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "high"])
    .nullable()
    .optional(),
  /** 目标：减脂/维持/增肌 */
  goal: z.enum(["cut", "maintain", "bulk"]).nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数不合法" },
      { status: 400 }
    );
  }
  const [row] = await getDb()
    .update(persons)
    .set(parsed.data)
    .where(eq(persons.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  return NextResponse.json(row);
}
