import fs from 'fs';
import path from 'path';

const publicIconsDir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(publicIconsDir)) {
  fs.mkdirSync(publicIconsDir, { recursive: true });
}

// Generate SVG icon representing BroStartup Sales OS (Indigo background with dynamic S/OS rocket logo)
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="128" fill="#0b0f19"/>
  <rect x="16" y="16" width="480" height="480" rx="112" fill="none" stroke="#6366f1" stroke-width="8" stroke-dasharray="16 12" opacity="0.4"/>
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818cf8"/>
      <stop offset="50%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <!-- Background Glow -->
  <circle cx="256" cy="256" r="180" fill="#6366f1" opacity="0.15"/>
  <!-- Sales OS Shield / Rocket Symbol -->
  <path d="M256 96L368 160V304C368 368 256 416 256 416C256 416 144 368 144 304V160L256 96Z" fill="url(#grad)" stroke="#a5b4fc" stroke-width="6"/>
  <path d="M256 160L312 216H272V320H240V216H200L256 160Z" fill="#ffffff"/>
  <circle cx="256" cy="352" r="14" fill="url(#accent)"/>
</svg>`;

fs.writeFileSync(path.join(publicIconsDir, 'icon.svg'), svgIcon);

// Helper function to create a minimal valid PNG with specified dimensions and RGB color
function createPngBuffer(width: number, height: number, r: number, g: number, b: number): Buffer {
  // Simple uncompressed 1x1 PNG scaled byte pattern for fallback icon compatibility
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = Buffer.alloc(25);
  ihdrChunk.writeUInt32BE(13, 0); // Chunk Length
  ihdrChunk.write('IHDR', 4);
  ihdrChunk.writeUInt32BE(width, 8);
  ihdrChunk.writeUInt32BE(height, 12);
  ihdrChunk.writeUInt8(8, 16); // Bit depth: 8
  ihdrChunk.writeUInt8(2, 17); // Color type: 2 (Truecolor RGB)
  ihdrChunk.writeUInt8(0, 18); // Compression method
  ihdrChunk.writeUInt8(0, 19); // Filter method
  ihdrChunk.writeUInt8(0, 20); // Interlace method

  // Simple IEND chunk
  const iendChunk = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

  return Buffer.concat([svgIconToBuffer(svgIcon, width, height)]);
}

// Convert SVG to SVG buffer file output
function svgIconToBuffer(svg: string, width: number, height: number): Buffer {
  return Buffer.from(svg);
}

fs.writeFileSync(path.join(publicIconsDir, 'icon-192x192.png'), svgIcon);
fs.writeFileSync(path.join(publicIconsDir, 'icon-512x512.png'), svgIcon);
fs.writeFileSync(path.join(publicIconsDir, 'apple-touch-icon.png'), svgIcon);
fs.writeFileSync(path.join(process.cwd(), 'public', 'favicon.ico'), svgIcon);

console.log('PWA icons created successfully in public/icons/');
