# 设计文档：Body Management 情侣健身记录 PWA

日期：2026-08-23
状态：已批准

## 1. 目标

为两人（用户 + 女朋友）打造手机端 App 式网页应用（PWA）：

1. 记录每日卡路里摄入（按餐/食物分条 + 拍照 AI 识别）
2. 蛋白粉每日打卡 + 真·系统推送提醒
3. 健身训练计划模板 + 打卡记录
4. 体重记录与趋势曲线

部署于 Vercel，两人通过浏览器添加到主屏幕使用。

## 2. 非目标（明确不做）

- 注册/登录体系
- 食物营养数据库搜索、营养素细分（蛋白/碳水/脂肪）展示
- 每人独立的推送时间（Vercel 免费 Cron 每天只能跑一次）
- 动作库、重量进步曲线、PR 纪录等健身房级分析功能

## 3. 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 15（App Router）+ TypeScript |
| UI | Tailwind CSS，自建移动端组件，底部 Tab 导航，中文界面 |
| 数据库 | Vercel Postgres（底层 Neon）+ Drizzle ORM |
| AI | OpenRouter（`https://openrouter.ai/api/v1`，OpenAI 兼容格式），服务端转发调用 |
| 推送 | Web Push（web-push 库）+ Vercel Cron 每日触发 |
| PWA | manifest + 自写 Service Worker（安装 + 收推送） |
| 测试 | Vitest（纯逻辑单元测试） |

### 环境变量

```
DATABASE_URL            Neon Postgres 连接串
OPENROUTER_API_KEY      OpenRouter API Key
OPENROUTER_BASE_URL     默认 https://openrouter.ai/api/v1
AI_MODEL                OpenRouter 模型 ID
VAPID_PUBLIC_KEY        Web Push 公钥
VAPID_PRIVATE_KEY       Web Push 私钥
CRON_SECRET             保护 cron 端点的随机字符串
```

## 4. 身份模型

无注册登录。首次打开弹出身份选择（你 / 女朋友），选择存 localStorage；右上角常驻身份标识，点击可切换。所有数据表带 `person_id`，切换身份即查看/录入对应人的数据。`persons` 表在初始化时写入两条固定数据。

## 5. 页面结构

底部 5 Tab：

- **今天**（默认首页）：卡路里进度 vs 目标、蛋白粉打卡状态、今日训练计划、体重提醒，各带快捷入口
- **吃**：按餐次（早/午/晚/加餐）分组列表；手动添加；拍照识别添加；前后日期切换回顾
- **练**：周模板编辑（7 天自由填写，休息日留空）；今日该练内容 + 打卡；计划外自由记录；历史列表
- **重**：体重录入；SVG 折线趋势图
- **我**：身份切换、每人每日卡路里目标设置、蛋白粉提醒时间展示、通知开关

所有记录支持修改和删除。拍照识别流程：摄像头拍照（`<input type="file" capture>`）→ 端上压缩至约 1000px → 上传 → 显示"识别中" → 返回结果供确认修改 → 保存。

## 6. 数据库设计（7 表）

```
persons             id, name, daily_calorie_target, notify_enabled,
                    created_at
food_entries        id, person_id, date, meal_type(breakfast/lunch/
                    dinner/snack), name, calories, source(manual/ai),
                    created_at
protein_checkins    id, person_id, date, checked_at
                    UNIQUE(person_id, date)，重复打卡覆盖 checked_at
training_plans      id, person_id, weekday(1-7), content(多行文本)
                    UNIQUE(person_id, weekday)
training_logs       id, person_id, date, plan_weekday nullable,
                    content(文本), created_at
weights             id, person_id, date, weight_kg
                    UNIQUE(person_id, date)，同天再称更新数值
push_subscriptions  id, person_id, endpoint UNIQUE, p256dh, auth,
                    created_at
```

## 7. 核心流程

### 7.1 拍照识别卡路里

