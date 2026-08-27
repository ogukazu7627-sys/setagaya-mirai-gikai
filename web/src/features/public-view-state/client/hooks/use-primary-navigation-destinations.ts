"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  PrimaryNavigationItem,
  PrimaryNavigationItemId,
} from "@/features/primary-navigation/shared/primary-navigation";
import {
  PUBLIC_VIEW_STATE_UPDATED_EVENT,
  readPrimaryDestination,
} from "../utils/public-view-state-storage";

type PrimaryDestinations = Partial<Record<PrimaryNavigationItemId, string>>;

export function usePrimaryNavigationDestinations(
  items: readonly PrimaryNavigationItem[]
): PrimaryDestinations {
  const readDestinations = useCallback(
    () =>
      Object.fromEntries(
        items.map((item) => [
          item.id,
          readPrimaryDestination(item.id, item.href),
        ])
      ) as PrimaryDestinations,
    [items]
  );
  const [destinations, setDestinations] = useState<PrimaryDestinations>({});

  useEffect(() => {
    setDestinations(readDestinations());

    const handleUpdate = () => setDestinations(readDestinations());
    window.addEventListener(PUBLIC_VIEW_STATE_UPDATED_EVENT, handleUpdate);
    return () =>
      window.removeEventListener(PUBLIC_VIEW_STATE_UPDATED_EVENT, handleUpdate);
  }, [readDestinations]);

  return destinations;
}
