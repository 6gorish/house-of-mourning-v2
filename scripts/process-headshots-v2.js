#!/usr/bin/env node

/**
 * Artist Headshot Batch Processor v2
 * 
 * Intelligently processes headshots of ANY orientation:
 * - Portrait: Resize to max 800px tall
 * - Landscape: Resize to max 800px wide  
 * - Square: Resize to 600x600
 * - All: Reduce saturation by 25%, optimize for web
 * 
 * Usage:
 *   1. Install sharp: npm install sharp --save-dev
 *   2. Place original images (any orientation) in ./original-headshots/
 *   3. Run: node scripts/process-headshots-v2.js
 *   4. Processed images appear in ./public/images/artists/headshots/
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_DIR = path.join(__dirname, '..', 'original-headshots');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'artists', 'headshots');
const QUALITY = 85;
const SATURATION = 0.75; // 75% saturation (25% desaturation)

// Portrait: max height 800px
// Landscape: max width 800px
// Square: 600x600

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✓ Created output directory: ${OUTPUT_DIR}`);
}

// Check if input directory exists
if (!fs.existsSync(INPUT_DIR)) {
  console.error(`✗ Input directory not found: ${INPUT_DIR}`);
  console.log('\nPlease create ./original-headshots/ and add images there.');
  console.log('Images can be portrait, landscape, or square - all orientations supported!');
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

console.log(`\nFound ${files.length} image(s) to process`);
console.log('Processing mixed orientations intelligently...\n');

// Process each image
async function processImage(filename) {
  const inputPath = path.join(INPUT_DIR, filename);
  const outputFilename = path.basename(filename, path.extname(filename))
    .toLowerCase()
    .replace(/\s+/g, '-') + '.jpg';
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  try {
    const metadata = await sharp(inputPath).metadata();
    const { width, height } = metadata;
    
    // Determine orientation
    const isPortrait = height > width;
    const isSquare = Math.abs(height - width) < 50; // Within 50px is "square enough"
    
    let resizeOptions;
    let orientation;
    
    if (isPortrait) {
      // Portrait: resize to max 800px tall, maintain aspect ratio
      orientation = 'Portrait';
      resizeOptions = { 
        height: 800, 
        withoutEnlargement: true // Don't upscale small images
      };
    } else if (isSquare) {
      // Square: resize to 600x600, cover to fill
      orientation = 'Square';
      resizeOptions = { 
        width: 600, 
        height: 600, 
        fit: 'cover',
        position: 'center'
      };
    } else {
      // Landscape: resize to max 800px wide, maintain aspect ratio
      orientation = 'Landscape';
      resizeOptions = { 
        width: 800, 
        withoutEnlargement: true
      };
    }

    await sharp(inputPath)
      .resize(resizeOptions)
      .modulate({ saturation: SATURATION }) // Desaturate by 25%
      .jpeg({ quality: QUALITY, progressive: true })
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    const dims = await sharp(outputPath).metadata();
    
    console.log(`✓ ${filename}`);
    console.log(`  → ${outputFilename} [${orientation}: ${dims.width}×${dims.height}, ${sizeKB} KB]`);
    
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
  console.log('\nOrientation handling:');
  console.log('  • Portrait images: Scaled to max 800px tall');
  console.log('  • Landscape images: Scaled to max 800px wide');
  console.log('  • Square images: Cropped to 600×600');
  console.log('  • All images: 25% desaturated, 85% quality JPG');
  console.log('\nNext steps:');
  console.log('1. Review processed images');
  console.log('2. Update content/artists.md with **image:** references');
  console.log('3. Run: npm run dev');
  console.log('4. Visit http://localhost:3001/artists to preview\n');
})();
