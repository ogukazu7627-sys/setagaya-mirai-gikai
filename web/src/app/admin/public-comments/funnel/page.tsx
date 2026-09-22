import { ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ShareUrlButton } from "@/components/share/share-url-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireAdmin } from "@/features/admin/server/auth";
import { upsertPublicCommentAdDailyStatAction } from "@/features/admin/server/public-comment-admin-actions";
import { listPublicCommentFunnelDashboard } from "@/features/admin/server/public-comment-funnel";
import { YOUTH_DIALOGUE_AD_CAMPAIGN } from "@/features/public-comment/shared/funnel";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

const FUNNEL_COLUMNS = [
  ["impressions", "広告表示"],
  ["linkClicks", "リンククリック"],
  ["trackedLinkAccesses", "計測リンクアクセス"],
  ["pageLoads", "ページ読込"],
  ["interviewStarts", "開始"],
  ["coreCompleted", "3問完了"],
  ["simpleSelected", "簡易版"],
  ["detailedSelected", "詳細版"],
  ["googleClaimed", "Google認証"],
  ["interviewCompleted", "完了"],
  ["emailAccepted", "メール送信受付"],
  ["emailDelivered", "メール配信"],
  ["emailClicked", "メールクリック"],
] as const;

export default async function AdminPublicCommentFunnelPage() {
  const user = await requireAdmin(routes.adminPublicCommentFunnel());
  const dashboard = await listPublicCommentFunnelDashboard();
  const baseUrl = env.webUrl.replace(/\/+$/, "");
  const minpakuUrl = `${baseUrl}/go/minpaku/${YOUTH_DIALOGUE_AD_CAMPAIGN}/creative-a`;
  const eventUrl = `${baseUrl}/go/event/${YOUTH_DIALOGUE_AD_CAMPAIGN}/creative-a`;

  return (
    <AdminShell user={user}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">広告・AIインタビュー計測</h1>
          <p className="mt-2 text-sm leading-6 text-mirai-text-secondary">
            広告・計測リンクへのアクセスから、AIインタビューと案内メールの状況を確認します。イベント単体広告は計測後にGoogleフォームへ転送します。フォーム回答数と来場者数はこの画面には表示されず、Googleフォームと当日の受付で別途確認してください。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>本番広告に設定するリンク</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <TrackingLink label="民泊AIインタビュー広告" url={minpakuUrl} />
            <TrackingLink
              label="イベント単体広告（Googleフォームへ即時転送）"
              url={eventUrl}
            />
            <p className="leading-6 text-mirai-text-secondary">
              広告クリエイティブごとに末尾の
              <code className="mx-1 rounded bg-gray-100 px-1">creative-a</code>
              を
              <code className="mx-1 rounded bg-gray-100 px-1">creative-b</code>
              などへ変えてください。そこが
              <code className="mx-1 rounded bg-gray-100 px-1">utm_content</code>
              として保存されます。
            </p>
            <p className="leading-6 text-mirai-text-secondary">
              「リンククリック」はMeta広告マネージャーから手入力した値、「計測リンクアクセス」は当サイトのURLに到達した回数で、ユニーク人数ではありません。再アクセスやSNS側の事前確認なども含まれる場合があります。イベントの申込回答は各Googleフォームで確認してください。当サイトでは回答者とインタビュー完了者を個人単位で結び付けず、来場状況も記録しません。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meta広告の日次実績を入力</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-5 text-sm leading-6 text-mirai-text-secondary">
              広告表示・Meta上のリンククリック・消化金額だけはMeta広告マネージャーの数値を入力します。同じ日・UTM・テーマは上書きされます。
            </p>
            <form
              action={upsertPublicCommentAdDailyStatAction}
              className="grid gap-4 md:grid-cols-4"
            >
              <AdminInput label="日付" name="statDate" type="date" required />
              <AdminInput
                label="utm_source"
                name="utmSource"
                defaultValue="instagram"
                required
              />
              <AdminInput
                label="utm_campaign"
                name="utmCampaign"
                defaultValue={YOUTH_DIALOGUE_AD_CAMPAIGN}
                required
              />
              <AdminInput
                label="utm_content"
                name="utmContent"
                defaultValue="creative-a"
                required
              />
              <label className="text-sm font-bold">
                広告テーマ
                <select
                  name="adTheme"
                  className="mt-2 min-h-10 w-full rounded-md border bg-white px-3"
                  required
                >
                  <option value="minpaku-2026">民泊AIインタビュー</option>
                  <option value="event-direct">イベント単体</option>
                </select>
              </label>
              <AdminInput
                label="広告表示"
                name="impressions"
                type="number"
                min="0"
                defaultValue="0"
                required
              />
              <AdminInput
                label="リンククリック"
                name="linkClicks"
                type="number"
                min="0"
                defaultValue="0"
                required
              />
              <AdminInput
                label="消化金額（円）"
                name="spendYen"
                type="number"
                min="0"
                defaultValue="0"
                required
              />
              <Button type="submit" className="md:col-span-4 md:w-fit">
                実績を保存
              </Button>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">ファネル集計</h2>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-[1800px] text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3">テーマ / campaign / content</th>
                  {FUNNEL_COLUMNS.map(([, label]) => (
                    <th
                      key={label}
                      className="whitespace-nowrap p-3 text-right"
                    >
                      {label}
                    </th>
                  ))}
                  <th className="p-3 text-right">消化金額</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.rows.map((row) => (
                  <tr key={row.key} className="border-t align-top">
                    <td className="p-3">
                      <p className="font-bold">{row.adTheme}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {row.utmCampaign}
                      </p>
                      <p className="text-xs text-gray-500">{row.utmContent}</p>
                    </td>
                    {FUNNEL_COLUMNS.map(([key]) => (
                      <td key={key} className="p-3 text-right tabular-nums">
                        {row[key]}
                      </td>
                    ))}
                    <td className="p-3 text-right tabular-nums">
                      {row.spendYen.toLocaleString()}円
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Link
          href={routes.adminPublicComments() as Route}
          className="inline-flex items-center gap-2 text-sm font-bold text-mirai-primary hover:underline"
        >
          パブコメ本文の確認へ
          <ExternalLink className="size-4" />
        </Link>
      </div>
    </AdminShell>
  );
}

function TrackingLink({ label, url }: { label: string; url: string }) {
  return (
    <div>
      <p className="font-bold">{label}</p>
      <div className="mt-2 flex items-center gap-2 rounded-md bg-gray-50 p-3">
        <code className="min-w-0 flex-1 break-all">{url}</code>
        <ShareUrlButton url={url} className="shrink-0" />
      </div>
    </div>
  );
}

function AdminInput({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="text-sm font-bold">
      {label}
      <input
        name={name}
        className="mt-2 min-h-10 w-full rounded-md border px-3 font-normal"
        {...props}
      />
    </label>
  );
}
