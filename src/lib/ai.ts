export type AiFood = {
  name: string;
  calories: number;
  note: string;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

/** 宽容取数：LLM 偶尔把数值写成字符串（如 "160"），能转就转 */
function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (
    typeof v === "string" &&
    v.trim() !== "" &&
    Number.isFinite(Number(v.trim()))
  )
    return Number(v.trim());
  return null;
}

/** 营养素克数解析：缺失/非法/超范围一律 null，小数四舍五入 */
function parseGrams(v: unknown): number | null {
  const n = toNum(v);
  if (n === null) return null;
  const g = Math.round(n);
  if (g < 0 || g > 500) return null;
  return g;
}

/** 从 AI 返回的任意文本中提取第一个平衡的 JSON 对象并校验 */
export function parseAiFood(raw: string): AiFood {
  const start = raw.indexOf("{");
  if (start === -1) throw new Error("未找到 JSON");

  let depth = 0;
  let end = -1;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === "{") depth++;
    else if (raw[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error("JSON 不完整");

  let obj: unknown;
  try {
    obj = JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw new Error("JSON 解析失败");
  }

  const name = (obj as { name?: unknown })?.name;
  const cal = toNum((obj as { calories?: unknown })?.calories);
  if (typeof name !== "string" || !name.trim()) throw new Error("食物名无效");
  if (cal === null) throw new Error("热量无效");

  const calories = Math.round(cal);
  if (calories < 0 || calories > 5000) throw new Error("热量超出合理范围");

  const note = (obj as { note?: unknown })?.note;
  const o = obj as Record<string, unknown>;
  return {
    name: name.trim(),
    calories,
    protein: parseGrams(o.protein),
    carbs: parseGrams(o.carbs),
    fat: parseGrams(o.fat),
    note: typeof note === "string" ? note.trim().slice(0, 200) : "",
  };
}

const PROMPT =
  '识别图中食物。若有多样食物请合并估算一份的总热量与营养。只返回JSON：{"name":"食物名","calories":整数千卡,"protein":整克蛋白质,"carbs":整克碳水,"fat":整克脂肪,"note":"一句话说明份量与估算依据"}。无法合理估算的营养素填null，不要编造精确数字。若图中没有食物，返回{"name":"未识别到食物","calories":0,"protein":null,"carbs":null,"fat":null,"note":"简述看到的内容"}';

const HINT_SUFFIX =
  "\n用户补充说明（份量、配料、做法等照片中不可见的信息以下方描述为准）：";

/** 构建发给模型的文本；有用户补充说明时追加到基础提示词后 */
export function buildUserText(hint?: string): string {
  const h = hint?.trim().slice(0, 200);
  if (!h) return PROMPT;
  return `${PROMPT}${HINT_SUFFIX}${h}`;
}

/** 调用 OpenAI 兼容接口（DeepSeek / OpenRouter）识别食物图片（base64 JPEG data URL） */
export async function analyzeFoodImage(
  dataUrl: string,
  hint?: string,
  timeoutMs = 30_000
): Promise<AiFood> {
  const base = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildUserText(hint) },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`AI 接口错误 ${res.status}`);
  const json = await res.json();
  const msg = json?.choices?.[0]?.message;
  // 推理模型偶尔把结果写进 reasoning 而 content 为空，做兜底
  const text: string = (msg?.content ?? "") || (msg?.reasoning ?? "");
  try {
    return parseAiFood(text);
  } catch (e) {
    console.error("[ai] parse failed, raw:", text.slice(0, 300));
    throw e;
  }
}

/** 失败自动重试一次 */
export async function analyzeFoodWithRetry(
  dataUrl: string,
  hint?: string
): Promise<AiFood> {
  try {
    return await analyzeFoodImage(dataUrl, hint);
  } catch (e) {
    console.error("[ai] first attempt failed:", e);
    await new Promise((r) => setTimeout(r, 1500)); // 退避，避开限流
    try {
      return await analyzeFoodImage(dataUrl, hint);
    } catch (e2) {
      console.error("[ai] retry failed:", e2);
      throw e2;
    }
  }
}
