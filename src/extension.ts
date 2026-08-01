import * as vscode from "vscode";
import * as path from "path";
import { compressImage, CompressOptions, CompressResult } from "./compressor";
import { StatusBarManager } from "./statusBar";
import {
    formatBytes,
    isImageFile,
    findImagesInFolder,
    isFirstInstall,
    incrementCompressCount,
    shouldPromptRating,
} from "./utils";

let statusBarManager: StatusBarManager;

export function activate(context: vscode.ExtensionContext) {
    // ─────────────────────────────────────────────
    // Status Bar
    // ─────────────────────────────────────────────
    statusBarManager = new StatusBarManager();
    context.subscriptions.push(statusBarManager);

    // ─────────────────────────────────────────────
    // Welcome message on first install
    // ─────────────────────────────────────────────
    if (isFirstInstall(context)) {
        vscode.window
            .showInformationMessage(
                vscode.l10n.t("Thanks for installing Miconvert! We also support PDF, Video tools at miconvert.com"),
                vscode.l10n.t("Visit miconvert.com")
            )
            .then((selection) => {
                if (selection === vscode.l10n.t("Visit miconvert.com")) {
                    vscode.env.openExternal(
                        vscode.Uri.parse("https://miconvert.com?utm_source=vscode&utm_medium=welcome")
                    );
                }
            });
    }

    // ─────────────────────────────────────────────
    // Command: Compress single file
    // ─────────────────────────────────────────────
    const compressFileCmd = vscode.commands.registerCommand(
        "miconvert.compressFile",
        async (uri?: vscode.Uri) => {
            // If no URI provided (e.g., from status bar click), use active editor
            if (!uri) {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    uri = editor.document.uri;
                }
            }

            if (!uri) {
                vscode.window.showWarningMessage(
                    `Miconvert: ${vscode.l10n.t("No image file selected.")}`
                );
                return;
            }

            const filePath = uri.fsPath;

            if (!isImageFile(filePath)) {
                const action = await vscode.window.showWarningMessage(
                    `Miconvert: ${vscode.l10n.t("File type not supported offline. Process it online at miconvert.com")}`,
                    vscode.l10n.t("Open miconvert.com")
                );
                if (action === vscode.l10n.t("Open miconvert.com")) {
                    vscode.env.openExternal(
                        vscode.Uri.parse(
                            "https://miconvert.com?utm_source=vscode&utm_medium=unsupported"
                        )
                    );
                }
                return;
            }

            const options = getCompressOptions();
            const fileName = path.basename(filePath);
            const verbose = vscode.workspace
                .getConfiguration("miconvert")
                .get<boolean>("verbose", true);

            try {
                // Show compressing notification
                if (verbose) {
                    vscode.window.setStatusBarMessage(
                        `$(loading~spin) ${vscode.l10n.t("Compressing {0}...", fileName)}`,
                        5000
                    );
                }

                const result = await compressImage(filePath, options);

                if (result.skipped) {
                    if (verbose) {
                        vscode.window.showInformationMessage(
                            `Miconvert: ${vscode.l10n.t("{0} skipped — {1}", fileName, result.skipReason || "")}`
                        );
                    }
                    return;
                }

                // Show success notification
                if (verbose) {
                    vscode.window.showInformationMessage(
                        `✅ ${vscode.l10n.t("Compressed {0}: Saved {1} ({2}%)", fileName, formatBytes(result.savedBytes), String(result.savedPercent))}`
                    );
                }

                // Track compress count & optionally prompt for rating
                incrementCompressCount(context);
                if (shouldPromptRating(context)) {
                    const action = await vscode.window.showInformationMessage(
                        vscode.l10n.t("Enjoying Miconvert? Rate us on the Marketplace! ⭐"),
                        vscode.l10n.t("⭐ Rate Now"),
                        vscode.l10n.t("Later"),
                        vscode.l10n.t("Don't ask again")
                    );
                    if (action === vscode.l10n.t("⭐ Rate Now")) {
                        vscode.env.openExternal(
                            vscode.Uri.parse(
                                "https://marketplace.visualstudio.com/items?itemName=miconvert.miconvert-image-optimizer&ssr=false#review-details"
                            )
                        );
                        context.globalState.update("miconvert.ratingDismissed", true);
                    } else if (action === vscode.l10n.t("Don't ask again")) {
                        context.globalState.update("miconvert.ratingDismissed", true);
                    }
                }

                // Refresh status bar
                statusBarManager.refresh();
            } catch (error: any) {
                vscode.window.showErrorMessage(
                    `Miconvert: ${vscode.l10n.t("Failed to compress {0}. {1}", fileName, error.message || String(error))}`
                );
            }
        }
    );

    // ─────────────────────────────────────────────
    // Command: Compress all images in folder
    // ─────────────────────────────────────────────
    const compressFolderCmd = vscode.commands.registerCommand(
        "miconvert.compressFolder",
        async (uri?: vscode.Uri) => {
            if (!uri) {
                vscode.window.showWarningMessage(
                    `Miconvert: ${vscode.l10n.t("No folder selected.")}`
                );
                return;
            }

            const folderPath = uri.fsPath;
            const options = getCompressOptions();
            const verbose = vscode.workspace
                .getConfiguration("miconvert")
                .get<boolean>("verbose", true);

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Miconvert: ${vscode.l10n.t("Compressing images")}`,
                    cancellable: true,
                },
                async (progress, token) => {
                    // Find all images
                    progress.report({ message: vscode.l10n.t("Scanning for images...") });
                    const images = await findImagesInFolder(folderPath);

                    if (images.length === 0) {
                        vscode.window.showInformationMessage(
                            `Miconvert: ${vscode.l10n.t("No image files found in this folder.")}`
                        );
                        return;
                    }

                    let completed = 0;
                    let totalSaved = 0;
                    let skipped = 0;
                    let failed = 0;
                    const results: CompressResult[] = [];

                    for (const imagePath of images) {
                        if (token.isCancellationRequested) {
                            break;
                        }

                        const fileName = path.basename(imagePath);
                        progress.report({
                            message: vscode.l10n.t("Compressing {0}/{1}: {2}", String(completed + 1), String(images.length), fileName),
                            increment: (1 / images.length) * 100,
                        });

                        try {
                            const result = await compressImage(imagePath, options);
                            results.push(result);

                            if (result.skipped) {
                                skipped++;
                            } else {
                                totalSaved += result.savedBytes;
                            }
                        } catch (error: any) {
                            failed++;
                            console.error(
                                `Miconvert: Failed to compress ${imagePath}: ${error.message}`
                            );
                        }

                        completed++;
                    }

                    // Summary notification
                    if (verbose) {
                        const compressed = completed - skipped - failed;
                        let msg = `✅ Miconvert: ${vscode.l10n.t("{0}/{1} images compressed. Saved {2} total.", String(compressed), String(images.length), formatBytes(totalSaved))}`;
                        if (skipped > 0) {
                            msg += ` ${vscode.l10n.t("{0} skipped.", String(skipped))}`;
                        }
                        if (failed > 0) {
                            msg += ` ${vscode.l10n.t("{0} failed.", String(failed))}`;
                        }
                        if (token.isCancellationRequested) {
                            msg += ` (${vscode.l10n.t("Cancelled")})`;
                        }
                        vscode.window.showInformationMessage(msg);
                    }

                    // Track compress count & optionally prompt for rating
                    const compressed = completed - skipped - failed;
                    for (let i = 0; i < compressed; i++) {
                        incrementCompressCount(context);
                    }
                    if (shouldPromptRating(context)) {
                        const action = await vscode.window.showInformationMessage(
                            vscode.l10n.t("Enjoying Miconvert? Rate us on the Marketplace! ⭐"),
                            vscode.l10n.t("⭐ Rate Now"),
                            vscode.l10n.t("Later"),
                            vscode.l10n.t("Don't ask again")
                        );
                        if (action === vscode.l10n.t("⭐ Rate Now")) {
                            vscode.env.openExternal(
                                vscode.Uri.parse(
                                    "https://marketplace.visualstudio.com/items?itemName=miconvert.miconvert-image-optimizer&ssr=false#review-details"
                                )
                            );
                            context.globalState.update("miconvert.ratingDismissed", true);
                        } else if (action === vscode.l10n.t("Don't ask again")) {
                            context.globalState.update("miconvert.ratingDismissed", true);
                        }
                    }

                    // Refresh status bar
                    statusBarManager.refresh();
                }
            );
        }
    );

    // ─────────────────────────────────────────────
    // Command: Convert Video Online (QuickPick)
    // ─────────────────────────────────────────────
    const convertVideoCmd = vscode.commands.registerCommand(
        "miconvert.convertVideoOnline",
        async () => {
            const items: vscode.QuickPickItem[] = [
                { label: "$(play) Convert Video Format", description: "MP4, AVI, MOV, MKV, WebM" },
                { label: "$(unmute) Extract Audio (MP3)", description: "MP4 to MP3, WebM to MP3" },
                { label: "$(file-media) Convert to GIF", description: "MP4 to GIF, WebM to GIF" },
                { label: "$(fold-down) Compress Video", description: "Reduce video file size" },
            ];
            const pick = await vscode.window.showQuickPick(items, {
                placeHolder: vscode.l10n.t("Choose a video conversion tool"),
            });
            if (!pick) { return; }
            const urlMap: Record<string, string> = {
                "$(play) Convert Video Format": "https://miconvert.com/en/video-converters?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
                "$(unmute) Extract Audio (MP3)": "https://miconvert.com/en/mp4-to-mp3?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
                "$(file-media) Convert to GIF": "https://miconvert.com/en/mp4-to-gif?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
                "$(fold-down) Compress Video": "https://miconvert.com/en/compress-mp4?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
            };
            const url = urlMap[pick.label] || "https://miconvert.com/en/video-converters?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer";
            vscode.env.openExternal(
                vscode.Uri.parse(`${url}?utm_source=vscode&utm_medium=context_menu`)
            );
        }
    );

    // ─────────────────────────────────────────────
    // Command: PDF Tools (QuickPick)
    // ─────────────────────────────────────────────
    const openPdfCmd = vscode.commands.registerCommand(
        "miconvert.openPdfTool",
        async () => {
            const items: vscode.QuickPickItem[] = [
                { label: "$(file-text) PDF to Word (DOCX)", description: "Convert PDF to editable Word document" },
                { label: "$(table) PDF to Excel (XLSX)", description: "Extract tables from PDF" },
                { label: "$(file-media) PDF to JPG", description: "Convert PDF pages to images" },
                { label: "$(output) Extract Text (TXT)", description: "Extract text from PDF" },
                { label: "$(fold-down) Compress PDF", description: "Reduce PDF file size" },
            ];
            const pick = await vscode.window.showQuickPick(items, {
                placeHolder: vscode.l10n.t("Choose a PDF tool"),
            });
            if (!pick) { return; }
            const urlMap: Record<string, string> = {
                "$(file-text) PDF to Word (DOCX)": "https://miconvert.com/en/pdf-to-docx?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
                "$(table) PDF to Excel (XLSX)": "https://miconvert.com/en/pdf-to-xlsx?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
                "$(file-media) PDF to JPG": "https://miconvert.com/en/pdf-to-jpg?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
                "$(output) Extract Text (TXT)": "https://miconvert.com/en/pdf-to-txt?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
                "$(fold-down) Compress PDF": "https://miconvert.com/en/compress-pdf?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
            };
            const url = urlMap[pick.label] || "https://miconvert.com/en/pdf-tools?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer";
            vscode.env.openExternal(
                vscode.Uri.parse(`${url}?utm_source=vscode&utm_medium=context_menu`)
            );
        }
    );

    // ─────────────────────────────────────────────
    // Command: Font Converter (direct link)
    // ─────────────────────────────────────────────
    const openFontCmd = vscode.commands.registerCommand(
        "miconvert.openFontTool",
        async () => {
            vscode.env.openExternal(
                vscode.Uri.parse(
                    "https://miconvert.com/en/file-converters?utm_source=vscode&utm_medium=context_menu"
                )
            );
        }
    );

    // ─────────────────────────────────────────────
    // Command: Audio Converter (QuickPick)
    // ─────────────────────────────────────────────
    const openAudioCmd = vscode.commands.registerCommand(
        "miconvert.openAudioTool",
        async () => {
            const items: vscode.QuickPickItem[] = [
                { label: "$(unmute) Convert to MP3", description: "WAV, FLAC, OGG, AAC to MP3" },
                { label: "$(file-binary) Convert to WAV", description: "MP3, FLAC, OGG to WAV" },
                { label: "$(file-code) Convert to FLAC", description: "MP3, WAV, OGG to FLAC (lossless)" },
            ];
            const pick = await vscode.window.showQuickPick(items, {
                placeHolder: vscode.l10n.t("Choose an audio conversion tool"),
            });
            if (!pick) { return; }
            const urlMap: Record<string, string> = {
                "$(unmute) Convert to MP3": "https://miconvert.com/en/wav-to-mp3?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
                "$(file-binary) Convert to WAV": "https://miconvert.com/en/mp3-to-wav?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
                "$(file-code) Convert to FLAC": "https://miconvert.com/en/mp3-to-flac?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
            };
            const url = urlMap[pick.label] || "https://miconvert.com/en/audio-converters?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer";
            vscode.env.openExternal(
                vscode.Uri.parse(`${url}?utm_source=vscode&utm_medium=context_menu`)
            );
        }
    );

    // ─────────────────────────────────────────────
    // Command: Office/Document Converter (QuickPick)
    // ─────────────────────────────────────────────
    const openOfficeCmd = vscode.commands.registerCommand(
        "miconvert.openOfficeTool",
        async () => {
            const items: vscode.QuickPickItem[] = [
                { label: "$(file-pdf) Convert to PDF", description: "DOCX, XLSX, PPTX to PDF" },
                { label: "$(table) XLSX to CSV", description: "Convert Excel to CSV" },
                { label: "$(code) CSV to JSON", description: "Convert CSV data to JSON" },
                { label: "$(file-text) All Document Tools", description: "Browse all converters" },
            ];
            const pick = await vscode.window.showQuickPick(items, {
                placeHolder: vscode.l10n.t("Choose a document conversion tool"),
            });
            if (!pick) { return; }
            const urlMap: Record<string, string> = {
                "$(file-pdf) Convert to PDF": "https://miconvert.com/en/docx-to-pdf?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
                "$(table) XLSX to CSV": "https://miconvert.com/en/xlsx-to-csv?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
                "$(code) CSV to JSON": "https://miconvert.com/en/csv-to-json?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
                "$(file-text) All Document Tools": "https://miconvert.com/en/file-converters?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer",
            };
            const url = urlMap[pick.label] || "https://miconvert.com/en/file-converters?utm_source=vscode&utm_medium=app&utm_campaign=vscode-image-optimizer";
            vscode.env.openExternal(
                vscode.Uri.parse(`${url}?utm_source=vscode&utm_medium=context_menu`)
            );
        }
    );

    // ─────────────────────────────────────────────
    // Command: SVG to PNG (direct link)
    // ─────────────────────────────────────────────
    const openSvgCmd = vscode.commands.registerCommand(
        "miconvert.openSvgTool",
        async () => {
            vscode.env.openExternal(
                vscode.Uri.parse(
                    "https://miconvert.com/en/svg-to-png?utm_source=vscode&utm_medium=context_menu"
                )
            );
        }
    );

    context.subscriptions.push(
        compressFileCmd, compressFolderCmd, convertVideoCmd,
        openPdfCmd, openFontCmd, openAudioCmd, openOfficeCmd, openSvgCmd
    );
}

/**
 * Read compression options from VS Code settings.
 */
function getCompressOptions(): CompressOptions {
    const config = vscode.workspace.getConfiguration("miconvert");
    return {
        quality: config.get<number>("quality", 80),
        overwrite: config.get<boolean>("overwrite", false),
        targetFormat: config.get<"original" | "webp" | "jpeg">(
            "targetFormat",
            "original"
        ),
        threshold: config.get<number>("threshold", 0),
    };
}

export function deactivate() {
    if (statusBarManager) {
        statusBarManager.dispose();
    }
}
