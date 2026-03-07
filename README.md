<p align="center">
  <img src="icon.png" alt="CodeMint" width="128" />
</p>

<h1 align="center">CodeMint</h1>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=codemint.codemint"><img src="https://img.shields.io/visual-studio-marketplace/v/codemint.codemint?label=VS%20Code%20Marketplace&color=brightgreen" alt="Marketplace version" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=codemint.codemint"><img src="https://img.shields.io/visual-studio-marketplace/i/codemint.codemint?color=blue" alt="Installs" /></a>
  <a href="https://codemint.app"><img src="https://img.shields.io/badge/website-codemint.app-green" alt="Website" /></a>
  <a href="https://github.com/neghani/code-mint-cli/releases"><img src="https://img.shields.io/github/v/release/neghani/code-mint-cli?label=CLI&color=orange" alt="CLI latest release" /></a>
  <img src="https://img.shields.io/badge/license-MIT-lightgrey" alt="MIT License" />
</p>

<p align="center">
  Sync AI rules and skills from <a href="https://codemint.app">CodeMint</a> directly into your workspace.<br/>
  Works with <strong>Cursor · Cline · Windsurf · Continue · GitHub Copilot · Claude · Codex</strong>
</p>

---

> **Public Beta — free to use.**  
> The hosted service at [codemint.app](https://codemint.app) is free and may be slow under heavy load. If a request takes a moment to return, please wait — the server is responding. Organizations can point the extension at their own hosted instance; see [Organizations & Self-hosting](#organizations--self-hosting).

---

## What is CodeMint?

CodeMint is a catalog of **rules**, **prompts**, and **skills** for AI coding assistants. The extension connects VS Code (and Cursor) to the catalog so you can:

- Browse and install rules/skills in one click, placed directly in the right folder for your AI tool
- Get **smart suggestions** based on your project's tech stack
- Keep everything in sync as the catalog evolves
- Share a consistent set of rules across your team via `.codemint/manifest.json`

**The CodeMint ecosystem:**

| | |
|---|---|
| **VS Code Extension** | This extension — install and manage catalog items from inside your editor |
| **CLI** | [`codemint-cli`](https://github.com/neghani/code-mint-cli) — install and sync from the terminal; [latest release](https://github.com/neghani/code-mint-cli/releases) |
| **App (self-hostable)** | [`code-mint-ai-app`](https://github.com/neghani/code-mint-ai-app) — the catalog web app; host it for your organization |

---

## Getting Started

### 1. Install

Search **CodeMint** in the VS Code Extensions view, or install from the [Marketplace page](https://marketplace.visualstudio.com/items?itemName=codemint.codemint).

### 2. Sign in

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **CodeMint: Login**.  
A browser window will open to complete the sign-in flow at [codemint.app](https://codemint.app). Once done, the status bar and sidebar will confirm you are logged in.

> Signing in on the website alone does not authenticate the extension. You must run **CodeMint: Login** from VS Code.

### 3. Browse and install

Open the **CodeMint** panel in the Activity Bar. In the **Explore** view, switch between **Rules**, **Prompts**, and **Skills** tabs and click **Install** on any item. The extension writes files into the correct folder for your AI tool automatically (e.g. `.cursor/rules/` for Cursor, `.github/instructions/` for Copilot).

### 4. Get suggestions for your project

Run **CodeMint: Suggest** from the Command Palette. The extension scans your workspace for framework and language signals (e.g. Next.js, TypeScript, Python) and surfaces catalog items that match your stack.

### 5. Stay up to date

Run **CodeMint: Sync** at any time to pull the latest version of every installed item from the catalog.

---

## Views

| View | Description |
|---|---|
| **Explore** | Browse the full catalog by tab: Rules, Prompts, Skills. Install, remove, open files, or open items on the website. |
| **Installed** | All items tracked in this workspace's `.codemint/manifest.json`. Open any file directly from the list. |

---

## Commands

| Command | Description |
|---|---|
| **CodeMint: Login** | Sign in via browser; token is stored in VS Code Secret Storage. |
| **CodeMint: Logout** | Remove the stored token. |
| **CodeMint: Add Rule/Skill** | Search the catalog and install an item in a single step. |
| **CodeMint: Suggest** | Scan the project tech stack and show recommended items. |
| **CodeMint: Sync** | Pull the latest version of all installed items from the catalog. |
| **CodeMint: List Installed** | View installed items; click to open the file. |
| **CodeMint: Remove** | Remove an installed item from disk and the manifest. |
| **CodeMint: Set app URL** | Point the extension at a custom CodeMint instance (see below). |
| **CodeMint: Open Settings** | Open VS Code settings filtered to CodeMint. |
| **CodeMint: Show logs** | Open the output channel for auth state, API URL, and error logs. |

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `codemint.baseUrl` | `https://codemint.app` | The CodeMint server URL used for login and API calls. |
| `codemint.autoSync` | `false` | Automatically sync installed items when a workspace with a manifest is opened. |
| `codemint.toolOverrides` | `[]` | Force specific AI tools instead of auto-detection (e.g. `["cursor"]`). |

---

## Organizations & Self-hosting

Organizations can run their own CodeMint instance for a private catalog scoped to their team. The source code is available at [github.com/neghani/code-mint-ai-app](https://github.com/neghani/code-mint-ai-app).

Once your instance is running, point the extension at it:

1. Run **CodeMint: Set app URL** from the Command Palette (or use the title bar icon in the Explore view).
2. Enter your instance's base URL (e.g. `https://codemint.yourcompany.com`).
3. Run **CodeMint: Login** to authenticate against your instance.

The active base URL is visible in the output channel (**CodeMint: Show logs**) after activation.

---

## Supported AI Tools

The extension automatically detects which tool your project uses based on workspace markers:

| Tool | Detected by |
|---|---|
| Cursor | `.cursor/` |
| Cline | `.cline/` or `.clinerules` |
| Windsurf | `.windsurf/` |
| Continue | `.continue/` |
| GitHub Copilot | `.github/instructions/` |
| Claude | `CLAUDE.md` or `.claude/` |
| Codex | `.codex/` |

Use `codemint.toolOverrides` to force a specific tool if auto-detection does not match your setup.

---

## Manifest

All installed items are recorded in `.codemint/manifest.json` at the workspace root. This file is compatible with the [CodeMint CLI](https://github.com/neghani/code-mint-cli), so you can use both the extension and the CLI in the same project interchangeably. Commit the manifest to source control to share a consistent set of rules and skills across your team.

---

## License

[MIT](LICENSE.txt) — © [CodeMint](https://codemint.app)

---

<p align="center">
  <a href="https://codemint.app">codemint.app</a> ·
  <a href="https://marketplace.visualstudio.com/items?itemName=codemint.codemint">VS Code Marketplace</a> ·
  <a href="https://github.com/neghani/code-mint-cli/releases">CLI releases</a> ·
  <a href="https://github.com/neghani/code-mint-ai-app">Self-host the app</a> ·
  <a href="https://github.com/neghani/code-mint-extension/issues">Report an issue</a>
</p>
