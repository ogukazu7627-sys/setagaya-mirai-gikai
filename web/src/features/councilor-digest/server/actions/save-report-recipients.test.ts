import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findReportOwnerAndBill: vi.fn(),
  getChatSupabaseUser: vi.fn(),
  listRecipientCandidates: vi.fn(),
  replacePendingReportRecipients: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/features/chat/server/utils/supabase-server", () => ({
  getChatSupabaseUser: mocks.getChatSupabaseUser,
}));

vi.mock("../repositories/report-recipient-repository", () => ({
  findReportOwnerAndBill: mocks.findReportOwnerAndBill,
  listRecipientCandidates: mocks.listRecipientCandidates,
  replacePendingReportRecipients: mocks.replacePendingReportRecipients,
}));

import { saveReportRecipients } from "./save-report-recipients";

const INITIAL_STATE = {
  success: false,
  message: "",
};

function createForm(councilorIds: string[], shareContact = false) {
  const formData = new FormData();
  formData.set("report_id", "report-1");
  for (const id of councilorIds) {
    formData.append("councilor_id", id);
  }
  if (shareContact) {
    formData.set("share_contact", "on");
  }
  return formData;
}

describe("saveReportRecipients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getChatSupabaseUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "user@example.com",
          user_metadata: { name: "利用者 太郎" },
        },
      },
      error: null,
    });
    mocks.findReportOwnerAndBill.mockResolvedValue({
      reportId: "report-1",
      billId: "bill-1",
      userId: "user-1",
    });
    mocks.listRecipientCandidates.mockResolvedValue([
      {
        id: "councilor-1",
        displayName: "世田谷 花子",
        iconUrl: "https://example.com/icon.jpg",
        source: "committee_member",
        sourceLabel: "委員会メンバー",
        recommended: true,
      },
    ]);
  });

  it("議員未選択の場合は保存しない", async () => {
    const result = await saveReportRecipients(INITIAL_STATE, createForm([]));

    expect(result).toEqual({
      success: false,
      message: "伝えたい議員を1人以上選んでください。",
    });
    expect(mocks.replacePendingReportRecipients).not.toHaveBeenCalled();
  });

  it("複数議員が送られた場合は保存しない", async () => {
    const result = await saveReportRecipients(
      INITIAL_STATE,
      createForm(["councilor-1", "councilor-2"])
    );

    expect(result).toEqual({
      success: false,
      message: "議員は1人だけ選択してください。",
    });
    expect(mocks.replacePendingReportRecipients).not.toHaveBeenCalled();
  });

  it("委員会メンバー候補がない案件では保存しない", async () => {
    mocks.listRecipientCandidates.mockResolvedValue([]);

    const result = await saveReportRecipients(
      INITIAL_STATE,
      createForm(["councilor-1"])
    );

    expect(result).toEqual({
      success: false,
      message:
        "この案件では委員会メンバー候補を確認できませんでした。管理画面で委員会情報を確認してください。",
    });
    expect(mocks.replacePendingReportRecipients).not.toHaveBeenCalled();
  });

  it("委員会メンバー候補外の議員は保存しない", async () => {
    const result = await saveReportRecipients(
      INITIAL_STATE,
      createForm(["councilor-2"])
    );

    expect(result).toEqual({
      success: false,
      message: "この案件で選択できる委員会メンバーから選んでください。",
    });
    expect(mocks.replacePendingReportRecipients).not.toHaveBeenCalled();
  });

  it("委員会メンバー1人だけを保存する", async () => {
    const result = await saveReportRecipients(
      INITIAL_STATE,
      createForm(["councilor-1"], true)
    );

    expect(result.success).toBe(true);
    const params = mocks.replacePendingReportRecipients.mock.calls[0]?.[0];
    expect(params).toMatchObject({
      reportId: "report-1",
      userId: "user-1",
      councilorIds: ["councilor-1"],
      shareContact: true,
      contactName: "利用者 太郎",
      contactEmail: "user@example.com",
    });
    expect(params.sourceByCouncilorId.get("councilor-1")).toBe(
      "committee_member"
    );
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });
});
