import { NextResponse } from "next/server";
import { getPublicCommentUser } from "@/features/public-comment/minpaku/server/auth";
import { savePublicCommentEmailPreference } from "@/features/public-comment/minpaku/server/email-preference-repository";

export async function DELETE() {
  const user = await getPublicCommentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Googleログインが必要です" },
      { status: 401 }
    );
  }
  try {
    await savePublicCommentEmailPreference(user.id, false);
    return NextResponse.json({ optedIn: false });
  } catch {
    return NextResponse.json(
      { error: "配信停止を保存できませんでした。もう一度お試しください。" },
      { status: 500 }
    );
  }
}
