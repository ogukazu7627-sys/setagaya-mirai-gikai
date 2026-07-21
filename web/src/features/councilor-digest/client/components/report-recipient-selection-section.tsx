"use client";

import { Send } from "lucide-react";
import Image from "next/image";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
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
  const [selectedCouncilorId, setSelectedCouncilorId] = useState("");
  const selectedCouncilor =
    selection.selectedCouncilors[0] ??
    selection.candidates.find((candidate) =>
      selection.selectedCouncilorIds.includes(candidate.id)
    );

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

        {selectedCouncilor ? (
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-mirai-gradient px-4 py-4">
            <CouncilorAvatar candidate={selectedCouncilor} />
            <p className="text-sm font-bold leading-[1.7] text-mirai-text">
              {selectedCouncilor.displayName}
              議員への提出を受け付け済みです。
            </p>
          </div>
        ) : selection.candidates.length === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-[1.8] text-amber-800">
            この案件では委員会メンバー候補を確認できませんでした。管理画面で委員会情報を確認してください。
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-5">
            <input type="hidden" name="report_id" value={reportId} />

            <div className="space-y-3">
              <p className="text-sm font-bold text-mirai-text">
                委員会メンバー
              </p>
              <div className="grid max-h-72 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-2">
                {selection.candidates.map((candidate) => (
                  <CouncilorRadio
                    key={candidate.id}
                    candidate={candidate}
                    checked={candidate.id === selectedCouncilorId}
                    disabled={selection.alreadySentCouncilorIds.includes(
                      candidate.id
                    )}
                    onChange={setSelectedCouncilorId}
                  />
                ))}
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

            <Button
              type="submit"
              disabled={isPending || !selectedCouncilorId}
              className="w-full"
            >
              <Send className="size-5" />
              {isPending ? "保存しています..." : "この議員に伝える"}
            </Button>
          </form>
        )}

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
      </div>
    </section>
  );
}

function CouncilorRadio({
  candidate,
  checked,
  disabled,
  onChange,
}: {
  candidate: CouncilorRecipientCandidate;
  checked: boolean;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm font-bold text-mirai-text transition-colors ${
        checked
          ? "border-primary bg-primary/10"
          : "border-gray-200 bg-white hover:bg-mirai-surface-gray"
      } ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
    >
      <input
        type="radio"
        name="councilor_id"
        value={candidate.id}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(candidate.id)}
        className="size-4"
      />
      <CouncilorAvatar candidate={candidate} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate">{candidate.displayName}議員</span>
        <span className="text-xs text-mirai-text-secondary">
          {disabled ? "送信済み" : "委員会メンバー"}
        </span>
      </span>
    </label>
  );
}

function CouncilorAvatar({
  candidate,
}: {
  candidate: CouncilorRecipientCandidate;
}) {
  if (!candidate.iconUrl) {
    return (
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-mirai-surface-muted text-xs text-mirai-text-secondary">
        顔写真
      </span>
    );
  }

  return (
    <Image
      src={candidate.iconUrl}
      alt=""
      width={48}
      height={48}
      className="size-12 shrink-0 rounded-full object-cover"
    />
  );
}
