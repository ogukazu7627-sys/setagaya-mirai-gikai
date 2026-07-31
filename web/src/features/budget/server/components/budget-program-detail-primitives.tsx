import "server-only";

import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SectionHeading({
  icon: Icon,
  id,
  title,
  description,
  kind,
}: {
  icon: LucideIcon;
  id: string;
  title: string;
  description: string;
  kind?: "official" | "editorial";
}) {
  return (
    <div>
      {kind && (
        <Badge variant={kind === "official" ? "outline" : "light"}>
          {kind === "official" ? "公式情報" : "みらい議会の整理"}
        </Badge>
      )}
      <div className="mt-2 flex items-center gap-3">
        <Icon
          aria-hidden="true"
          className="size-5 text-budget-overview-accent"
        />
        <h2 id={id} className="text-xl font-bold text-mirai-text">
          {title}
        </h2>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-mirai-text-secondary">
        {description}
      </p>
    </div>
  );
}

export function HierarchyItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-mirai-border px-4 py-4 last:border-b-0 sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0">
      <dt className="text-xs font-bold text-mirai-text-muted">{label}</dt>
      <dd className="mt-1 font-bold text-mirai-text">{value}</dd>
    </div>
  );
}

export function ProgramNameRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <>
      <dt className="text-xs font-bold text-mirai-text-muted">{label}</dt>
      <dd className="sm:col-span-2 text-mirai-text">{value || "名称なし"}</dd>
    </>
  );
}
