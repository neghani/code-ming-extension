import * as path from "path";
import * as vscode from "vscode";
import type { Manifest, ManifestEntry } from "./types";
import { MANIFEST_VERSION, CODEMINT_DIR, MANIFEST_FILE } from "./types";

function getBaseUrl(): string {
  return vscode.workspace.getConfiguration("codemint").get<string>("baseUrl") ?? "https://codemint.app";
}

export async function readManifest(root: vscode.WorkspaceFolder): Promise<Manifest | null> {
  const manifestPath = path.join(root.uri.fsPath, MANIFEST_FILE);
  try {
    const data = await vscode.workspace.fs.readFile(vscode.Uri.file(manifestPath));
    const parsed = JSON.parse(Buffer.from(data).toString("utf8")) as Manifest;
    if (!parsed.installed || !Array.isArray(parsed.installed)) {
      return { version: MANIFEST_VERSION, baseUrl: getBaseUrl(), installed: [] };
    }
    return {
      version: parsed.version ?? MANIFEST_VERSION,
      baseUrl: parsed.baseUrl ?? getBaseUrl(),
      lastSyncAt: parsed.lastSyncAt,
      installed: parsed.installed,
    };
  } catch {
    return null;
  }
}

export async function ensureManifestDir(root: vscode.WorkspaceFolder): Promise<string> {
  const dirPath = path.join(root.uri.fsPath, CODEMINT_DIR);
  await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
  return dirPath;
}

export async function writeManifest(root: vscode.WorkspaceFolder, manifest: Manifest): Promise<void> {
  await ensureManifestDir(root);
  const manifestPath = path.join(root.uri.fsPath, MANIFEST_FILE);
  const content = JSON.stringify(manifest, null, 2);
  await vscode.workspace.fs.writeFile(vscode.Uri.file(manifestPath), Buffer.from(content, "utf8"));
}

export function addEntry(manifest: Manifest, entry: ManifestEntry): Manifest {
  const next = { ...manifest, installed: manifest.installed.filter((e) => e.catalogId !== entry.catalogId) };
  next.installed.push(entry);
  return next;
}

export function removeEntry(manifest: Manifest, catalogId: string): Manifest {
  return {
    ...manifest,
    installed: manifest.installed.filter((e) => e.catalogId !== catalogId),
  };
}

export function updateEntry(
  manifest: Manifest,
  catalogId: string,
  upd: Partial<ManifestEntry>
): Manifest {
  return {
    ...manifest,
    installed: manifest.installed.map((e) =>
      e.catalogId === catalogId ? { ...e, ...upd } : e
    ),
  };
}

export function getEmptyManifest(): Manifest {
  return {
    version: MANIFEST_VERSION,
    baseUrl: getBaseUrl(),
    installed: [],
  };
}
