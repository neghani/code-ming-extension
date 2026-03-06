import * as vscode from "vscode";

let channel: vscode.OutputChannel | null = null;

function now(): string {
  return new Date().toISOString();
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function toDetails(err: unknown): string {
  if (err instanceof Error) return err.stack ?? err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function getLogger(): vscode.OutputChannel {
  if (!channel) channel = vscode.window.createOutputChannel("CodeMint");
  return channel;
}

export function initializeLogger(context: vscode.ExtensionContext): void {
  context.subscriptions.push(getLogger());
}

export function errorMessage(err: unknown): string {
  return toMessage(err);
}

export function logInfo(message: string): void {
  getLogger().appendLine(`[${now()}] INFO ${message}`);
}

export function logWarn(message: string): void {
  getLogger().appendLine(`[${now()}] WARN ${message}`);
}

export function logError(message: string, err: unknown): void {
  const logger = getLogger();
  logger.appendLine(`[${now()}] ERROR ${message}`);
  if (err && typeof err === "object") {
    try {
      logger.appendLine(JSON.stringify(err, null, 2));
    } catch {
      logger.appendLine(toDetails(err));
    }
  } else {
    logger.appendLine(toDetails(err));
  }
  logger.show(true); // Show output channel on error
}
