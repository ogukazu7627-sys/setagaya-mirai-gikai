import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import { isUuid } from "@/lib/utils/uuid";

export type PublicCouncilor = {
  id: string;
  displayName: string;
  iconUrl: string;
};

export async function findActivePublicCouncilors(): Promise<PublicCouncilor[]> {
  if (isSetagayaMockMode) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("councilors")
    .select("id, display_name, icon_url")
    .eq("is_active", true)
    .not("icon_url", "is", null)
    .order("display_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch public councilors: ${error.message}`);
  }

  return (data ?? []).flatMap((councilor) =>
    councilor.icon_url
      ? [
          {
            id: councilor.id,
            displayName: councilor.display_name,
            iconUrl: councilor.icon_url,
          },
        ]
      : []
  );
}

export async function findActivePublicCouncilorById(
  councilorId: string
): Promise<PublicCouncilor | null> {
  if (isSetagayaMockMode || !isUuid(councilorId)) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("councilors")
    .select("id, display_name, icon_url")
    .eq("id", councilorId)
    .eq("is_active", true)
    .not("icon_url", "is", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch public councilor: ${error.message}`);
  }

  if (!data?.icon_url) {
    return null;
  }

  return {
    id: data.id,
    displayName: data.display_name,
    iconUrl: data.icon_url,
  };
}