```
拍照 → 手机端 canvas 压缩为 JPEG(~1000px, 质量0.8) → base64
→ POST /api/food/ai-analyze
→ 服务端调 OpenRouter chat/completions（图片消息 + prompt 要求返回
   JSON: {"name": string, "calories": number}）
→ 解析失败自动重试 1 次 → 返回结构化结果
→ 用户确认/修改名称和热量 → POST /api/foods 入库(source=ai)
```

API Key 仅存于服务端，不暴露给客户端。

### 7.2 蛋白粉系统推送

```
「我」Tab 开启通知 → 浏览器授权 Notification.permission
→ PushManager.subscribe(VAPID 公钥) → POST /api/push/subscribe 入库
→ Vercel Cron 每天 07:00 UTC（北京时间 15:00）GET /api/cron/daily-push
  （用 CRON_SECRET 校验）
→ 查询 notify_enabled=true 且当日无 protein_checkin 的用户
→ web-push 发送通知，点击跳转 App；endpoint 返回 404/410 时清理订阅
```

限制：Vercel 免费 Cron 每天一次 → 提醒时间两人统一，修改需改配置重新部署。

### 7.3 训练计划与打卡

「练」Tab 编辑 7 天模板（每天多行文本：动作名 组数×次数×重量）→「今天」页显示当日模板内容 → 点打卡写 training_logs → 支持不关联模板的自由记录。

## 8. 错误处理

- AI 识别：超时 30s；解析失败自动重试 1 次；仍失败提示"识别失败，请手动填写"
- 推送：失效订阅（404/410）自动从库中删除
- 网络：提交失败时表单草稿保留在本地状态，不用重填
- 所有 API 入参用 zod 校验，非法输入返回 400

## 9. 测试策略

- Vitest 单元测试覆盖纯逻辑：日期处理工具、AI 响应 JSON 解析、Cron 推送目标筛选
- UI 与推送交付时附手动验收清单（含 iOS 添加主屏幕、通知授权流程）

## 10. 部署步骤

GitHub 仓库 → Vercel 导入 → 创建 Vercel Postgres → 配置环境变量 → 部署 → 生成 VAPID 密钥写入环境变量 → 手机打开网址添加到主屏幕并授权通知。

## 11. 已确认的决策记录

| 决策 | 选择 |
|---|---|
| 账号体系 | 免登录 + 简单身份切换 |
| 卡路里录入 | 按餐分条手动 + 拍照 AI 识别 |
| AI 服务 | OpenRouter（OpenAI 兼容），模型走环境变量配置 |
| 提醒方式 | 真·系统推送通知（PWA + Web Push） |
| 训练功能深度 | 计划模板 + 打卡 |
| 额外功能 | 体重记录趋势 |
| 域名访问 | 无需担心（已有解决方案） |

---

## 附录 A：2026-08-23 追加需求（已批准）

### A1. 训练日历（周历 + 可展开月历）
- 「练」页顶部：默认本周 7 天横条，可展开整月日历并左右翻月
- 每格显示日期 + 计划简写（模板首行前 4 字，空=休）+ 打卡圆点
- 今天高亮；点击任意日期切换下方详情（计划全文 / 打卡 / 重量记录）
- 支持选中过去日期补记（打卡与重量记录按选中日期保存）

### A2. 结构化重量记录
- 保留一键快速打卡（training_logs 文本日志不变）
- 新增「记重量」独立入口：选动作（24 个内置预设 + 历史联想）→ 逐组填 次数×重量 → 可多个动作一次保存
- 选中动作显示该动作"上次记录"对比（最近一次日期 + 各组明细）
- 新表 `exercise_sets`：id, person_id, date, exercise_name, set_index, reps, weight_kg；同日同动作保存=整体替换
- API：按日查询、批量替换保存、上次记录查询、联想词表

### A3. 食物照片日记
- AI 识别流程中照片必须保留：压缩图随确认一起入库
- food_entries 新增列：photo(bytea, 可空)、ai_note(text, 可空)
- AI 提示词增加返回 note 字段（简短估算说明，如"约150g牛肉，估算约300千卡"）
- 「吃」页条目显示缩略图；点击打开全屏大图 + AI 说明
- 照片接口：GET /api/foods/[id]/photo（image/jpeg，长期缓存）
- 手动输入的记录保持纯文字
