import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { foodEntries, persons, proteinCheckins } from "@/lib/schema";
import { calcPowderNutrition, powderEntryName } from "@/lib/protein";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseParams(sp: URLSearchParams) {
  const personId = Number(sp.get("personId"));
  const from = sp.get("from");
  const to = sp.get("to");
  if (!Number.isInteger(personId) || personId <= 0) return null;
  return { personId, from, to };
}

/** 查询打卡日期（from/to 可选，缺省查单日 to=from 不传则报错） */
export async function GET(req: NextRequest) {
  const p = parseParams(req.nextUrl.searchParams);
  if (!p) return NextResponse.json({ error: "参数不合法" }, { status: 400 });

  const conds = [eq(proteinCheckins.personId, p.personId)];
  if (p.from && DATE_RE.test(p.from)) {
    conds.push(gte(proteinCheckins.date, p.from));
  }
  if (p.to && DATE_RE.test(p.to)) {
    conds.push(lte(proteinCheckins.date, p.to));
  } else if (!p.to && !p.from) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }

  const rows = await getDb()
    .select({ date: proteinCheckins.date })
    .from(proteinCheckins)
    .where(and(...conds))
    .orderBy(asc(proteinCheckins.date));
  return NextResponse.json(rows.map((r) => r.date));
}

const postSchema = z.object({
  personId: z.number().int().positive(),
  date: z.string().regex(DATE_RE),
  /** 本次冲的克数，不传则用个人默认设置 */
  servingG: z.number().int().min(10).max(500).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  const { personId, date } = parsed.data;

  try {
    await getDb().transaction(async (tx) => {
      // 个人粉配置（每100g营养 + 默认每次克数）
      const [person] = await tx
        .select({
          servingG: persons.proteinServingG,
          kcalPer100G: persons.proteinKcalPer100G,
          proteinPer100G: persons.proteinProteinPer100G,
        })
        .from(persons)
        .where(eq(persons.id, personId));
      if (!person) throw new Error("用户不存在");

      const servingG = parsed.data.servingG ?? person.servingG;
      const nutrition = calcPowderNutrition(servingG, person);

      const [existing] = await tx
        .select({ id: proteinCheckins.id, foodEntryId: proteinCheckins.foodEntryId })
        .from(proteinCheckins)
        .where(
          and(eq(proteinCheckins.personId, personId), eq(proteinCheckins.date, date))
        );

      let foodEntryId = existing?.foodEntryId ?? null;
      if (foodEntryId) {
        // 已有联动记录（改量重打）：更新名称与营养
        await tx
          .update(foodEntries)
          .set({
            name: powderEntryName(servingG),
            calories: nutrition.calories,
            proteinG: nutrition.proteinG,
          })
          .where(eq(foodEntries.id, foodEntryId));
      } else {
        const [entry] = await tx
          .insert(foodEntries)
          .values({
            personId,
            date,
            mealType: "protein",
            name: powderEntryName(servingG),
            calories: nutrition.calories,
            source: "manual",
            proteinG: nutrition.proteinG,
          })
          .returning({ id: foodEntries.id });
        foodEntryId = entry.id;
      }

      if (existing) {
        await tx
          .update(proteinCheckins)
          .set({ checkedAt: new Date(), foodEntryId, servingG })
          .where(eq(proteinCheckins.id, existing.id));
      } else {
        await tx.insert(proteinCheckins).values({
          personId,
          date,
          checkedAt: new Date(),
          foodEntryId,
          servingG,
        });
      }
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "打卡失败" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const personId = Number(sp.get("personId"));
  const date = sp.get("date") ?? "";
  if (!Number.isInteger(personId) || personId <= 0 || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }

  await getDb().transaction(async (tx) => {
    const [row] = await tx
      .select({ id: proteinCheckins.id, foodEntryId: proteinCheckins.foodEntryId })
      .from(proteinCheckins)
      .where(
        and(eq(proteinCheckins.personId, personId), eq(proteinCheckins.date, date))
      );
    if (!row) return;
    // 先删打卡行（解除 food_entry_id 引用），再删联动吃页记录
    await tx.delete(proteinCheckins).where(eq(proteinCheckins.id, row.id));
    if (row.foodEntryId) {
      await tx.delete(foodEntries).where(eq(foodEntries.id, row.foodEntryId));
    }
  });
  return NextResponse.json({ ok: true });
}
