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
exports.writeContent = exports.writePath = void 0;
const path = __importStar(require("path"));
const TOOL_DIRS = {
    cursor: ".cursor",
    cline: ".cline",
    windsurf: ".windsurf",
    continue: ".continue",
    copilot: ".github/instructions",
    claude: ".claude",
    codex: ".codex",
};
function writePath(rootPath, slug, type, tool) {
    const dir = TOOL_DIRS[tool];
    const base = path.join(rootPath, dir);
    if (type === "skill") {
        if (tool === "cursor")
            return path.join(base, "skills", slug, "SKILL.md");
        if (tool === "cline")
            return path.join(base, "skills", slug, "SKILL.md");
        return path.join(base, "skills", `skill-${slug}.md`);
    }
    if (tool === "cursor")
        return path.join(base, "rules", `${slug}.mdc`);
    return path.join(base, "rules", `${slug}.md`);
}
exports.writePath = writePath;
function writeContent(content, _title, _type) {
    return content;
}
exports.writeContent = writeContent;
//# sourceMappingURL=generic.js.map