import "server-only";

import { PUBLIC_COMMENT_EVENT_INVITATION_CONSENT_VERSION as CONSENT_VERSION } from "@/features/public-comment/minpaku/shared/consent";

export const PUBLIC_COMMENT_EVENT_INVITATION_CONSENT_VERSION = CONSENT_VERSION;

export const PUBLIC_COMMENT_EVENT_INVITATION_SUBJECT =
  "【10/3開催】AIに話したその続きを、地域の人と。｜若者と地域を語る会";

export const PUBLIC_COMMENT_EVENT_INVITATION_TEXT = `みらい議会@世田谷

AIに話したその続きを、
今度は人と話してみませんか。

若者と地域を語る会
若い世代が主催。どの世代の方も歓迎します。

2026年10月3日（土）14:00〜16:00
太子堂区民センター 第二会議室
東京都世田谷区太子堂1丁目14番20号
三軒茶屋駅から徒歩約5分

先日は、AIインタビューにご協力いただき、ありがとうございました。

インタビューで考えたことを、今度は地域の誰かと話してみる。そんな場として、「若者と地域を語る会」を開催します。

「暮らしの中で、こんなことが気になっている」
「ほかの人は、どう感じているんだろう」

そんな身近な話から、世田谷のことを一緒に考えてみませんか。

若い世代の主催者も輪に加わり、世代や立場の違う皆さんと、お互いの経験や考えを聞き合います。

当日は、こんな時間に

気になっていることを、話してみる。
AIインタビューで考えたことや、普段の暮らしで感じていることを、少人数で話します。

違う経験や考えに、耳を傾ける。
同じ地域で暮らす人が、何に困り、何を大切にしているのかを聞いてみます。

もう少し考えたいことを、持ち帰る。
話してみて気づいたことや、新しく生まれた問いを振り返ります。

専門知識や、まとまった意見は必要ありません。一つの結論を出したり、誰かを説得したりする会ではありません。話を聞くことを中心にしたご参加も歓迎します。

開催概要
日時：2026年10月3日（土）14:00〜16:00
会場：太子堂区民センター 第二会議室
住所：東京都世田谷区太子堂1丁目14番20号
アクセス：三軒茶屋駅から徒歩約5分
参加費：無料

参加を申し込む
https://forms.gle/sx7BdN5ZgWEk1cSKA

お問い合わせ：info@civictech-setagaya.org

このメールは、AIインタビューにご協力いただき、イベント案内の受信を希望された方へお送りしています。
配信停止をご希望の場合は、info@civictech-setagaya.org までご連絡ください。`;

const FORM_URL = "https://forms.gle/sx7BdN5ZgWEk1cSKA";
const CONTACT_EMAIL = "info@civictech-setagaya.org";
const BLUE = "#0ea5e9";
const PALE_BLUE = "#e0f2fe";
const DARK = "#12324a";
const BORDER = "#9adcf6";

