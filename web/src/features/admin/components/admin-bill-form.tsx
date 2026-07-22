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
import type { BillSource } from "@/features/bills/shared/types";
import { MAJOR_CATEGORY_OPTIONS } from "@/features/bills/shared/types";
import { saveAdminBillAction } from "../server/actions";
import {
  type AdminBillFormData,
  BILL_ITEM_TYPE_OPTIONS,
  BILL_STATUS_LABEL_OPTIONS,
  BILL_STATUS_OPTIONS,
  getInitialAdminBillValues,
  getPreviewPath,
  PUBLISH_STATUS_OPTIONS,
  SOURCE_TYPE_OPTIONS,
} from "../server/bill-admin";
import { AdminDietSessionField } from "./admin-diet-session-field";
import { AdminTagSelector } from "./admin-tag-selector";

interface AdminBillFormProps {
  data: AdminBillFormData;
  error?: string;
  returnPath?: string;
  saved?: boolean;
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

export function AdminBillForm({
  data,
  error,
  returnPath = "/admin/bills",
  saved,
}: AdminBillFormProps) {
  const bill = data.bill;
  const values = getInitialAdminBillValues(data);
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

  return (
    <form
      action={saveAdminBillAction}
      encType="multipart/form-data"
      className="flex flex-col gap-6"
    >
      {bill?.id && <input type="hidden" name="id" value={bill.id} />}
      <input type="hidden" name="return_path" value={returnPath} />

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
              defaultValue={bill?.publish_status ?? "draft"}
              required
            >
              {PUBLISH_STATUS_OPTIONS.map((option) => (
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
            <NativeSelect name="status_label" defaultValue={currentStatusLabel}>
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
          <Field label="大分類">
            <NativeSelect
              name="major_category"
              defaultValue={bill?.major_category ?? "教育🏫"}
              required
            >
              {MAJOR_CATEGORY_OPTIONS.map((category) => (
                <option key={category.id} value={category.label}>
                  {category.label}
                </option>
              ))}
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
            hint="画像を選ぶと保存時にアップロードします。未選択の場合は現在の画像を維持します。"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>本文</CardTitle>
          <CardDescription>
            normalは必須です。hardが空の場合はnormalをコピーして保存します。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4">
            <h2 className="text-lg font-bold">normal</h2>
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
            <Field label="Markdown本文">
              <Textarea
                name="normal_content"
                defaultValue={values.normalContent}
                rows={16}
                required
                className="font-mono text-sm"
              />
            </Field>
          </div>
          <div className="grid gap-4 border-t pt-6">
            <h2 className="text-lg font-bold">hard</h2>
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
            <Field label="Markdown本文">
              <Textarea
                name="hard_content"
                defaultValue={values.hardContent}
                rows={16}
                className="font-mono text-sm"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>タグ・出典・チャット情報</CardTitle>
          <CardDescription>
            小分類タグは案件ごとに入力します。出典は公開詳細ページの補足資料として表示されます。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <AdminTagSelector
            tags={data.tags}
            selectedTagIds={data.selectedTagIds}
          />
          <Field
            label="ナレッジソース"
            hint="AIチャット・AIインタビューに渡す内部用テキストです。"
          >
            <div className="grid gap-3">
              <Textarea
                name="knowledge_source"
                defaultValue={bill?.knowledge_source ?? ""}
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

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" className="shadow-lg">
          保存する
        </Button>
      </div>
    </form>
  );
}
