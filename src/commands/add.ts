import * as vscode from "vscode";
import { getStoredToken } from "../auth";
import { itemsSearch } from "../api";
import { installSuggestItem } from "./install";

export function registerAddCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.add", async () => {
      try {
        const token = await getStoredToken(context) ?? undefined;
        const q = await vscode.window.showInputBox({
          prompt: "Search rules and skills",
          placeHolder: "e.g. nextjs, react, typescript",
        });
        if (q === undefined) return;

        const res = await itemsSearch(
          { q: q || undefined, limit: 25 },
          token
        );
        if (!res.items.length) {
          vscode.window.showInformationMessage("CodeMint: No results.");
          return;
        }

        const picked = await vscode.window.showQuickPick(
          res.items.map((item) => ({
            label: item.name,
            description: `@${item.type}/${item.slug}`,
            detail: item.tags?.length ? item.tags.join(", ") : undefined,
            item,
          })),
          { matchOnDescription: true, matchOnDetail: true, title: "Select to add" }
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
