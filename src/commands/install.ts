import * as path from "path";
import * as vscode from "vscode";
import { getStoredToken } from "../auth";
import { catalogResolve, trackUsage } from "../api";
import { ensureTool } from "../toolDetect";
import { writePath, writeContent } from "../writers";
import {
  readManifest,
  writeManifest,
  addEntry,
  getEmptyManifest,
  ensureManifestDir,
} from "../manifest";
import type { ManifestEntry } from "../types";
import type { SuggestItem } from "../types";

export async function installSuggestItem(
  context: vscode.ExtensionContext,
  item: SuggestItem
): Promise<void> {
  const token = await getStoredToken(context) ?? undefined;
  const { root, tool } = await ensureTool(context);
  const rootPath = root.uri.fsPath;
  const ref = `@${item.type}/${item.slug}`;
  const catalog = await catalogResolve(ref, token);
  if (catalog.type !== "rule" && catalog.type !== "skill") {
    throw new Error("Only rules and skills can be installed.");
  }
  const fullPath = writePath(rootPath, catalog.slug, catalog.type, tool);
  const relPath = path.relative(rootPath, fullPath);
  const dir = path.dirname(fullPath);
  await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));
  const body = writeContent(catalog.content, catalog.title, catalog.type, tool);
  await vscode.workspace.fs.writeFile(vscode.Uri.file(fullPath), Buffer.from(body, "utf8"));
  let manifest = await readManifest(root) ?? getEmptyManifest();
  await ensureManifestDir(root);
  const entry: ManifestEntry = {
    catalogId: catalog.catalogId,
    ref: `@${catalog.type}/${catalog.slug}`,
    type: catalog.type,
    slug: catalog.slug,
    tool,
    version: catalog.catalogVersion,
    checksum: catalog.checksum ?? null,
    installedAt: new Date().toISOString(),
    path: relPath,
  };
  manifest = addEntry(manifest, entry);
  await writeManifest(root, manifest);
  trackUsage(catalog.id, token).catch(() => {});
  await vscode.commands.executeCommand("codemint.refreshSidebar");
  vscode.window.showInformationMessage(`CodeMint: Added ${catalog.title} to ${tool}.`);
}
