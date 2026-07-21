import { Badge } from "@/components/ui/badge";
import type { BillItemType } from "../../../shared/types";
import { getBillItemTypeLabel } from "../../../shared/types";

interface BillItemTypeBadgeProps {
  itemType?: BillItemType | null;
  className?: string;
}

export function BillItemTypeBadge({
  itemType,
  className,
}: BillItemTypeBadgeProps) {
  return (
    <Badge variant="outline" className={className}>
      {getBillItemTypeLabel(itemType)}
    </Badge>
  );
}
