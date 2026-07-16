import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { nanoid } from "nanoid";
import { routes } from "@/lib/routes";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";

export async function ensurePreviewToken(
  billId: string,
  createdBy = "admin"
): Promise<string> {
  if (isSetagayaMockMode) {
    return "mock-preview-token";
  }

  const supabase = createAdminClient();
  const now = new Date();
  const { data: existing, error: existingError } = await supabase
    .from("preview_tokens")
    .select("id, token, expires_at")
    .eq("bill_id", billId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to fetch preview token: ${existingError.message}`);
  }
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30);

  if (existing) {
    if (new Date(existing.expires_at) <= now) {
      const { error } = await supabase
        .from("preview_tokens")
        .update({ expires_at: expiresAt.toISOString() })
        .eq("id", existing.id);

      if (error) {
        throw new Error(`Failed to extend preview token: ${error.message}`);
      }
    }

    return existing.token;
  }

  const token = nanoid(32);
  const { error } = await supabase.from("preview_tokens").insert({
    bill_id: billId,
    token,
    expires_at: expiresAt.toISOString(),
    created_by: createdBy,
  });

  if (error) {
    throw new Error(`Failed to create preview token: ${error.message}`);
  }

  return token;
}

export function getPreviewPath(billId: string, token: string) {
  if (isSetagayaMockMode) {
    return routes.billDetail(billId);
  }

  return routes.previewBillDetail(billId, token);
}
