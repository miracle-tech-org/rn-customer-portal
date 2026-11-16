const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assets = 'C:/Users/admin/.cursor/projects/e-Enterprise-RN/assets';
const files = [
  '1-45754964-cc1f-437c-a13c-24016d513552.png',
  '2-14c1d34b-5b0d-4017-9e32-41456a6c3dd8.png',
  '3-1e6e3eb4-f604-469f-aa82-5f02a891fa4d.png',
  '4-03c8bf40-321f-4822-922c-2fe84f0ef3a9.png',
  '5-c340b265-854f-4beb-8b8a-410f11cfd1b8.png',
  '6-a7b26215-82ad-42a7-837d-a571006bcf08.png',
].map(f => path.join(assets, f));

for (const f of files) {
  if (!fs.existsSync(f)) {
    throw new Error('missing ' + f);
  }
}

const outDir = path.join(__dirname, '..', 'assets', 'app-store');
fs.mkdirSync(outDir, {recursive: true});

async function phoneFrame(srcPath, phoneW, phoneH) {
  const radius = Math.round(phoneW * 0.12);
  const inset = Math.max(8, Math.round(phoneW * 0.035));
  const screenW = phoneW - inset * 2;
  const screenH = phoneH - inset * 2;

  const screen = await sharp(srcPath)
    .resize(screenW, screenH, {fit: 'cover', position: 'north'})
    .png()
    .toBuffer();

  const frameSvg = Buffer.from(
    `<svg width="${phoneW}" height="${phoneH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${phoneW}" height="${phoneH}" rx="${radius}" ry="${radius}" fill="#111111"/>
    </svg>`,
  );

  const screenMask = Buffer.from(
    `<svg width="${screenW}" height="${screenH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${screenW}" height="${screenH}" rx="${Math.round(radius * 0.7)}" ry="${Math.round(radius * 0.7)}" fill="#ffffff"/>
    </svg>`,
  );

  const roundedScreen = await sharp(screen)
    .composite([{input: screenMask, blend: 'dest-in'}])
    .png()
    .toBuffer();

  return sharp(frameSvg)
    .composite([{input: roundedScreen, left: inset, top: inset}])
    .png()
    .toBuffer();
}

async function compose(outName, W, H) {
  const marginX = Math.round(W * 0.035);
  const marginTop = Math.round(H * 0.07);
  const marginBottom = Math.round(H * 0.07);
  const gap = Math.round(W * 0.01);
  const usableW = W - marginX * 2 - gap * 5;
  const phoneW = Math.floor(usableW / 6);
  const phoneH = Math.min(
    Math.round(phoneW * (19.5 / 9)),
    H - marginTop - marginBottom,
  );

  const phones = [];
  for (let i = 0; i < 6; i++) {
    const buf = await phoneFrame(files[i], phoneW, phoneH);
    const left = marginX + i * (phoneW + gap);
    const top =
      marginTop + Math.round((H - marginTop - marginBottom - phoneH) / 2);
    phones.push({input: buf, left, top});
  }

  const bgSvg = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#022751"/>
          <stop offset="45%" stop-color="#0A5A3A"/>
          <stop offset="100%" stop-color="#022751"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>`,
  );

  const out = path.join(outDir, outName);
  await sharp(bgSvg)
    .composite(phones)
    .removeAlpha()
    .png({compressionLevel: 9})
    .toFile(out);

  const m = await sharp(out).metadata();
  console.log(
    outName,
    `${m.width}x${m.height}`,
    `alpha=${m.hasAlpha}`,
    `${Math.round(fs.statSync(out).size / 1024)}KB`,
    `phone=${phoneW}x${phoneH}`,
  );
}

(async () => {
  await compose('sbts-creative-all-5244x2950.png', 5244, 2950);
  await compose('sbts-creative-all-3840x1646.png', 3840, 1646);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
