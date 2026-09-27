// VITE_IMAGE_BASE_URL 정규화 — 앱(imageCdn.ts)과 빌드 설정(vite.config.ts)이 함께 쓴다.
// 순수 함수만 둔다(import.meta.env 참조 금지: vite.config 의 node tsconfig 에서도 컴파일됨).
//
// 2026-09-27 장애: Vercel env 값 앞에 BOM(U+FEFF)이 붙어 이미지 src 가
// "\uFEFFhttps://…" 가 됐고, 브라우저가 이를 상대 경로로 해석해 전 카드 이미지가 404였다.

/** BOM·제로폭 문자·공백·끝 슬래시를 제거한다. 미설정이면 "". */
export function normalizeImageBase(raw: string | undefined): string {
  return (raw ?? "")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .trim()
    .replace(/\/+$/, "");
}

/** 정규화된 베이스가 공백 없는 http(s) 절대 URL인지. 아니면 이미지가 상대 경로로 깨진다. */
export function isValidImageBase(base: string): boolean {
  if (/\s/.test(base)) return false;
  try {
    const url = new URL(base);
    return (url.protocol === "https:" || url.protocol === "http:") && url.host !== "";
  } catch {
    return false;
  }
}
