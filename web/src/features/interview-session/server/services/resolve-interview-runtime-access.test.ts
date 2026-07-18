import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getBillById: vi.fn(),
  getBillByIdAdmin: vi.fn(),
  getInterviewConfig: vi.fn(),
  getInterviewConfigAdmin: vi.fn(),
  validatePreviewToken: vi.fn(),
}));

// @ts-expect-error Vitest supports virtual mocks for Next's server-only marker.
vi.mock("server-only", () => ({}), { virtual: true });

vi.mock("@/features/bills/server/loaders/get-bill-by-id", () => ({
  getBillById: mocks.getBillById,
}));

vi.mock("@/features/bills/server/loaders/get-bill-by-id-admin", () => ({
  getBillByIdAdmin: mocks.getBillByIdAdmin,
}));

vi.mock("@/features/bills/server/loaders/validate-preview-token", () => ({
  validatePreviewToken: mocks.validatePreviewToken,
}));

vi.mock(
  "@/features/interview-config/server/loaders/get-interview-config",
  () => ({
    getInterviewConfig: mocks.getInterviewConfig,
  })
);

vi.mock(
  "@/features/interview-config/server/loaders/get-interview-config-admin",
  () => ({
    getInterviewConfigAdmin: mocks.getInterviewConfigAdmin,
  })
);

import { resolveInterviewRuntimeAccess } from "./resolve-interview-runtime-access";

const publicBill = {
  id: "bill-1",
  name: "テスト案件",
  interview_enabled: true,
  tags: [],
};

const publicConfig = {
  id: "config-1",
  bill_id: "bill-1",
  status: "public",
  deleted_at: null,
};

describe("resolveInterviewRuntimeAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBillById.mockResolvedValue(publicBill);
    mocks.getInterviewConfig.mockResolvedValue(publicConfig);
  });

  it("公開案件かつインタビューONならpublic accessを返す", async () => {
    const result = await resolveInterviewRuntimeAccess({ billId: "bill-1" });

    expect(result).toMatchObject({
      mode: "public",
      bill: publicBill,
      interviewConfig: publicConfig,
    });
    expect(mocks.getBillByIdAdmin).not.toHaveBeenCalled();
  });

  it("公開案件でもinterview_enabled=falseならnullを返す", async () => {
    mocks.getBillById.mockResolvedValue({
      ...publicBill,
      interview_enabled: false,
    });

    const result = await resolveInterviewRuntimeAccess({ billId: "bill-1" });

    expect(result).toBeNull();
  });

  it("previewTokenが有効なら管理者ローダーでpreview accessを返す", async () => {
    const adminBill = { ...publicBill, interview_enabled: false };
    const adminConfig = { ...publicConfig, status: "draft" };
    mocks.validatePreviewToken.mockResolvedValue(true);
    mocks.getBillByIdAdmin.mockResolvedValue(adminBill);
    mocks.getInterviewConfigAdmin.mockResolvedValue(adminConfig);

    const result = await resolveInterviewRuntimeAccess({
      billId: "bill-1",
      previewToken: "preview-token-1",
    });

    expect(result).toMatchObject({
      mode: "preview",
      bill: adminBill,
      interviewConfig: adminConfig,
    });
    expect(mocks.getBillById).not.toHaveBeenCalled();
  });

  it("previewTokenが無効なら管理者ローダーを呼ばずnullを返す", async () => {
    mocks.validatePreviewToken.mockResolvedValue(false);

    const result = await resolveInterviewRuntimeAccess({
      billId: "bill-1",
      previewToken: "bad-token",
    });

    expect(result).toBeNull();
    expect(mocks.getBillByIdAdmin).not.toHaveBeenCalled();
    expect(mocks.getInterviewConfigAdmin).not.toHaveBeenCalled();
  });
});
