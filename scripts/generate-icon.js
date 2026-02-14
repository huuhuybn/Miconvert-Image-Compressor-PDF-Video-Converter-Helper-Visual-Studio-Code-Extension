const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const svgPath = path.join(__dirname, '../images/icon.svg');
const pngPath = path.join(__dirname, '../images/icon.png');

async function generate() {
    console.log('Generating PNG icon from SVG...');

    // Ensure images directory exists
    const dir = path.dirname(pngPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    await sharp(svgPath)
        .resize(128, 128)
        .png()
        .toFile(pngPath);

    console.log(`✅ Icon generated at: ${pngPath}`);
}

generate().catch(err => {
    console.error('Failed to generate icon:', err);
    process.exit(1);
});
