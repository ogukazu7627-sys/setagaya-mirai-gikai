import type { Route } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createAdminAuthClient,
  isAdminAuthBypassed,
  isAdminUser,
} from "@/features/admin/server/auth";
import { loginAdminAction } from "@/features/admin/server/actions";

interface AdminLoginPageProps {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
}

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = await searchParams;
  if (isAdminAuthBypassed) {
    redirect("/admin/bills" as Route);
  }

  const supabase = await createAdminAuthClient();
  const { data } = await supabase.auth.getUser();

  if (data.user && isAdminUser(data.user)) {
    redirect(
      (params?.next?.startsWith("/admin")
        ? params.next
        : "/admin/bills") as Route
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-mirai-surface-light px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">管理画面ログイン</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={loginAdminAction} className="flex flex-col gap-4">
            <input
              type="hidden"
              name="next"
              value={params?.next ?? "/admin/bills"}
            />
            {params?.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {params.error}
              </div>
            )}
            <div className="flex flex-col gap-1.5 text-sm font-bold">
              <label htmlFor="admin-email">メールアドレス</label>
              <Input
                id="admin-email"
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="admin@example.com"
              />
            </div>
            <div className="flex flex-col gap-1.5 text-sm font-bold">
              <label htmlFor="admin-password">パスワード</label>
              <Input
                id="admin-password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder="admin123456"
              />
            </div>
            <Button type="submit">ログイン</Button>
            <p className="text-xs leading-relaxed text-mirai-text-secondary">
              ローカル開発ではseedの管理者ユーザーを使います。
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
