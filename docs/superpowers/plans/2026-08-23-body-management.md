# Body Management PWA 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为两人构建手机端健身记录 PWA：卡路里（手动+AI拍照）、蛋白粉打卡与系统推送、训练计划打卡、体重趋势，部署于 Vercel。

**Architecture:** Next.js 15 App Router 单项目：React 前端 + Route Handler API + Drizzle ORM 访问 Vercel Postgres(Neon)；Web Push 用 web-push 库，Vercel Cron 每日触发；OpenRouter 提供 AI 识图。身份为 localStorage 免登录切换。

**Tech Stack:** Next.js 15 / TypeScript / Tailwind CSS v4 / Drizzle ORM + @neondatabase/serverless / zod / web-push / Vitest

**Spec:** `docs/superpowers/specs/2026-08-23-body-management-design.md`

---

## 约定（所有任务通用）

- 包管理器 npm；Windows + PowerShell 环境
- 每个任务结束必须 `git commit`
- 测试命令统一 `npx vitest run`；类型检查 `npx tsc --noEmit`；lint `npm run lint`
- 日期一律用 `YYYY-MM-DD` 字符串，由**客户端按设备本地时区**生成传给 API；服务端 cron 用固定 Asia/Shanghai 时区计算
- 所有响应 JSON；错误格式 `{ error: string }`

## 文件结构总览

```
src/
  app/
    layout.tsx            根布局+PWA meta
    page.tsx              「今天」Tab
    eat/page.tsx          「吃」Tab
    train/page.tsx        「练」Tab
    weight/page.tsx       「重」Tab
    me/page.tsx           「我」Tab
    api/
      foods/route.ts              饮食 CRUD
      food/ai-analyze/route.ts    AI 识图
      protein/route.ts            蛋白粉打卡查询/写入
      plans/route.ts              训练模板读写
      training-logs/route.ts      训练日志读写
      weights/route.ts            体重读写
      push/subscribe/route.ts     推送订阅保存
      cron/daily-push/route.ts    定时推送
      today/route.ts              首页聚合数据
  components/             TabBar、PersonBadge、卡片等 UI 组件
  lib/
    db.ts                 drizzle 客户端
    schema.ts             7 表定义
    person.ts             身份存取(context)
    date.ts               本地日期工具(含单测)
    ai.ts                 OpenRouter 调用与解析(含单测)
    push-select.ts        推送目标筛选纯函数(含单测)
    image.ts              客户端图片压缩
public/
  manifest.webmanifest  sw.js  icons/
scripts/
  generate-vapid.mjs     VAPID 密钥生成
  seed.mjs               初始化两人数据
vercel.json              cron 配置
```

---

### Task 0: 项目脚手架

**Files:** Create: 项目根（create-next-app）、`public/manifest.webmanifest`、`public/sw.js`(占位)、`vercel.json`、`.gitignore`(自带)

- [ ] **Step 1: 创建 Next.js 应用**

在当前目录初始化（目录已有 docs/，create-next-app 允许非冲突文件）：

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

若拒绝非空目录，则在临时子目录创建后把内容移回根目录再删除子目录。

- [ ] **Step 2: 安装基础依赖**

```bash
npm i @neondatabase/serverless drizzle-orm zod web-push && npm i -D drizzle-kit vitest @types/web-push
```

- [ ] **Step 3: PWA manifest 与注册**

`public/manifest.webmanifest`：

```json
{
  "name": "Body Management",
  "short_name": "Body",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#16a34a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

图标先用任意 192/512 绿色占位 PNG 放入 `public/icons/`（可用 ImageMagick 或从简单脚本生成纯色 PNG）。

`public/sw.js` 占位：

```js
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.registration.update()));
self.addEventListener("push", (e) => {
  const data = (() => { try { return e.data.json(); } catch { return {}; } })();
  e.waitUntil(self.registration.showNotification(data.title || "Body Management", {
    body: data.body || "", data: { url: data.url || "/" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || "/"));
});
```

`src/app/layout.tsx` 的 `<head>` 补充（metadata 导出）：

```tsx
export const metadata: Metadata = {
  title: "Body Management",
  description: "情侣健身记录",
  manifest: "/manifest.webmanifest",
  viewport: { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" },
};
```

`src/components/SwRegister.tsx`（client 组件，挂到 layout）：

```tsx
"use client";
import { useEffect } from "react";
export default function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
  }, []);
  return null;
}
```

- [ ] **Step 4: vercel.json**

```json
{ "crons": [{ "path": "/api/cron/daily-push", "schedule": "0 7 * * *" }] }
```

- [ ] **Step 5: vitest 配置**

`vitest.config.ts`：

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node" } });
```

