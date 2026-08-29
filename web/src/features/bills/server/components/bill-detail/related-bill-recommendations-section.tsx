import type { Route } from "next";
import Link from "next/link";
import { CompactBillCard } from "@/features/bills/client/components/bill-list/compact-bill-card";
import type { BillWithContent } from "@/features/bills/shared/types";
import { routes } from "@/lib/routes";

interface RelatedBillRecommendationsSectionProps {
  bills: BillWithContent[];
}

export function RelatedBillRecommendationsSection({
  bills,
}: RelatedBillRecommendationsSectionProps) {
  if (bills.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="related-bill-recommendations-title"
      className="my-12"
    >
      <h2
        id="related-bill-recommendations-title"
        className="mb-6 text-2xl font-bold"
      >
        関連する案件
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {bills.map((bill) => (
          <Link
            key={bill.id}
            href={routes.billDetail(bill.id) as Route}
            className="block h-full rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <CompactBillCard bill={bill} className="h-full" />
          </Link>
        ))}
      </div>
    </section>
  );
}
