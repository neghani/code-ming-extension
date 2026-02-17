import * as path from "path";
import * as vscode from "vscode";
import { getStoredToken } from "../auth";
import { itemsSearch } from "../api";
import { ensureTool } from "../toolDetect";
import { installSuggestItem } from "./install";
import type { SuggestItem } from "../types";

const TECH_MARKERS: { file: string; tags: string[] }[] = [
  { file: "package.json", tags: ["node", "javascript"] },
  { file: "tsconfig.json", tags: ["typescript"] },
  { file: "next.config.js", tags: ["nextjs"] },
  { file: "next.config.mjs", tags: ["nextjs"] },
  { file: "next.config.ts", tags: ["nextjs"] },
  { file: "requirements.txt", tags: ["python"] },
  { file: "pyproject.toml", tags: ["python"] },
  { file: "Cargo.toml", tags: ["rust"] },
  { file: "go.mod", tags: ["go"] },
];

async function deriveTags(root: vscode.WorkspaceFolder): Promise<string[]> {
  const tags = new Set<string>();
  const rootPath = root.uri.fsPath;
  for (const { file, tags: t } of TECH_MARKERS) {
    const uri = vscode.Uri.file(path.join(rootPath, file));
    try {
      await vscode.workspace.fs.stat(uri);
      t.forEach((tag) => tags.add(tag));
    } catch {
      // not found
    }
  }
  try {
    const pkgUri = vscode.Uri.file(path.join(rootPath, "package.json"));
    const buf = await vscode.workspace.fs.readFile(pkgUri);
    const pkg = JSON.parse(Buffer.from(buf).toString("utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...(pkg.devDependencies ?? {}) };
    if (deps["next"]) tags.add("nextjs");
    if (deps["react"]) tags.add("react");
    if (deps["vue"]) tags.add("vue");
    if (deps["svelte"]) tags.add("svelte");
    if (deps["typescript"]) tags.add("typescript");
    if (deps["tailwindcss"]) tags.add("tailwind");
  } catch {
    // ignore
  }
  return Array.from(tags);
}


export function registerSuggestCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.suggest", async () => {
      try {
        const token = await getStoredToken(context) ?? undefined;
        const { root, tool } = await ensureTool(context);
        const tags = await deriveTags(root);
        if (!tags.length) {
          vscode.window.showInformationMessage("CodeMint: No tech markers found. Try CodeMint: Add and search manually.");
          return;
        }

        const [rulesRes, skillsRes] = await Promise.all([
          itemsSearch({ tags, type: "rule", limit: 10 }, token),
          itemsSearch({ tags, type: "skill", limit: 10 }, token),
        ]);
        const combined: SuggestItem[] = [...rulesRes.items, ...skillsRes.items];
        if (!combined.length) {
          vscode.window.showInformationMessage("CodeMint: No recommendations for this project.");
          return;
        }

        const picked = await vscode.window.showQuickPick(
          combined.map((item) => ({
            label: item.name,
            description: `@${item.type}/${item.slug}`,
            detail: item.tags?.length ? item.tags.join(", ") : undefined,
            item,
          })),
          { title: "Suggested for your stack", matchOnDetail: true }
        );
        if (!picked) return;

        await installSuggestItem(context, picked.item);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      }
    })
  );
}
