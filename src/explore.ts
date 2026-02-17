import * as path from "path";
import * as vscode from "vscode";
import { getStoredToken } from "./auth";
import { itemsSearch, catalogResolve } from "./api";
import { installSuggestItem } from "./commands/install";
import { readManifest, getEmptyManifest, writeManifest, removeEntry, ensureManifestDir } from "./manifest";
import type { SuggestItem } from "./types";

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
    * { box-sizing: border-box; }
    body { margin: 0; padding: 8px; font-family: var(--font-family); font-size: 13px; }
    .tabs { display: flex; gap: 4px; margin-bottom: 8px; border-bottom: 1px solid var(--vscode-panel-border); align-items: center; flex-wrap: wrap; }
    .tab { padding: 6px 12px; cursor: pointer; background: transparent; border: none; color: var(--vscode-foreground); }
    .tab:hover { background: var(--vscode-toolbar-hoverBackground); }
    .tab.active { font-weight: 600; border-bottom: 2px solid var(--vscode-focusBorder); margin-bottom: -1px; }
    .search-box { margin-left: auto; padding: 4px 8px; font-size: 12px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 2px; width: 140px; }
    #list { overflow-y: auto; }
    .card { padding: 10px; margin-bottom: 8px; border: 1px solid var(--vscode-panel-border); border-radius: 4px; background: var(--vscode-editor-background); }
    .card h3 { margin: 0 0 6px 0; font-size: 13px; }
    .card .desc { color: var(--vscode-descriptionForeground); font-size: 12px; line-height: 1.4; margin-bottom: 8px; white-space: pre-wrap; max-height: 3.6em; overflow: hidden; }
    .card .actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .card button { padding: 4px 8px; font-size: 12px; cursor: pointer; border: 1px solid var(--vscode-button-border); background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-radius: 2px; }
    .card button:hover { background: var(--vscode-button-hoverBackground); }
    .card button.danger { background: var(--vscode-errorBackground); color: var(--vscode-errorForeground); }
    .empty { padding: 16px; color: var(--vscode-descriptionForeground); text-align: center; }
    .loading { padding: 16px; text-align: center; }
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
              ? '<button class="danger" data-action="remove" data-item="' + enc(item) + '">Remove</button>'
              : '<button data-action="install" data-item="' + enc(item) + '">Sync</button>')
            : '';
          return '<div class="card" data-id="' + item.catalogId + '">' +
            '<h3>' + escapeHtml(item.name) + '</h3>' +
            '<div class="desc">' + escapeHtml(desc) + '</div>' +
            '<div class="actions">' + syncOrRemove +
            '<button data-action="openFile" data-item="' + enc(item) + '">Open in new file</button>' +
            '<button data-action="openUrl" data-item="' + enc(item) + '">Open on website</button>' +
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
      const msg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      currentItems = [];
      postMessage({ type: "items", tab, items: [], installedIds: await getInstalledIds() });
    }
  }

  async function removeByCatalogId(catalogId: string): Promise<void> {
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
    vscode.window.showInformationMessage(`CodeMint: Removed ${entry.slug}.`);
  }

  async function openInFile(item: SuggestItem): Promise<void> {
    try {
      const token = await getStoredToken(context) ?? undefined;
      const ref = `@${item.type}/${item.slug}`;
      const catalog = await catalogResolve(ref, token);
      const doc = await vscode.workspace.openTextDocument({
        content: catalog.content,
        language: "markdown",
      });
      await vscode.window.showTextDocument(doc);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(`CodeMint: ${msg}`);
    }
  }

  function openUrl(item: SuggestItem): void {
    const base = getBaseUrl().replace(/\/+$/, "");
    const segment = item.type === "rule" ? "rules" : item.type === "prompt" ? "prompts" : "skills";
    const url = `${base}/${segment}/${item.slug}`;
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
            const err = e instanceof Error ? e.message : String(e);
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
        await installSuggestItem(context, item);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.removeByCatalogId", async (catalogId: string) => {
      try {
        await removeByCatalogId(catalogId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.openCatalogItemInFile", async (item: SuggestItem) => {
      await openInFile(item);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.openCatalogItemUrl", (item: SuggestItem) => {
      openUrl(item);
    })
  );
}
