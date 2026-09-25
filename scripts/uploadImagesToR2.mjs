// cdn/images/**/*.webp 를 Cloudflare R2 버킷에 증분 업로드한다 (S3 호환 API).
// 사용: npm run img:upload
//
// 자격 증명은 프로젝트 루트의 .env.r2 (gitignore 됨) 또는 환경변수로 전달:
//   R2_ACCOUNT_ID=<Cloudflare 계정 ID>
//   R2_ACCESS_KEY_ID=<R2 API 토큰의 Access Key ID>
//   R2_SECRET_ACCESS_KEY=<R2 API 토큰의 Secret Access Key>
//   R2_BUCKET=<버킷 이름, 예: holo-cards>

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const OUT_ROOT = "cdn/images";
const KEY_PREFIX = "images/"; // 버킷 내 키: images/hBP01/hBP01-001_OSR.webp
const CONCURRENCY = 8;

// .env.r2 로드 (있으면) — 이미 설정된 환경변수가 우선
if (existsSync(".env.r2")) {
  for (const line of readFileSync(".env.r2", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error(
    "[img:upload] R2 자격 증명이 없습니다. .env.r2 파일에 R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET 을 설정하세요.",
  );
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function collectWebps(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...collectWebps(p));
    else if (name.toLowerCase().endsWith(".webp")) out.push({ path: p, size: st.size });
  }
  return out;
}

if (!existsSync(OUT_ROOT)) {
  console.error(`[img:upload] ${OUT_ROOT} 가 없습니다. 먼저 npm run img:webp 를 실행하세요.`);
  process.exit(1);
}

// 1) 버킷의 기존 객체 목록 (키 → 크기)
const existing = new Map();
let token = undefined;
do {
  const res = await client.send(
    new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: KEY_PREFIX, ContinuationToken: token }),
  );
  for (const obj of res.Contents ?? []) existing.set(obj.Key, obj.Size);
  token = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (token);
console.log(`[img:upload] bucket has ${existing.size} objects under ${KEY_PREFIX}`);

// 2) 크기가 다르거나 없는 파일만 업로드
const files = collectWebps(OUT_ROOT);
const pending = files.filter(({ path: p, size }) => {
  const key = KEY_PREFIX + relative(OUT_ROOT, p).replaceAll("\\", "/");
  return existing.get(key) !== size;
});
console.log(`[img:upload] ${files.length} local files, ${pending.length} to upload`);

let uploaded = 0;
let failed = 0;
const queue = [...pending];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const { path: p } = queue.pop();
      const key = KEY_PREFIX + relative(OUT_ROOT, p).replaceAll("\\", "/");
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: readFileSync(p),
            ContentType: "image/webp",
            CacheControl: "public, max-age=31536000, immutable",
          }),
        );
        uploaded++;
        if (uploaded % 200 === 0) console.log(`  …${uploaded}/${pending.length} uploaded`);
      } catch (e) {
        failed++;
        console.error(`[FAIL] ${key}: ${e.message}`);
      }
    }
  }),
);

console.log(`[img:upload] done — uploaded ${uploaded}, failed ${failed}`);
if (failed > 0) process.exit(1);
