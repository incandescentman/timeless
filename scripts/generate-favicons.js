import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate sleek minimal calendar grid icon
 * Design: 4x4 grid of refined squares with sophisticated spacing
 * Color scheme: Refined grayscale with red accent (timeless design)
 */
function generateCalendarSVG(size) {
  const padding = size * 0.18;
  const gridSize = size - (padding * 2);
  const rows = 4;
  const cols = 4;
  const cellSize = gridSize / rows;
  const gap = cellSize * 0.18; // Refined gap ratio
  const actualCellSize = cellSize - gap;
  const cornerRadius = actualCellSize * 0.2; // Sleeker rounded corners

  // Sophisticated color palette - refined grays
  const bgColor = '#ffffff'; // Pure white
  const cellColor = '#374151'; // gray-700 - sophisticated dark gray
  const accentColor = '#ef4444'; // red-500 - vibrant red for today

  let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${size}" height="${size}" fill="${bgColor}"/>`;

  // Draw 4x4 grid representing a month view
  // Top-right cell is the accent (representing today)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = padding + (col * cellSize);
      const y = padding + (row * cellSize);

      // Accent cell at position (1, 2) - offset from center for visual interest
      const isAccent = row === 1 && col === 2;
      const fillColor = isAccent ? accentColor : cellColor;

      svg += `<rect x="${x}" y="${y}" width="${actualCellSize}" height="${actualCellSize}" rx="${cornerRadius}" fill="${fillColor}"/>`;
    }
  }

  svg += '</svg>';
  return Buffer.from(svg);
}

async function generateIcons() {
  console.log('Generating favicons for Timeless...');

  const publicDir = join(__dirname, '..', 'public');

  // Generate apple-touch-icon (180x180 - iOS standard)
  console.log('Creating apple-touch-icon.png (180x180)...');
  const appleTouchSVG = generateCalendarSVG(180);
  await sharp(appleTouchSVG)
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));

  // Generate standard favicon (32x32)
  console.log('Creating favicon.png (32x32)...');
  const faviconSVG = generateCalendarSVG(32);
  await sharp(faviconSVG)
    .png()
    .toFile(join(publicDir, 'favicon.png'));

  // Generate additional sizes for different contexts
  console.log('Creating favicon-16x16.png...');
  const favicon16SVG = generateCalendarSVG(16);
  await sharp(favicon16SVG)
    .png()
    .toFile(join(publicDir, 'favicon-16x16.png'));

  console.log('Creating favicon-192x192.png (Android)...');
  const favicon192SVG = generateCalendarSVG(192);
  await sharp(favicon192SVG)
    .png()
    .toFile(join(publicDir, 'favicon-192x192.png'));

  console.log('Creating favicon-512x512.png (Android)...');
  const favicon512SVG = generateCalendarSVG(512);
  await sharp(favicon512SVG)
    .png()
    .toFile(join(publicDir, 'favicon-512x512.png'));

  console.log('✓ All favicons generated successfully!');
  console.log('\nGenerated files:');
  console.log('  - apple-touch-icon.png (180x180) - iOS home screen');
  console.log('  - favicon.png (32x32) - browser tab');
  console.log('  - favicon-16x16.png (16x16) - browser tab (small)');
  console.log('  - favicon-192x192.png (192x192) - Android');
  console.log('  - favicon-512x512.png (512x512) - Android (high-res)');
}

generateIcons().catch(console.error);
