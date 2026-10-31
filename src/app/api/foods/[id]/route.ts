import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { foodEntries } from "@/lib/schema";
import { MEALS } from "@/lib/meals";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  calories: z.number().int().min(0).max(20000).optional(),
  mealType: z.enum(MEALS).optional(),
  proteinG: z.number().int().min(0).max(500).nullable().optional(),
  carbsG: z.number().int().min(0).max(500).nullable().optional(),
  fatG: z.number().int().min(0).max(500).nullable().optional(),
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
    .update(foodEntries)
    .set(parsed.data)
    .where(eq(foodEntries.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  const [row] = await getDb()
    .delete(foodEntries)
    .where(eq(foodEntries.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
