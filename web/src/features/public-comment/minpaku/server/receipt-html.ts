import "server-only";

type ConversationMessage = {
  role: "assistant" | "user";
  content: string;
};

type ReceiptHtmlInput = {
  subject: string;
  body: string;
  finalBody: string;
  conversation: unknown;
};

const BRAND_BLUE = "#087fbd";
const DARK_BLUE = "#12324a";
const PALE_BLUE = "#eef9ff";
const BORDER_BLUE = "#c4e8f8";
const NOTICE_YELLOW = "#fff8df";
const NOTICE_BORDER = "#f0d98b";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function preserveLines(value: string): string {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

function parseConversation(value: unknown): ConversationMessage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const role = record.role === "user" ? "user" : "assistant";
    return typeof record.content === "string"
      ? [{ role, content: record.content }]
      : [];
  });
}

function findOfficialUrl(body: string): string | null {
  const candidates = body.match(/https?:\/\/[^\s<>"']+/g) ?? [];
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" || url.protocol === "http:")
        return url.href;
    } catch {
      // Ignore malformed values from the persisted text snapshot.
    }
  }
  return null;
}

function renderConversation(conversation: ConversationMessage[]): string {
  if (conversation.length === 0) {
    return `<p style="margin:0;color:#536b7a;font-size:14px;line-height:1.8;">会話記録はありません。</p>`;
  }

  return conversation
    .map((message) => {
      const isUser = message.role === "user";
      const label = isUser ? "あなた" : "AIインタビュアー";
      const background = isUser ? "#e8f5fd" : "#f7fbfd";
      const alignment = isUser ? "right" : "left";
      return `<tr>
  <td align="${alignment}" style="padding:0 0 12px;">
    <div style="display:inline-block;max-width:92%;text-align:left;background:${background};border:1px solid ${BORDER_BLUE};border-radius:14px;padding:12px 14px;">
      <div style="color:${BRAND_BLUE};font-size:12px;font-weight:700;line-height:1.5;margin-bottom:5px;">${label}</div>
      <div style="color:${DARK_BLUE};font-size:14px;line-height:1.8;word-break:break-word;">${preserveLines(message.content)}</div>
    </div>
  </td>
</tr>`;
    })
    .join("\n");
}

export function createPublicCommentReceiptHtml({
  subject,
  body,
  finalBody,
  conversation: rawConversation,
}: ReceiptHtmlInput): string {
  const officialUrl = findOfficialUrl(body);
  const conversation = parseConversation(rawConversation);
  const officialLink = officialUrl
    ? `<a href="${escapeHtml(officialUrl)}" style="color:${BRAND_BLUE};font-weight:700;text-decoration:underline;word-break:break-all;">公式提出ページを開く</a><br><span style="color:#536b7a;font-size:12px;word-break:break-all;">${escapeHtml(officialUrl)}</span>`
    : "公式提出ページのURLは、受信したプレーンテキスト本文をご確認ください。";

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;background:#f2fbff;color:${DARK_BLUE};font-family:-apple-system,BlinkMacSystemFont,'Hiragino Kaku Gothic ProN','Yu Gothic',Meiryo,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2fbff;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid ${BORDER_BLUE};border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:24px 26px;background:#e7f8ff;border-bottom:1px solid ${BORDER_BLUE};">
                <div style="color:${BRAND_BLUE};font-size:14px;font-weight:800;letter-spacing:.02em;">◯ みらい議会＠世田谷</div>
                <h1 style="margin:14px 0 8px;color:${DARK_BLUE};font-size:24px;line-height:1.45;">AIパブコメインタビューの控え</h1>
                <p style="margin:0;color:#536b7a;font-size:14px;line-height:1.7;">${escapeHtml(subject)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 26px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NOTICE_YELLOW};border:1px solid ${NOTICE_BORDER};border-radius:12px;">
                  <tr>
                    <td style="padding:15px 16px;color:#574817;font-size:13px;line-height:1.8;">
                      このメールは、今回のインタビューと確認済みコメントの控えです。<br>
                      このサイトから世田谷区への提出や、一般公開は行っていません。<br>
                      ${officialLink}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 26px 8px;">
                <h2 style="margin:0 0 10px;color:${DARK_BLUE};font-size:18px;line-height:1.5;">確認済みコメント</h2>
                <div style="padding:17px;background:${PALE_BLUE};border:1px solid ${BORDER_BLUE};border-radius:12px;color:${DARK_BLUE};font-size:14px;line-height:1.9;word-break:break-word;">${preserveLines(finalBody)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 26px 24px;">
                <h2 style="margin:0 0 12px;color:${DARK_BLUE};font-size:18px;line-height:1.5;">インタビュー全文</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${renderConversation(conversation)}</table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 26px;background:#f8fcfe;border-top:1px solid ${BORDER_BLUE};color:#657b89;font-size:12px;line-height:1.8;">
                みらい議会＠世田谷<br>
                AIによる整理を含むため、公式資料と照合のうえご利用ください。
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
