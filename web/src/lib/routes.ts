/**
 * web アプリの内部ルート定義
 *
 * app/ ディレクトリの page.tsx と 1:1 対応する。
 * Link href や router.push には必ずこのファイルの関数を使うこと。
 * 新しいページを追加したらここにもルートを追加し、テストを通すこと。
 */

import { getCouncilorStatementAnchorId } from "./councilor-statement-anchor";

export const routes = {
  // ── 静的ルート ──────────────────────────────────────
  home: () => "/" as const,
  terms: () => "/terms" as const,
  privacy: () => "/privacy" as const,
  reportProblem: () => "/report-problem" as const,
  reportProblemThanks: () => "/report-problem/thanks" as const,
  bills: () => "/bills" as const,
  budget: () => "/budget" as const,
  budgetAll: (filters?: BudgetDirectoryRouteFilters) =>
    buildBudgetDirectoryRoute("/budget/all", filters),
  budgetRevenue: (filters?: BudgetDirectoryRouteFilters) =>
    buildBudgetDirectoryRoute("/budget/revenue", filters),
  budgetCategory: (categorySlug: string) =>
    `/budget?category=${encodeURIComponent(categorySlug)}` as const,
  budgetTopic: (categorySlug: string, topicSlug: string) =>
    `/budget?category=${encodeURIComponent(categorySlug)}&topic=${encodeURIComponent(topicSlug)}` as const,
  // 描画層は既定で v2。比較したいときだけ "v1" を渡す。
  budgetMap: (variant?: "v1" | "v2", activeDatasetId?: string | null) => {
    const searchParams = new URLSearchParams({ embed: "1" });
    if (variant === "v1") {
      searchParams.set("variant", "v1");
    }
    if (activeDatasetId !== undefined) {
      searchParams.set("dataset", activeDatasetId ?? "none");
    }
    return `/budget/map?${searchParams.toString()}` as const;
  },
  budgetOfficialHierarchy: (accountCode?: string) =>
    accountCode
      ? (`/budget/official?account=${encodeURIComponent(accountCode)}` as const)
      : ("/budget/official" as const),
  budgetProgramDetail: (
    budgetProgramIdentityId: string,
    returnContext?: {
      categorySlug: string;
      topicSlug?: string;
    }
  ) => {
    const pathname = `/budget/programs/${budgetProgramIdentityId}` as const;
    if (!returnContext) {
      return pathname;
    }
    const searchParams = new URLSearchParams({
      fromCategory: returnContext.categorySlug,
    });
    if (returnContext.topicSlug) {
      searchParams.set("fromTopic", returnContext.topicSlug);
    }
    return `${pathname}?${searchParams.toString()}` as const;
  },
  budgetQuestionCategory: (categorySlug: string, focusBillId?: string) => {
    const pathname = `/budget/questions/${encodeURIComponent(categorySlug)}`;
    return focusBillId
      ? (`${pathname}?focus=${encodeURIComponent(focusBillId)}` as const)
      : (pathname as `/budget/questions/${string}`);
  },
  councilors: () => "/councilors" as const,
  councilorDetail: (councilorId: string) =>
    `/councilors/${councilorId}` as const,
  committees: () => "/committees" as const,
  committeeDetail: (committeeId: string) =>
    `/committees/${committeeId}` as const,
  learn: () => "/learn" as const,
  learnLesson: (slug: string) => `/learn/${slug}` as const,

  // ── 管理画面 ──────────────────────────────────────
  adminHome: () => "/admin" as const,
  adminLogin: () => "/admin/login" as const,
  adminBills: () => "/admin/bills" as const,
  adminBillNew: () => "/admin/bills/new" as const,
  adminBillEdit: (billId: string) => `/admin/bills/${billId}/edit` as const,
  adminDietSessions: () => "/admin/diet-sessions" as const,
  adminDietSessionEdit: (sessionId: string) =>
    `/admin/diet-sessions/${sessionId}/edit` as const,
  adminIssueReports: () => "/admin/reports" as const,
  adminCouncilorDigests: () => "/admin/councilor-digests" as const,

  // ── 議案 ──────────────────────────────────────────
  billDetail: (billId: string) => `/bills/${billId}` as const,
  billDetailCouncilorStatement: (billId: string, statementIndex: number) =>
    `/bills/${billId}#${getCouncilorStatementAnchorId(statementIndex)}` as const,
  billOpinions: (billId: string) => `/bills/${billId}/opinions` as const,
  billTopics: (billId: string) => `/bills/${billId}/topics` as const,
  billTopicDetail: (billId: string, topicId: string, filter?: string) =>
    filter && filter !== "all"
      ? (`/bills/${billId}/topics/${topicId}?filter=${encodeURIComponent(filter)}` as const)
      : (`/bills/${billId}/topics/${topicId}` as const),

  // ── インタビュー ──────────────────────────────────
  interviewLP: (billId: string) => `/bills/${billId}/interview` as const,
  interviewDisclosure: (billId: string) =>
    `/bills/${billId}/interview/disclosure` as const,
  interviewChat: (billId: string) => `/bills/${billId}/interview/chat` as const,

  // ── プレビュー（token 付き） ──────────────────────
  previewBillDetail: (billId: string, token: string) =>
    `/preview/bills/${billId}?token=${encodeURIComponent(token)}` as const,
  previewInterviewLP: (billId: string, token: string) =>
    `/preview/bills/${billId}/interview?token=${encodeURIComponent(token)}` as const,
  previewInterviewDisclosure: (billId: string, token: string) =>
    `/preview/bills/${billId}/interview/disclosure?token=${encodeURIComponent(token)}` as const,
  previewInterviewChat: (billId: string, token: string) =>
    `/preview/bills/${billId}/interview/chat?token=${encodeURIComponent(token)}` as const,

  // ── レポート ──────────────────────────────────────
  publicReport: (reportId: string) => `/report/${reportId}` as const,
  reportComplete: (reportId: string) => `/report/${reportId}/complete` as const,
  legacyReportChatLog: (reportId: string) =>
    `/report/${reportId}/chat-log` as const,

  // ── 世田谷区議会セッション ────────────────────────────────
  kokkaiSessionBills: (slug: string) => `/kokkai/${slug}/bills` as const,
} as const;

export type BudgetDirectoryRouteFilters = {
  accountCode?: string | null;
  kanCode?: string | null;
  kouCode?: string | null;
  mokuCode?: string | null;
  includeZeroAmount?: boolean;
  sort?: "amount_desc" | "name_asc";
  page?: number;
};

function buildBudgetDirectoryRoute(
  pathname: "/budget/all" | "/budget/revenue",
  filters?: BudgetDirectoryRouteFilters
) {
  const searchParams = new URLSearchParams();
  if (filters?.accountCode) {
    searchParams.set("account", filters.accountCode);
  }
  if (filters?.kanCode) {
    searchParams.set("kan", filters.kanCode);
  }
  if (filters?.kouCode) {
    searchParams.set("kou", filters.kouCode);
  }
  if (filters?.mokuCode) {
    searchParams.set("moku", filters.mokuCode);
  }
  if (filters?.includeZeroAmount) {
    searchParams.set("includeZeroAmount", "true");
  }
  if (filters?.sort && filters.sort !== "amount_desc") {
    searchParams.set("sort", filters.sort);
  }
  if (filters?.page && filters.page > 1) {
    searchParams.set("page", String(filters.page));
  }
  const query = searchParams.toString();
  return query ? (`${pathname}?${query}` as const) : pathname;
}
