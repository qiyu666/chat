import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const base = 'e:/qiyu/Documents/xm/chat/android/app/src/main/res';

async function generate() {
  // SVG icon matching the user's image
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#56CCF2"/>
        <stop offset="100%" stop-color="#2F80ED"/>
      </linearGradient>
    </defs>
    <!-- Chat bubble outline -->
    <path d="M256 32C131.8 32 32 115.5 32 220c0 59.4 33.3 111.8 83.6 141.3L96 416l56.2,-33.3C171.1,392 212.2,400 256 400c124.2 0 224,-83.5 224,-188S380.2 32 256 32z" fill="none" stroke="url(#g)" stroke-width="28" stroke-linejoin="round"/>
    <!-- Left face -->
    <circle cx="190" cy="210" r="52" fill="#fff"/>
    <ellipse cx="162" cy="215" rx="22" ry="18" fill="#fff"/>
    <!-- Right face -->
    <circle cx="322" cy="210" r="52" fill="#fff"/>
    <ellipse cx="350" cy="215" rx="22" ry="18" fill="#fff"/>
  </svg>`;

  for (const [dir, size] of Object.entries(sizes)) {
    const outDir = `${base}/${dir}`;
    mkdirSync(outDir, { recursive: true });
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(`${outDir}/ic_launcher.png`);
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(`${outDir}/ic_launcher_round.png`);
    console.log(`Generated ${dir} (${size}px)`);
  }
  console.log('Done!');
}

generate().catch(e => { console.error(e); process.exit(1); });
