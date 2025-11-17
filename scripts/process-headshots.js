#!/usr/bin/env node

/**
 * Artist Headshot Batch Processor
 * 
 * Processes artist headshots to standardized format:
 * - Resize to 600x800 (3:4 portrait ratio)
 * - Reduce saturation by 25%
 * - Optimize for web (85% quality)
 * - Convert to JPG
 * 
 * Usage:
 *   1. Install sharp: npm install sharp --save-dev
 *   2. Place original images in ./original-headshots/
 *   3. Run: node scripts/process-headshots.js
 *   4. Processed images appear in ./public/images/artists/headshots/
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_DIR = path.join(__dirname, '..', 'original-headshots');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'artists', 'headshots');
const TARGET_WIDTH = 600;
const TARGET_HEIGHT = 800;
const QUALITY = 85;
const SATURATION = 0.75; // 75% saturation (25% desaturation)

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✓ Created output directory: ${OUTPUT_DIR}`);
}

// Check if input directory exists
if (!fs.existsSync(INPUT_DIR)) {
  console.error(`✗ Input directory not found: ${INPUT_DIR}`);
  console.log('\nPlease create ./original-headshots/ and add images there.');
  process.exit(1);
}

// Supported image formats
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif'];

// Get all image files
const files = fs.readdirSync(INPUT_DIR).filter(file => {
  const ext = path.extname(file).toLowerCase();
  return SUPPORTED_FORMATS.includes(ext);
});

if (files.length === 0) {
  console.log('No images found in ./original-headshots/');
  console.log(`Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
  process.exit(0);
}

console.log(`\nFound ${files.length} image(s) to process\n`);

// Process each image
async function processImage(filename) {
  const inputPath = path.join(INPUT_DIR, filename);
  const outputFilename = path.basename(filename, path.extname(filename))
    .toLowerCase()
    .replace(/\s+/g, '-') + '.jpg';
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  try {
    const metadata = await sharp(inputPath).metadata();
    
    // Calculate crop to maintain aspect ratio
    const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;
    const currentRatio = metadata.width / metadata.height;
    
    let resize = {
      width: TARGET_WIDTH,
      height: TARGET_HEIGHT,
      fit: 'cover',
      position: 'center'
    };

    await sharp(inputPath)
      .resize(resize)
      // Desaturate by reducing saturation to 75%
      .modulate({
        saturation: SATURATION
      })
      .jpeg({ quality: QUALITY, progressive: true })
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    
    console.log(`✓ ${filename} → ${outputFilename} (${sizeKB} KB)`);
    
  } catch (error) {
    console.error(`✗ Error processing ${filename}:`, error.message);
  }
}

// Process all images
(async () => {
  console.log('Processing images...\n');
  
  for (const file of files) {
    await processImage(file);
  }
  
  console.log(`\n✓ Processed ${files.length} image(s)`);
  console.log(`\nOutput directory: ${OUTPUT_DIR}`);
  console.log('\nNext steps:');
  console.log('1. Review processed images');
  console.log('2. Update content/artists.md with **image:** references');
  console.log('3. Run: npm run dev');
  console.log('4. Visit http://localhost:3001/artists to preview\n');
})();