`package.json` scripts 增加 `"test": "vitest run"`。

- [ ] **Step 6: 构建验证并提交**

Run: `npm run build && npx vitest run` → 均通过
`git add -A && git commit -m "chore: next.js scaffold with pwa shell"`

---

### Task 1: 数据层（schema + 迁移 + 种子）

**Files:** Create: `.env.local`、`drizzle.config.ts`、`scripts/seed.mjs`、`src/lib/db.ts`、`src/lib/schema.ts`

- [ ] **Step 1: schema 定义**

`src/lib/schema.ts`：

```ts
import { pgTable, serial, text, integer, real, timestamp, date, boolean, uniqueIndex } from "drizzle-orm/pg-core";

export const persons = pgTable("persons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dailyCalorieTarget: integer("daily_calorie_target").notNull().default(2000),
  notifyEnabled: boolean("notify_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const foodEntries = pgTable("food_entries", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull().references(() => persons.id),
  date: date("date").notNull(),
  mealType: text("meal_type").notNull(), // breakfast|lunch|dinner|snack
  name: text("name").notNull(),
  calories: integer("calories").notNull(),
  source: text("source").notNull().default("manual"), // manual|ai
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const proteinCheckins = pgTable("protein_checkins", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull().references(() => persons.id),
  date: date("date").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uq: uniqueIndex("uq_protein_person_date").on(t.personId, t.date) }));

export const trainingPlans = pgTable("training_plans", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull().references(() => persons.id),
  weekday: integer("weekday").notNull(), // 1=周一 ... 7=周日
  content: text("content").notNull().default(""),
}, (t) => ({ uq: uniqueIndex("uq_plan_person_weekday").on(t.personId, t.weekday) }));

export const trainingLogs = pgTable("training_logs", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull().references(() => persons.id),
  date: date("date").notNull(),
  planWeekday: integer("plan_weekday"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weights = pgTable("weights", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull().references(() => persons.id),
  date: date("date").notNull(),
  weightKg: real("weight_kg").notNull(),
}, (t) => ({ uq: uniqueIndex("uq_weight_person_date").on(t.personId, t.date) }));

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull().references(() => persons.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uq: uniqueIndex("uq_push_endpoint").on(t.endpoint) }));
```

- [ ] **Step 2: db 客户端**

`drizzle.config.ts`：

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/lib/schema.ts", out: "./drizzle",
  dialect: "postgresql", dbCredentials: { url: process.env.DATABASE_URL! },
});
```

`src/lib/db.ts`：

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
export const db = drizzle(neon(process.env.DATABASE_URL!), { schema });
```

- [ ] **Step 3: 种子脚本与迁移**

`scripts/seed.mjs`：用 `postgres` 包或 `@neondatabase/serverless` 直接连 `DATABASE_URL`，执行 upsert：

```sql
INSERT INTO persons (name, daily_calorie_target) VALUES ($1, $2), ($3, $4)
ON CONFLICT (id) DO NOTHING;
-- 若表为空才插入：先 SELECT count(*) FROM persons
```

名字与目标默认「小明」2100、「小红」1600（可后续在设置页修改）。本地无库时可跳过执行，部署后再跑。

Run: `npx drizzle-kit generate` 生成迁移 SQL（提交 `drizzle/` 目录）；`npx drizzle-kit migrate` 需要真实 DATABASE_URL，本地没有就留待部署后在 Vercel 执行或用线上连接串执行一次。

- [ ] **Step 4: 提交**

`git add -A && git commit -m "feat: drizzle schema for 7 tables"`

---

### Task 2: 日期工具（TDD）

**Files:** Create: `src/lib/date.ts`、`src/lib/date.test.ts`

- [ ] **Step 1: 失败测试**

```ts
import { describe, it, expect } from "vitest";
import { toDateStr, addDays, weekdayOf, formatDateCN } from "./date";

describe("date utils", () => {
  it("toDateStr formats ISO date parts", () => {
    expect(toDateStr(new Date(2026, 7, 3))).toBe("2026-08-03");
  });
  it("addDays crosses months correctly", () => {
    const d = addDays(new Date(2026, 7, 31), 1);
    expect(toDateStr(d)).toBe("2026-09-01");
  });
  it("weekdayOf maps Mon..Sun to 1..7", () => {
    expect(weekdayOf(new Date(2026, 7, 3))).toBe(1);  // 2026-08-03 是周一
    expect(weekdayOf(new Date(2026, 7, 9))).toBe(7);  // 周日
  });
  it("formatDateCN shows month and day", () => {
    expect(formatDateCN("2026-08-23")).toBe("8月23日");
  });
});
```

