import * as vscode from "vscode";
import type { SuggestItem, CatalogItem, AuthUser } from "./types";

function getBaseUrl(): string {
  return vscode.workspace.getConfiguration("codemint").get<string>("baseUrl") ?? "https://codemint.app";
}

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null }
): Promise<T> {
  const base = trimTrailingSlash(getBaseUrl());
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  const init: RequestInit = { method: opts.method ?? "GET", headers };
  if (opts.body != null && opts.method !== "GET") init.body = JSON.stringify(opts.body);
  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    const err = data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "object"
      ? (data as { error: { code?: string; message?: string } }).error
      : { code: "error", message: text || res.statusText };
    const msg = typeof err === "object" && err && "message" in err ? String((err as { message: string }).message) : String(err);
    if (res.status === 401) throw new Error("Not logged in or token expired. Run CodeMint: Login.");
    if (res.status === 404) throw new Error("Rule/skill not found. Check ref or visibility.");
    if (res.status === 429) throw new Error("Too many requests. Try again later.");
    throw new Error(msg || "Request failed");
  }
  return data as T;
}

export async function authMe(token: string): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>("/api/auth/me", { token });
}

export type SearchParams = {
  q?: string;
  type?: "rule" | "prompt" | "skill";
  tags?: string[];
  page?: number;
  limit?: number;
};

export type SearchResponse = {
  items: SuggestItem[];
  total: number;
  page: number;
  limit: number;
};

export async function itemsSearch(
  params: SearchParams,
  token?: string | null
): Promise<SearchResponse> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.type) sp.set("type", params.type);
  if (params.tags?.length) sp.set("tags", params.tags.join(","));
  if (params.page != null) sp.set("page", String(params.page));
  if (params.limit != null) sp.set("limit", String(params.limit));
  const path = `/api/items/search?${sp.toString()}`;
  const res = await request<{ items: SuggestItem[]; total: number; page: number; limit: number }>(path, { token });
  return {
    items: res.items ?? [],
    total: res.total ?? 0,
    page: res.page ?? 1,
    limit: res.limit ?? 25,
  };
}

export async function catalogResolve(
  ref: string,
  token?: string | null
): Promise<CatalogItem> {
  const path = `/api/catalog/resolve?ref=${encodeURIComponent(ref)}`;
  return request<CatalogItem>(path, { token });
}

export async function catalogSync(
  catalogIds: string[],
  token?: string | null
): Promise<{ items: (CatalogItem | null)[] }> {
  if (catalogIds.length > 100) throw new Error("Max 100 catalog IDs per sync.");
  const res = await request<{ items: (CatalogItem | null)[] }>("/api/catalog/sync", {
    method: "POST",
    body: { catalogIds },
    token,
  });
  return { items: res.items ?? [] };
}

export async function trackUsage(itemId: string, token?: string | null): Promise<void> {
  try {
    await request<{ ok: boolean }>(`/api/items/${encodeURIComponent(itemId)}/track`, {
      method: "POST",
      body: { action: "copy" },
      token,
    });
  } catch {
    // fire-and-forget
  }
}
