# 设计文档：AI 识别营养素扩展（三大宏量）

日期：2026-08-23
状态：已批准

## 1. 目标

食物 AI 拍照识别在「名称 + 热量 + 估算说明」之外，增加三大宏量营养素估算：蛋白质、碳水化合物、脂肪（整数克）。手动添加的记录也可选填营养素。吃页展示单条与当日合计。

## 2. 非目标

- 微量营养素（钠、纤维、糖等）——已确认不做
- 营养素的历史趋势图、目标达成度分析
- 热量与宏量的换算交叉校验（视觉估算误差大，强校验会误杀合理结果）

## 3. 数据层

`food_entries` 新增三个可空列（drizzle 迁移）：

```
protein_g   real null   蛋白质，克
carbs_g     real null   碳水，克
fat_g       real null   脂肪，克
```

- 旧记录为 NULL，UI 静默隐藏对应内容
- 取消原 spec「非目标：营养素细分」中与本设计冲突的部分

## 4. AI 识别链路

### 4.1 提示词

JSON 返回格式扩展为：

```json
{"name":"食物名","calories":整数千卡,"protein":整克,"carbs":整克,"fat":整克,"note":"一句话说明份量与估算依据"}
```

要求：无法合理估算的营养素填 `null`，不要编造精确数字。

### 4.2 解析器 `parseAiFood`（TDD）

返回类型扩展：

```ts
type AiFood = {
  name: string;
  calories: number;
  note: string;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};
```

规则：
- 缺失 / 非数值 / NaN → `null`
- 范围 0–500 克，超出视为无效 → `null`
- 小数四舍五入为整数（视觉估算精度不支持小数）
- **营养素解析失败不影响主结果**：name/calories 校验逻辑不变，识别不因营养素缺失而失败

测试用例新增：完整解析、缺省全 null、非法类型 null、超范围 null、小数取整。

## 5. API

- `POST /api/foods` createSchema 增加可选字段 `proteinG/carbsG/fatG`：`z.number().min(0).max(500).int().optional()`（手动与 AI 共用入口）
- `PATCH /api/foods/[id]` 同样支持三个可选字段
- `GET /api/foods` 返回新字段（null 或数值）
- 字段全部可选 → 旧客户端/旧记录完全兼容

## 6. UI

| 位置 | 展示 |
|---|---|
| FoodForm | 一行三个小输入框：蛋白 / 碳水 / 脂肪（g）。AI 预填可修改；手动模式留空 = 不记录 |
| FoodList 条目 | 名称下方灰色小字 `蛋白12 · 碳水30 · 脂肪8`（仅当至少一项有值时显示；null 项跳过） |
| FoodPhotoViewer | note 下方同样式小字 |
| 吃页汇总卡 | 底部追加当日合计 `P x g · C y g · F z g`（当日任一条目有营养素才显示） |

FoodForm 新增 prefill 字段 `protein/carbs/fat`；提交时空串→不传，非空→校验 0–500 整数（非法给行内错误提示，保留草稿）。

## 7. 测试与验收

- `src/lib/ai.test.ts`：新增营养素解析用例，全部通过
- `npx vitest run && npx tsc --noEmit && npm run lint && npm run build` 全绿
- 手动验证：拍照识别返回三项宏量并可改；手动添加可选填；列表/查看器/汇总卡正确显示；旧记录无营养素无异常

## 8. 决策记录

| 决策 | 选择 |
|---|---|
| 营养素范围 | 三大宏量（蛋白/碳水/脂肪），整数克 |
| 手动录入 | 可选填，留空不记录 |
| 存储 | food_entries 主表加列（一对一） |
| 失败策略 | 营养素解析失败置 null，不影响主识别结果 |
