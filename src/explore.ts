import * as crypto from "crypto";
import * as path from "path";
import * as vscode from "vscode";
import { getStoredToken } from "./auth";
import { itemsSearch, catalogResolve } from "./api";
import { installSuggestItem } from "./commands/install";
import { readManifest, getEmptyManifest, writeManifest, removeEntry, removeEntryByRef, ensureManifestDir } from "./manifest";
import type { SuggestItem } from "./types";
import { errorMessage, logError, logInfo, logWarn } from "./logger";

type TabType = "rule" | "prompt" | "skill";

function getBaseUrl(): string {
  return vscode.workspace.getConfiguration("codemint").get<string>("baseUrl") ?? "https://codemint.app";
}

function getHtml(): string {
  const nonce = crypto.randomBytes(16).toString("base64");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      margin: 0; 
      padding: 12px; 
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif); 
      font-size: 13px; 
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
    .tabs { 
      display: flex; 
      gap: 8px; 
      margin-bottom: 12px; 
      border-bottom: 1px solid var(--vscode-panel-border); 
      align-items: center; 
      flex-wrap: wrap; 
      padding-bottom: 8px;
    }
    .tab { 
      padding: 8px 16px; 
      cursor: pointer; 
      background: transparent; 
      border: none; 
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      font-weight: 500;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .tab:hover { 
      background: var(--vscode-list-hoverBackground); 
      color: var(--vscode-editor-foreground);
    }
    .tab.active { 
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      font-weight: 600;
    }
    .search-box { 
      margin-left: auto; 
      padding: 6px 12px; 
      font-size: 12px; 
      border: 1px solid var(--vscode-input-border); 
      background: var(--vscode-input-background); 
      color: var(--vscode-input-foreground); 
      border-radius: 6px; 
      width: 160px;
      outline: none;
    }
    .search-box:focus {
      border-color: var(--vscode-focusBorder);
      box-shadow: 0 0 0 1px var(--vscode-focusBorder);
    }
    .search-box::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }
    #list { overflow-y: auto; }
    .card { 
      padding: 12px; 
      margin-bottom: 10px; 
      border: 1px solid var(--vscode-panel-border); 
      border-radius: 8px; 
      background: var(--vscode-editor-inactiveSelectionBackground);
      transition: all 0.2s;
    }
    .card:hover {
      border-color: var(--vscode-focusBorder);
      background: var(--vscode-list-hoverBackground);
    }
    .card h3 { 
      margin: 0 0 8px 0; 
      font-size: 14px; 
      font-weight: 600;
      color: var(--vscode-editor-foreground);
    }
    .card .desc { 
      color: var(--vscode-descriptionForeground); 
      font-size: 12px; 
      line-height: 1.5; 
      margin-bottom: 10px; 
      white-space: pre-wrap; 
      max-height: 4.5em; 
      overflow: hidden; 
    }
    .card .actions { 
      display: flex; 
      flex-wrap: wrap; 
      gap: 8px; 
    }
    .card button { 
      padding: 6px; 
      width: 32px;
      height: 32px;
      font-size: 14px; 
      cursor: pointer; 
      border: 1px solid var(--vscode-button-border, var(--vscode-panel-border)); 
      background: transparent; 
      color: var(--vscode-button-background); 
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      position: relative;
    }
    .card button:hover { 
      background: var(--vscode-list-hoverBackground); 
      border-color: var(--vscode-button-background);
    }
    .card button:hover::after {
      content: attr(title);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 4px;
      padding: 4px 8px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      font-size: 11px;
      white-space: nowrap;
      color: var(--vscode-editor-foreground);
      pointer-events: none;
      z-index: 1000;
    }
    .card button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-background);
    }
    .card button.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .card button.danger { 
      background: transparent;
      border-color: var(--vscode-inputValidation-errorBorder);
      color: var(--vscode-errorForeground);
    }
    .card button.danger:hover {
      background: var(--vscode-inputValidation-errorBackground);
      border-color: var(--vscode-errorForeground);
    }
    .empty { 
      padding: 24px; 
      color: var(--vscode-descriptionForeground); 
      text-align: center; 
      font-size: 13px;
    }
    .loading { 
      padding: 24px; 
      text-align: center; 
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="tabs">
    <button class="tab active" data-tab="rule">Rules</button>
    <button class="tab" data-tab="prompt">Prompts</button>
    <button class="tab" data-tab="skill">Skills</button>
    <input type="text" class="search-box" id="search" placeholder="Search…" />
  </div>
  <div id="list"><div class="empty">Select a tab to load items.</div></div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const listEl = document.getElementById('list');
    let currentTab = 'rule';
    let installedIds = [];
    const tabBtns = document.querySelectorAll('.tab');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        vscode.postMessage({ type: 'tab', value: currentTab });
      });
    });
    const searchEl = document.getElementById('search');
    searchEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') vscode.postMessage({ type: 'search', value: searchEl.value.trim() });
    });
    window.addEventListener('message', e => {
      const msg = e.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'items') {
        installedIds = msg.installedIds || [];
        const items = msg.items || [];
        if (items.length === 0) {
          listEl.innerHTML = '<div class="empty">No items found.</div>';
          return;
        }
        listEl.innerHTML = items.map(item => {
          const desc = item.snippet || (item.tags && item.tags.length ? item.tags.join(', ') : '') || 'No description';
          const installed = item.catalogId != null && installedIds.includes(item.catalogId);
          const canInstall = item.type !== 'prompt';
          const syncOrRemove = canInstall
            ? (installed
              ? '<button class="danger" title="Remove" data-action="remove" data-item="' + enc(item) + '">🗑</button>'
              : '<button class="primary" title="Sync" data-action="install" data-item="' + enc(item) + '">⬇</button>')
            : '';
          return '<div class="card" data-id="' + (item.catalogId ?? '') + '">' +
            '<h3>' + escapeHtml(item.name) + '</h3>' +
            '<div class="desc">' + escapeHtml(desc) + '</div>' +
            '<div class="actions">' + syncOrRemove +
            '<button title="Open File" data-action="openFile" data-item="' + enc(item) + '">📄</button>' +
            '<button title="View Online" data-action="openUrl" data-item="' + enc(item) + '">🌐</button>' +
            '</div></div>';
        }).join('');
        listEl.querySelectorAll('[data-action]').forEach(btn => {
          btn.addEventListener('click', () => {
            const item = dec(btn.dataset.item);
            vscode.postMessage({ type: btn.dataset.action, item });
          });
        });
      } else if (msg.type === 'loading') {
        listEl.innerHTML = '<div class="loading">Loading…</div>';
      }
    });
    function enc(o) { return encodeURIComponent(JSON.stringify(o)); }
    function dec(s) { try { return JSON.parse(decodeURIComponent(s)); } catch { return null; } }
    function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  </script>
