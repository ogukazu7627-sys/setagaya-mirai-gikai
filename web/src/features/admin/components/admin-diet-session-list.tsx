"use client";

import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { routes } from "@/lib/routes";

interface AdminDietSessionListProps {
  sessions: AdminDietSessionListItem[];
}

type AdminDietSessionListItem = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  slug: string | null;
  is_active: boolean;
};

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

export function AdminDietSessionList({ sessions }: AdminDietSessionListProps) {
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
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-mirai-surface">
              <tr className="text-left">
                <th className="px-4 py-3 font-bold">会期名</th>
                <th className="px-4 py-3 font-bold">日程</th>
                <th className="px-4 py-3 font-bold">slug</th>
                <th className="px-4 py-3 font-bold">状態</th>
                <th className="px-4 py-3 font-bold">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => (
                <tr key={session.id} className="border-t align-top">
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
                    {session.is_active ? (
                      <Badge>現在</Badge>
                    ) : (
                      <Badge variant="outline">通常</Badge>
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
