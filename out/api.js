"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackUsage = exports.catalogSync = exports.catalogResolve = exports.itemsSearch = exports.authMe = void 0;
const vscode = __importStar(require("vscode"));
function getBaseUrl() {
    return vscode.workspace.getConfiguration("codemint").get("baseUrl") ?? "https://codemint.app";
}
function trimTrailingSlash(s) {
    return s.replace(/\/+$/, "");
}
async function request(path, opts) {
    const base = trimTrailingSlash(getBaseUrl());
    const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = { "Content-Type": "application/json" };
    if (opts.token)
        headers["Authorization"] = `Bearer ${opts.token}`;
    const init = { method: opts.method ?? "GET", headers };
    if (opts.body != null && opts.method !== "GET")
        init.body = JSON.stringify(opts.body);
    const res = await fetch(url, init);
    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    }
    catch {
        data = {};
    }
    if (!res.ok) {
        const err = data && typeof data === "object" && "error" in data && typeof data.error === "object"
            ? data.error
            : { code: "error", message: text || res.statusText };
        const msg = typeof err === "object" && err && "message" in err ? String(err.message) : String(err);
        if (res.status === 401)
            throw new Error("Not logged in or token expired. Run CodeMint: Login.");
        if (res.status === 404)
            throw new Error("Rule/skill not found. Check ref or visibility.");
        if (res.status === 429)
            throw new Error("Too many requests. Try again later.");
        throw new Error(msg || "Request failed");
    }
    return data;
}
async function authMe(token) {
    return request("/api/auth/me", { token });
}
exports.authMe = authMe;
async function itemsSearch(params, token) {
    const sp = new URLSearchParams();
    if (params.q)
        sp.set("q", params.q);
    if (params.type)
        sp.set("type", params.type);
    if (params.tags?.length)
        sp.set("tags", params.tags.join(","));
    if (params.page != null)
        sp.set("page", String(params.page));
    if (params.limit != null)
        sp.set("limit", String(params.limit));
    const path = `/api/items/search?${sp.toString()}`;
    const res = await request(path, { token });
    return {
        items: res.items ?? [],
        total: res.total ?? 0,
        page: res.page ?? 1,
        limit: res.limit ?? 25,
    };
}
exports.itemsSearch = itemsSearch;
async function catalogResolve(ref, token) {
    const path = `/api/catalog/resolve?ref=${encodeURIComponent(ref)}`;
    return request(path, { token });
}
exports.catalogResolve = catalogResolve;
async function catalogSync(catalogIds, token) {
    if (catalogIds.length > 100)
        throw new Error("Max 100 catalog IDs per sync.");
    const res = await request("/api/catalog/sync", {
        method: "POST",
        body: { catalogIds },
        token,
    });
    return { items: res.items ?? [] };
}
exports.catalogSync = catalogSync;
async function trackUsage(itemId, token) {
    try {
        await request(`/api/items/${encodeURIComponent(itemId)}/track`, {
            method: "POST",
            body: { action: "copy" },
            token,
        });
    }
    catch {
        // fire-and-forget
    }
}
exports.trackUsage = trackUsage;
//# sourceMappingURL=api.js.map