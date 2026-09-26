const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  public fieldErrors: Record<string, string>;
  public formErrors: string[];

  constructor(
    message: string,
    public status: number,
    public body: unknown,
    fieldErrors: Record<string, string> = {},
    formErrors: string[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
    this.formErrors = formErrors;
  }
}

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => undefined);

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    const fieldErrors: Record<string, string> = {};
    const formErrors: string[] = [];

    if (data && typeof data === "object") {
      const rawObj = data as Record<string, unknown>;

      const rawFieldErrors =
        rawObj.fieldErrors && typeof rawObj.fieldErrors === "object"
          ? (rawObj.fieldErrors as Record<string, unknown>)
          : rawObj.message && typeof rawObj.message === "object" && "fieldErrors" in (rawObj.message as Record<string, unknown>)
            ? ((rawObj.message as Record<string, unknown>).fieldErrors as Record<string, unknown>)
            : null;

      if (rawFieldErrors) {
        for (const [key, val] of Object.entries(rawFieldErrors)) {
          if (typeof val === "string") {
            fieldErrors[key] = val;
          } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") {
            fieldErrors[key] = val[0];
          }
        }
      }

      const rawFormErrors = Array.isArray(rawObj.formErrors)
        ? rawObj.formErrors
        : rawObj.message && typeof rawObj.message === "object" && Array.isArray((rawObj.message as Record<string, unknown>).formErrors)
          ? ((rawObj.message as Record<string, unknown>).formErrors as unknown[])
          : null;

      if (rawFormErrors) {
        for (const err of rawFormErrors) {
          if (typeof err === "string") formErrors.push(err);
        }
      }

      if (typeof rawObj.message === "string") {
        message = rawObj.message;
      } else if (Array.isArray(rawObj.message)) {
        message = rawObj.message.join(", ");
      } else if (formErrors.length > 0) {
        message = formErrors[0];
      } else if (Object.values(fieldErrors).length > 0) {
        message = Object.values(fieldErrors)[0];
      } else if (typeof rawObj.error === "string") {
        message = rawObj.error;
      }
    }

    throw new ApiError(message, res.status, data, fieldErrors, formErrors);
  }

  return data as T;
}
