import { NextResponse } from "next/server";
import { z } from "zod";
import { arrivePublicCommentFunnelVisit } from "@/features/public-comment/shared/server/funnel-repository";

const optionalTag = z.string().trim().max(120).nullable().optional();
const requestSchema = z.object({
  publicToken: z.uuid().nullable().optional(),
  journeyType: z.enum(["interview", "event_direct"]),
  adTheme: z.string().trim().min(1).max(100),
  landingPath: z.string().trim().startsWith("/").max(240),
  utmSource: optionalTag,
  utmMedium: optionalTag,
  utmCampaign: optionalTag,
  utmContent: optionalTag,
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "流入情報を確認できませんでした" },
      { status: 400 }
    );
  }

  try {
    const publicToken = await arrivePublicCommentFunnelVisit(parsed.data);
    return NextResponse.json({ publicToken });
  } catch {
    return NextResponse.json(
      { error: "流入情報を保存できませんでした" },
      { status: 500 }
    );
  }
}
