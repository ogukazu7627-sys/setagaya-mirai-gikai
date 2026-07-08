"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AdminDietSessionOption = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  slug: string | null;
  is_active: boolean;
};

interface AdminDietSessionFieldProps {
  sessions: AdminDietSessionOption[];
  defaultSessionId?: string | null;
}

function formatSessionLabel(session: AdminDietSessionOption) {
  const activeLabel = session.is_active ? "（現在）" : "";
  return `${session.name} ${session.start_date} - ${session.end_date}${activeLabel}`;
}

function matchesSession(session: AdminDietSessionOption, query: string) {
  const haystack = [
    session.name,
    session.start_date,
    session.end_date,
    session.slug ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export function AdminDietSessionField({
  sessions,
  defaultSessionId,
}: AdminDietSessionFieldProps) {
  const defaultSession =
    sessions.find((session) => session.id === defaultSessionId) ?? null;
  const [selectedSessionId, setSelectedSessionId] = useState(
    defaultSession?.id ?? ""
  );
  const [query, setQuery] = useState(
    defaultSession ? formatSessionLabel(defaultSession) : ""
  );

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? null;
  const filteredSessions = useMemo(() => {
    const trimmed = query.trim();
    const matched = trimmed
      ? sessions.filter((session) => matchesSession(session, trimmed))
      : sessions;
    return matched.slice(0, 12);
  }, [query, sessions]);

  return (
    <div className="flex flex-col gap-2 md:col-span-2">
      <span className="text-sm font-bold">会期</span>
      <input type="hidden" name="diet_session_id" value={selectedSessionId} />

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedSessionId("");
          }}
          placeholder="既存の会期を検索"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setQuery("");
            setSelectedSessionId("");
          }}
        >
          未設定にする
        </Button>
      </div>

      {selectedSession ? (
        <p className="text-xs font-bold text-mirai-text-secondary">
          選択中: {formatSessionLabel(selectedSession)}
        </p>
      ) : (
        <p className="text-xs text-mirai-text-secondary">
          既存会期を検索して選ぶか、下で新しい会期を追加してください。
        </p>
      )}

      <div className="max-h-52 overflow-y-auto rounded-md border border-input bg-white">
        {filteredSessions.length > 0 ? (
          filteredSessions.map((session) => (
            <button
              type="button"
              key={session.id}
              onClick={() => {
                setSelectedSessionId(session.id);
                setQuery(formatSessionLabel(session));
              }}
              className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-mirai-surface"
            >
              <span className="font-bold">{session.name}</span>
              <span className="ml-2 text-xs text-mirai-text-secondary">
                {session.start_date} - {session.end_date}
                {session.is_active ? " / 現在" : ""}
              </span>
            </button>
          ))
        ) : (
          <p className="px-3 py-3 text-sm text-mirai-text-secondary">
            一致する会期がありません。
          </p>
        )}
      </div>

      <details className="pt-2">
        <summary className="cursor-pointer text-sm font-bold text-primary">
          新しい会期を追加
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label
            className="flex flex-col gap-1.5"
            htmlFor="new_diet_session_name"
          >
            <span className="text-xs font-bold">会期名</span>
            <Input
              id="new_diet_session_name"
              name="new_diet_session_name"
              placeholder="例: 令和8年第2回区議会定例会"
            />
          </label>
          <label
            className="flex flex-col gap-1.5"
            htmlFor="new_diet_session_slug"
          >
            <span className="text-xs font-bold">URL用スラッグ（任意）</span>
            <Input
              id="new_diet_session_slug"
              name="new_diet_session_slug"
              placeholder="例: 2026-2"
            />
          </label>
          <label
            className="flex flex-col gap-1.5"
            htmlFor="new_diet_session_start_date"
          >
            <span className="text-xs font-bold">開始日</span>
            <Input
              id="new_diet_session_start_date"
              type="date"
              name="new_diet_session_start_date"
            />
          </label>
          <label
            className="flex flex-col gap-1.5"
            htmlFor="new_diet_session_end_date"
          >
            <span className="text-xs font-bold">終了日</span>
            <Input
              id="new_diet_session_end_date"
              type="date"
              name="new_diet_session_end_date"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold md:col-span-2">
            <input
              type="checkbox"
              name="new_diet_session_is_active"
              className="h-5 w-5 accent-primary"
            />
            この会期を現在の会期にする
          </label>
          <p className="text-xs text-mirai-text-secondary md:col-span-2">
            新しい会期を入力して保存すると、この案件には新しく作った会期が紐づきます。
          </p>
        </div>
      </details>
    </div>
  );
}
