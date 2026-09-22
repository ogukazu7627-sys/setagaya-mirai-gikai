import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

export type PublicCommentFunnelRow = {
  key: string;
  utmSource: string;
  utmCampaign: string;
  utmContent: string;
  adTheme: string;
  impressions: number;
  linkClicks: number;
  spendYen: number;
  trackedLinkAccesses: number;
  pageLoads: number;
  interviewStarts: number;
  coreCompleted: number;
  simpleSelected: number;
  detailedSelected: number;
  googleClaimed: number;
  interviewCompleted: number;
  emailAccepted: number;
  emailDelivered: number;
  emailClicked: number;
};

function keyOf(parts: {
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  ad_theme: string;
}) {
  return [
    parts.utm_source ?? "organic",
    parts.utm_campaign ?? "organic",
    parts.utm_content ?? "organic",
    parts.ad_theme,
  ].join("::");
}

function emptyRow(parts: {
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  ad_theme: string;
}): PublicCommentFunnelRow {
  return {
    key: keyOf(parts),
    utmSource: parts.utm_source ?? "organic",
    utmCampaign: parts.utm_campaign ?? "organic",
    utmContent: parts.utm_content ?? "organic",
    adTheme: parts.ad_theme,
    impressions: 0,
    linkClicks: 0,
    spendYen: 0,
    trackedLinkAccesses: 0,
    pageLoads: 0,
    interviewStarts: 0,
    coreCompleted: 0,
    simpleSelected: 0,
    detailedSelected: 0,
    googleClaimed: 0,
    interviewCompleted: 0,
    emailAccepted: 0,
    emailDelivered: 0,
    emailClicked: 0,
  };
}

export async function listPublicCommentFunnelDashboard() {
  const supabase = createAdminClient();
  const [
    { data: visits, error: visitError },
    { data: stats, error: statError },
  ] = await Promise.all([
    supabase.from("public_comment_funnel_visits").select("*"),
    supabase.from("public_comment_ad_daily_stats").select("*"),
  ]);
  if (visitError || statError)
    throw new Error("パブコメのファネル集計を取得できませんでした");

  const rows = new Map<string, PublicCommentFunnelRow>();
  for (const visit of visits ?? []) {
    const key = keyOf(visit);
    const row = rows.get(key) ?? emptyRow(visit);
    row.trackedLinkAccesses += visit.short_link_opened_at ? 1 : 0;
    row.pageLoads += visit.arrived_at ? 1 : 0;
    row.interviewStarts += visit.interview_started_at ? 1 : 0;
    row.coreCompleted += visit.core_completed_at ? 1 : 0;
    row.simpleSelected += visit.checkpoint_choice === "simple" ? 1 : 0;
    row.detailedSelected += visit.checkpoint_choice === "detailed" ? 1 : 0;
    row.googleClaimed += visit.google_claimed_at ? 1 : 0;
    row.interviewCompleted += visit.interview_completed_at ? 1 : 0;
    row.emailAccepted += visit.event_invitation_accepted_at ? 1 : 0;
    row.emailDelivered += visit.event_invitation_delivered_at ? 1 : 0;
    row.emailClicked += visit.event_invitation_clicked_at ? 1 : 0;
    rows.set(key, row);
  }
  for (const stat of stats ?? []) {
    const key = keyOf(stat);
    const row = rows.get(key) ?? emptyRow(stat);
    row.impressions += stat.impressions;
    row.linkClicks += stat.link_clicks;
    row.spendYen += stat.spend_yen;
    rows.set(key, row);
  }

  return {
    rows: [...rows.values()].sort(
      (a, b) =>
        b.spendYen - a.spendYen ||
        b.pageLoads - a.pageLoads ||
        a.key.localeCompare(b.key)
    ),
  };
}

export async function upsertPublicCommentAdDailyStat(params: {
  statDate: string;
  utmSource: string;
  utmCampaign: string;
  utmContent: string;
  adTheme: string;
  impressions: number;
  linkClicks: number;
  spendYen: number;
}) {
  const { error } = await createAdminClient()
    .from("public_comment_ad_daily_stats")
    .upsert(
      {
        stat_date: params.statDate,
        utm_source: params.utmSource,
        utm_campaign: params.utmCampaign,
        utm_content: params.utmContent,
        ad_theme: params.adTheme,
        impressions: params.impressions,
        link_clicks: params.linkClicks,
        spend_yen: params.spendYen,
      },
      {
        onConflict: "stat_date,utm_source,utm_campaign,utm_content,ad_theme",
      }
    );
  if (error) throw new Error("広告実績を保存できませんでした");
}
