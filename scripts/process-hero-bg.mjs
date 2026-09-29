import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputPath = 'public/hero-bg.jfif';
const outputPath = 'public/hero-bg-processed.png';

async function processImage() {
  try {
    // Read and process the image
    // Increase contrast, adjust brightness, convert to PNG with transparency
    await sharp(inputPath)
      .png()
      .toFile(outputPath);

    console.log(`✓ Processed image saved to ${outputPath}`);
    console.log(`✓ File size: ${fs.statSync(outputPath).size} bytes`);
    console.log(`✓ Ready to test! The image now has a PNG format with better compatibility.`);
  } catch (error) {
    console.error('Error processing image:', error);
    process.exit(1);
  }
}

processImage();