- [ ] **Step 2: 运行确认失败** — `npx vitest run src/lib/date.test.ts` → FAIL(模块不存在)

- [ ] **Step 3: 实现**

```ts
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
export function weekdayOf(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1; // Mon=1..Sun=7
}
export function formatDateCN(s: string): string {
  const [, m, d] = s.split("-").map(Number);
  return `${m}月${d}日`;
}
```

注意：这些函数基于调用方运行环境的时钟——客户端跑在用户手机上即设备本地时区，符合约定。

- [ ] **Step 4: 测试通过后提交** — `git commit -m "feat: local date utils with tests"`

---

### Task 3: 饮食 API（CRUD）

**Files:** Create: `src/app/api/foods/route.ts`、`src/app/api/foods/[id]/route.ts`

- [ ] **Step 1: 列表+创建 `GET/POST /api/foods?personId=&date=`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { foodEntries } from "@/lib/schema";

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
const createSchema = z.object({
  personId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: z.enum(MEALS),
  name: z.string().min(1).max(100),
  calories: z.number().int().min(0).max(20000),
  source: z.enum(["manual", "ai"]).default("manual"),
});

export async function GET(req: NextRequest) {
  const personId = Number(req.nextUrl.searchParams.get("personId"));
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!personId || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: "bad params" }, { status: 400 });
  const rows = await db.select().from(foodEntries)
    .where(and(eq(foodEntries.personId, personId), eq(foodEntries.date, date)))
    .orderBy(asc(foodEntries.mealType), asc(foodEntries.id));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const [row] = await db.insert(foodEntries).values(parsed.data).returning();
  return NextResponse.json(row, { status: 201 });
}
```

- [ ] **Step 2: 更新+删除 `PATCH/DELETE /api/foods/[id]`**

```ts
const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  calories: z.number().int().min(0).max(20000).optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
});
// PATCH: parse 后 db.update(...).set(parsed.data).where(eq(foodEntries.id, id)).returning()
// DELETE: db.delete(...).where(eq(id)) → 返回 { ok: true }
// id 不存在返回 404
```

- [ ] **Step 3: 类型检查+提交** — `npx tsc --noEmit` 通过；`git commit -m "feat: foods crud api"`

---

### Task 4: 「吃」页面

**Files:** Create: `src/app/eat/page.tsx`、`src/components/FoodList.tsx`、`src/components/FoodForm.tsx`、`src/components/DayNav.tsx`

- [ ] **Step 1: DayNav（前后日切换）**

client 组件：props `{ value: string; onChange(next: string): void }`，内部用 Task 2 的 `addDays/toDateStr/formatDateCN`，显示 `‹ 8月23日 ›`，「未来日期」按钮禁用。

- [ ] **Step 2: FoodList**

client 组件，fetch `/api/foods?personId&date`；按餐次分组渲染（早/午/晚/加餐中文标签映射），每条显示名称+热量+删除按钮（DELETE 后刷新列表），空组显示"未记录"。顶部合计热量 vs 目标进度条（目标来自 `/api/persons` 见 Task 12 前可先硬编码读取 persons 接口，若无则显示合计即可——以实现顺序为准，persons 接口在本任务一并创建亦可）。

- [ ] **Step 3: FoodForm（手动添加）**

餐次选择（四个 chip 按钮，默认按时段推断）+ 名称输入 + 热量数字输入 + 保存按钮；POST 成功后清空并刷新列表；失败保留输入值（草稿不丢）。编辑复用同组件（传入初始值与 id 走 PATCH）。

- [ ] **Step 4: 页面组装**

`eat/page.tsx`：标题栏显示当前日期，DayNav + 合计卡 + FoodList + 底部悬浮「＋添加」按钮弹出 FoodForm（底部抽屉样式）。

- [ ] **Step 5: 手动验证+提交** — `npm run dev` 手机模拟器视图走查增删改查；`git commit -m "feat: eat tab ui"`

---

### Task 5: AI 拍照识别

**Files:** Create: `src/lib/ai.ts`、`src/lib/ai.test.ts`、`src/lib/image.ts`、`src/app/api/food/ai-analyze/route.ts`、`src/components/AiFoodButton.tsx`

- [ ] **Step 1: 解析器 TDD**

`src/lib/ai.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { parseAiFood } from "./ai";

