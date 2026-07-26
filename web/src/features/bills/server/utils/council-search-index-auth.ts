import "server-only";

import { timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, type JWTPayload, jwtVerify } from "jose";

const GITHUB_ACTIONS_OIDC_ISSUER =
  "https://token.actions.githubusercontent.com";
const GITHUB_ACTIONS_OIDC_AUDIENCE =
  "https://civictech-setagaya.org/api/cron/council-search-index";
const GITHUB_REPOSITORY = "ogukazu7627-sys/setagaya-mirai-gikai";
const GITHUB_REPOSITORY_ID = "1291369822";
const GITHUB_REPOSITORY_OWNER_ID = "272612047";
const GITHUB_MAIN_REF = "refs/heads/main";
const GITHUB_WORKFLOW_REF = `${GITHUB_REPOSITORY}/.github/workflows/council_search_index.yml@${GITHUB_MAIN_REF}`;
const GITHUB_ACTIONS_JWKS = createRemoteJWKSet(
  new URL(`${GITHUB_ACTIONS_OIDC_ISSUER}/.well-known/jwks`),
  {
    cacheMaxAge: 60 * 60 * 1000,
    cooldownDuration: 5 * 60 * 1000,
  }
);

type CouncilSearchIndexAuthDependencies = {
  verifyGithubActionsToken?: (token: string) => Promise<boolean>;
};

export async function isCouncilSearchIndexRequestAuthorized(
  request: Request,
  dependencies: CouncilSearchIndexAuthDependencies = {}
): Promise<boolean> {
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) {
    return false;
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secretsMatch(token, cronSecret)) {
    return true;
  }

  try {
    return await (
      dependencies.verifyGithubActionsToken ??
      verifyCouncilSearchIndexGithubActionsToken
    )(token);
  } catch {
    return false;
  }
}

export function hasExpectedCouncilSearchIndexGithubClaims(
  payload: JWTPayload
): boolean {
  const eventName = payload.event_name;
  return (
    payload.repository === GITHUB_REPOSITORY &&
    payload.repository_id === GITHUB_REPOSITORY_ID &&
    payload.repository_owner_id === GITHUB_REPOSITORY_OWNER_ID &&
    payload.ref === GITHUB_MAIN_REF &&
    payload.workflow_ref === GITHUB_WORKFLOW_REF &&
    payload.sub === `repo:${GITHUB_REPOSITORY}:ref:${GITHUB_MAIN_REF}` &&
    (eventName === "schedule" || eventName === "workflow_dispatch")
  );
}

async function verifyCouncilSearchIndexGithubActionsToken(
  token: string
): Promise<boolean> {
  const { payload } = await jwtVerify(token, GITHUB_ACTIONS_JWKS, {
    algorithms: ["RS256"],
    audience: GITHUB_ACTIONS_OIDC_AUDIENCE,
    issuer: GITHUB_ACTIONS_OIDC_ISSUER,
    clockTolerance: 5,
    maxTokenAge: "5 minutes",
  });
  return hasExpectedCouncilSearchIndexGithubClaims(payload);
}

function getBearerToken(authorization: string | null): string | null {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  const token = authorization.slice("Bearer ".length);
  return token.length > 0 ? token : null;
}

function secretsMatch(value: string, expected: string): boolean {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return (
    valueBuffer.length === expectedBuffer.length &&
    timingSafeEqual(valueBuffer, expectedBuffer)
  );
}
