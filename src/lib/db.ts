import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

let instance: ReturnType<typeof create> | null = null;

function create() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  return drizzle(pool, { schema });
}

/** 惰性初始化，避免构建期因缺少 DATABASE_URL 而失败 */
export function getDb() {
  if (!instance) instance = create();
  return instance;
}
