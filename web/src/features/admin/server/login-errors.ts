export const ADMIN_LOGIN_ERROR_MESSAGES = {
  missing_credentials: "メールアドレスとパスワードを入力してください",
  login_failed: "ログインに失敗しました",
  not_admin: "管理者権限がありません",
} as const;

export type AdminLoginErrorCode = keyof typeof ADMIN_LOGIN_ERROR_MESSAGES;

export function getAdminLoginErrorMessage(
  error: string | undefined
): string | undefined {
  if (!error) return undefined;
  if (error in ADMIN_LOGIN_ERROR_MESSAGES) {
    return ADMIN_LOGIN_ERROR_MESSAGES[error as AdminLoginErrorCode];
  }
  return undefined;
}

export function buildAdminLoginErrorPath(
  error: AdminLoginErrorCode,
  next: string
): string {
  const params = new URLSearchParams({ error });
  if (next.startsWith("/admin")) {
    params.set("next", next);
  }
  return `/admin/login?${params.toString()}`;
}
