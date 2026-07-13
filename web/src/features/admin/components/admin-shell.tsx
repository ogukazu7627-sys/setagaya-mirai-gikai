import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { logoutAdminAction } from "../server/actions";

interface AdminShellProps {
  user: { email?: string | null };
  children: React.ReactNode;
}

export function AdminShell({ user, children }: AdminShellProps) {
  return (
    <div className="min-h-dvh bg-mirai-surface-light text-mirai-text">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link
            href={routes.adminBills() as Route}
            className="text-lg font-bold"
          >
            みらい議会＠世田谷区 管理画面
          </Link>
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-2 text-sm font-bold">
              <Link
                href={routes.adminBills() as Route}
                className="hover:underline"
              >
                案件
              </Link>
              <Link
                href={routes.adminDietSessions() as Route}
                className="hover:underline"
              >
                会期
              </Link>
              <Link
                href={routes.adminIssueReports() as Route}
                className="hover:underline"
              >
                問い合わせ
              </Link>
            </nav>
            <span className="hidden text-xs text-mirai-text-secondary sm:inline">
              {user.email}
            </span>
            <form action={logoutAdminAction}>
              <Button variant="outline" size="sm" type="submit">
                ログアウト
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
