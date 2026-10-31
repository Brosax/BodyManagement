import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { foodEntries } from "@/lib/schema";
import { MEALS } from "@/lib/meals";
import { decodePhoto } from "@/lib/photo-server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z.object({
  personId: z.number().int().positive(),
  date: z.string().regex(DATE_RE),
  mealType: z.enum(MEALS),
  name: z.string().min(1).max(100),
  calories: z.number().int().min(0).max(20000),
  source: z.enum(["manual", "ai"]).default("manual"),
  photo: z.string().startsWith("data:image/jpeg;base64,").optional(),
  aiNote: z.string().max(500).optional(),
  proteinG: z.number().int().min(0).max(500).optional(),
  carbsG: z.number().int().min(0).max(500).optional(),
  fatG: z.number().int().min(0).max(500).optional(),
});

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const personId = Number(sp.get("personId"));
  const date = sp.get("date") ?? "";
  if (!Number.isInteger(personId) || personId <= 0 || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  const rows = await getDb()
    .select({
      id: foodEntries.id,
      personId: foodEntries.personId,
      date: foodEntries.date,
      mealType: foodEntries.mealType,
      name: foodEntries.name,
      calories: foodEntries.calories,
      source: foodEntries.source,
      aiNote: foodEntries.aiNote,
      proteinG: foodEntries.proteinG,
      carbsG: foodEntries.carbsG,
      fatG: foodEntries.fatG,
      hasPhoto: sql<boolean>`${foodEntries.photo} is not null`,
    })
    .from(foodEntries)
    .where(and(eq(foodEntries.personId, personId), eq(foodEntries.date, date)))
    .orderBy(asc(foodEntries.mealType), asc(foodEntries.id));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数不合法" },
      { status: 400 }
    );
  }
  const [row] = await getDb()
    .insert(foodEntries)
    .values({
      personId: parsed.data.personId,
      date: parsed.data.date,
      mealType: parsed.data.mealType,
      name: parsed.data.name,
      calories: parsed.data.calories,
      source: parsed.data.source,
      aiNote: parsed.data.aiNote ?? null,
      proteinG: parsed.data.proteinG ?? null,
      carbsG: parsed.data.carbsG ?? null,
      fatG: parsed.data.fatG ?? null,
      photo: parsed.data.photo ? decodePhoto(parsed.data.photo) : null,
    })
    .returning({
      id: foodEntries.id,
      personId: foodEntries.personId,
      date: foodEntries.date,
      mealType: foodEntries.mealType,
      name: foodEntries.name,
      calories: foodEntries.calories,
      source: foodEntries.source,
      aiNote: foodEntries.aiNote,
      proteinG: foodEntries.proteinG,
      carbsG: foodEntries.carbsG,
      fatG: foodEntries.fatG,
    });
  return NextResponse.json(row, { status: 201 });
}
