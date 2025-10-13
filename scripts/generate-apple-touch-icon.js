import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateAppleTouchIcon() {
  console.log('Generating apple-touch-icon from inf.png...');

  const publicDir = join(__dirname, '..', 'public');
  const sourceImage = join(publicDir, 'inf.png');
  const outputImage = join(publicDir, 'apple-touch-icon.png');

  try {
    // Generate apple-touch-icon (180x180 - iOS standard)
    await sharp(sourceImage)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
      })
      .png()
      .toFile(outputImage);

    console.log('✓ apple-touch-icon.png generated successfully!');
    console.log('  - Size: 180x180');
    console.log('  - Location: public/apple-touch-icon.png');
  } catch (error) {
    console.error('Error generating apple-touch-icon:', error);
    process.exit(1);
  }
}

generateAppleTouchIcon();
