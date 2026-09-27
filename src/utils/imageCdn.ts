// 카드 이미지 CDN 변환 유틸.
// VITE_IMAGE_BASE_URL 이 설정되면 로컬 경로("/images/….png")를
// CDN URL("https://…/images/….webp")로 변환해 표시한다.
// 미설정(로컬 dev, 로컬 빌드)이면 public/images 의 PNG를 그대로 쓴다.
//
// 내부 데이터(cards.ts·변형 맵·저장된 덱)는 항상 "/images/….png" 경로 공간을
// 기준으로 비교해야 하므로, 비교 시에는 toImagePath 로 정규화한다.

import { normalizeImageBase } from "./imageBase";

const IMAGES_PREFIX = "/images/";

/** 순수 변환 함수(테스트용): base가 비어 있으면 원본 그대로. */
export function toImageSrcWith(base: string, url: string): string {
  if (!base || !url.startsWith(IMAGES_PREFIX)) return url;
  return base + url.replace(/\.png$/i, ".webp");
}

/** 어떤 형태의 이미지 URL이든 "/images/….png" 경로 공간으로 정규화(테스트용 순수 함수). */
export function toImagePath(url: string): string {
  const i = url.indexOf(IMAGES_PREFIX);
  const path = i >= 0 ? url.slice(i) : url;
  return path.replace(/\.webp$/i, ".png");
}

const RAW_BASE: string = normalizeImageBase(
  import.meta.env?.VITE_IMAGE_BASE_URL as string | undefined,
);

export const IMAGE_CDN_ENABLED = RAW_BASE !== "";

/** 로컬 이미지 경로를 표시용 URL로 변환한다. CDN 미설정이면 그대로 반환. */
export function toImageSrc(url: string): string {
  return toImageSrcWith(RAW_BASE, url);
}
