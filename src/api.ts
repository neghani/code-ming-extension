import * as vscode from "vscode";
import type { SuggestItem, CatalogItem, AuthUser } from "./types";
import { logError, logInfo, logWarn } from "./logger";

function getBaseUrl(): string {
  return vscode.workspace.getConfiguration("codemint").get<string>("baseUrl") ?? "https://codemint.app";
}

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

let baseUrlLogged = false;

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null }
): Promise<T> {
  const base = trimTrailingSlash(getBaseUrl());
  if (!baseUrlLogged) {
    logInfo("api baseUrl=" + base);
    baseUrlLogged = true;
  }
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  const method = opts.method ?? "GET";
  const init: RequestInit = { method, headers };
  if (opts.body != null && opts.method !== "GET") {
    init.body = JSON.stringify(opts.body);
    logInfo(`api.request: ${method} ${url} body=${JSON.stringify(opts.body)}`);
  } else {
    logInfo(`api.request: ${method} ${url}`);
  }
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    logError(`api.request: network failure ${method} ${url}`, e);
    throw new Error(`Network error: ${e instanceof Error ? e.message : String(e)}`);
  }
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    let msg: string;
    if (data && typeof data === "object" && "error" in data) {
      const err = (data as { error: unknown }).error;
      if (typeof err === "string") msg = err;
      else if (typeof err === "object" && err && "message" in err) msg = String((err as { message: string }).message);
      else msg = text || res.statusText;
    } else {
      msg = text || res.statusText;
    }
    logError(`api.request: failed ${method} ${url} status=${res.status}`, {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      body: text,
      parsed: data,
    });
    if (res.status === 401) throw new Error("Not logged in or token expired. Run CodeMint: Login.");
    if (res.status === 404) throw new Error("Rule/skill not found. Check ref or visibility.");
    if (res.status === 429) throw new Error("Too many requests. Try again later.");
    if (res.status === 503) {
      const hint =
        "Search unavailable. If you're using a local app, ensure the app's database is running and DATABASE_URL is set.";
      throw new Error(hint);
    }
    throw new Error(`API error (${res.status}): ${msg || "Request failed"}`);
  }
  logInfo(`api.request: success ${method} ${url} status=${res.status}`);
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
  logInfo(`api.itemsSearch: params=${JSON.stringify(params)} query=${sp.toString()}`);
  const res = await request<{ items: SuggestItem[]; total: number; page: number; limit: number }>(path, { token });
  const result = {
    items: res.items ?? [],
    total: res.total ?? 0,
    page: res.page ?? 1,
    limit: res.limit ?? 25,
  };
  logInfo(`api.itemsSearch: returned ${result.items.length} items (total=${result.total})`);
  return result;
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
  const sanitized = catalogIds.filter(
    (id): id is string => typeof id === "string" && id.trim().length > 0
  );
  if (sanitized.length > 100) throw new Error("Max 100 catalog IDs per sync.");
  const res = await request<{ items: (CatalogItem | null)[] }>("/api/catalog/sync", {
    method: "POST",
    body: { catalogIds: sanitized },
    token,
  });
  return { items: res.items ?? [] };
}

export async function trackUsage(itemId: string, token?: string | null): Promise<void> {
  if (!itemId || String(itemId).trim() === "") return;
  try {
    await request<{ ok: boolean }>(`/api/items/${encodeURIComponent(itemId)}/track`, {
      method: "POST",
      body: { action: "copy" },
      token,
    });
  } catch (e) {
    logWarn(`api.trackUsage: failed for ${itemId}: ${String(e)}`);
  }
}
