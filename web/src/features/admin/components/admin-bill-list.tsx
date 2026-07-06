import Link from "next/link";
import type { Route } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getPreviewPath,
  type AdminBillListItem,
  formatAdminDate,
} from "../server/bill-admin";
import { getBillItemTypeLabel } from "@/features/bills/shared/types";

interface AdminBillListProps {
  bills: Array<AdminBillListItem & { previewToken?: string | null }>;
}

function publishStatusLabel(status: string) {
  switch (status) {
    case "published":
      return "公開";
    case "coming_soon":
      return "近日公開";
    case "draft":
    default:
      return "下書き";
  }
}

export function AdminBillList({ bills }: AdminBillListProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead className="bg-mirai-surface">
            <tr className="text-left">
              <th className="px-4 py-3 font-bold">案件</th>
              <th className="px-4 py-3 font-bold">種別</th>
              <th className="px-4 py-3 font-bold">大分類</th>
              <th className="px-4 py-3 font-bold">状態</th>
              <th className="px-4 py-3 font-bold">公開</th>
              <th className="px-4 py-3 font-bold">更新日</th>
              <th className="px-4 py-3 font-bold">操作</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => {
              const title =
                bill.bill_contents?.find(
                  (content) => content.difficulty_level === "normal"
                )?.title ?? bill.name;
              return (
                <tr key={bill.id} className="border-t align-top">
                  <td className="max-w-[360px] px-4 py-4">
                    <p className="font-bold leading-relaxed">{title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-mirai-text-secondary">
                      {bill.name}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant="outline">
                      {getBillItemTypeLabel(bill.item_type)}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">{bill.major_category ?? "-"}</td>
                  <td className="px-4 py-4">
                    {bill.status_label ?? bill.status}
                    {bill.status_note && (
                      <p className="mt-1 text-xs text-mirai-text-secondary">
                        {bill.status_note}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      variant={
                        bill.publish_status === "published"
                          ? "default"
                          : "outline"
                      }
                    >
                      {publishStatusLabel(bill.publish_status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    {formatAdminDate(bill.updated_at)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/bills/${bill.id}/edit` as Route}>
                          編集
                        </Link>
                      </Button>
                      {bill.previewToken && (
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={
                              getPreviewPath(
                                bill.id,
                                bill.previewToken
                              ) as Route
                            }
                            target="_blank"
                          >
                            プレビュー
                          </Link>
                        </Button>
                      )}
                      {bill.publish_status === "published" && (
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/bills/${bill.id}` as Route}
                            target="_blank"
                          >
                            公開ページ
                          </Link>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {bills.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-mirai-text-secondary">
          まだ案件がありません。
        </div>
      )}
    </div>
  );
}
