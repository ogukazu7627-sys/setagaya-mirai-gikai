"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  type FunnelJourneyType,
  PUBLIC_COMMENT_FUNNEL_STORAGE_PREFIX,
} from "../funnel";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function usePublicCommentAttribution(params: {
  journeyType: FunnelJourneyType;
  adTheme: string;
}) {
  const promiseRef = useRef<Promise<string | null> | null>(null);

  const ensureAttribution = useCallback(() => {
    if (promiseRef.current) return promiseRef.current;
    promiseRef.current = (async () => {
      const url = new URL(window.location.href);
      const storageKey = `${PUBLIC_COMMENT_FUNNEL_STORAGE_PREFIX}:${url.pathname}`;
      let publicToken = url.searchParams.get("attribution");
      if (!publicToken || !UUID_PATTERN.test(publicToken)) {
        try {
          publicToken = sessionStorage.getItem(storageKey);
        } catch {
          publicToken = null;
        }
      }

      const response = await fetch("/api/public-comment/funnel/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken,
          journeyType: params.journeyType,
          adTheme: params.adTheme,
          landingPath: url.pathname,
          utmSource: url.searchParams.get("utm_source"),
          utmMedium: url.searchParams.get("utm_medium"),
          utmCampaign: url.searchParams.get("utm_campaign"),
          utmContent: url.searchParams.get("utm_content"),
        }),
      });
      if (!response.ok) return null;
      // Parse a clone so this best-effort side request cannot consume a
      // Response object reused by a test double or an embedded-browser shim.
      const data = await response
        .clone()
        .json()
        .catch(() => null);
      const token =
        typeof data?.publicToken === "string" ? data.publicToken : null;
      if (token && UUID_PATTERN.test(token)) {
        try {
          sessionStorage.setItem(storageKey, token);
        } catch {
          // Attribution is useful but must never block the interview.
        }
        return token;
      }
      return null;
    })().catch(() => null);
    return promiseRef.current;
  }, [params.adTheme, params.journeyType]);

  useEffect(() => {
    void ensureAttribution();
  }, [ensureAttribution]);

  return { ensureAttribution };
}
