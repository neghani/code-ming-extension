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
exports.toolId = exports.writeContent = exports.writePath = void 0;
const path = __importStar(require("path"));
function hasFrontmatter(content) {
    const trimmed = content.trimStart();
    return trimmed.startsWith("---");
}
function ensureFrontmatter(content, title) {
    if (hasFrontmatter(content))
        return content;
    const desc = title.replace(/"/g, '\\"');
    return `---
description: "${desc}"
alwaysApply: true
---

${content}`;
}
function writePath(rootPath, slug, type) {
    if (type === "skill") {
        return path.join(rootPath, ".cursor", "skills", slug, "SKILL.md");
    }
    return path.join(rootPath, ".cursor", "rules", `${slug}.mdc`);
}
exports.writePath = writePath;
function writeContent(content, title, type) {
    if (type === "skill")
        return content;
    return ensureFrontmatter(content, title);
}
exports.writeContent = writeContent;
exports.toolId = "cursor";
//# sourceMappingURL=cursor.js.map