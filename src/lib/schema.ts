import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  date,
  boolean,
  uniqueIndex,
  index,
  customType,
} from "drizzle-orm/pg-core";

/** drizzle-orm 未直接导出 bytea，用 customType 声明 */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const persons = pgTable("persons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dailyCalorieTarget: integer("daily_calorie_target").notNull().default(2000),
  notifyEnabled: boolean("notify_enabled").notNull().default(false),
  reminderTime: text("reminder_time"), // 蛋白粉提醒时间，马德里 HH:MM，NULL=未设置
  proteinServingG: integer("protein_serving_g").notNull().default(30), // 每次蛋白粉克数
  proteinKcalPer100G: integer("protein_kcal_per_100g").notNull().default(400),
  proteinProteinPer100G: integer("protein_protein_per_100g")
    .notNull()
    .default(80),
  // 身体信息（可空 = 未填写，用于计算 BMI/BMR/TDEE 与宏量建议）
  heightCm: real("height_cm"),
  age: integer("age"),
  sex: text("sex"), // male | female
  activityLevel: text("activity_level"), // sedentary | light | moderate | high
  goal: text("goal"), // cut | maintain | bulk
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const foodEntries = pgTable("food_entries", {
  id: serial("id").primaryKey(),
  personId: integer("person_id")
    .notNull()
    .references(() => persons.id),
  date: date("date").notNull(),
  mealType: text("meal_type").notNull(), // breakfast|lunch|dinner|snack|protein
  name: text("name").notNull(),
  calories: integer("calories").notNull(),
  source: text("source").notNull().default("manual"), // manual|ai
  photo: bytea("photo"),
  aiNote: text("ai_note"),
  proteinG: real("protein_g"),
  carbsG: real("carbs_g"),
  fatG: real("fat_g"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const proteinCheckins = pgTable(
  "protein_checkins",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id")
      .notNull()
      .references(() => persons.id),
    date: date("date").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    foodEntryId: integer("food_entry_id").references(() => foodEntries.id), // 打卡联动生成的吃页记录
    servingG: real("serving_g"), // 本次打卡实际冲的克数
  },
  (t) => [uniqueIndex("uq_protein_person_date").on(t.personId, t.date)]
);

/** 四分训练模板（两人共用一份，weekday 列存位次 1–4） */
export const trainingPlans = pgTable(
  "training_plans",
  {
    id: serial("id").primaryKey(),
    weekday: integer("weekday").notNull(), // 位次 1=第1练 ... 4=第4练
    content: text("content").notNull().default(""),
  },
  (t) => [uniqueIndex("uq_plan_weekday").on(t.weekday)]
);

export const trainingLogs = pgTable("training_logs", {
  id: serial("id").primaryKey(),
  personId: integer("person_id")
    .notNull()
    .references(() => persons.id),
  date: date("date").notNull(),
  planWeekday: integer("plan_weekday"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const exerciseSets = pgTable(
  "exercise_sets",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id")
      .notNull()
      .references(() => persons.id),
    date: date("date").notNull(),
    exerciseName: text("exercise_name").notNull(),
    setIndex: integer("set_index").notNull(), // 1-based 组号
    reps: integer("reps").notNull(),
    weightKg: real("weight_kg").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_sets_person_date").on(t.personId, t.date),
    index("ix_sets_person_exercise").on(t.personId, t.exerciseName),
  ]
);

export const weights = pgTable(
  "weights",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id")
      .notNull()
      .references(() => persons.id),
    date: date("date").notNull(),
    weightKg: real("weight_kg").notNull(),
  },
  (t) => [uniqueIndex("uq_weight_person_date").on(t.personId, t.date)]
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id")
      .notNull()
      .references(() => persons.id),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("uq_push_endpoint").on(t.endpoint)]
);
