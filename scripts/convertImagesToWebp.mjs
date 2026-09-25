// public/images/**/*.png → cdn/images/**/*.webp 증분 변환.
// 원본 해상도는 유지하고 WebP(품질 80)로만 재인코딩한다.
// 사용: npm run img:webp  (이후 npm run img:upload 로 R2 업로드)

import { mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import sharp from "sharp";

const SRC_ROOT = "public/images";
const OUT_ROOT = "cdn/images";
const QUALITY = 80;
const CONCURRENCY = 8;

function collectPngs(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...collectPngs(p));
    else if (name.toLowerCase().endsWith(".png")) out.push({ path: p, mtimeMs: st.mtimeMs, size: st.size });
  }
  return out;
}

const files = collectPngs(SRC_ROOT);
let converted = 0;
let skipped = 0;
let failed = 0;
let inBytes = 0;
let outBytes = 0;

async function convertOne({ path: src, mtimeMs, size }) {
  const rel = relative(SRC_ROOT, src);
  const out = join(OUT_ROOT, rel.replace(/\.png$/i, ".webp"));
  try {
    const outStat = statSync(out);
    if (outStat.mtimeMs >= mtimeMs) {
      skipped++;
      inBytes += size;
      outBytes += outStat.size;
      return;
    }
  } catch {
    // 산출물 없음 → 변환
  }
  mkdirSync(dirname(out), { recursive: true });
  try {
    const info = await sharp(src).webp({ quality: QUALITY }).toFile(out);
    converted++;
    inBytes += size;
    outBytes += info.size;
    if (converted % 200 === 0) console.log(`  …${converted} converted`);
  } catch (e) {
    failed++;
    console.error(`[FAIL] ${rel}: ${e.message}`);
  }
}

console.log(`[img:webp] ${files.length} PNGs found under ${SRC_ROOT}`);
const queue = [...files];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) await convertOne(queue.pop());
  }),
);

const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(
  `[img:webp] done — converted ${converted}, skipped(up-to-date) ${skipped}, failed ${failed}`,
);
console.log(`[img:webp] size: ${mb(inBytes)} MB (png) → ${mb(outBytes)} MB (webp)`);
if (failed > 0) process.exit(1);
