"use client";

import { useEffect, useState } from "react";

/**
 * Hook to ensure an anonymous Supabase user exists and return the user ID
 * This will automatically create an anonymous user if none exists
 */
export function useAnonymousSupabaseUser() {
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SETAGAYA_MOCK_MODE === "true") {
      return;
    }

    const ensureAnonUser = async () => {
      try {
        const { createBrowserClient } = await import("@mirai-gikai/supabase");
        const supabase = createBrowserClient();

        // Check if user already exists
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          return;
        }

        // No valid session -> sign in anonymously
        const { data, error: signInError } =
          await supabase.auth.signInAnonymously();

        if (signInError) {
          console.error("Error creating anonymous user:", signInError);
          return;
        }

        if (data.user) {
          setUserId(data.user.id);
        }
      } catch (err) {
        console.error("Error ensuring anonymous user:", err);
      }
    };

    ensureAnonUser();
  }, []);

  return userId;
}
