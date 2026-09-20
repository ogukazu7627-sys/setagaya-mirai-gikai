"use client";

import { PUBLIC_COMMENT_EVENT_INVITATION_LABEL } from "../shared/consent";

export function EventInvitationPreference({
  checked,
  onChange,
  disabled,
  userEmail,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
  userEmail?: string;
}) {
  return (
    <div className="space-y-2 text-sm leading-6">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 size-4 shrink-0 accent-primary"
        />
        <span>{PUBLIC_COMMENT_EVENT_INVITATION_LABEL}</span>
      </label>
      <p className="break-all pl-7 text-xs text-mirai-text-secondary">
        {userEmail
          ? `送信先：${userEmail}`
          : "送信先：Googleログインのメールアドレス"}
      </p>
      <p className="pl-7 text-xs text-mirai-text-secondary">
        任意です。完了前に変更できます。今回の活動に関する案内のみを送り、インタビューの回答内容は含めません。
      </p>
    </div>
  );
}
