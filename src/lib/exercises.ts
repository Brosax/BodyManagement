export type ExercisePreset = { name: string; muscle: string };

/** 动作部位分类（记重量选择区的 tab 顺序） */
export const MUSCLE_CATEGORIES = ["胸", "背", "肩", "腿", "手臂", "核心"] as const;

/** 40 个内置动作预设（按部位分类，选动作时的联想与浏览基础列表） */
export const EXERCISE_PRESETS: ExercisePreset[] = [
  // 胸
  { name: "杠铃卧推", muscle: "胸" },
  { name: "上斜哑铃卧推", muscle: "胸" },
  { name: "哑铃飞鸟", muscle: "胸" },
  { name: "双杠臂屈伸", muscle: "胸" },
  { name: "蝴蝶机夹胸", muscle: "胸" },
  { name: "绳索夹胸", muscle: "胸" },
  // 背
  { name: "引体向上", muscle: "背" },
  { name: "高位下拉", muscle: "背" },
  { name: "坐姿划船", muscle: "背" },
  { name: "杠铃划船", muscle: "背" },
  { name: "硬拉", muscle: "背" },
  { name: "单臂哑铃划船", muscle: "背" },
  { name: "T杠划船", muscle: "背" },
  // 肩
  { name: "杠铃推举", muscle: "肩" },
  { name: "哑铃推举", muscle: "肩" },
  { name: "阿诺德推举", muscle: "肩" },
  { name: "哑铃侧平举", muscle: "肩" },
  { name: "面拉", muscle: "肩" },
  { name: "俯身飞鸟", muscle: "肩" },
  // 腿
  { name: "杠铃深蹲", muscle: "腿" },
  { name: "腿举", muscle: "腿" },
  { name: "腿弯举", muscle: "腿" },
  { name: "腿屈伸", muscle: "腿" },
  { name: "罗马尼亚硬拉", muscle: "腿" },
  { name: "保加利亚分腿蹲", muscle: "腿" },
  { name: "箭步蹲", muscle: "腿" },
  { name: "臀推", muscle: "腿" },
  { name: "站姿提踵", muscle: "腿" },
  // 手臂
  { name: "杠铃弯举", muscle: "手臂" },
  { name: "哑铃锤式弯举", muscle: "手臂" },
  { name: "牧师凳弯举", muscle: "手臂" },
  { name: "绳索下压", muscle: "手臂" },
  { name: "仰卧臂屈伸", muscle: "手臂" },
  { name: "窄距卧推", muscle: "手臂" },
  // 核心
  { name: "山羊挺身", muscle: "核心" },
  { name: "农夫行走", muscle: "核心" },
  { name: "卷腹", muscle: "核心" },
  { name: "平板支撑", muscle: "核心" },
  { name: "悬垂举腿", muscle: "核心" },
  { name: "俄罗斯转体", muscle: "核心" },
];

/** 按部位取预设动作名（保持清单顺序） */
export function presetNamesByMuscle(muscle: string): string[] {
  return EXERCISE_PRESETS.filter((p) => p.muscle === muscle).map((p) => p.name);
}

/** 预设动作名 → 部位，未知动作（自定义/历史）返回 null */
export function muscleOf(name: string): string | null {
  return EXERCISE_PRESETS.find((p) => p.name === name)?.muscle ?? null;
}