describe("parseAiFood", () => {
  it("parses clean json object", () => {
    expect(parseAiFood('{"name":"番茄炒蛋","calories":320}'))
      .toEqual({ name: "番茄炒蛋", calories: 320 });
  });
  it("extracts json from markdown code fence", () => {
    const s = '好的！识别结果如下：\n```json\n{"name":"米饭","calories":230}\n```';
    expect(parseAiFood(s)).toEqual({ name: "米饭", calories: 230 });
  });
  it("throws on missing fields or bad types", () => {
    expect(() => parseAiFood('{"name":"x"}')).toThrow();
    expect(() => parseAiFood('{"name":"x","calories":"很多"}')).toThrow();
    expect(() => parseAiFood("not json at all")).toThrow();
  });
  it("rounds float calories to int", () => {
    expect(parseAiFood('{"name":"苹果","calories":95.4}').calories).toBe(95);
  });
});
```

`src/lib/ai.ts` 实现：提取第一个 `{...}` 平衡块→JSON.parse→校验 name 非空字符串、calories 数值且 0–5000→`Math.round(calories)`，否则 throw。

- [ ] **Step 2: OpenRouter 调用封装**

```ts
export async function analyzeFoodImage(base64Jpeg: string): Promise<{ name: string; calories: number }> {
  const base = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL,
      max_tokens: 300,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "识别图中食物。若有多样食物请合并估算一份的总热量。只返回JSON：{\"name\":\"食物名\",\"calories\":整数千卡}。" },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Jpeg}` } },
        ],
      }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`ai http ${res.status}`);
  const content = (await res.json()).choices?.[0]?.message?.content ?? "";
  return parseAiFood(content); // route 里 catch 后重试一次
}
```

- [ ] **Step 3: `/api/food/ai-analyze` 路由**

zod 校验 `{ image: z.string().startsWith("data:image/jpeg;base64,") , personId: number }`；调 `analyzeFoodImage`，catch 后重试 1 次；仍失败返回 502 `{ error: "AI 识别失败，请手动填写" }`。

- [ ] **Step 4: 客户端压缩 `src/lib/image.ts`**

`compressImage(file: File): Promise<string>` — createImageBitmap→canvas 缩放至最长边 ≤1024px→`toDataURL("image/jpeg", 0.8)` 返回 base64 data URL。（浏览器 API，不做单测，走手动验证）

- [ ] **Step 5: AiFoodButton 组件**

隐藏 `<input type="file" accept="image/*" capture="environment">`；选中后压缩→弹确认抽屉（预览缩略图+"识别中…" spinner）→成功后把 name/calories 预填进 FoodForm 供修改确认→保存时 source="ai"。

- [ ] **Step 6: 测试+提交** — `npx vitest run` PASS；`git commit -m "feat: ai photo calorie recognition"`

---

### Task 6: 蛋白粉打卡

**Files:** Create: `src/app/api/protein/route.ts`、Modify: `src/app/page.tsx`（打卡区块，Task 12 会重整首页，此任务先做接口+独立组件 `ProteinCard.tsx`）

- [ ] **Step 1: API**

`GET /api/protein?personId=&from=&to=` 返回区间内打卡日期数组（用于月历/连续天数展示）；`POST /api/protein { personId, date }` 用 `ON CONFLICT (person_id, date) DO UPDATE SET checked_at = now()` upsert，返回 `{ ok: true }`；`DELETE /api/protein?personId=&date=` 取消打卡。

- [ ] **Step 2: ProteinCard 组件**

props 当日状态；未打卡显示大按钮「💊 打卡喝蛋白粉」，已打卡显示✅+时间；点击 POST 后更新状态。

- [ ] **Step 3: 提交** — `git commit -m "feat: protein checkin api and card"`

---

### Task 7: 推送基础设施

**Files:** Create: `scripts/generate-vapid.mjs`、`src/app/api/push/subscribe/route.ts`、`src/app/api/me/push-toggle/route.ts`、Modify: `src/app/me/page.tsx`、`public/sw.js`(已就绪)

- [ ] **Step 1: VAPID 生成脚本**

