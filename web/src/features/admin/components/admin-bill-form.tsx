import { RefreshCw } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  BillPublicationCategory,
  BillSource,
  MajorCategoryLabel,
} from "@/features/bills/shared/types";
import { MAJOR_CATEGORY_OPTIONS } from "@/features/bills/shared/types";
import { routes } from "@/lib/routes";
import {
  regenerateAdminBillSeoAction,
  saveAdminBillAction,
} from "../server/actions";
import {
  ADMIN_PUBLICATION_STATUS_OPTIONS,
  type AdminBillFormData,
  BILL_ITEM_TYPE_OPTIONS,
  BILL_STATUS_LABEL_OPTIONS,
  BILL_STATUS_OPTIONS,
  getInitialAdminBillValues,
  getPreviewPath,
  normalizeBillPublicationCategory,
  PUBLICATION_CATEGORY_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  toAdminPublicationStatus,
} from "../server/bill-admin";
import { BUDGET_OVERALL_MAJOR_CATEGORY } from "../shared/admin-budget-form-values";
import { AdminBillPublicationKindController } from "./admin-bill-publication-kind-controller";
import { AdminDietSessionField } from "./admin-diet-session-field";
import { AdminTagSelector } from "./admin-tag-selector";

interface AdminBillFormProps {
  data: AdminBillFormData;
  error?: string;
  returnPath?: string;
  saved?: boolean;
  seoStatus?: string;
  seoWarning?: string;
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">{label}</span>
      {children}
      {hint && (
        <span className="text-xs text-mirai-text-secondary">{hint}</span>
      )}
    </div>
  );
}

function NativeSelect({
  name,
  defaultValue,
  children,
  required,
}: {
  name: string;
  defaultValue?: string | null;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      required={required}
      className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {children}
    </select>
  );
}

function ToggleField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border bg-white px-4 py-3 text-sm font-bold">
      <span>{label}</span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-5 w-5 accent-primary"
      />
    </label>
  );
}

function PublicationCategoryHidden({
  children,
  hiddenFor,
  initiallyHidden,
}: {
  children: React.ReactNode;
  hiddenFor: BillPublicationCategory[];
  initiallyHidden: boolean;
}) {
  return (
    <fieldset
      data-admin-bill-hidden-for={hiddenFor.join(" ")}
      disabled={initiallyHidden}
      style={{ display: initiallyHidden ? "none" : "contents" }}
    >
      {children}
    </fieldset>
  );
}

function KnowledgeSourceField({
  defaultValue,
}: {
  defaultValue?: string | null;
}) {
  return (
    <Field
      label="ナレッジソース"
      hint="AIチャット・AIインタビューに渡す内部用テキストです。"
    >
      <div className="grid gap-3">
        <Textarea
          name="knowledge_source"
          defaultValue={defaultValue ?? ""}
          rows={8}
        />
        <div className="grid gap-2 rounded-md border border-input bg-white p-3">
          <span className="text-xs font-bold text-mirai-text-secondary">
            ファイルから追加
          </span>
          <Input
            type="file"
            name="knowledge_source_file"
            accept=".md,.txt,.docx,text/markdown,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
          <span className="text-xs text-mirai-text-secondary">
            .md / .txt /
            .docxのみ対応。PDFは使えません。選択したファイルの本文は保存時に上のナレッジソースへ追記されます。
          </span>
        </div>
      </div>
    </Field>
  );
}

function normalizeSources(sources: unknown): BillSource[] {
  if (!Array.isArray(sources)) return [];
  return sources.filter(
    (source): source is BillSource =>
      typeof source === "object" &&
      source !== null &&
      "title" in source &&
      typeof source.title === "string"
  );
}

function normalizeMajorCategory(
  majorCategory: string | null | undefined,
  publicationCategory: BillPublicationCategory
): MajorCategoryLabel | typeof BUDGET_OVERALL_MAJOR_CATEGORY {
  if (
    publicationCategory === "budget" &&
    majorCategory === BUDGET_OVERALL_MAJOR_CATEGORY
  ) {
    return BUDGET_OVERALL_MAJOR_CATEGORY;
  }

  return (
    MAJOR_CATEGORY_OPTIONS.find((category) => category.label === majorCategory)
      ?.label ?? "教育🏫"
  );
}

