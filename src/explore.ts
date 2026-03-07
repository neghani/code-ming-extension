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

const ICON_SVGS: Record<string, string> = {
  "cloud-download": "M8 3a3 3 0 0 0-3 3 .5.5 0 0 1-.5.5h-.25a2.25 2.25 0 0 0 0 4.5h.772c.031.343.094.678.185 1H4.25a3.25 3.25 0 0 1-.22-6.493 4 4 0 0 1 7.887-.323 5.49 5.49 0 0 0-1.084-.174A3.001 3.001 0 0 0 8 3Zm7 7.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-4.854 2.353.003.003a.499.499 0 0 0 .348.144h.006a.5.5 0 0 0 .35-.146l2-2a.5.5 0 0 0-.707-.708L11 11.293V8a.5.5 0 0 0-1 0v3.293l-1.146-1.147a.5.5 0 0 0-.708.708l2 2Z",
  trash: "M14 2h-4c0-1.103-.897-2-2-2S6 .897 6 2H2a.5.5 0 0 0 0 1h.54l.809 9.708A2.513 2.513 0 0 0 5.84 15h4.319a2.514 2.514 0 0 0 2.491-2.292L13.459 3h.54a.5.5 0 0 0 0-1H14ZM8 1c.551 0 1 .449 1 1H7c0-.551.449-1 1-1Zm3.655 11.625A1.509 1.509 0 0 1 10.16 14H5.841a1.509 1.509 0 0 1-1.495-1.375L3.544 3h8.914l-.802 9.625h-.001ZM7 5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 1 0Zm3 0v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 1 0Z",
  file: "M5 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V5.414a1.5 1.5 0 0 0-.44-1.06L9.647 1.439A1.5 1.5 0 0 0 8.586 1H5ZM4 3a1 1 0 0 1 1-1h3v2.5A1.5 1.5 0 0 0 9.5 6H12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3Zm7.793 2H9.5a.5.5 0 0 1-.5-.5V2.207L11.793 5Z",
  "link-external": "M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5V9.27a.5.5 0 0 1 1 0v3.23a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 12.5v-9A2.5 2.5 0 0 1 3.5 1h3.23a.5.5 0 0 1 0 1H3.5Zm5.27-.5a.5.5 0 0 1 .5-.5h5.23a.5.5 0 0 1 .5.5v5.23a.5.5 0 0 1-1 0V2.708L9.623 7.084a.5.5 0 1 1-.707-.707L13.293 2H9.269a.5.5 0 0 1-.5-.5Z",
};

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
      padding: 8px; 
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif); 
      font-size: 13px; 
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
    .tabs { 
      display: flex; 
      gap: 2px; 
      margin-bottom: 6px; 
      border-bottom: 1px solid var(--vscode-panel-border); 
      align-items: center; 
      padding-bottom: 6px;
    }
    .tab { 
      padding: 4px 10px; 
      cursor: pointer; 
      background: transparent; 
      border: none; 
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      font-weight: 500;
      border-radius: 4px;
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
    .search-row { margin-bottom: 8px; }
    .search-box { 
      width: 100%;
      height: 26px;
      padding: 3px 8px; 
      font-size: 12px; 
      border: 1px solid var(--vscode-input-border); 
      background: var(--vscode-input-background); 
      color: var(--vscode-input-foreground); 
      border-radius: 4px;
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
      padding: 7px 9px; 
      margin-bottom: 4px; 
      border: 1px solid var(--vscode-panel-border); 
      border-radius: 6px; 
      background: var(--vscode-sideBar-background, var(--vscode-editor-inactiveSelectionBackground));
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
    }
    .card:hover {
      border-color: var(--vscode-focusBorder);
      background: var(--vscode-list-hoverBackground);
    }
    .card-header {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      min-width: 0;
    }
    .installed-dot {
      font-size: 8px;
      color: var(--vscode-testing-iconPassed, #4ec9b0);
      flex-shrink: 0;
      line-height: 1;
    }
    .card-title {
      flex: 1 1 0;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--vscode-editor-foreground);
    }
    .card-actions {
      display: flex;
      gap: 2px;
      flex-shrink: 0;
    }
    .card-actions button {
      width: 16px;
      height: 16px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--vscode-icon-foreground, var(--vscode-descriptionForeground));
      border-radius: 2px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      position: relative;
    }
    .card-actions button:hover {
      background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground);
      color: var(--vscode-editor-foreground);
    }
    .card-actions button:hover::after {
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
    .card-actions button.primary { color: var(--vscode-button-background); }
    .card-actions button.primary:hover { color: var(--vscode-button-hoverBackground); }
    .card-actions button.danger { color: var(--vscode-errorForeground); }
    .card-actions button.danger:hover { color: var(--vscode-errorForeground); }
    .card-actions button svg {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
    }
    .card-meta { margin-top: 4px; }
    .card-meta.snippet {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-meta.tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
    }
    .tag {
      font-size: 9px;
      font-weight: 500;
      padding: 1px 4px;
      border-radius: 3px;
      background: transparent;
      color: var(--vscode-descriptionForeground);
      border: 1px solid var(--vscode-descriptionForeground);
      white-space: nowrap;
      line-height: 1.2;
    }
    .empty, .loading {
      padding: 16px 8px;
      font-size: 12px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <div class="tabs">
    <button class="tab active" data-tab="rule">Rules</button>
    <button class="tab" data-tab="prompt">Prompts</button>
    <button class="tab" data-tab="skill">Skills</button>
  </div>
  <div class="search-row">
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
    const ICON_SVGS = ${JSON.stringify(ICON_SVGS)};
    const iconSvg = (name) => {
      const d = ICON_SVGS[name];
      return d ? '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="' + d + '"/></svg>' : '';
    };
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
          const installed = item.catalogId != null && installedIds.includes(item.catalogId);
          const canInstall = item.type !== 'prompt';
          const syncOrRemove = canInstall
            ? (installed
              ? '<button class="danger" title="Remove" data-action="remove" data-item="' + enc(item) + '">' + iconSvg('trash') + '</button>'
              : '<button class="primary" title="Install" data-action="install" data-item="' + enc(item) + '">' + iconSvg('cloud-download') + '</button>')
            : '';
          const hasSnippet = !!item.snippet;
          const tags = (item.tags && item.tags.length > 0)
            ? (item.tags || []).slice(0, 5).map(function(t) { return String(t).trim(); }).filter(Boolean)
            : (item.slug ? [item.slug] : []);
          const hasTags = tags.length > 0;
          let meta = '';
          if (hasSnippet) {
            meta = '<div class="card-meta snippet">' + escapeHtml(item.snippet) + '</div>';
          } else if (hasTags) {
            meta = '<div class="card-meta tags">' + tags.map(function(t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('') + '</div>';
          }
          const dot = installed ? '<span class="installed-dot" title="Installed">●</span>' : '';
          return '<div class="card" data-id="' + (item.catalogId ?? '') + '">' +
            '<div class="card-header">' +
            dot +
            '<span class="card-title">' + escapeHtml(item.name) + '</span>' +
            '<div class="card-actions">' + syncOrRemove +
            '<button title="Open in editor" data-action="openFile" data-item="' + enc(item) + '">' + iconSvg('file') + '</button>' +
            '<button title="View on web" data-action="openUrl" data-item="' + enc(item) + '">' + iconSvg('link-external') + '</button>' +
            '</div></div>' +
            meta +
            '</div>';
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
      wv.webview.options = { enableScripts: true };
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
