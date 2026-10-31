/** 蛋白粉营养换算（纯函数，服务端与客户端共用） */

export type PowderConfig = {
  /** 每 100g 热量 kcal */
  kcalPer100G: number;
  /** 每 100g 蛋白质 g */
  proteinPer100G: number;
};

export type PowderNutrition = {
  calories: number;
  proteinG: number;
};

/** 按份量克数换算整份热量/蛋白质（四舍五入取整） */
export function calcPowderNutrition(
  servingG: number,
  config: PowderConfig
): PowderNutrition {
  const factor = servingG / 100;
  return {
    calories: Math.round(factor * config.kcalPer100G),
    proteinG: Math.round(factor * config.proteinPer100G),
  };
}

/** 联动吃页记录的显示名，如「蛋白粉 30g」 */
export function powderEntryName(servingG: number): string {
  return `蛋白粉 ${servingG}g`;
}
