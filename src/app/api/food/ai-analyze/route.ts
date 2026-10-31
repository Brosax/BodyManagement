import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeFoodWithRetry } from "@/lib/ai";

const schema = z.object({
  image: z.string().startsWith("data:image/jpeg;base64,"),
  hint: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY || !process.env.AI_MODEL) {
    return NextResponse.json(
      { error: "AI 服务未配置" },
      { status: 503 }
    );
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "图片数据无效" }, { status: 400 });
  }
  try {
    const food = await analyzeFoodWithRetry(parsed.data.image, parsed.data.hint);
    return NextResponse.json(food);
  } catch {
    return NextResponse.json(
      { error: "AI 识别失败，请手动填写" },
      { status: 502 }
    );
  }
}
