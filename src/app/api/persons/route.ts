import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { persons } from "@/lib/schema";

export async function GET() {
  const rows = await getDb().select().from(persons).orderBy(asc(persons.id));
  return NextResponse.json(rows);
}
