import { Check, ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareUrlButton } from "@/components/share/share-url-button";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireAdmin } from "@/features/admin/server/auth";
import {
  setPublicCommentEventAttendanceAction,
  upsertPublicCommentAdDailyStatAction,
} from "@/features/admin/server/public-comment-admin-actions";
import { listPublicCommentFunnelDashboard } from "@/features/admin/server/public-comment-funnel";
import { YOUTH_DIALOGUE_AD_CAMPAIGN } from "@/features/public-comment/shared/funnel";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

const FUNNEL_COLUMNS = [
  ["impressions", "広告表示"],
  ["linkClicks", "リンククリック"],
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
  ["registrations", "申込"],
  ["attendees", "来場"],
] as const;

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

function cost(spendYen: number, count: number) {
  return count > 0 ? `${Math.round(spendYen / count).toLocaleString()}円` : "-";
}

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
          <h1 className="text-2xl font-bold">広告からイベント来場まで</h1>
          <p className="mt-2 text-sm leading-6 text-mirai-text-secondary">
            UTM別に、広告表示からページ読込、AIインタビュー、案内メール、申込、来場までを確認します。回答本文や個人の政治的意見は集計に使用しません。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>本番広告に設定するリンク</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <TrackingLink label="民泊AIインタビュー広告" url={minpakuUrl} />
            <TrackingLink label="イベント単体広告" url={eventUrl} />
            <p className="leading-6 text-mirai-text-secondary">
              広告クリエイティブごとに末尾の
              <code className="mx-1 rounded bg-gray-100 px-1">creative-a</code>
              を
              <code className="mx-1 rounded bg-gray-100 px-1">creative-b</code>
              などへ変えてください。そこが
              <code className="mx-1 rounded bg-gray-100 px-1">utm_content</code>
              として保存されます。
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
                  <th className="p-3 text-right">申込単価</th>
                  <th className="p-3 text-right">来場単価</th>
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
                    <td className="p-3 text-right tabular-nums">
                      {cost(row.spendYen, row.registrations)}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {cost(row.spendYen, row.attendees)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">
              イベント申込・来場確認（{dashboard.registrations.length}件）
            </h2>
            <p className="mt-1 text-sm text-mirai-text-secondary">
              氏名とメールアドレスはイベント運営だけに使用し、公開しません。当日は来場した方だけを「来場済み」にしてください。
            </p>
          </div>
          {dashboard.registrations.length === 0 ? (
            <p className="rounded-xl border bg-white p-6 text-sm text-mirai-text-secondary">
              申込はまだありません。
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {dashboard.registrations.map((registration) => (
                <Card key={registration.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {registration.attendeeName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="break-all">{registration.email}</p>
                    <p>関心: {registration.interests.join(" / ")}</p>
                    <p>申込: {formatDateTime(registration.registeredAt)}</p>
                    <p>
                      流入: {registration.adTheme ?? "organic"} /{" "}
                      {registration.utmContent ?? "organic"}
                    </p>
                    {registration.note ? (
                      <p className="whitespace-pre-wrap rounded-md bg-gray-50 p-3">
                        {registration.note}
                      </p>
                    ) : null}
                    <form action={setPublicCommentEventAttendanceAction}>
                      <input
                        type="hidden"
                        name="registrationId"
                        value={registration.id}
                      />
                      <input
                        type="hidden"
                        name="attended"
                        value={registration.attendedAt ? "false" : "true"}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant={
                          registration.attendedAt ? "outline" : "default"
                        }
                      >
                        {registration.attendedAt ? (
                          <>
                            <Check className="size-4" />
                            来場済み（取り消す）
                          </>
                        ) : (
                          "来場済みにする"
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
