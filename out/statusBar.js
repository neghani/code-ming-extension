"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStatusBar = void 0;
const vscode = __importStar(require("vscode"));
function createStatusBar(context) {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(item);
    const update = async () => {
        const token = await context.secrets.get("codemint.token");
        const user = context.globalState.get("codemint.user");
        if (token && user) {
            item.text = "CodeMint: synced";
            item.tooltip = `Logged in as ${user.email}. Click to sync.`;
        }
        else {
            item.text = "CodeMint: not logged in";
            item.tooltip = "Click to open CodeMint output. Run CodeMint: Login to sign in.";
        }
        item.show();
    };
    item.command = "codemint.statusBarClick";
    context.subscriptions.push(vscode.commands.registerCommand("codemint.statusBarClick", async () => {
        const channel = vscode.window.createOutputChannel("CodeMint");
        channel.show();
        const token = await context.secrets.get("codemint.token");
        if (token) {
            await vscode.commands.executeCommand("codemint.sync");
        }
        else {
            channel.appendLine("Not logged in. Run CodeMint: Login from the command palette.");
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("codemint.refreshStatusBar", () => update()));
    update();
}
exports.createStatusBar = createStatusBar;
//# sourceMappingURL=statusBar.js.map