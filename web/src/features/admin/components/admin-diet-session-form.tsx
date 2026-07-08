import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { routes } from "@/lib/routes";
import { saveAdminDietSessionAction } from "../server/actions";
import type { AdminDietSession } from "../server/diet-session-admin";

interface AdminDietSessionFormProps {
  session?: AdminDietSession | null;
  submitLabel?: string;
}

function Field({
  label,
  children,
  hint,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  htmlFor: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && (
        <span className="text-xs text-mirai-text-secondary">{hint}</span>
      )}
    </div>
  );
}

export function AdminDietSessionForm({
  session,
  submitLabel = "会期を追加",
}: AdminDietSessionFormProps) {
  return (
    <form action={saveAdminDietSessionAction} className="grid gap-4">
      {session?.id && <input type="hidden" name="id" value={session.id} />}
      <Field label="会期名" htmlFor="diet-session-name">
        <Input
          id="diet-session-name"
          name="name"
          defaultValue={session?.name ?? ""}
          placeholder="例: 令和8年第1回定例会"
          required
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="開始日" htmlFor="diet-session-start-date">
          <Input
            id="diet-session-start-date"
            type="date"
            name="start_date"
            defaultValue={session?.start_date ?? ""}
            required
          />
        </Field>
        <Field label="終了日" htmlFor="diet-session-end-date">
          <Input
            id="diet-session-end-date"
            type="date"
            name="end_date"
            defaultValue={session?.end_date ?? ""}
            required
          />
        </Field>
      </div>
      <Field
        label="URL用スラッグ（任意）"
        htmlFor="diet-session-slug"
        hint="slugがある会期は、案件詳細の会期名から会期別一覧へリンクできます。"
      >
        <Input
          id="diet-session-slug"
          name="slug"
          defaultValue={session?.slug ?? ""}
          placeholder="例: 2026-1"
        />
      </Field>
      <label className="flex items-center justify-between gap-4 rounded-lg border bg-white px-4 py-3 text-sm font-bold">
        <span>現在の会期にする</span>
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={session?.is_active ?? false}
          className="h-5 w-5 accent-primary"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit">{submitLabel}</Button>
        {session?.id && (
          <Button variant="outline" asChild>
            <Link href={routes.adminDietSessions() as Route}>一覧に戻る</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
