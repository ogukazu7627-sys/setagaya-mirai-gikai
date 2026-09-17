"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GoogleGIcon } from "@/features/chat/client/components/google-login-gate";
import type { ChatAuthStatus } from "@/features/chat/client/hooks/use-chat-auth";
import { routes } from "@/lib/routes";
import { ReceiptPreference } from "./receipt-preference";

interface PublicCommentConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isStarting: boolean;
  onAgree: (receiptOptIn: boolean) => void;
  authStatus: ChatAuthStatus;
  userEmail?: string;
  authError?: string;
  initialReceiptOptIn: boolean;
  receiptEnabled?: boolean;
  onSignIn: (receiptOptIn: boolean) => Promise<void>;
}

export function PublicCommentConsentModal({
  open,
  onOpenChange,
  isStarting,
  onAgree,
  authStatus,
  userEmail,
  authError,
  initialReceiptOptIn,
  receiptEnabled = true,
  onSignIn,
}: PublicCommentConsentModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [receiptOptIn, setReceiptOptIn] = useState(initialReceiptOptIn);
  const [signingIn, setSigningIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const disabled = isStarting || signingIn;

  useEffect(() => {
    setReceiptOptIn(initialReceiptOptIn);
    if (!open) {
      setAgreed(false);
      setLoginError(null);
    }
  }, [open, initialReceiptOptIn]);

  const signIn = async () => {
    setSigningIn(true);
    setLoginError(null);
    try {
      await onSignIn(receiptOptIn);
    } catch {
      setLoginError("ログインを開始できませんでした。もう一度お試しください。");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!disabled) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto px-5 py-8 sm:px-8">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold text-primary">
            AIインタビュー同意事項
          </DialogTitle>
          <DialogDescription className="sr-only">
            {receiptEnabled
              ? "Googleログイン、回答の保存、任意の控えメールについて確認してください。"
              : "Googleログインと回答の保存について確認してください。"}
          </DialogDescription>
          <div className="mt-6 h-px bg-mirai-gradient" />
        </DialogHeader>

        <div className="mt-6 flex flex-col gap-6">
          <ul className="flex list-disc flex-col gap-3 pl-5 text-sm font-bold leading-[22px] text-gray-800">
            <li>
              不正利用・過剰利用を防ぐため、AIの利用にはGoogleログインが必要です。
            </li>
            <li>
              Googleのメールアドレス・ユーザーIDを取得し、利用者の識別と利用上限の管理に使います。会話はアカウントにひも付けて保存されます。
            </li>
            <li>同意後の回答は、下書き作成のために保存します。</li>
            <li>
              個人情報や、個人・施設・学校が特定できる情報は入力しないでください。
            </li>
            <li>AIの下書きは、最後にあなた自身が確認・編集します。</li>
            <li>公式ページへの提出や匿名公開は自動では行いません。</li>
          </ul>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="public-comment-consent-agree"
              checked={agreed}
              disabled={disabled}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded accent-primary"
            />
            <label
              htmlFor="public-comment-consent-agree"
              className="text-sm font-bold leading-6 text-black"
            >
              <Link
                href={routes.terms() as Route}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                利用規約
              </Link>
              と
              <Link
                href={routes.privacy() as Route}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                プライバシーポリシー
              </Link>
              を確認し、回答の保存に同意します
            </label>
          </div>
          {receiptEnabled && (
            <div className="space-y-3 border-t border-gray-200 pt-4 text-sm leading-6">
              <ReceiptPreference
                checked={receiptOptIn}
                onChange={setReceiptOptIn}
                disabled={disabled}
                userEmail={userEmail}
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {authStatus === "authenticated" ? (
            <p className="break-all text-sm text-mirai-text-secondary">
              ログイン中：{userEmail}
            </p>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => void signIn()}
              disabled={disabled || authStatus === "loading"}
              className="w-full"
            >
              <GoogleGIcon />
              {authStatus === "loading"
                ? "ログイン状態を確認中..."
                : "Google でログイン"}
            </Button>
          )}
          {(authError || loginError) && (
            <p role="alert" className="text-sm text-destructive">
              {authError || loginError}
            </p>
          )}
          <Button
            onClick={() => onAgree(receiptOptIn)}
            disabled={disabled || !agreed || authStatus !== "authenticated"}
            className="w-full"
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                準備中...
              </>
            ) : (
              <>
                同意してはじめる
                <ArrowRight className="ml-2 size-4" />
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={disabled}
            className="w-full"
          >
            同意せずに戻る
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
