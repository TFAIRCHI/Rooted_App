export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: Record<string, unknown>, public code?: string) {
    super(message);
  }
}

export type ThemeTokens = { brand: string; brandStrong: string; accent: string; pageSurface: string; panelSurface: string; navSurface: string; actionSurface: string; focusRing: string; textOnBrand: string; textOnSurface: string; border: string };
export type ChurchTheme = { mode: "light" | "dark" | "system"; primary: string; accent: string; surface: string; tokens?: ThemeTokens; assetId?: string | null; logoUrl?: string | null; churchName?: string };
export type Church = { id: string; slug: string; name: string; timeZone?: string; capabilities: string[]; contributorAccess?: boolean; theme?: ChurchTheme };
export type Session = { user: { id: string; displayName: string }; churches: Church[]; csrfToken: string; access?: 'member' | 'contributor' };

export async function api<T>(path: string, options: { method?: string; body?: unknown; etag?: string; csrf?: string; key?: string } = {}): Promise<{ data: T; etag: string }> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.etag) headers["If-Match"] = options.etag;
  if (options.csrf) headers["X-CSRF-Token"] = options.csrf;
  if (options.method && options.method !== "GET") headers["Idempotency-Key"] = options.key ?? crypto.randomUUID();
  const response = await fetch(`/api/v1${path}`, { method: options.method ?? "GET", headers, body: options.body === undefined ? undefined : JSON.stringify(options.body), credentials: "same-origin", cache: "no-store" });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data?.message ?? `Request failed (${response.status}). Please try again.`, data?.details, data?.code);
  return { data, etag: response.headers.get("ETag") ?? "" };
}
