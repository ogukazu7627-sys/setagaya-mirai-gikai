"use client";

import { Search, Send } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveReportRecipients } from "../../server/actions/save-report-recipients";
import type {
  CouncilorRecipientCandidate,
  ReportRecipientSelection,
  SaveReportRecipientsResult,
} from "../../shared/types";

const INITIAL_STATE: SaveReportRecipientsResult = {
  success: false,
  message: "",
};

type ReportRecipientSelectionSectionProps = {
  reportId: string;
  selection: ReportRecipientSelection;
};

export function ReportRecipientSelectionSection({
  reportId,
  selection,
}: ReportRecipientSelectionSectionProps) {
  const [state, formAction, isPending] = useActionState(
    saveReportRecipients,
    INITIAL_STATE
  );
  const [query, setQuery] = useState("");

  const recommended = selection.candidates.filter(
    (candidate) => candidate.recommended
  );
  const recommendedIds = useMemo(
    () => new Set(recommended.map((candidate) => candidate.id)),
    [recommended]
  );
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const candidates = selection.candidates.filter(
      (candidate) => !recommendedIds.has(candidate.id)
    );
    if (!normalizedQuery) {
      return candidates;
    }

    return candidates.filter((candidate) =>
      candidate.displayName.toLowerCase().includes(normalizedQuery)
    );
  }, [query, recommendedIds, selection.candidates]);

  return (
    <section className="rounded-lg border border-primary/20 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <h3 className="text-base font-bold text-mirai-text">
            誰にこの意見を伝えたいですか？
          </h3>
          <p className="text-sm font-bold leading-[1.8] text-mirai-text-secondary">
            選んだ議員ごとに、運営者が内容を確認して週次レポート形式で届けます。ユーザーの作業はここで完了です。
          </p>
        </div>

        {state.message && (
          <p
            className={`rounded-lg border px-4 py-3 text-sm font-bold leading-[1.7] ${
              state.success
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {state.message}
          </p>
        )}

        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="report_id" value={reportId} />

          {recommended.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-mirai-text">おすすめ候補</p>
              <div className="grid gap-2">
                {recommended.map((candidate) => (
                  <CouncilorCheckbox
                    key={`recommended-${candidate.id}`}
                    candidate={candidate}
                    defaultChecked={selection.selectedCouncilorIds.includes(
                      candidate.id
                    )}
                    disabled={selection.alreadySentCouncilorIds.includes(
                      candidate.id
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label
              htmlFor="councilor-search"
              className="text-sm font-bold text-mirai-text"
            >
              全議員から検索
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mirai-text-secondary" />
              <Input
                id="councilor-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="議員名で検索"
                className="pl-9"
              />
            </div>
            <div className="grid max-h-72 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {filtered.map((candidate) => (
                <CouncilorCheckbox
                  key={candidate.id}
                  candidate={candidate}
                  defaultChecked={selection.selectedCouncilorIds.includes(
                    candidate.id
                  )}
                  disabled={selection.alreadySentCouncilorIds.includes(
                    candidate.id
                  )}
                />
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-sm font-bold text-mirai-text-secondary">
                  一致する議員が見つかりません。
                </p>
              )}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-mirai-surface px-4 py-3 text-sm font-bold leading-[1.7] text-mirai-text">
            <input
              type="checkbox"
              name="share_contact"
              defaultChecked={selection.shareContact}
              className="mt-1 size-4"
            />
            <span>
              議員向けレポートにGoogleアカウントの名前・メールアドレスを含めることに同意します。
            </span>
          </label>

          <Button type="submit" disabled={isPending} className="w-full">
            <Send className="size-5" />
            {isPending ? "保存しています..." : "この議員に伝える"}
          </Button>
        </form>
      </div>
    </section>
  );
}

function CouncilorCheckbox({
  candidate,
  defaultChecked,
  disabled,
}: {
  candidate: CouncilorRecipientCandidate;
  defaultChecked: boolean;
  disabled: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm font-bold text-mirai-text">
      <input
        type="checkbox"
        name="councilor_id"
        value={candidate.id}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="size-4"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span>{candidate.displayName}議員</span>
        <span className="text-xs text-mirai-text-secondary">
          {disabled ? "送信済み" : candidate.sourceLabel}
        </span>
      </span>
    </label>
  );
}
