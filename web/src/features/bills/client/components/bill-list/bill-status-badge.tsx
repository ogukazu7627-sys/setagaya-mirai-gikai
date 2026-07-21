import { Badge } from "@/components/ui/badge";
import type { BillStatusEnum } from "../../../shared/types";
import {
  getCardStatusLabel,
  getStatusVariant,
} from "../../../shared/utils/bill-status";

interface BillStatusBadgeProps {
  status: BillStatusEnum;
  statusLabel?: string | null;
  className?: string;
}

export function BillStatusBadge({
  status,
  statusLabel,
  className,
}: BillStatusBadgeProps) {
  return (
    <Badge variant={getStatusVariant(status)} className={className}>
      {statusLabel ?? getCardStatusLabel(status)}
    </Badge>
  );
}
