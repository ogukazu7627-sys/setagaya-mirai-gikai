import type { BillWithContent } from "@/features/bills/shared/types";

export type ChatBillContext = Pick<
  BillWithContent,
  "bill_content" | "id" | "interview_enabled" | "item_type" | "name"
>;

export type ChatPageContext = {
  type: "home" | "council" | "bill" | "budget-question";
  bills?: Array<{
    id?: string;
    name: string;
    summary?: string;
    tags?: string[];
    isFeatured?: boolean;
  }>;
};
