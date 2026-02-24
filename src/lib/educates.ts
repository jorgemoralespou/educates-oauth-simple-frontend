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

// Cached token state
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

// Refresh token 60 seconds before it expires
const TOKEN_REFRESH_MARGIN_SECONDS = 60;

async function login(): Promise<LoginResponse> {
  const { educates } = getSiteConfig();

  const response = await fetch(`${educates.lookupServiceUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: educates.credentials.username,
      password: educates.credentials.password,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Educates login failed (${response.status}): ${text}`);
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
  const token = await getAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // If we get a 401, the token may have been revoked or expired early.
  // Clear the cache and retry once with a fresh token.
  if (response.status === 401) {
    cachedToken = null;
    tokenExpiresAt = 0;

    const freshToken = await getAccessToken();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${freshToken}`,
      },
    });
  }

  return response;
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
    const text = await response.text();
    throw new Error(`Educates API error (${response.status}): ${text}`);
  }

  return response.json();
}
