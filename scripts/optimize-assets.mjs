import sharp from 'sharp';
import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const originals = join(root, 'assets/recycling/samples-v1');
const output = join(root, 'assets/optimized');
const entries = [];
async function optimize(source, target, size, lossless) {
  const destination = join(output, target);
  await mkdir(dirname(destination), { recursive: true });
  const original = await readFile(source);
  const image = sharp(original).resize({ width: size, height: size, fit: 'inside', kernel: 'nearest', withoutEnlargement: true });
  let { data, info } = await image.webp(lossless ? { lossless: true, effort: 6 } : { quality: 88, effort: 6 }).toBuffer({ resolveWithObject: true });
  // Limit oversized inventory sprites to a compact palette; keep originals intact.
  let paletteColors;
  if (target.startsWith('recycling/') && data.length >= 40000) {
    paletteColors = 128;
    const palette = await sharp(original).resize({ width: size, height: size, fit: 'inside', kernel: 'nearest', withoutEnlargement: true })
      .png({ palette: true, colours: paletteColors, dither: 0 }).toBuffer();
    ({ data, info } = await sharp(palette).webp({ lossless: true, effort: 6 }).toBuffer({ resolveWithObject: true }));
  }
  await writeFile(destination, data);
  entries.push({ source: relative(root, source), output: `assets/optimized/${target}`, width: info.width, height: info.height, originalBytes: original.length, optimizedBytes: data.length, lossless, ...(paletteColors ? { paletteColors } : {}) });
}
for (const directory of (await readdir(originals, { withFileTypes: true })).filter(entry => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  for (const file of (await readdir(join(originals, directory.name))).filter(file => file.endsWith('.png')).sort()) {
    await optimize(join(originals, directory.name, file), `recycling/${directory.name}/${file.replace(/\.png$/, '.webp')}`, 256, true);
  }
}
await optimize(join(root, 'assets/recycling/backgrounds/truck-bed-sorting-v1.png'), 'backgrounds/truck-bed-sorting-v1.webp', 1152, false);
// Preserve the portrait background's 2:3 composition while reducing its long edge.
for (const file of ['police-v1', 'angry-worker-v1', 'angry-garbage-worker-v1']) await optimize(join(root, `assets/failure/${file}.png`), `failure/${file}.webp`, 512, true);
const totals = entries.reduce((sum, item) => ({ originalBytes: sum.originalBytes + item.originalBytes, optimizedBytes: sum.optimizedBytes + item.optimizedBytes }), { originalBytes: 0, optimizedBytes: 0 });
await writeFile(join(output, 'manifest.json'), JSON.stringify({ generator: `sharp ${sharp.versions.sharp}`, entries, totals }, null, 2) + '\n');
console.log(JSON.stringify({ files: entries.length, ...totals, savedPercent: Math.round((1 - totals.optimizedBytes / totals.originalBytes) * 100) }, null, 2));
