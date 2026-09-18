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
import { routes } from "@/lib/routes";

export function PublicCommentConsentModal({
  open,
  onOpenChange,
  isStarting,
  onAgree,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isStarting: boolean;
  onAgree: () => void;
}) {
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!open) setAgreed(false);
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isStarting) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto px-5 py-8 sm:px-8">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold text-primary">
            AIインタビュー同意事項
          </DialogTitle>
          <DialogDescription className="sr-only">
            回答の保存と、最終文章の確認に必要なGoogleログインについて確認してください。
          </DialogDescription>
          <div className="mt-6 h-px bg-mirai-gradient" />
        </DialogHeader>

        <div className="mt-6 flex flex-col gap-6">
          <ul className="flex list-disc flex-col gap-3 pl-5 text-sm font-bold leading-[22px] text-gray-800">
            <li>
              インタビューはログインなしで開始できます。回答は一時的な匿名IDにひも付けて保存します。
            </li>
            <li>
              不正利用・過剰利用を防ぐため、完成した文章の表示にはGoogleログインが必要です。
            </li>
            <li>
              ログイン後はGoogleのユーザーID・メールアドレスを利用者の識別と利用上限の管理に使い、今回の回答と下書きを引き継ぎます。
            </li>
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
              disabled={isStarting}
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
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <Button
            onClick={onAgree}
            disabled={isStarting || !agreed}
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
            disabled={isStarting}
            className="w-full"
          >
            同意せずに戻る
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
