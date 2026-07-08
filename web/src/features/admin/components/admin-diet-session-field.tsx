"use client";

import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { routes } from "@/lib/routes";

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
          保存済みの会期を検索して選んでください。会期がない場合は{" "}
          <Link
            href={routes.adminDietSessions() as Route}
            className="font-bold text-primary underline-offset-4 hover:underline"
          >
            会期管理
          </Link>{" "}
          で追加してください。
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
          <div className="px-3 py-3 text-sm text-mirai-text-secondary">
            <p>一致する会期がありません。</p>
            <Link
              href={routes.adminDietSessions() as Route}
              className="mt-1 inline-block font-bold text-primary underline-offset-4 hover:underline"
            >
              会期管理で追加してください
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
