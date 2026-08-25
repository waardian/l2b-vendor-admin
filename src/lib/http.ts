export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, token } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return send<T>(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiUpload<T>(
  path: string,
  form: FormData,
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return send<T>(path, { method: "POST", headers, body: form });
}

async function send<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail = data && (data.detail ?? data.message);
    if (detail && typeof detail === "object" && !Array.isArray(detail) && "message" in detail) {
      throw new ApiError(res.status, String(detail.message), detail.code);
    }
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? formatValidationErrors(detail)
          : detail
            ? JSON.stringify(detail)
            : `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }

  return data as T;
}

interface ValidationIssue {
  loc?: unknown[];
  msg?: string;
}

/**
 * FastAPI answers a 422 with an array of issues. Rendering that array as JSON puts
 * `[{"type":"string_too_short","loc":[...]}]` in front of the user, so name the field
 * and quote the message instead.
 */
function formatValidationErrors(issues: unknown[]): string {
  const lines = issues
    .map((raw) => {
      const issue = raw as ValidationIssue;
      if (!issue?.msg) return null;
      const path = Array.isArray(issue.loc)
        ? issue.loc.filter((part) => part !== "body" && typeof part !== "number")
        : [];
      const field = path.map((part) => String(part).replace(/_/g, " ")).join(" → ");
      return field ? `${field}: ${issue.msg}` : issue.msg;
    })
    .filter((line): line is string => Boolean(line));

  return lines.length > 0 ? lines.join("; ") : "The server rejected those details.";
}
