const DEFAULT_WEB_ORIGIN = "http://localhost:3000";

/**
 * WEB_ORIGIN is a comma-separated list of dashboard origins allowed by CORS.
 * The first entry is the canonical one used to build links in emails.
 * Trailing slashes are stripped because browsers never send them in the
 * Origin header, so "https://app.example.com/" would never match.
 */
export function parseWebOrigins(raw: string | undefined): string[] {
  const origins = (raw ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return origins.length > 0 ? origins : [DEFAULT_WEB_ORIGIN];
}

export function primaryWebOrigin(raw: string | undefined): string {
  return parseWebOrigins(raw)[0]!;
}
