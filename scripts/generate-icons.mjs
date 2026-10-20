#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const iconDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'extension', 'icons');
const source = path.join(iconDir, 'icon512.png');
const metadata = await sharp(source).metadata();
if (metadata.width !== 512 || metadata.height !== 512) {
  throw new Error('The master icon must be 512 x 512 pixels.');
}

for (const size of [16, 32, 48, 128]) {
  const output = path.join(iconDir, `icon${size}.png`);
  await sharp(source)
    .resize(size, size, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(output);
  console.log(`Generated ${path.relative(process.cwd(), output)} (${size} x ${size})`);
}