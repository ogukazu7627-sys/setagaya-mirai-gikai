import type { Route } from "next";
import Link from "next/link";
import { BillsByMajorCategorySection } from "../../client/components/bill-list/bills-by-major-category-section";
import type { FiscalArchiveData } from "../loaders/load-home-data";

type FiscalYearArchiveSectionProps = {
  archiveData: FiscalArchiveData;
};

export function FiscalYearArchiveSection({
  archiveData,
}: FiscalYearArchiveSectionProps) {
  if (archiveData.years.length === 0 || archiveData.selectedYear == null) {
    return null;
  }

  return (
    <section id="archive" className="flex flex-col gap-8 scroll-mt-20">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[22px] font-bold text-black leading-[1.48]">
            前年度以前の世田谷区議会
          </h2>
          <p className="text-xs text-mirai-text-secondary">
            年度を選ぶと、その年度に始まった会期の案件をテーマ別に確認できます。
          </p>
        </div>

        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-2">
            {archiveData.years.map((year) => {
              const isSelected = archiveData.selectedYear === year;
              return (
                <Link
                  key={year}
                  href={`/?archive_year=${year}#archive` as Route}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-mirai-border bg-white text-mirai-text hover:bg-gray-50"
                  }`}
                >
                  {year}年度
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {archiveData.billsByMajorCategory.length > 0 ? (
        <BillsByMajorCategorySection
          billsByMajorCategory={archiveData.billsByMajorCategory}
          title={`${archiveData.selectedYear}年度の案件をテーマから探す`}
        />
      ) : (
        <p className="text-center py-12 text-muted-foreground">
          この年度の公開案件はまだありません
        </p>
      )}
    </section>
  );
}
