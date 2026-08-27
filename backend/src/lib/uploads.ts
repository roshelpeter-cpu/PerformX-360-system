import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================
// ASSIGNMENT EVIDENCE STORAGE
// Small reusable disk store for supporting evidence attached to batch
// and supervisor reassignments. Future modules can reuse the same folder
// layout rather than introducing a second storage system.
// ============================================================

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const uploadsRoot = path.resolve(moduleDir, "../../uploads");
export const evidenceDir = path.join(uploadsRoot, "evidence");

export function ensureUploadDirs() {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

export function evidenceFilePath(filename: string): string {
  return path.join(evidenceDir, filename);
}
