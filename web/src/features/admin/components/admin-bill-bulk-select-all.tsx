"use client";

interface AdminBillBulkSelectAllProps {
  disabled?: boolean;
  formId: string;
}

export function AdminBillBulkSelectAll({
  disabled,
  formId,
}: AdminBillBulkSelectAllProps) {
  return (
    <input
      type="checkbox"
      disabled={disabled}
      aria-label="表示中の案件をすべて選択"
      className="h-4 w-4 accent-primary"
      onChange={(event) => {
        for (const checkbox of document.querySelectorAll<HTMLInputElement>(
          `input[data-admin-bill-bulk-checkbox="${formId}"]`
        )) {
          checkbox.checked = event.currentTarget.checked;
        }
      }}
    />
  );
}
