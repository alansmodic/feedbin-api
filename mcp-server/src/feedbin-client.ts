const BASE_URL = "https://api.feedbin.com/v2";

let credentials: { email: string; password: string } | null = null;

export function configure(email: string, password: string) {
  credentials = { email, password };
}

function authHeader(): string {
  if (!credentials) {
    throw new Error(
      "Feedbin credentials not configured. Set FEEDBIN_EMAIL and FEEDBIN_PASSWORD environment variables."
    );
  }
  const encoded = Buffer.from(
    `${credentials.email}:${credentials.password}`
  ).toString("base64");
  return `Basic ${encoded}`;
}

export interface FeedbinRequestOptions {
  method?: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  contentType?: string;
  rawBody?: string;
}

export interface FeedbinResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

export async function feedbinRequest<T = unknown>(
  path: string,
  options: FeedbinRequestOptions = {}
): Promise<FeedbinResponse<T>> {
  const { method = "GET", params, body, contentType, rawBody } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    Authorization: authHeader(),
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  } else if (body) {
    headers["Content-Type"] = "application/json; charset=utf-8";
  }

  const fetchOptions: RequestInit = { method, headers };
  if (rawBody !== undefined) {
    fetchOptions.body = rawBody;
  } else if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Feedbin API error ${response.status} ${response.statusText}: ${errorBody}`
    );
  }

  // Some endpoints return 204 No Content
  if (response.status === 204) {
    return { data: undefined as T, status: response.status, headers: response.headers };
  }

  const data = (await response.json()) as T;
  return { data, status: response.status, headers: response.headers };
}

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function jsonResult(data: unknown) {
  return textResult(formatJson(data));
}
