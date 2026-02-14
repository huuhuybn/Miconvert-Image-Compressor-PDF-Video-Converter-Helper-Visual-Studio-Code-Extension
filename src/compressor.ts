import * as path from "path";
import * as fs from "fs";
import sharp from "sharp";

export interface CompressOptions {
    quality: number;
    overwrite: boolean;
    targetFormat: "original" | "webp" | "jpeg";
    threshold: number; // in KB
}

export interface CompressResult {
    inputPath: string;
    outputPath: string;
    originalSize: number;
    compressedSize: number;
    savedBytes: number;
    savedPercent: number;
    skipped: boolean;
    skipReason?: string;
}

/**
 * Compress a single image file using sharp.
 */
export async function compressImage(
    filePath: string,
    options: CompressOptions
): Promise<CompressResult> {
    const originalSize = (await fs.promises.stat(filePath)).size;

    // Check threshold
    const thresholdBytes = options.threshold * 1024;
    if (thresholdBytes > 0 && originalSize <= thresholdBytes) {
        return {
            inputPath: filePath,
            outputPath: filePath,
            originalSize,
            compressedSize: originalSize,
            savedBytes: 0,
            savedPercent: 0,
            skipped: true,
            skipReason: `File size (${originalSize} bytes) is below threshold (${thresholdBytes} bytes)`,
        };
    }

    const ext = path.extname(filePath).toLowerCase();
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, ext);

    // Determine output format
    let outputFormat: "png" | "jpeg" | "webp" = getFormat(ext);
    let outputExt = ext;

    if (options.targetFormat !== "original") {
        outputFormat = options.targetFormat === "jpeg" ? "jpeg" : "webp";
        outputExt = options.targetFormat === "jpeg" ? ".jpg" : ".webp";
    }

    // Determine output path
    let outputPath: string;
    if (options.overwrite) {
        outputPath = path.join(dir, `${baseName}${outputExt}`);
    } else {
        outputPath = path.join(dir, `${baseName}_min${outputExt}`);
    }

    // Read and compress with sharp
    let pipeline = sharp(filePath);

    // Rotate based on EXIF orientation (auto-orient)
    pipeline = pipeline.rotate();

    switch (outputFormat) {
        case "png":
            pipeline = pipeline.png({
                quality: options.quality,
                compressionLevel: Math.round((100 - options.quality) / 100 * 9),
                adaptiveFiltering: true,
            });
            break;
        case "jpeg":
            pipeline = pipeline.jpeg({
                quality: options.quality,
                mozjpeg: true,
            });
            break;
        case "webp":
            pipeline = pipeline.webp({
                quality: options.quality,
                effort: 4,
            });
            break;
    }

    // Write to a temp file first, then move (prevents corruption if overwriting)
    const tempPath = path.join(dir, `.miconvert_tmp_${Date.now()}${outputExt}`);

    try {
        await pipeline.toFile(tempPath);

        const compressedSize = (await fs.promises.stat(tempPath)).size;

        // If compressed file is larger than original, keep original (unless format changed)
        if (compressedSize >= originalSize && options.targetFormat === "original") {
            await fs.promises.unlink(tempPath);
            return {
                inputPath: filePath,
                outputPath: filePath,
                originalSize,
                compressedSize: originalSize,
                savedBytes: 0,
                savedPercent: 0,
                skipped: true,
                skipReason: "Compressed size would be larger than original",
            };
        }

        // Move temp to final destination
        // If overwriting AND format changed, delete old file first
        if (options.overwrite && outputPath !== filePath) {
            await fs.promises.unlink(filePath);
        }

        await fs.promises.rename(tempPath, outputPath);

        const savedBytes = originalSize - compressedSize;
        const savedPercent = Math.round((savedBytes / originalSize) * 100);

        return {
            inputPath: filePath,
            outputPath,
            originalSize,
            compressedSize,
            savedBytes,
            savedPercent,
            skipped: false,
        };
    } catch (error) {
        // Clean up temp file on error
        try {
            await fs.promises.unlink(tempPath);
        } catch {
            // ignore cleanup errors
        }
        throw error;
    }
}

function getFormat(ext: string): "png" | "jpeg" | "webp" {
    switch (ext) {
        case ".png":
            return "png";
        case ".jpg":
        case ".jpeg":
            return "jpeg";
        case ".webp":
            return "webp";
        default:
            return "jpeg";
    }
}
