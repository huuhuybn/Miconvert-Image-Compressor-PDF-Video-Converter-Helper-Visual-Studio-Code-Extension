import * as vscode from "vscode";
import { getFileSize, formatBytes, isImageFile } from "./utils";

const IMAGE_SIZE_WARNING_THRESHOLD = 500 * 1024; // 500KB

/**
 * Manages the status bar item that shows image file sizes
 * and warns about large images.
 */
export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private disposables: vscode.Disposable[] = [];

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = "miconvert.compressFile";

        // Listen for active editor changes
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor(() => this.update())
        );

        // Listen for file saves (size may change after save)
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument(() => this.update())
        );

        // Initial update
        this.update();
    }

    private async update(): Promise<void> {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            this.statusBarItem.hide();
            return;
        }

        const filePath = editor.document.uri.fsPath;

        if (!isImageFile(filePath)) {
            this.statusBarItem.hide();
            return;
        }

        try {
            const size = await getFileSize(filePath);
            const formattedSize = formatBytes(size);

            if (size > IMAGE_SIZE_WARNING_THRESHOLD) {
                // Large file warning - yellow
                this.statusBarItem.text = `$(warning) ${vscode.l10n.t("Image too large ({0}). Click to compress.", formattedSize)}`;
                this.statusBarItem.backgroundColor = new vscode.ThemeColor(
                    "statusBarItem.warningBackground"
                );
                this.statusBarItem.tooltip = vscode.l10n.t(
                    "This image is larger than 500KB. Click to compress with Miconvert."
                );
            } else {
                // Normal size display
                this.statusBarItem.text = `$(file-media) ${formattedSize}`;
                this.statusBarItem.backgroundColor = undefined;
                this.statusBarItem.tooltip = vscode.l10n.t("Image size: {0}", formattedSize);
            }

            this.statusBarItem.show();
        } catch {
            this.statusBarItem.hide();
        }
    }

    /**
     * Force refresh the status bar (e.g., after compression).
     */
    public refresh(): void {
        this.update();
    }

    public dispose(): void {
        this.statusBarItem.dispose();
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