export function AdminBillForm({
  data,
  error,
  returnPath = "/admin/bills",
  saved,
  seoStatus,
  seoWarning,
}: AdminBillFormProps) {
  const bill = data.bill;
  const values = getInitialAdminBillValues(data);
  const initialPublicationCategory = normalizeBillPublicationCategory(
    bill?.publication_category
  );
  const initialMajorCategory = normalizeMajorCategory(
    bill?.major_category,
    initialPublicationCategory
  );
  const initialTagMajorCategory =
    MAJOR_CATEGORY_OPTIONS.find(
      (category) => category.label === initialMajorCategory
    )?.label ?? "教育🏫";
  const isInitialBudget = initialPublicationCategory === "budget";
  const isInitialGeneralQuestion =
    initialPublicationCategory === "general_question";
  const isInitialSimplifiedPublication =
    isInitialBudget || isInitialGeneralQuestion;
  const sources = normalizeSources(bill?.sources);
  const sourceRows = Array.from({
    length: Math.max(5, sources.length + 1),
  }).map((_, index) => ({
    index,
    key: sources[index]
      ? [
          sources[index]?.title,
          sources[index]?.url,
          sources[index]?.source_type,
          sources[index]?.published_at,
          sources[index]?.accessed_at,
        ].join("|")
      : `empty-source-row-${index + 1}`,
    source: sources[index] ?? null,
  }));
  const currentStatusLabel = bill?.status_label ?? "";
  const hasCurrentStatusLabelOption =
    !currentStatusLabel ||
    BILL_STATUS_LABEL_OPTIONS.includes(
      currentStatusLabel as (typeof BILL_STATUS_LABEL_OPTIONS)[number]
    );
  const previewHref =
    bill && data.previewToken
      ? getPreviewPath(bill.id, data.previewToken)
      : null;
  const seoReturnPath = bill
    ? `${routes.adminBillEdit(bill.id)}?return_path=${encodeURIComponent(returnPath)}`
    : null;

  return (
    <form
      action={saveAdminBillAction}
      encType="multipart/form-data"
      data-admin-bill-form=""
      className="flex flex-col gap-6"
    >
      {bill?.id && <input type="hidden" name="id" value={bill.id} />}
      <input type="hidden" name="return_path" value={returnPath} />
      {seoReturnPath && (
        <input type="hidden" name="seo_return_path" value={seoReturnPath} />
      )}
      <div hidden>
        <input
          type="hidden"
          name="preserved_status_note"
          value={bill?.status_note ?? ""}
        />
        <input
          type="hidden"
          name="preserved_thumbnail_url"
          value={bill?.thumbnail_url ?? ""}
        />
        <input
          type="hidden"
          name="preserved_share_thumbnail_url"
          value={bill?.share_thumbnail_url ?? ""}
        />
        <input
          type="hidden"
          name="preserved_is_review_completed"
          value={bill?.is_review_completed ? "true" : "false"}
        />
        <input
          type="hidden"
          name="preserved_is_featured"
          value={bill?.is_featured ? "true" : "false"}
        />
        {data.selectedTagIds.map((tagId) => (
          <input
            key={tagId}
            type="hidden"
            name="preserved_tag_ids"
            value={tagId}
          />
        ))}
        {sources.map((source, index) => (
          <div key={`${source.title}-${index}`}>
            <input
              type="hidden"
              name={`preserved_source_${index}_title`}
              value={source.title}
            />
            <input
              type="hidden"
              name={`preserved_source_${index}_url`}
              value={source.url ?? ""}
            />
            <input
              type="hidden"
              name={`preserved_source_${index}_source_type`}
              value={source.source_type}
            />
            <input
              type="hidden"
              name={`preserved_source_${index}_published_at`}
              value={source.published_at ?? ""}
            />
            <input
              type="hidden"
              name={`preserved_source_${index}_accessed_at`}
              value={source.accessed_at ?? ""}
            />
          </div>
        ))}
      </div>
      <AdminBillPublicationKindController
        budgetMajorCategory={BUDGET_OVERALL_MAJOR_CATEGORY}
        defaultMajorCategory="教育🏫"
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {bill ? "案件を編集" : "新しい案件を追加"}
          </h1>
          <p className="mt-1 text-sm text-mirai-text-secondary">
            下書き保存してからプレビューで確認し、公開状態を切り替えます。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={returnPath as Route}>一覧へ戻る</Link>
          </Button>
          {previewHref && (
            <Button variant="outline" asChild>
              <Link href={previewHref as Route} target="_blank">
                プレビュー
              </Link>
            </Button>
          )}
          <Button type="submit">保存する</Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
          保存しました。
        </div>
      )}
      {seoWarning && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          {seoWarning}
        </div>
      )}
      {seoStatus === "ready" && !seoWarning && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
          案件別SEOをAIで生成しました。
        </div>
      )}
      {data.unknownCouncilorNames.length > 0 && (
        <div className="rounded-lg border border-mirai-star bg-mirai-badge-yellow px-4 py-3 text-sm font-bold text-mirai-text">
          議員・会派マスタに未登録の名前があります:{" "}
          {data.unknownCouncilorNames.join("、")}
          。表記を確認するか、議員・会派マスタに追加してください。
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
          <CardDescription>
            公開ページのヘッダー、一覧カード、ステータス表示に使います。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="公開状態">
            <NativeSelect
              name="publish_status"
              defaultValue={toAdminPublicationStatus(bill?.publish_status)}
              required
            >
              {ADMIN_PUBLICATION_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="公開種別">
            <NativeSelect
              name="publication_category"
              defaultValue={initialPublicationCategory}
              required
            >
              {PUBLICATION_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="md:col-span-2">
            <Field label="正式タイトル">
              <Input name="name" defaultValue={bill?.name ?? ""} required />
            </Field>
          </div>
          <PublicationCategoryHidden
            hiddenFor={["budget", "general_question"]}
            initiallyHidden={isInitialSimplifiedPublication}
          >
            <Field label="案件タイプ">
              <NativeSelect
                name="item_type"
                defaultValue={bill?.item_type ?? "bill"}
                required
              >
                {BILL_ITEM_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="ステータス表示ラベル">
              <NativeSelect
                name="status_label"
                defaultValue={currentStatusLabel}
              >
                <option value="">未設定</option>
                {!hasCurrentStatusLabelOption && (
                  <option value={currentStatusLabel}>
                    {currentStatusLabel}（現在の値）
                  </option>
                )}
                {BILL_STATUS_LABEL_OPTIONS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </PublicationCategoryHidden>
          <Field label="大分類">
            <NativeSelect
              name="major_category"
              defaultValue={initialMajorCategory}
              required
            >
              {MAJOR_CATEGORY_OPTIONS.map((category) => (
                <option key={category.id} value={category.label}>
                  {category.label}
                </option>
              ))}
              {isInitialBudget && (
                <option value={BUDGET_OVERALL_MAJOR_CATEGORY}>
                  {BUDGET_OVERALL_MAJOR_CATEGORY}
                </option>
              )}
            </NativeSelect>
          </Field>
          <AdminDietSessionField
            sessions={data.sessions}
            defaultSessionId={bill?.diet_session_id}
          />
          <Field label="日付">
            <Input
              type="date"
              name="submitted_date"
              defaultValue={values.submittedDate}
            />
          </Field>
          <PublicationCategoryHidden
            hiddenFor={["budget", "general_question"]}
            initiallyHidden={isInitialSimplifiedPublication}
          >
            <Field label="進行ステータス">
              <NativeSelect
                name="status"
                defaultValue={bill?.status ?? "introduced"}
                required
              >
                {BILL_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="ステータス説明文">
              <Input
                name="status_note"
                defaultValue={bill?.status_note ?? ""}
                placeholder="例: 2025-12-01 文教常任委員会で報告"
              />
            </Field>
            <Field
              label="サムネイル"
              hint="画像を選ぶと保存時にWebPへ軽量化してアップロードします。未選択の場合は現在の画像を維持します。"
            >
              <input
                type="hidden"
                name="thumbnail_url"
                value={bill?.thumbnail_url ?? ""}
              />
              <div className="grid gap-3 rounded-md border border-input bg-white p-3">
                {bill?.thumbnail_url && (
                  <div className="flex items-center gap-3">
                    <img
                      src={bill.thumbnail_url}
                      alt="現在のサムネイル"
                      className="h-20 w-28 rounded-md border object-cover"
                    />
                    <span className="text-xs text-mirai-text-secondary">
                      現在のサムネイル
                    </span>
                  </div>
                )}
                <Input
                  type="file"
                  name="thumbnail_file"
                  accept="image/png,image/jpeg,image/webp"
                />
              </div>
            </Field>
            <Field label="共有画像URL">
              <Input
                name="share_thumbnail_url"
                defaultValue={bill?.share_thumbnail_url ?? ""}
              />
            </Field>
          </PublicationCategoryHidden>
        </CardContent>
      </Card>

      {bill && initialPublicationCategory === "report" && (
        <Card>
          <CardHeader>
            <CardTitle>案件別SEO</CardTitle>
            <CardDescription>
              公開されるnormal版の内容からAIが自動生成します。直接編集はできません。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 rounded-md border bg-white p-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="text-xs font-bold text-mirai-text-secondary">
                  生成状態
                </p>
                <p className="mt-1 text-sm font-bold">
                  {getSeoStatusLabel(data.seoProfile?.status)}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-bold text-mirai-text-secondary">
                  SEOタイトル
                </p>
                <p className="mt-1 text-sm">
                  {data.seoProfile?.seoTitle ?? "未生成"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-bold text-mirai-text-secondary">
                  SEO説明文
                </p>
                <p className="mt-1 text-sm leading-6">
                  {data.seoProfile?.seoDescription ?? "未生成"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-bold text-mirai-text-secondary">
                  キーワード
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(data.seoProfile?.seoKeywords.length ?? 0) > 0 ? (
                    data.seoProfile?.seoKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full border border-mirai-light-blue bg-mirai-bg px-3 py-1 text-xs"
                      >
                        {keyword}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm">未生成</span>
                  )}
                </div>
              </div>
              {data.seoProfile?.lastError && (
                <div className="md:col-span-2">
                  <p className="text-xs font-bold text-red-700">直近のエラー</p>
                  <p className="mt-1 text-sm text-red-700">
                    {data.seoProfile.lastError}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-mirai-text-secondary">
                本文やタグを変更した場合は、先に案件を保存してください。
              </p>
              <Button
                type="submit"
                variant="outline"
                formAction={regenerateAdminBillSeoAction}
              >
                <RefreshCw aria-hidden="true" />
                AIで再生成
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>本文</CardTitle>
          <CardDescription>
            本文は必須です。hardが空の場合はnormalと同じ内容を保存します。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4">
            <PublicationCategoryHidden
              hiddenFor={["general_question"]}
              initiallyHidden={isInitialGeneralQuestion}
            >
              <h2 className="text-lg font-bold">normal</h2>
            </PublicationCategoryHidden>
            <PublicationCategoryHidden
              hiddenFor={["budget", "general_question"]}
              initiallyHidden={isInitialSimplifiedPublication}
            >
              <Field label="表示タイトル">
                <Input
                  name="normal_title"
                  defaultValue={values.normalTitle}
                  required
                />
              </Field>
              <Field label="概要">
                <Textarea
                  name="normal_summary"
                  defaultValue={values.normalSummary}
                  rows={3}
                  required
                />
              </Field>
            </PublicationCategoryHidden>
            <Field label="本文（Markdown）">
              <Textarea
                name="normal_content"
                defaultValue={values.normalContent}
                rows={16}
                required
                className="font-mono text-sm"
              />
            </Field>
          </div>
          <PublicationCategoryHidden
            hiddenFor={["general_question"]}
            initiallyHidden={isInitialGeneralQuestion}
          >
            <div className="grid gap-4 border-t pt-6">
              <h2 className="text-lg font-bold">hard</h2>
              <PublicationCategoryHidden
                hiddenFor={["budget"]}
                initiallyHidden={isInitialBudget}
              >
                <Field label="表示タイトル">
                  <Input name="hard_title" defaultValue={values.hardTitle} />
                </Field>
                <Field label="概要">
                  <Textarea
                    name="hard_summary"
                    defaultValue={values.hardSummary}
                    rows={3}
                  />
                </Field>
              </PublicationCategoryHidden>
              <Field label="本文（Markdown）">
                <Textarea
                  name="hard_content"
                  defaultValue={values.hardContent}
                  rows={16}
                  className="font-mono text-sm"
                />
              </Field>
            </div>
          </PublicationCategoryHidden>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ナレッジソース</CardTitle>
          <CardDescription>
            AIチャット・AIインタビューが参照する内部用テキストです。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KnowledgeSourceField defaultValue={bill?.knowledge_source} />
        </CardContent>
      </Card>

      <PublicationCategoryHidden
        hiddenFor={["budget", "general_question"]}
        initiallyHidden={isInitialSimplifiedPublication}
      >
        <Card>
          <CardHeader>
            <CardTitle>タグ・出典</CardTitle>
            <CardDescription>
              小分類タグは固定候補から選びます。出典は公開詳細ページの補足資料として表示されます。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <AdminTagSelector
              majorCategory={initialTagMajorCategory}
              tags={data.tags}
              selectedTagIds={data.selectedTagIds}
            />
            <div className="grid gap-4">
              <h2 className="text-sm font-bold">公式資料・出典</h2>
              {sourceRows.map(({ source, index, key }) => (
                <div
                  key={key}
                  className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1.2fr_1.2fr_0.9fr_0.8fr_0.8fr]"
                >
                  <Input
                    name={`source_${index}_title`}
                    defaultValue={source?.title ?? ""}
                    placeholder="タイトル"
                  />
                  <Input
                    name={`source_${index}_url`}
                    defaultValue={source?.url ?? ""}
                    placeholder="URL"
                  />
                  <NativeSelect
                    name={`source_${index}_source_type`}
                    defaultValue={source?.source_type ?? "official_page"}
                  >
                    {SOURCE_TYPE_OPTIONS.map((sourceType) => (
                      <option key={sourceType} value={sourceType}>
                        {sourceType}
                      </option>
                    ))}
                  </NativeSelect>
                  <Input
                    name={`source_${index}_published_at`}
                    defaultValue={source?.published_at ?? ""}
                    placeholder="公開日"
                  />
                  <Input
                    name={`source_${index}_accessed_at`}
                    defaultValue={source?.accessed_at ?? ""}
                    placeholder="確認日"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </PublicationCategoryHidden>

      <PublicationCategoryHidden
        hiddenFor={["budget", "general_question"]}
        initiallyHidden={isInitialSimplifiedPublication}
      >
        <Card>
          <CardHeader>
            <CardTitle>公開設定</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <ToggleField
              name="is_review_completed"
              label="レビュー完了"
              defaultChecked={bill?.is_review_completed ?? false}
            />
            <ToggleField
              name="is_featured"
              label="注目表示"
              defaultChecked={bill?.is_featured ?? false}
            />
          </CardContent>
        </Card>
      </PublicationCategoryHidden>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" className="shadow-lg">
          保存する
        </Button>
      </div>
    </form>
  );
}

function getSeoStatusLabel(status: string | undefined): string {
  switch (status) {
    case "pending":
      return "生成待ち";
    case "generating":
      return "生成中";
    case "ready":
      return "生成済み";
    case "failed":
      return "生成失敗";
    default:
      return "未生成";
  }
}
