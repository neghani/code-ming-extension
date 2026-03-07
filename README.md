# CodeMint

Sync rules and skills from [CodeMintAI](https://codemint.app) into your workspace. Works with Cursor, Cline, Windsurf, Continue, Copilot, Claude, and Codex.

## Sign in

To use **Sync**, **Suggest**, and **Install**, run **CodeMint: Login** from the command palette and complete the browser flow. Logging in only on the website does not sign the extension in.

## Views

- **Installed** — Rules and skills installed in this workspace (from `.codemint/manifest.json`). Use the title bar icon to open CodeMint settings.
- **Explore** — Browse the catalog on the host: **Rules**, **Prompts**, **Skills** tabs; Sync/Remove, Open in file, Open on website. Use the title bar icon to set the CodeMint app URL if needed.

## Commands

- **CodeMint: Login** — Sign in via browser and store token in VS Code Secret Storage.
- **CodeMint: Logout** — Clear stored token.
- **CodeMint: Add Rule/Skill** — Search the catalog, pick an item, and install it to the detected AI tool folder.
- **CodeMint: Sync** — Compare installed items with the server and update changed files.
- **CodeMint: Suggest** — Scan the project for tech stack (e.g. nextjs, typescript), then show recommended rules/skills to add.
- **CodeMint: List Installed** — Show installed items and open the file on pick.
- **CodeMint: Remove** — Pick an installed item and remove it from disk and manifest.
- **CodeMint: Set app URL** — Set the CodeMint app URL (used for login and API; default `https://codemint.app`). Also in Explore view title bar.
- **CodeMint: Show logs** — Open the CodeMint output channel (auth state, baseUrl, and command logs).
- **CodeMint: Open Settings** — Open VS Code settings filtered to CodeMint. Also available from the Installed view title bar.

## Settings

- `codemint.baseUrl` — CodeMint app URL for login and API (default: `https://codemint.app`). Change via **CodeMint: Set app URL** or Explore view title bar. When using a local app (e.g. development), set this to that app (e.g. `http://localhost:3000`). The CodeMint output channel (**CodeMint: Show logs**) shows the effective baseUrl after activation.
- `codemint.autoSync` — Run sync on workspace open when a manifest exists (default: `false`).
- `codemint.toolOverrides` — Force a tool instead of auto-detect (e.g. `["cursor"]`).

## Tool detection

The extension looks for these folders/files in the workspace root and uses the first match (or the override):

| Tool     | Marker                |
|----------|------------------------|
| Cursor   | `.cursor/`             |
| Cline    | `.cline/` or `.clinerules` |
| Windsurf | `.windsurf/`           |
| Continue | `.continue/`           |
| Copilot  | `.github/instructions` |
| Claude   | `CLAUDE.md` or `.claude/` |
| Codex    | `.codex/`              |

## Manifest

Installed items are recorded in `.codemint/manifest.json`, compatible with the CodeMint CLI. You can use both the extension and the CLI in the same project.

## Development

When changing the extension code, follow [BEST_PRACTICES.md](BEST_PRACTICES.md) so type vs runtime shape, null handling, and API/manifest contracts stay consistent (e.g. SuggestItem has no `ref`; catalogId may be null from API; validate payloads at boundaries).

## Build

```bash
cd extension
npm install
npm run compile
```

Package for distribution:

```bash
npx @vscode/vsce package
```
