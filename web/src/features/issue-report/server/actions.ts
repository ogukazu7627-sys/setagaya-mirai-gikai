"use server";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/features/admin/server/auth";
import { routes } from "@/lib/routes";

const ISSUE_REPORT_CATEGORIES = [
  "content_issue",
  "broken_link",
  "display_issue",
  "other",
] as const;

const nullableTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : null));

const issueReportSchema = z.object({
  bill_id: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .pipe(z.string().uuid().nullable()),
  category: z.enum(ISSUE_REPORT_CATEGORIES),
  message: z.string().trim().min(1).max(4000),
  contact_name: nullableTrimmedString(120),
  contact_email: nullableTrimmedString(254).refine(
    (value) => value == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "Invalid email"
  ),
  page_url: nullableTrimmedString(2048).refine(
    (value) => value == null || /^https?:\/\//.test(value),
    "Invalid page URL"
  ),
});

function buildReportProblemPath(
  error: "invalid" | "save_failed",
  billId: string | null,
  pageUrl: string | null
) {
  const params = new URLSearchParams({ error });
  if (billId) params.set("billId", billId);
  if (pageUrl) params.set("pageUrl", pageUrl);
  return `${routes.reportProblem()}?${params.toString()}` as Route;
}

export async function createIssueReportAction(formData: FormData) {
  const raw = {
    bill_id: String(formData.get("bill_id") ?? ""),
    category: String(formData.get("category") ?? "content_issue"),
    message: String(formData.get("message") ?? ""),
    contact_name: String(formData.get("contact_name") ?? ""),
    contact_email: String(formData.get("contact_email") ?? ""),
    page_url: String(formData.get("page_url") ?? ""),
  };

  const parsed = issueReportSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(
      buildReportProblemPath(
        "invalid",
        raw.bill_id || null,
        raw.page_url || null
      )
    );
  }

  const requestHeaders = await headers();
  const supabase = createAdminClient();
  const { error } = await supabase.from("issue_reports").insert({
    bill_id: parsed.data.bill_id,
    category: parsed.data.category,
    message: parsed.data.message,
    contact_name: parsed.data.contact_name,
    contact_email: parsed.data.contact_email,
    page_url: parsed.data.page_url,
    user_agent: requestHeaders.get("user-agent"),
  });

  if (error) {
    redirect(
      buildReportProblemPath(
        "save_failed",
        parsed.data.bill_id,
        parsed.data.page_url
      )
    );
  }

  redirect(routes.reportProblemThanks() as Route);
}

export async function resolveIssueReportAction(formData: FormData) {
  await requireAdmin(routes.adminIssueReports());

  const reportId = z
    .string()
    .uuid()
    .parse(String(formData.get("report_id") ?? ""));

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("issue_reports")
    .update({
      status: "resolved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    redirect(`${routes.adminIssueReports()}?error=resolve_failed` as Route);
  }

  redirect(`${routes.adminIssueReports()}?resolved=1` as Route);
}
