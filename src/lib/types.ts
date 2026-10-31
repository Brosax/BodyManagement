export type Person = {
  id: number;
  name: string;
  dailyCalorieTarget: number;
  notifyEnabled: boolean;
  reminderTime?: string | null; // 蛋白粉提醒时间，马德里 HH:MM
  proteinServingG: number; // 每次蛋白粉克数
  proteinKcalPer100G: number; // 蛋白粉每100g热量
  proteinProteinPer100G: number; // 蛋白粉每100g蛋白质
  heightCm?: number | null; // 身高 cm
  age?: number | null; // 年龄
  sex?: "male" | "female" | null; // 性别
  activityLevel?:
    | "sedentary"
    | "light"
    | "moderate"
    | "high"
    | null; // 日常活动量
  goal?: "cut" | "maintain" | "bulk" | null; // 目标：减脂/维持/增肌
};

export type FoodEntry = {
  id: number;
  personId: number;
  date: string;
  mealType: string;
  name: string;
  calories: number;
  source: string; // manual | ai
  aiNote?: string | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  hasPhoto?: boolean;
  createdAt?: string;
};

export type TrainingLog = {
  id: number;
  personId: number;
  date: string;
  planWeekday: number | null;
  content: string;
  createdAt: string;
};

export type WeightEntry = {
  id: number;
  personId: number;
  date: string;
  weightKg: number;
};

/** 单个动作某天的一组重量记录 */
export type ExerciseSetGroup = {
  exerciseName: string;
  sets: { setIndex: number; reps: number; weightKg: number }[];
};
