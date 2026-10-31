import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { foodEntries } from "@/lib/schema";

type Ctx = { params: Promise<{ id: string }> };

/** 返回食物照片（image/jpeg） */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  const [row] = await getDb()
    .select({ photo: foodEntries.photo })
    .from(foodEntries)
    .where(eq(foodEntries.id, id));
  if (!row?.photo) {
    return NextResponse.json({ error: "无照片" }, { status: 404 });
  }
  return new Response(new Uint8Array(row.photo), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
