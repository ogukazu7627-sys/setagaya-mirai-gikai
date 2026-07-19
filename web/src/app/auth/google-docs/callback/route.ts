import type { Database } from "@mirai-gikai/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createPetitionGoogleDocFromReport,
  PetitionGoogleDocsError,
} from "@/features/petition-google-docs/server/create-petition-google-doc";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getRedirectBase(request: Request) {
  if (process.env.NODE_ENV === "development") {
    return new URL(request.url).origin;
  }

  return env.webUrl.replace(/\/+$/, "");
}

function buildCompleteRedirectUrl(
  redirectBase: string,
  reportId: string,
  params: Record<string, string>
) {
  const url = new URL(routes.reportComplete(reportId), redirectBase);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

function redirectWithError(
  redirectBase: string,
  reportId: string | null,
  error: string
) {
  if (!reportId || !UUID_PATTERN.test(reportId)) {
    return NextResponse.redirect(
      new URL(`/?petition_doc_error=${encodeURIComponent(error)}`, redirectBase)
    );
  }

  return NextResponse.redirect(
    buildCompleteRedirectUrl(redirectBase, reportId, {
      petition_doc_error: error,
    })
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const reportId = requestUrl.searchParams.get("reportId");
  const redirectBase = getRedirectBase(request);

  if (!code) {
    return redirectWithError(redirectBase, reportId, "missing_oauth_code");
  }

  if (!reportId || !UUID_PATTERN.test(reportId)) {
    return redirectWithError(redirectBase, reportId, "invalid_report_id");
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    env.supabaseUrl,
    env.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return redirectWithError(redirectBase, reportId, "google_login_failed");
  }

  const sessionWithProviderToken = data.session as
    | (typeof data.session & { provider_token?: string | null })
    | null;
  const providerToken = sessionWithProviderToken?.provider_token;

  if (!providerToken) {
    return redirectWithError(
      redirectBase,
      reportId,
      "missing_google_access_token"
    );
  }

  try {
    const document = await createPetitionGoogleDocFromReport({
      reportId,
      userId: data.user.id,
      accessToken: providerToken,
    });

    return NextResponse.redirect(
      buildCompleteRedirectUrl(redirectBase, reportId, {
        petition_doc_created: "1",
        petition_doc_url: document.documentUrl,
      })
    );
  } catch (error) {
    console.error("Failed to create petition Google Docs draft:", error);
    return redirectWithError(
      redirectBase,
      reportId,
      error instanceof PetitionGoogleDocsError
        ? error.code
        : "google_docs_create_failed"
    );
  }
}