```js
import webpush from "web-push";
const keys = webpush.generateVAPIDKeys();
console.log(JSON.stringify(keys, null, 2));
```

Run: `node scripts/generate-vapid.mjs` → 把输出记入 Vercel 环境变量（本地写 `.env.local`，不入库）。

- [ ] **Step 2: 订阅保存接口**

`POST /api/push/subscribe`：zod 校验 `{ personId, endpoint: url, keys: { p256dh, auth } }`，upsert by endpoint 唯一索引（conflict do update person_id/keys）。

- [ ] **Step 3: 通知开关流程（me 页）**

「开启提醒」按钮 client 逻辑：

```ts
const perm = await Notification.requestPermission();
if (perm !== "granted") alert("需要通知权限才能提醒");
const reg = await navigator.serviceWorker.ready;
const sub = await reg.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
});
await fetch("/api/push/subscribe", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ personId, ...sub.toJSON() }) });
```

同时 PATCH `/api/me/push-toggle { personId, enabled }` 写 persons.notifyEnabled。`urlBase64ToUint8Array` 工具放 `src/lib/push-client.ts`。iOS 要求已添加主屏幕，验收清单注明。

- [ ] **Step 4: 提交** — `git commit -m "feat: web push subscribe and settings toggle"`

---

### Task 8: Cron 定时推送

**Files:** Create: `src/lib/push-select.ts`、`src/lib/push-select.test.ts`、`src/app/api/cron/daily-push/route.ts`；Modify: `src/lib/db.ts`（导出带 node-postgres 兼容的推送辅助或直接在 route 内建 client）

- [ ] **Step 1: 目标筛选 TDD**

```ts
import { describe, it, expect } from "vitest";
import { selectPushTargets } from "./push-select";

describe("selectPushTargets", () => {
  const subs = [
    { personId: 1, endpoint: "a" }, { personId: 2, endpoint: "b" },
  ];
  it("targets enabled persons without checkin who have subscriptions", () => {
    const persons = [
      { id: 1, notifyEnabled: true }, { id: 2, notifyEnabled: false }, { id: 3, notifyEnabled: true },
    ];
    const checkedIn = [new Set([2])]; // 无关数据形状见实现签名
    expect(selectPushTargets(persons, new Set([2]), subs)).toEqual([{ personId: 1, endpoint: "a" }]);
  });
});
```

（测试代码以上述语义为准编写，签名：`selectPushTargets(persons: {id:number; notifyEnabled:boolean}[], checkedInIds: Set<number>, subs: {personId:number; endpoint:string}[])` → 返回需发送的订阅数组；多设备同人去重为多条但同一人只发其名下订阅。）实际编写时修正 import 为 `vitest` 并覆盖：未开启者排除、已打卡者排除、无人订阅者跳过。

- [ ] **Step 2: 发送逻辑**

route handler：`Authorization: Bearer ${CRON_SECRET}` 不符返回 403。用 Asia/Shanghai 计算"今天"字符串（`new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date())` 即 YYYY-MM-DD）→ 查询三张表 → `selectPushTargets` → 对每个目标用 `webpush.sendNotification(sub, JSON.stringify({ title: "蛋白粉时间到啦 💊", body: "记得今天的蛋白质哦", url: "/" }), { vapidDetails: {...} })`；catch 中 `e.statusCode === 404 || 410` 时删除该订阅。返回 `{ sent: n, cleaned: m }`。

注意：neon-http driver 可满足查询；web-push 发送是普通 fetch 无需额外驱动。

- [ ] **Step 3: 测试+提交** — `npx vitest run` PASS；`git commit -m "feat: daily protein push cron"`

---

### Task 9: 训练周模板

**Files:** Create: `src/app/api/plans/route.ts`、Modify: `src/app/train/page.tsx`、Create: `src/components/WeekPlanEditor.tsx`

- [ ] **Step 1: API**

`GET /api/plans?personId=` 返回该人 7 行（不足则视为空串）；`PUT /api/plans { personId, weekday, content }` upsert（唯一索引 conflict do update）。

- [ ] **Step 2: WeekPlanEditor**

周一~周日 7 个折叠块，点开是多行 textarea（placeholder 示例：`卧推 4×8×50kg\n绳索下压 3×12×25kg`），失焦或点保存时 PUT。今天对应项高亮。

- [ ] **Step 3: 提交** — `git commit -m "feat: weekly plan template editor"`

---

### Task 10: 训练打卡与历史

