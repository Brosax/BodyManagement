import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { foodEntries } from "@/lib/schema";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 区间内每日热量合计（日历格子用） */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const personId = Number(sp.get("personId"));
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  if (
    !Number.isInteger(personId) ||
    personId <= 0 ||
    !DATE_RE.test(from) ||
    !DATE_RE.test(to) ||
    from > to
  ) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  const rows = await getDb()
    .select({
      date: foodEntries.date,
      total: sql<number>`coalesce(sum(${foodEntries.calories}), 0)::int`,
    })
    .from(foodEntries)
    .where(
      and(
        eq(foodEntries.personId, personId),
        gte(foodEntries.date, from),
        lte(foodEntries.date, to)
      )
    )
    .groupBy(foodEntries.date)
    .orderBy(asc(foodEntries.date));
  return NextResponse.json(rows);
}