export const PUBLIC_COMMENT_EVENT_INVITATION_HTML = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
    <title>${PUBLIC_COMMENT_EVENT_INVITATION_SUBJECT}</title>
  </head>
  <body style="margin:0;padding:0;width:100%;background-color:#f3f8fb;color:#243746;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Kaku Gothic ProN','Yu Gothic',Meiryo,Arial,sans-serif;font-size:16px;line-height:1.85;-webkit-text-size-adjust:100%;">
    <div style="display:none;visibility:hidden;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;">AIインタビューへのご協力、ありがとうございました。若い世代が主催する対話会へ、世代を問わずご招待します。</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f8fb" style="width:100%;background-color:#f3f8fb;">
      <tr><td align="center" style="padding:32px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;">
          <tr><td style="padding:22px 36px;border-top:5px solid ${BLUE};border-bottom:1px solid ${PALE_BLUE};">
            <p style="margin:0;color:#075985;font-size:19px;line-height:1.5;font-weight:700;">みらい議会@世田谷</p>
            <p style="margin:4px 0 0;color:#475569;font-size:14px;line-height:1.6;">AIインタビューから、地域の対話へ。</p>
          </td></tr>
          <tr><td align="center" bgcolor="${PALE_BLUE}" style="padding:32px 36px 28px;background-color:${PALE_BLUE};">
            <h1 style="margin:0 0 22px;color:${DARK};font-size:26px;line-height:1.6;font-weight:700;">AIに話したその続きを、<br>今度は人と話してみませんか。</h1>
            <h2 style="margin:0 0 12px;color:#075985;font-size:24px;line-height:1.5;font-weight:700;">若者と地域を語る会</h2>
            <p style="margin:0;color:#243746;font-size:16px;line-height:1.8;font-weight:700;">若い世代が主催。どの世代の方も歓迎します。</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:22px;"><tr><td align="center" style="padding-top:18px;border-top:1px solid ${BORDER};">
              <p style="margin:0 0 5px;color:${DARK};font-size:19px;line-height:1.7;font-weight:700;">2026年10月3日（土）14:00〜16:00</p>
              <p style="margin:0;color:#243746;font-size:16px;line-height:1.8;">太子堂区民センター 第二会議室<br>三軒茶屋駅から徒歩約5分</p>
            </td></tr></table>
            <table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:340px;margin-top:22px;"><tr><td align="center" bgcolor="${BLUE}" style="background-color:${BLUE};border:1px solid #0284c7;border-radius:6px;mso-padding-alt:16px 24px;">
              <a href="${FORM_URL}" target="_blank" rel="noopener noreferrer" style="display:block;padding:16px 24px;color:#082f49;font-size:18px;line-height:1.5;font-weight:700;text-align:center;text-decoration:none;border-radius:6px;">参加を申し込む</a>
            </td></tr></table>
          </td></tr>
          <tr><td style="padding:30px 36px 24px;">
            <p style="margin:0 0 18px;font-size:16px;line-height:1.9;">先日は、AIインタビューにご協力いただき、ありがとうございました。</p>
            <p style="margin:0 0 18px;font-size:16px;line-height:1.9;">インタビューで考えたことを、今度は地域の誰かと話してみる。そんな場として、<strong>「若者と地域を語る会」</strong>を開催します。</p>
            <p style="margin:0;padding:2px 0 2px 16px;border-left:3px solid ${BLUE};color:#075985;font-size:17px;line-height:1.9;font-weight:700;">「暮らしの中で、こんなことが気になっている」<br>「ほかの人は、どう感じているんだろう」</p>
            <p style="margin:18px 0 0;font-size:16px;line-height:1.9;">そんな身近な話から、世田谷のことを一緒に考えてみませんか。</p>
            <p style="margin:14px 0 0;font-size:16px;line-height:1.9;">若い世代の主催者も輪に加わり、世代や立場の違う皆さんと、お互いの経験や考えを聞き合います。</p>
          </td></tr>
          <tr><td style="padding:4px 36px 28px;">
            <h2 style="margin:0 0 18px;color:${DARK};font-size:21px;line-height:1.6;font-weight:700;">当日は、こんな時間に</h2>
            <p style="margin:0;padding:14px 0;border-top:1px solid #dceaf1;font-size:16px;line-height:1.85;"><strong style="color:#075985;">気になっていることを、話してみる。</strong><br>AIインタビューで考えたことや、普段の暮らしで感じていることを、少人数で話します。</p>
            <p style="margin:0;padding:14px 0;border-top:1px solid #dceaf1;font-size:16px;line-height:1.85;"><strong style="color:#075985;">違う経験や考えに、耳を傾ける。</strong><br>同じ地域で暮らす人が、何に困り、何を大切にしているのかを聞いてみます。</p>
            <p style="margin:0;padding:14px 0;border-top:1px solid #dceaf1;border-bottom:1px solid #dceaf1;font-size:16px;line-height:1.85;"><strong style="color:#075985;">もう少し考えたいことを、持ち帰る。</strong><br>話してみて気づいたことや、新しく生まれた問いを振り返ります。</p>
          </td></tr>
          <tr><td bgcolor="#f0f9ff" style="padding:24px 36px;background-color:#f0f9ff;">
            <p style="margin:0 0 12px;color:#075985;font-size:17px;line-height:1.85;font-weight:700;">話を聞くことを中心にしたご参加も歓迎します。</p>
            <p style="margin:0;font-size:16px;line-height:1.85;">専門知識や、まとまった意見は必要ありません。一つの結論を出したり、誰かを説得したりする会ではありません。</p>
          </td></tr>
          <tr><td style="padding:28px 36px 4px;">
            <h2 style="margin:0 0 18px;color:${DARK};font-size:21px;line-height:1.6;font-weight:700;">開催概要</h2>
            <p style="margin:0;padding:0 0 14px;border-bottom:1px solid #dceaf1;font-size:16px;line-height:1.85;"><strong style="display:block;color:#075985;">日時</strong>2026年10月3日（土）14:00〜16:00</p>
            <p style="margin:0;padding:14px 0;border-bottom:1px solid #dceaf1;font-size:16px;line-height:1.85;"><strong style="display:block;color:#075985;">会場</strong>太子堂区民センター 第二会議室<br>東京都世田谷区太子堂1丁目14番20号<br>三軒茶屋駅から徒歩約5分</p>
            <p style="margin:0;padding:14px 0;border-bottom:1px solid #dceaf1;font-size:16px;line-height:1.85;"><strong style="display:block;color:#075985;">参加費</strong>無料</p>
          </td></tr>
          <tr><td align="center" style="padding:28px 36px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:340px;"><tr><td align="center" bgcolor="${BLUE}" style="background-color:${BLUE};border:1px solid #0284c7;border-radius:6px;">
              <a href="${FORM_URL}" target="_blank" rel="noopener noreferrer" style="display:block;padding:16px 24px;color:#082f49;font-size:18px;line-height:1.5;font-weight:700;text-align:center;text-decoration:none;border-radius:6px;">参加を申し込む</a>
            </td></tr></table>
            <p style="margin:24px 0 0;color:#243746;font-size:16px;line-height:1.85;">お一人でのご参加も歓迎です。<br>当日、お会いできることを楽しみにしています。</p>
          </td></tr>
          <tr><td style="padding:24px 36px 28px;background-color:#f8fafc;border-top:1px solid #dceaf1;">
            <p style="margin:0 0 10px;color:#075985;font-size:16px;line-height:1.7;font-weight:700;">みらい議会@世田谷</p>
            <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:1.8;">お問い合わせ：<br><a href="mailto:${CONTACT_EMAIL}?subject=%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E6%A1%88%E5%86%85%E3%81%AE%E9%85%8D%E4%BF%A1%E5%81%9C%E6%AD%A2" style="color:#075985;text-decoration:underline;">${CONTACT_EMAIL}</a></p>
            <p style="margin:0;color:#475569;font-size:14px;line-height:1.85;">このメールは、AIインタビューにご協力いただき、イベント案内の受信を希望された方へお送りしています。配信停止をご希望の場合は、上記アドレスまでご連絡ください。</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
