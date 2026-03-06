import * as path from "path";
import * as vscode from "vscode";
import { getStoredToken } from "./auth";
import { itemsSearch, catalogResolve } from "./api";
import { installSuggestItem } from "./commands/install";
import { readManifest, getEmptyManifest, writeManifest, removeEntry, ensureManifestDir } from "./manifest";
import type { SuggestItem } from "./types";
import { errorMessage, logError, logInfo } from "./logger";

type TabType = "rule" | "prompt" | "skill";

function getBaseUrl(): string {
  return vscode.workspace.getConfiguration("codemint").get<string>("baseUrl") ?? "https://codemint.app";
}

function getHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      margin: 0; 
      padding: 12px; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      font-size: 13px; 
      background: #121212;
      color: #e5e5e5;
    }
    .tabs { 
      display: flex; 
      gap: 8px; 
      margin-bottom: 12px; 
      border-bottom: 1px solid #303030; 
      align-items: center; 
      flex-wrap: wrap; 
      padding-bottom: 8px;
    }
    .tab { 
      padding: 8px 16px; 
      cursor: pointer; 
      background: transparent; 
      border: none; 
      color: #9e9e9e;
      font-size: 13px;
      font-weight: 500;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .tab:hover { 
      background: #212121; 
      color: #e5e5e5;
    }
    .tab.active { 
      color: #2dcc8c;
      background: rgba(45, 204, 140, 0.1);
      font-weight: 600;
    }
    .search-box { 
      margin-left: auto; 
      padding: 6px 12px; 
      font-size: 12px; 
      border: 1px solid #424242; 
      background: #212121; 
      color: #e5e5e5; 
      border-radius: 6px; 
      width: 160px;
      outline: none;
    }
    .search-box:focus {
      border-color: #2dcc8c;
      box-shadow: 0 0 0 1px rgba(45, 204, 140, 0.2);
    }
    .search-box::placeholder {
      color: #757575;
    }
    #list { overflow-y: auto; }
    .card { 
      padding: 12px; 
      margin-bottom: 10px; 
      border: 1px solid #303030; 
      border-radius: 8px; 
      background: #1e1e1e;
      transition: all 0.2s;
    }
    .card:hover {
      border-color: #424242;
      background: #212121;
    }
    .card h3 { 
      margin: 0 0 8px 0; 
      font-size: 14px; 
      font-weight: 600;
      color: #ffffff;
    }
    .card .desc { 
      color: #9e9e9e; 
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
      border: 1px solid rgba(45, 204, 140, 0.3); 
      background: transparent; 
      color: #2dcc8c; 
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      position: relative;
    }
    .card button:hover { 
      background: rgba(45, 204, 140, 0.1); 
      border-color: #2dcc8c;
    }
    .card button:hover::after {
      content: attr(title);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 4px;
      padding: 4px 8px;
      background: #1e1e1e;
      border: 1px solid #303030;
      border-radius: 4px;
      font-size: 11px;
      white-space: nowrap;
      color: #e5e5e5;
      pointer-events: none;
      z-index: 1000;
    }
    .card button.primary {
      background: #2dcc8c;
      color: #121212;
      border-color: #2dcc8c;
    }
    .card button.primary:hover {
      background: #47d7a7;
    }
    .card button.danger { 
      background: transparent;
      border-color: rgba(239, 83, 80, 0.3);
      color: #ef5350;
    }
    .card button.danger:hover {
      background: rgba(239, 83, 80, 0.1);
      border-color: #ef5350;
    }
    .empty { 
      padding: 24px; 
      color: #757575; 
      text-align: center; 
      font-size: 13px;
    }
    .loading { 
      padding: 24px; 
      text-align: center; 
      color: #757575;
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
  <script>
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
      if (msg.type === 'items') {
        installedIds = msg.installedIds || [];
        const items = msg.items || [];
        if (items.length === 0) {
          listEl.innerHTML = '<div class="empty">No items found.</div>';
          return;
        }
        listEl.innerHTML = items.map(item => {
          const desc = item.snippet || (item.tags && item.tags.length ? item.tags.join(', ') : '') || 'No description';
          const installed = installedIds.includes(item.catalogId);
          const canInstall = item.type !== 'prompt';
          const syncOrRemove = canInstall
            ? (installed
              ? '<button class="danger" title="Remove" data-action="remove" data-item="' + enc(item) + '">🗑</button>'
              : '<button class="primary" title="Sync" data-action="install" data-item="' + enc(item) + '">⬇</button>')
            : '';
          return '<div class="card" data-id="' + item.catalogId + '">' +
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
    return manifest.installed.map((e) => e.catalogId);
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

  async function removeByCatalogId(catalogId: string): Promise<void> {
    logInfo(`explore.removeByCatalogId: catalogId=${catalogId}`);
    const root = vscode.workspace.workspaceFolders?.[0];
    if (!root) {
      vscode.window.showWarningMessage("CodeMint: Open a folder first.");
      return;
    }
    let manifest = await readManifest(root) ?? getEmptyManifest();
    const entry = manifest.installed.find((e) => e.catalogId === catalogId);
    if (!entry) return;
    const fullPath = path.join(root.uri.fsPath, entry.path);
    try {
      await vscode.workspace.fs.delete(vscode.Uri.file(fullPath));
    } catch {
      // file may already be deleted
    }
    manifest = removeEntry(manifest, catalogId);
    await ensureManifestDir(root);
    await writeManifest(root, manifest);
    await vscode.commands.executeCommand("codemint.refreshSidebar");
    logInfo(`explore.removeByCatalogId: removed ${entry.ref}`);
    vscode.window.showInformationMessage(`CodeMint: Removed ${entry.slug}.`);
  }

  async function openInFile(item: SuggestItem): Promise<void> {
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
    const base = getBaseUrl().replace(/\/+$/, "");
    const segment = item.type === "rule" ? "rules" : item.type === "prompt" ? "prompts" : "skills";
    const url = `${base}/${segment}/${item.slug}`;
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
        logInfo(`explore.message: type=${msg.type}`);
        if (msg.type === "tab" && msg.value) {
          await loadTab(msg.value);
        } else if (msg.type === "search" && typeof msg.value === "string") {
          await loadTab(currentTab, msg.value);
        } else if (msg.type === "install" && msg.item) {
          try {
            await installSuggestItem(context, msg.item);
            const installedIds = await getInstalledIds();
            postMessage({ type: "items", tab: currentTab, items: currentItems, installedIds });
          } catch (e) {
            logError("explore.message install: failed", e);
            const err = errorMessage(e);
            vscode.window.showErrorMessage(`CodeMint: ${err}`);
          }
        } else if (msg.type === "remove" && msg.item) {
          await removeByCatalogId(msg.item.catalogId);
          const installedIds = await getInstalledIds();
          postMessage({ type: "items", tab: currentTab, items: currentItems, installedIds });
        } else if (msg.type === "openFile" && msg.item) {
          await openInFile(msg.item);
        } else if (msg.type === "openUrl" && msg.item) {
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
      try {
        logInfo(`command codemint.openCatalogItemInFile: @${item.type}/${item.slug}`);
        await openInFile(item);
      } catch (e) {
        logError("command codemint.openCatalogItemInFile: failed", e);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.openCatalogItemUrl", (item: SuggestItem) => {
      try {
        logInfo(`command codemint.openCatalogItemUrl: @${item.type}/${item.slug}`);
        openUrl(item);
      } catch (e) {
        logError("command codemint.openCatalogItemUrl: failed", e);
      }
    })
  );
}
