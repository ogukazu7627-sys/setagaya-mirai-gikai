"use server";

import { revalidatePath } from "next/cache";
import { routes } from "@/lib/routes";
import {
  addCommitteeCouncilor,
  createCommittee,
  markDigestRecipientsSent,
  removeCommitteeCouncilor,
  upsertCouncilorContact,
} from "../repositories/councilor-digest-repository";

export async function markCouncilorDigestSentAction(formData: FormData) {
  const councilorId = String(formData.get("councilor_id") ?? "");
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("body") ?? "");
  const recipientIds = formData
    .getAll("recipient_id")
    .map(String)
    .filter(Boolean);

  if (!councilorId || !subject || !body || recipientIds.length === 0) {
    return;
  }

  await markDigestRecipientsSent({
    councilorId,
    recipientIds,
    subject,
    body,
  });
  revalidatePath(routes.councilorDigests());
}

export async function upsertCouncilorContactAction(formData: FormData) {
  const councilorId = String(formData.get("councilor_id") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const isDeliveryEnabled = formData.get("is_delivery_enabled") === "on";

  if (!councilorId) {
    return;
  }

  await upsertCouncilorContact({
    councilorId,
    email: email || null,
    isDeliveryEnabled,
  });
  revalidatePath(routes.councilorDigests());
}

export async function createCommitteeAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return;
  }

  await createCommittee({ name });
  revalidatePath(routes.councilorDigests());
}

export async function addCommitteeCouncilorAction(formData: FormData) {
  const committeeId = String(formData.get("committee_id") ?? "");
  const councilorId = String(formData.get("councilor_id") ?? "");
  if (!committeeId || !councilorId) {
    return;
  }

  await addCommitteeCouncilor({ committeeId, councilorId });
  revalidatePath(routes.councilorDigests());
}

export async function removeCommitteeCouncilorAction(formData: FormData) {
  const committeeId = String(formData.get("committee_id") ?? "");
  const councilorId = String(formData.get("councilor_id") ?? "");
  if (!committeeId || !councilorId) {
    return;
  }

  await removeCommitteeCouncilor({ committeeId, councilorId });
  revalidatePath(routes.councilorDigests());
}
