const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type ApiFetchOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
};

const normalizeError = async (res: Response): Promise<string> => {
  try {
    const data = await res.json();
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.message === "string") return data.message;
    return JSON.stringify(data);
  } catch {
    try {
      return await res.text();
    } catch {
      return `Request failed with status ${res.status}`;
    }
  }
};

export async function apiFetch<T = any>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", token, body, headers = {} } = options;
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    throw new Error(await normalizeError(res));
  }

  // Some endpoints may return 204 No Content.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Normalize stored upload URLs to the configured API host (fixes port/host mismatches). */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/uploads/")) {
      return `${API_URL}${parsed.pathname}`;
    }
  } catch {
    /* use as-is */
  }
  return url;
}

export { API_URL };

