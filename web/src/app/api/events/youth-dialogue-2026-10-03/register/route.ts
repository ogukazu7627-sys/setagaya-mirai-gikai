import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "イベント申込はGoogleフォームからお手続きください" },
    { status: 410 }
  );
}
