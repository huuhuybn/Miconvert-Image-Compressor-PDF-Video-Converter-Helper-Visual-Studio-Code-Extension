# Miconvert: Image Compressor, PDF & Video Converter Helper

> **The official VS Code extension for [miconvert.com](https://miconvert.com?utm_source=vscode&utm_medium=readme).** Compress PNG, JPG, WebP images locally in milliseconds — no upload, no internet needed. Plus, quickly access free online tools for PDF to Word, MP4 to MP3, and 100+ file conversions.

![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/miconvert.miconvert-image-optimizer)
![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/miconvert.miconvert-image-optimizer)
![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/miconvert.miconvert-image-optimizer)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ⚡ Why Miconvert?

Tired of switching between VS Code and external image compressors? **Miconvert** brings blazing-fast, offline image compression directly into your editor. Right-click → compress → done. No plugins to configure, no APIs to sign up for.

Powered by [Sharp](https://sharp.pixelplumbing.com/) — the fastest Node.js image processing library.

---

## ✨ Features

### 🖱️ One-Click Image Compression
Right-click any image (`.png`, `.jpg`, `.jpeg`, `.webp`) in the Explorer → **"Compress with Miconvert"**. Instantly reduce file size while keeping visual quality.

### 📁 Bulk Folder Compression
Right-click any folder → **"Miconvert: Compress All Images in Folder"** to recursively compress every image inside. Includes a progress bar and automatically skips `node_modules`.

### 🔄 Image Format Conversion
Convert images to **WebP** or **JPEG** on the fly — perfect for web performance optimization. WebP images are up to 30% smaller than JPEG at the same quality.

### 📊 Smart Status Bar Warning
When viewing an image file, the status bar shows file size. If the image exceeds **500KB**, a ⚠️ yellow warning appears — click it to compress instantly.

### 🎬 Quick Access to Video & PDF Tools
Right-click a video file (`.mp4`, `.avi`, `.mov`, `.mkv`, `.webm`) → **"Miconvert: Convert Video (Online)"** to open the free [Video Converter](https://miconvert.com/en/video-converters?utm_source=vscode&utm_medium=readme) at miconvert.com.

### 🌍 Multi-Language Support
Available in **10 languages**: English, Vietnamese, Chinese, Japanese, Korean, Spanish, Portuguese, French, German, and Russian.

---

## 🚀 Quick Start

1. **Single file**: Right-click an image → *Compress with Miconvert*
2. **Entire folder**: Right-click a folder → *Miconvert: Compress All Images in Folder*
3. **Status bar**: Open an image file → Click the yellow warning to compress
4. **Video conversion**: Right-click a video → *Miconvert: Convert Video (Online)*

---

## ⚙️ Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `miconvert.quality` | number | `80` | Compression quality (1–100). Lower = smaller files |
| `miconvert.overwrite` | boolean | `false` | Overwrite original or create `_min` suffix |
| `miconvert.targetFormat` | string | `"original"` | Output format: `"original"`, `"webp"`, `"jpeg"` |
| `miconvert.threshold` | number | `0` | Only compress files larger than X KB (0 = all) |
| `miconvert.verbose` | boolean | `true` | Show toast notifications with results |

---

## 🌐 More Free Online Tools

Need more than image compression? **Miconvert** offers a full suite of free online converters:

| Tool | Link |
|------|------|
| 🖼️ **Image Converters** | [Convert PNG, JPG, WebP, HEIC](https://miconvert.com/en/image-converters?utm_source=vscode&utm_medium=readme) |
| 📄 **PDF to Word (DOCX)** | [Convert PDF to Word free](https://miconvert.com/en/pdf-to-docx?utm_source=vscode&utm_medium=readme) |
| 📄 **Word (DOCX) to PDF** | [Convert Word to PDF free](https://miconvert.com/en/docx-to-pdf?utm_source=vscode&utm_medium=readme) |
| 🎬 **Video Converters** | [Convert MP4, AVI, MOV, MKV](https://miconvert.com/en/video-converters?utm_source=vscode&utm_medium=readme) |
| 🎵 **MP4 to MP3** | [Extract audio from video](https://miconvert.com/en/mp4-to-mp3?utm_source=vscode&utm_medium=readme) |
| 🖼️ **PNG to WebP** | [Convert PNG to WebP](https://miconvert.com/en/png-to-webp?utm_source=vscode&utm_medium=readme) |
| 🎵 **Audio Converters** | [Convert MP3, WAV, FLAC, OGG](https://miconvert.com/en/audio-converters?utm_source=vscode&utm_medium=readme) |
| 📄 **PDF Tools** | [Compress, merge, convert PDF](https://miconvert.com/en/pdf-tools?utm_source=vscode&utm_medium=readme) |
| 📁 **File Converters** | [DOCX, XLSX, CSV, JSON](https://miconvert.com/en/file-converters?utm_source=vscode&utm_medium=readme) |

> Powered by [**Free Online File Converter — miconvert.com**](https://miconvert.com?utm_source=vscode&utm_medium=readme)

---

## ❓ FAQ

### Is this extension free?
Yes! Miconvert is **100% free** and open-source (MIT license). No watermarks, no limits, no sign-up required.

### Does it work offline?
Yes. Image compression runs entirely on your machine using [Sharp](https://sharp.pixelplumbing.com/). No files are ever uploaded anywhere.

### What image formats are supported?
PNG, JPG, JPEG, and WebP. You can also convert between these formats.

### Does it work with large projects?
Absolutely. Folder compression automatically skips `node_modules`, `.git`, and hidden directories. Tested with projects containing thousands of images.

---

## 📋 Requirements

- VS Code 1.85.0 or later
- Node.js (for Sharp native bindings)

---

## 🤝 Support & Contact

- 🌐 Website: [miconvert.com](https://miconvert.com?utm_source=vscode&utm_medium=readme)
- 📧 Contact: [miconvert.com/en/contact](https://miconvert.com/en/contact?utm_source=vscode&utm_medium=readme)
- 🐛 Issues: [GitHub Issues](https://github.com/huuhuybn/Miconvert-Image-Compressor-PDF-Video-Converter-Helper-Visual-Studio-Code-Extension/issues)
- ⭐ Love this extension? [Rate us on the Marketplace!](https://marketplace.visualstudio.com/items?itemName=miconvert.miconvert-image-optimizer&ssr=false#review-details)

---

## 📜 License

MIT © [Miconvert](https://miconvert.com) — Free Online File Converter
