import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { routes } from "@/lib/routes";

export function ReportProblemButton() {
  return (
    <Link
      href={routes.reportProblem() as Route}
      className="flex items-center justify-center gap-1.5 py-2 text-base font-bold"
    >
      <Image
        src="/icons/report-error.svg"
        alt="報告アイコン"
        width={20}
        height={20}
        className="shrink-0"
      />
      問題を報告する
    </Link>
  );
}
