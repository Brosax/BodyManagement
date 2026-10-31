import pg from "pg";

const DEFAULTS = [
  { name: "小明", calories: 2100 },
  { name: "小红", calories: 1600 },
];

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows } = await client.query("SELECT count(*)::int AS count FROM persons");
  if (rows[0].count > 0) {
    console.log(`persons 表已有 ${rows[0].count} 条数据，跳过种子。`);
    await client.end();
    return;
  }
  for (const p of DEFAULTS) {
    await client.query(
      "INSERT INTO persons (name, daily_calorie_target) VALUES ($1, $2)",
      [p.name, p.calories]
    );
    console.log(`已插入: ${p.name} (目标 ${p.calories} kcal)`);
  }
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
