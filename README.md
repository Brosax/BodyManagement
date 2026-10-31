# Body Management 情侣健身记录

手机端 App 式网页应用（PWA），两人使用：

- 🔥 **卡路里**：按餐记录每日摄入 + 拍照 AI 识别热量
- 💊 **蛋白粉**：每天打卡，固定时间系统推送提醒
- 🏋️ **训练**：每周计划模板、今日打卡、自由记录与历史
- ⚖️ **体重**：定期称重，90 天趋势曲线

技术栈：Next.js 15 · TypeScript · Tailwind CSS · Vercel Postgres (Neon) · Drizzle ORM · Web Push · DeepSeek AI（OpenAI 兼容）

---

## 部署步骤（从零开始）

### 1. 推送到 GitHub

```bash
git remote add origin <你的GitHub仓库地址>
git push -u origin main
```

### 2. 创建数据库（Neon Postgres）

1. 登录 [Vercel](https://vercel.com) → 你的项目还没有的话，先 `Add New... → Project` 导入上面的 GitHub 仓库
2. 进入项目 → `Storage` 标签 → `Create Database` → 选择 **Neon (Postgres)**
3. 创建完成后页面会显示连接串，复制 `postgres://...` 开头的 **DATABASE_URL**

### 3. 配置环境变量

项目 → `Settings` → `Environment Variables`，添加以下变量：

| 变量名 | 说明 |
|---|---|
| `DATABASE_URL` | 上一步复制的连接串 |
| `OPENROUTER_API_KEY` | DeepSeek API Key（也兼容 OpenRouter） |
| `OPENROUTER_BASE_URL` | DeepSeek 填 `https://api.deepseek.com/v1`；OpenRouter 填 `https://openrouter.ai/api/v1` |
| `AI_MODEL` | DeepSeek 填 `deepseek-flash`（DeepSeek-V4.1-Flash）；OpenRouter 填对应模型 ID |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 见第 4 步生成 |
| `VAPID_PRIVATE_KEY` | 见第 4 步生成 |
| `CRON_SECRET` | 随便一串长随机字符（用于保护定时任务接口） |

### 4. 生成推送密钥

在本地项目目录运行：

```bash
node scripts/generate-vapid.mjs
```

把输出的两行分别填到上表的 `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 和 `VAPID_PRIVATE_KEY`。

### 5. 初始化数据表和用户

本地创建 `.env.local` 文件（参考 `.env.example`），填入 `DATABASE_URL`，然后：

```bash
npx drizzle-kit migrate        # 建表
node --env-file=.env.local scripts/seed.mjs   # 写入两个人
```

想改默认名字/目标：编辑 `scripts/seed.mjs` 里的 `DEFAULTS` 后再运行（仅在表为空时生效；已写入后可直接改数据库或在应用内调整目标）。

### 6. 部署并安装到手机

1. `Deploy` 重新部署一次让环境变量生效
2. 手机浏览器打开网址 → 分享菜单 →「添加到主屏幕」
3. 从主屏幕打开 App →「我」Tab → 开启蛋白粉提醒通知（iOS 会弹授权）

## 本地开发

```bash
npm run dev     # 开发服务器 http://localhost:3000
npm test        # 单元测试
npm run build   # 生产构建验证
```

## 定时提醒说明

- 提醒时间统一为**每天北京时间 15:00**（配置在 `vercel.json`，UTC 7 点）
- 只提醒「开启通知且当天未打卡」的人；点通知直达 App 打卡
- 想改时间：修改 `vercel.json` 中 cron 的 UTC 时间（北京时间 = UTC + 8）后重新部署
