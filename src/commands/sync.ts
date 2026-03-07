import * as path from "path";
import * as vscode from "vscode";
import { getStoredToken } from "../auth";
import { catalogSync } from "../api";
import { readManifest, writeManifest, updateEntry, getEmptyManifest, ensureManifestDir } from "../manifest";
import { writePath, writeContent } from "../writers";
import type { CatalogItem } from "../types";
import { errorMessage, getLogger, logError, logInfo } from "../logger";

export function registerSyncCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.sync", async () => {
      const channel = getLogger();
      try {
        logInfo("command codemint.sync: invoked");
        const token = await getStoredToken(context) ?? undefined;
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length) {
          vscode.window.showWarningMessage("CodeMint: Open a folder first.");
          return;
        }
        const root = folders[0];
        let manifest = await readManifest(root) ?? getEmptyManifest();
        await ensureManifestDir(root);
        if (!manifest.installed.length) {
          vscode.window.showInformationMessage("CodeMint: Nothing installed to sync.");
          return;
        }

        const catalogIds = manifest.installed
          .map((e) => e.catalogId)
          .filter((id): id is string => typeof id === "string" && id.length > 0);
        const skipped = manifest.installed.length - catalogIds.length;
        if (skipped > 0) {
          logInfo(`command codemint.sync: skipped ${skipped} entry/entries with missing catalogId`);
        }
        if (!catalogIds.length) {
          vscode.window.showWarningMessage("CodeMint: No valid catalog IDs in manifest.");
          return;
        }
        const { items } = await catalogSync(catalogIds, token);
        const byCatalogId = new Map<string, CatalogItem | null>();
        catalogIds.forEach((id, i) => byCatalogId.set(id, items[i] ?? null));
        let updated = 0;
        let upToDate = 0;

        for (const entry of manifest.installed) {
          const remote = byCatalogId.get(entry.catalogId) ?? null;
          if (!remote) {
            channel.appendLine(`Skip ${entry.slug}: not found on server`);
            continue;
          }
          const changed =
            remote.catalogVersion !== entry.version ||
            (remote.checksum != null && remote.checksum !== entry.checksum);
          if (!changed) {
            upToDate++;
            continue;
          }

          const rootPath = root.uri.fsPath;
          const fullPath = path.join(rootPath, entry.path);
          await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(fullPath)));
          const body = writeContent(remote.content, remote.title, remote.type, entry.tool as "cursor" | "cline" | "windsurf" | "continue" | "copilot" | "claude" | "codex");
          await vscode.workspace.fs.writeFile(vscode.Uri.file(fullPath), Buffer.from(body, "utf8"));
          if (typeof entry.catalogId === "string" && entry.catalogId.length > 0) {
            manifest = updateEntry(manifest, entry.catalogId, {
              version: remote.catalogVersion,
              checksum: remote.checksum ?? null,
            });
          }
          updated++;
          channel.appendLine(`Updated ${entry.slug} to ${remote.catalogVersion}`);
        }

        manifest = { ...manifest, lastSyncAt: new Date().toISOString() };
        await writeManifest(root, manifest);
        await vscode.commands.executeCommand("codemint.refreshSidebar");
        logInfo(`command codemint.sync: completed updated=${updated} upToDate=${upToDate}`);
        vscode.window.showInformationMessage(
          `CodeMint: Synced. ${updated} updated, ${upToDate} up-to-date.`
        );
      } catch (e) {
        logError("command codemint.sync: failed", e);
        const msg = errorMessage(e);
        channel.appendLine(`Error: ${msg}`);
        vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      }
    })
  );
}
