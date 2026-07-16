import "server-only";

import type { AdminSupabaseClient, NewTagInput } from "./bill-admin-shared";

export async function resolveTagIds(
  supabase: AdminSupabaseClient,
  tagIds: string[],
  newTags: NewTagInput[]
) {
  const normalizedTagIds = Array.from(new Set(tagIds));
  if (newTags.length === 0) return normalizedTagIds;

  const newLabels = Array.from(
    new Set(newTags.map((tag) => tag.label).filter(Boolean))
  );
  if (newLabels.length === 0) return normalizedTagIds;

  const { error: upsertError } = await supabase.from("tags").upsert(
    newTags.map((tag) => ({
      label: tag.label,
      major_category: tag.major_category,
    })),
    { onConflict: "label", ignoreDuplicates: true }
  );

  if (upsertError) {
    throw new Error(`Failed to create tags: ${upsertError.message}`);
  }

  const { data, error } = await supabase
    .from("tags")
    .select("id")
    .in("label", newLabels);

  if (error) {
    throw new Error(`Failed to fetch created tags: ${error.message}`);
  }

  return Array.from(
    new Set([...normalizedTagIds, ...(data ?? []).map((tag) => tag.id)])
  );
}
