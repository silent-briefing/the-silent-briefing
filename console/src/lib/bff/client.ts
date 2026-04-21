import type { ZodType } from "zod";

export class BffHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "BffHttpError";
  }
}

function bffBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_BFF_BASE_URL ?? "";
  return base.replace(/\/$/, "");
}

export type BffJsonArgs<T> = {
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  getToken: () => Promise<string | null>;
  schema: ZodType<T>;
};

/**
 * Authenticated JSON call to the FastAPI BFF. Validates the JSON body with Zod.
 * Pass `getToken` from Clerk, e.g. `() => getToken()` from `useAuth()`.
 */
export async function bffJson<T>({
  path,
  method = "GET",
  body,
  getToken,
  schema,
}: BffJsonArgs<T>): Promise<T> {
  const base = bffBaseUrl();
  if (!base) {
    throw new Error("NEXT_PUBLIC_BFF_BASE_URL is not set");
  }
  const token = await getToken();
  if (!token) {
    throw new Error("Not signed in");
  }

  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let raw: unknown;
  const text = await res.text();
  try {
    raw = text ? JSON.parse(text) : null;
  } catch {
    raw = text;
  }

  if (!res.ok) {
    throw new BffHttpError(
      `BFF ${method} ${path} failed (${res.status})`,
      res.status,
      raw,
    );
  }

  return schema.parse(raw);
}
