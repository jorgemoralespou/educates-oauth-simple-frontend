import { getSiteConfig } from "./config";

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_at: number;
}

interface WorkshopSessionResponse {
  sessionActivationUrl: string;
  tenantName: string;
  clusterName: string;
  portalName: string;
  environmentName: string;
  sessionName: string;
}

export type LookupErrorCode =
  | "LOOKUP_UNREACHABLE"
  | "LOOKUP_AUTH_FAILED"
  | "LOOKUP_MISCONFIGURED"
  | "WORKSHOP_NOT_FOUND"
  | "WORKSHOP_NO_CAPACITY"
  | "LOOKUP_UNKNOWN";

export class LookupError extends Error {
  constructor(
    public code: LookupErrorCode,
    public httpStatus: number,
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "LookupError";
  }
}

function classifyNetworkError(err: unknown, host: string): LookupError {
  const msg = err instanceof Error ? err.message : String(err);
  return new LookupError(
    "LOOKUP_UNREACHABLE",
    503,
    `Cannot reach lookup service at ${host}: ${msg}`,
    err,
  );
}

// Cached token state
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

// Refresh token 60 seconds before it expires
const TOKEN_REFRESH_MARGIN_SECONDS = 60;

async function login(): Promise<LoginResponse> {
  const { educates } = getSiteConfig();
  const url = `${educates.lookupServiceUrl}/auth/login`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: educates.credentials.username,
        password: educates.credentials.password,
      }),
    });
  } catch (err) {
    throw classifyNetworkError(err, educates.lookupServiceUrl);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (response.status === 401) {
      throw new LookupError(
        "LOOKUP_AUTH_FAILED",
        503,
        `Lookup service rejected credentials (401): ${text}`,
      );
    }
    if (response.status >= 400 && response.status < 500) {
      throw new LookupError(
        "LOOKUP_MISCONFIGURED",
        503,
        `Lookup login failed (${response.status}): ${text}`,
      );
    }
    throw new LookupError(
      "LOOKUP_UNKNOWN",
      502,
      `Lookup login failed (${response.status}): ${text}`,
    );
  }

  return response.json();
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && now < tokenExpiresAt - TOKEN_REFRESH_MARGIN_SECONDS) {
    return cachedToken;
  }

  const result = await login();
  cachedToken = result.access_token;
  tokenExpiresAt = result.expires_at;
  return cachedToken;
}

async function authenticatedFetch(
  url: string,
  options: RequestInit
): Promise<Response> {
  const { educates } = getSiteConfig();
  const token = await getAccessToken();

  const doFetch = async (bearer: string) => {
    try {
      return await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${bearer}`,
        },
      });
    } catch (err) {
      throw classifyNetworkError(err, educates.lookupServiceUrl);
    }
  };

  const response = await doFetch(token);

  // If we get a 401, the token may have been revoked or expired early.
  // Clear the cache and retry once with a fresh token.
  if (response.status === 401) {
    cachedToken = null;
    tokenExpiresAt = 0;
    const freshToken = await getAccessToken();
    return doFetch(freshToken);
  }

  return response;
}

export async function verifyLookupService(): Promise<
  { ok: true } | { ok: false; code: LookupErrorCode; message: string }
> {
  try {
    await getAccessToken();
    return { ok: true };
  } catch (err) {
    if (err instanceof LookupError) {
      return { ok: false, code: err.code, message: err.message };
    }
    return {
      ok: false,
      code: "LOOKUP_UNKNOWN",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function requestWorkshopSession(
  workshopName: string,
  clientUserId: string,
  clientIndexUrl: string
): Promise<WorkshopSessionResponse> {
  const { educates } = getSiteConfig();

  const response = await authenticatedFetch(
    `${educates.lookupServiceUrl}/api/v1/workshops`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantName: educates.tenantName,
        workshopName,
        clientUserId,
        clientIndexUrl,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (response.status === 401) {
      throw new LookupError(
        "LOOKUP_AUTH_FAILED",
        503,
        `Lookup service auth failed after retry (401): ${text}`,
      );
    }
    if (response.status === 404) {
      throw new LookupError(
        "WORKSHOP_NOT_FOUND",
        404,
        `Workshop not found: ${workshopName}`,
      );
    }
    if (response.status === 409 || response.status === 429) {
      throw new LookupError(
        "WORKSHOP_NO_CAPACITY",
        503,
        `Workshop capacity unavailable (${response.status}): ${text}`,
      );
    }
    if (response.status >= 400 && response.status < 500) {
      throw new LookupError(
        "LOOKUP_MISCONFIGURED",
        503,
        `Lookup request failed (${response.status}): ${text}`,
      );
    }
    throw new LookupError(
      "LOOKUP_UNKNOWN",
      502,
      `Lookup request failed (${response.status}): ${text}`,
    );
  }

  return response.json();
}
