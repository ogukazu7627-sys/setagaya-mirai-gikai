import Link from "next/link";
import type { Route } from "next";
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
import { AdminTagSelector } from "./admin-tag-selector";
import { saveAdminBillAction } from "../server/actions";
import {
  BILL_ITEM_TYPE_OPTIONS,
  BILL_STATUS_LABEL_OPTIONS,
  BILL_STATUS_OPTIONS,
  getInitialAdminBillValues,
  getPreviewPath,
  PUBLISH_STATUS_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  type AdminBillFormData,
} from "../server/bill-admin";

interface AdminBillFormProps {
  data: AdminBillFormData;
  error?: string;
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
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">{label}</span>
      {children}
      {hint && (
        <span className="text-xs text-mirai-text-secondary">{hint}</span>
      )}
    </label>
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

export function AdminBillForm({ data, error, saved }: AdminBillFormProps) {
  const bill = data.bill;
  const values = getInitialAdminBillValues(data);
  const sources = normalizeSources(bill?.sources);
  const sourceRows = Array.from({
    length: Math.max(5, sources.length + 1),
  }).map((_, index) => sources[index] ?? null);
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
    <form action={saveAdminBillAction} className="flex flex-col gap-6">
      {bill?.id && <input type="hidden" name="id" value={bill.id} />}

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
            <Link href={"/admin/bills" as Route}>一覧へ戻る</Link>
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
          <Field label="会期">
            <NativeSelect
              name="diet_session_id"
              defaultValue={bill?.diet_session_id}
            >
              <option value="">未設定</option>
              {data.sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                  {session.is_active ? "（現在）" : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
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
          <Field label="サムネイルURL">
            <Input
              name="thumbnail_url"
              defaultValue={bill?.thumbnail_url ?? ""}
            />
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
            タグは案件編集の中で選択・追加します。出典は詳細ページ下部に表示されます。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <AdminTagSelector
            tags={data.tags}
            selectedTagIds={data.selectedTagIds}
            defaultMajorCategory={bill?.major_category}
          />
          <Field label="ナレッジソース">
            <Textarea
              name="knowledge_source"
              defaultValue={bill?.knowledge_source ?? ""}
              rows={8}
            />
          </Field>
          <div className="grid gap-4">
            <h2 className="text-sm font-bold">公式資料・出典</h2>
            {sourceRows.map((source, index) => (
              <div
                key={index}
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
          <ToggleField
            name="interview_enabled"
            label="AIインタビュー表示"
            defaultChecked={bill?.interview_enabled ?? false}
          />
          <ToggleField
            name="use_knowledge_source_in_chat"
            label="チャットでナレッジを使う"
            defaultChecked={bill?.use_knowledge_source_in_chat ?? false}
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
