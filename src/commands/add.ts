import * as vscode from "vscode";
import { getStoredToken } from "../auth";
import { itemsSearch } from "../api";
import { installSuggestItem } from "./install";
import { errorMessage, logError, logInfo } from "../logger";

export function registerAddCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.add", async () => {
      try {
        logInfo("command codemint.add: invoked");
        const token = await getStoredToken(context) ?? undefined;
        const q = await vscode.window.showInputBox({
          prompt: "Search rules and skills",
          placeHolder: "e.g. nextjs, react, typescript",
        });
        if (q === undefined) return;

        logInfo(`command codemint.add: searching with query="${q || "<empty>"}"`);
        let res;
        try {
          res = await itemsSearch(
            { q: q || undefined, limit: 25 },
            token
          );
          logInfo(`command codemint.add: search returned ${res.items.length} items`);
        } catch (e) {
          logError("command codemint.add: search failed", e);
          throw new Error(`Failed to search: ${e instanceof Error ? e.message : String(e)}`);
        }
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
        logInfo(`command codemint.add: installed @${picked.item.type}/${picked.item.slug}`);
      } catch (e) {
        logError("command codemint.add: failed", e);
        const msg = errorMessage(e);
        vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      }
    })
  );
}