**Files:** Create: `src/app/api/training-logs/route.ts`、`src/components/TrainToday.tsx`、Modify: `train/page.tsx`

- [ ] **Step 1: API**

`GET /api/training-logs?personId=&limit=30` 按日期倒序；`POST { personId, date, content, planWeekday? }`；`DELETE /api/training-logs/[id]`。

- [ ] **Step 2: TrainToday**

读当日模板（Task 9 接口）：有内容显示模板文本+「✅ 完成打卡」按钮（POST 带 planWeekday）；下方「自由记录」入口（textarea 直接提交，不带 planWeekday）；历史列表按日期分组倒序展示，可删。

- [ ] **Step 3: 提交** — `git commit -m "feat: training checkin and history"`

---

### Task 11: 体重与趋势

**Files:** Create: `src/app/api/weights/route.ts`、`src/components/WeightChart.tsx`、Modify: `weight/page.tsx`

- [ ] **Step 1: API**

`GET /api/weights?personId=&days=90` 升序返回；`POST { personId, date, weightKg(20..300, 一位小数) }` upsert（同日覆盖）。

- [ ] **Step 2: WeightChart**

纯 SVG 折线（无第三方图表库）：viewBox 按 90 天窗口等距布点，y 轴自适应 min-max 加 padding，末尾标注最新数值；数据 <2 条显示提示"再记录一天就能看趋势啦"。

- [ ] **Step 3: 录入 UI**

今日体重快捷输入（数字键盘 input）+ 提交；下方趋势图。

- [ ] **Step 4: 提交** — `git commit -m "feat: weight log and trend chart"`

---

### Task 12: 「今天」首页整合

**Files:** Create: `src/app/api/today/route.ts`、`src/app/api/persons/route.ts`；Modify: `src/app/page.tsx`

- [ ] **Step 1: persons API**

`GET /api/persons` 全量返回（两人小应用无需鉴权过滤）；`PATCH /api/persons/[id]` 改 `dailyCalorieTarget` / `notifyEnabled`。

- [ ] **Step 2: today 聚合接口**

`GET /api/today?personId=&date=` 一次返回：`{ calorieSum, calorieTarget, proteinChecked, planContent, lastWeightDate, latestWeight }`（并行 4 个查询）。

- [ ] **Step 3: 首页组装**

四张状态卡（摄入进度条 / 蛋白粉状态+打卡 / 今日计划+去打卡链接 / 体重提醒"距上次称重 N 天"）+ 右上角 PersonBadge 切换（切换后全站数据源随 context 刷新）。空状态文案齐备。

- [ ] **Step 4: 提交** — `git commit -m "feat: today dashboard aggregation"`

---

### Task 13: 收尾

**Files:** Modify: 各处空态/错误态；Create: `README.md`

- [ ] **Step 1: 错误与空态巡检** — 所有 fetch 失败显示内联错误+重试按钮；提交失败保留草稿；loading skeleton。
- [ ] **Step 2: README 部署指南** — GitHub 推送、Vercel 导入、创建 Vercel Postgres、环境变量清单（spec 第 3 节）、`node scripts/generate-vapid.mjs`、seed 执行、cron 说明、手机安装步骤。
- [ ] **Step 3: 手动验收清单** — 写入 `docs/superpowers/checklists/manual-acceptance.md`：双人身份切换、饮食增删改、AI 拍照（含失败回退）、蛋白粉打卡、iOS/Android 添加主屏、通知授权与收到推送、体重录入与曲线、弱网表现。
- [ ] **Step 4: 最终验证** — `npm run build && npx vitest run && npx tsc --noEmit` 全绿；`git commit -m "chore: polish, docs and acceptance checklist"`

---

## Self-Review 记录

- **Spec coverage**: 卡路里(T3/T4/T5)、蛋白粉(T6/T7/T8)、训练(T9/T10)、体重(T11)、身份(T2/T12)、首页(T12)、PWA/推送(T0/T7)、错误处理(T13+各任务内)、部署文档(T13) —— spec 第 5/6/7/8/10 节全部有对应任务 ✓
- **Placeholder scan**: Task 3 Step2、Task 8 Step1 的测试语义已给完整签名与断言说明；无 TBD/TODO ✓
- **Type consistency**: `selectPushTargets(persons, checkedInIds, subs)` 在 Step1 与 Step2 一致；`analyzeFoodImage(base64)` 返回 `{name, calories}` 与路由消费一致；schema 字段名与各 API 引用一致 ✓
