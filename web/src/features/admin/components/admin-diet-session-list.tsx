"use client";

import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { routes } from "@/lib/routes";

interface AdminDietSessionListProps {
  sessions: AdminDietSessionListItem[];
  activeAction: SaveActiveDietSessionsAction;
}

type AdminDietSessionListItem = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  slug: string | null;
  is_active: boolean;
};

type SaveActiveDietSessionsAction = (formData: FormData) => Promise<void>;

function matchesSession(session: AdminDietSessionListItem, query: string) {
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

function ActiveSessionCheckbox({
  session,
  action,
}: {
  session: AdminDietSessionListItem;
  action: SaveActiveDietSessionsAction;
}) {
  return (
    <form action={action}>
      <input
        type="checkbox"
        name="active_session_ids"
        value={session.id}
        defaultChecked={session.is_active}
        aria-label={`${session.name}を現在の会期にする`}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-5 w-5 accent-primary"
      />
    </form>
  );
}

export function AdminDietSessionList({
  sessions,
  activeAction,
}: AdminDietSessionListProps) {
  const [query, setQuery] = useState("");
  const filteredSessions = useMemo(() => {
    const trimmed = query.trim();
    return trimmed
      ? sessions.filter((session) => matchesSession(session, trimmed))
      : sessions;
  }, [query, sessions]);

  return (
    <div className="grid gap-3">
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="会期名・日付・slugで検索"
      />
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead className="bg-mirai-surface">
              <tr className="text-left">
                <th className="px-4 py-3 font-bold">現在</th>
                <th className="px-4 py-3 font-bold">会期名</th>
                <th className="px-4 py-3 font-bold">日程</th>
                <th className="px-4 py-3 font-bold">slug</th>
                <th className="px-4 py-3 font-bold">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => (
                <tr key={session.id} className="border-t align-top">
                  <td className="px-4 py-4">
                    <ActiveSessionCheckbox
                      session={session}
                      action={activeAction}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold leading-relaxed">{session.name}</p>
                  </td>
                  <td className="px-4 py-4">
                    {session.start_date} - {session.end_date}
                  </td>
                  <td className="px-4 py-4">
                    {session.slug ? (
                      <code className="rounded bg-mirai-surface px-2 py-1 text-xs">
                        {session.slug}
                      </code>
                    ) : (
                      <span className="text-mirai-text-secondary">未設定</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={routes.adminDietSessionEdit(session.id) as Route}
                      >
                        編集
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSessions.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-mirai-text-secondary">
            一致する会期がありません。
          </div>
        )}
      </div>
    </div>
  );
}
