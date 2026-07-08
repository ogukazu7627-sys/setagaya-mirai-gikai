"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type DeleteBillAction = (formData: FormData) => Promise<void>;

interface AdminDeleteBillButtonProps {
  billId: string;
  title: string;
  action: DeleteBillAction;
}

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
    >
      {pending ? "削除中" : "削除"}
    </Button>
  );
}

export function AdminDeleteBillButton({
  billId,
  title,
  action,
}: AdminDeleteBillButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const ok = window.confirm(
          `「${title}」を削除します。この操作は元に戻せません。削除してよろしいですか？`
        );
        if (!ok) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={billId} />
      <DeleteSubmitButton />
    </form>
  );
}