</body>
</html>`;
}

export function createExploreView(context: vscode.ExtensionContext): void {
  logInfo("explore: creating webview");
  let webviewView: vscode.WebviewView | null = null;

  async function getInstalledIds(): Promise<string[]> {
    const root = vscode.workspace.workspaceFolders?.[0];
    if (!root) return [];
    const manifest = await readManifest(root) ?? getEmptyManifest();
    return manifest.installed
      .map((e) => e.catalogId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
  }

  function postMessage(payload: unknown): void {
    if (webviewView?.visible) webviewView.webview.postMessage(payload);
  }

  let currentTab: TabType = "rule";
  let currentQuery = "";
  let currentItems: SuggestItem[] = [];

  async function loadTab(tab: TabType, query?: string): Promise<void> {
    currentTab = tab;
    if (query !== undefined) currentQuery = query;
    logInfo(`explore.loadTab: tab=${tab} query=${currentQuery || "<empty>"}`);
    postMessage({ type: "loading" });
    try {
      const token = await getStoredToken(context) ?? undefined;
      const res = await itemsSearch(
        { type: tab, limit: 50, q: currentQuery || undefined },
        token
      );
      currentItems = res.items;
      const installedIds = await getInstalledIds();
      postMessage({ type: "items", tab, items: res.items, installedIds });
    } catch (e) {
      logError("explore.loadTab: failed", e);
      const msg = errorMessage(e);
      vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      currentItems = [];
      postMessage({ type: "items", tab, items: [], installedIds: await getInstalledIds() });
    }
  }

  async function removeByCatalogId(catalogId: string | null, ref?: string): Promise<void> {
    logInfo(`explore.removeByCatalogId: catalogId=${catalogId} ref=${ref ?? ""}`);
    const root = vscode.workspace.workspaceFolders?.[0];
    if (!root) {
      vscode.window.showWarningMessage("CodeMint: Open a folder first.");
      return;
    }
    let manifest = await readManifest(root) ?? getEmptyManifest();
    const hasValidCatalogId = typeof catalogId === "string" && catalogId.trim().length > 0;
    const entry = hasValidCatalogId
      ? manifest.installed.find((e) => e.catalogId === catalogId)
      : ref
        ? manifest.installed.find((e) => e.ref === ref)
        : undefined;
    if (!entry) return;
    const fullPath = path.join(root.uri.fsPath, entry.path);
    try {
      await vscode.workspace.fs.delete(vscode.Uri.file(fullPath));
    } catch (e) {
      logWarn("explore remove: delete failed " + (e instanceof Error ? e.message : String(e)));
    }
    const entryHasValidCatalogId = typeof entry.catalogId === "string" && entry.catalogId.trim().length > 0;
    manifest = entryHasValidCatalogId ? removeEntry(manifest, entry.catalogId) : removeEntryByRef(manifest, entry.ref);
    await ensureManifestDir(root);
    await writeManifest(root, manifest);
    await vscode.commands.executeCommand("codemint.refreshSidebar");
    logInfo(`explore.removeByCatalogId: removed ${entry.ref}`);
    vscode.window.showInformationMessage(`CodeMint: Removed ${entry.slug}.`);
  }

  async function openInFile(item: SuggestItem): Promise<void> {
    if (!item?.type || !item?.slug) {
      vscode.window.showErrorMessage("CodeMint: Invalid item.");
      return;
    }
    try {
      logInfo(`explore.openInFile: @${item.type}/${item.slug}`);
      if (item.type === "prompt") {
        vscode.window.showInformationMessage("CodeMint: Prompts open on the website. Use \"Open on website\" for this item.");
        openUrl(item);
        return;
      }
      const token = await getStoredToken(context) ?? undefined;
      const ref = `@${item.type}/${item.slug}`;
      const catalog = await catalogResolve(ref, token);
      const doc = await vscode.workspace.openTextDocument({
        content: catalog.content,
        language: "markdown",
      });
      await vscode.window.showTextDocument(doc);
    } catch (e) {
      logError("explore.openInFile: failed", e);
      const msg = errorMessage(e);
      vscode.window.showErrorMessage(`CodeMint: ${msg}`);
    }
  }

  function openUrl(item: SuggestItem): void {
    if (!item?.type || !item?.id) {
      vscode.window.showErrorMessage("CodeMint: Invalid item.");
      return;
    }
    const base = getBaseUrl().replace(/\/+$/, "");
    const url = `${base}/explore/items/${encodeURIComponent(item.id)}?from=${item.type}`;
    logInfo(`explore.openUrl: ${url}`);
    vscode.env.openExternal(vscode.Uri.parse(url));
  }

  const provider: vscode.WebviewViewProvider = {
    resolveWebviewView(
      wv: vscode.WebviewView,
      _ctx: vscode.WebviewViewResolveContext,
      _token: vscode.CancellationToken
    ): void {
      webviewView = wv;
      wv.webview.options = { enableScripts: true, localResourceRoots: [] };
      wv.webview.html = getHtml();
      void loadTab("rule");
      wv.webview.onDidReceiveMessage(async (msg: { type: string; value?: TabType; item?: SuggestItem }) => {
        if (!msg || typeof msg !== "object") return;
        logInfo(`explore.message: type=${msg.type}`);
        if (msg.type === "tab" && msg.value) {
          await loadTab(msg.value);
        } else if (msg.type === "search" && typeof msg.value === "string") {
          await loadTab(currentTab, msg.value);
        } else if (msg.type === "install" && msg.item?.type && msg.item?.slug) {
          try {
            await installSuggestItem(context, msg.item);
            const installedIds = await getInstalledIds();
            postMessage({ type: "items", tab: currentTab, items: currentItems, installedIds });
          } catch (e) {
            logError("explore.message install: failed", e);
            const err = errorMessage(e);
            vscode.window.showErrorMessage(`CodeMint: ${err}`);
          }
        } else if (msg.type === "remove" && msg.item && typeof msg.item === "object") {
          const ref = msg.item.type && msg.item.slug ? `@${msg.item.type}/${msg.item.slug}` : undefined;
          await removeByCatalogId(msg.item.catalogId ?? null, ref);
          const installedIds = await getInstalledIds();
          postMessage({ type: "items", tab: currentTab, items: currentItems, installedIds });
        } else if (msg.type === "openFile" && msg.item?.type && msg.item?.slug) {
          await openInFile(msg.item);
        } else if (msg.type === "openUrl" && msg.item && typeof msg.item === "object") {
          openUrl(msg.item);
        }
      });
      wv.onDidDispose(() => { webviewView = null; });
    },
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("codemint.explore", provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.installCatalogItem", async (item: SuggestItem) => {
      if (!item?.type || !item?.slug) {
        vscode.window.showWarningMessage("CodeMint: Invalid item. Use Explore to select a rule or skill to install.");
        return;
      }
      try {
        logInfo(`command codemint.installCatalogItem: @${item.type}/${item.slug}`);
        await installSuggestItem(context, item);
      } catch (e) {
        logError("command codemint.installCatalogItem: failed", e);
        const msg = errorMessage(e);
        vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.removeByCatalogId", async (catalogId: string) => {
      try {
        const validCatalogId = typeof catalogId === "string" && catalogId.trim().length > 0;
        if (!validCatalogId) {
          vscode.window.showErrorMessage("CodeMint: Invalid catalog ID.");
          return;
        }
        logInfo(`command codemint.removeByCatalogId: ${catalogId}`);
        await removeByCatalogId(catalogId);
      } catch (e) {
        logError("command codemint.removeByCatalogId: failed", e);
        const msg = errorMessage(e);
        vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.openCatalogItemInFile", async (item: SuggestItem) => {
      if (!item?.type || !item?.slug) {
        vscode.window.showErrorMessage("CodeMint: Invalid item.");
        return;
      }
      try {
        logInfo(`command codemint.openCatalogItemInFile: @${item.type}/${item.slug}`);
        await openInFile(item);
      } catch (e) {
        logError("command codemint.openCatalogItemInFile: failed", e);
        vscode.window.showErrorMessage("CodeMint: " + errorMessage(e));
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.openCatalogItemUrl", (item: SuggestItem) => {
      if (!item?.type || !item?.slug) {
        vscode.window.showErrorMessage("CodeMint: Invalid item.");
        return;
      }
      try {
        logInfo(`command codemint.openCatalogItemUrl: @${item.type}/${item.slug}`);
        openUrl(item);
      } catch (e) {
        logError("command codemint.openCatalogItemUrl: failed", e);
        vscode.window.showErrorMessage("CodeMint: " + errorMessage(e));
      }
    })
  );
}
