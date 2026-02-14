import * as fs from "fs";
import * as path from "path";

/** Supported image extensions */
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/**
 * Format bytes into a human-readable string.
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Check if a file path is a supported image file.
 */
export function isImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
}

/**
 * Recursively find all image files in a folder, skipping node_modules.
 */
export async function findImagesInFolder(folderPath: string): Promise<string[]> {
    const results: string[] = [];
    await walkDir(folderPath, results);
    return results;
}

async function walkDir(dir: string, results: string[]): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            // Skip node_modules, .git, and hidden directories
            if (
                entry.name === "node_modules" ||
                entry.name === ".git" ||
                entry.name.startsWith(".")
            ) {
                continue;
            }
            await walkDir(fullPath, results);
        } else if (entry.isFile() && isImageFile(entry.name)) {
            results.push(fullPath);
        }
    }
}

/**
 * Check if this is the first time the extension has been activated.
 */
export function isFirstInstall(
    context: { globalState: { get(key: string): any; update(key: string, value: any): Thenable<void> } }
): boolean {
    const key = "miconvert.installed";
    const installed = context.globalState.get(key);
    if (!installed) {
        context.globalState.update(key, true);
        return true;
    }
    return false;
}

/**
 * Get the file size in bytes.
 */
export async function getFileSize(filePath: string): Promise<number> {
    const stat = await fs.promises.stat(filePath);
    return stat.size;
}

// ─────────────────────────────────────────────
// Review Seeding
// ─────────────────────────────────────────────

let ratingPromptedThisSession = false;

/**
 * Increment the compress count stored in globalState.
 */
export function incrementCompressCount(
    context: { globalState: { get(key: string): any; update(key: string, value: any): Thenable<void> } }
): number {
    const key = "miconvert.compressCount";
    const count = (context.globalState.get(key) as number) || 0;
    const newCount = count + 1;
    context.globalState.update(key, newCount);
    return newCount;
}

/**
 * Determine whether to show a "Rate us" prompt.
 * Rules:
 *  - Only after at least 5 successful compressions
 *  - 20% random chance each time
 *  - Only once per VS Code session
 *  - Not if user already dismissed permanently
 */
export function shouldPromptRating(
    context: { globalState: { get(key: string): any; update(key: string, value: any): Thenable<void> } }
): boolean {
    if (ratingPromptedThisSession) {
        return false;
    }

    const dismissed = context.globalState.get("miconvert.ratingDismissed") as boolean;
    if (dismissed) {
        return false;
    }

    const count = (context.globalState.get("miconvert.compressCount") as number) || 0;
    if (count < 5) {
        return false;
    }

    // 20% chance
    if (Math.random() > 0.2) {
        return false;
    }

    ratingPromptedThisSession = true;
    return true;
}
