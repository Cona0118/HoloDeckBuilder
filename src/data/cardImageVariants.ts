// 카드 일러스트 변형 매니페스트.
// CARD_IMAGE_VARIANTS 매핑은 빌드 전 scripts/genCardImageVariants.mjs 가
// public/images/ 폴더를 스캔해 자동 생성한다 (cardImageVariantsMap.generated.ts).
// 새 일러스트 이미지를 폴더에 추가했다면 `npm run gen:variants` 또는 빌드 시 자동 갱신된다.
import { CARD_IMAGE_VARIANTS as RAW_VARIANTS } from "./cardImageVariantsMap.generated";
import { toImagePath, toImageSrc } from "../utils/imageCdn";

// 표시용 URL로 변환된 변형 맵 — CDN 베이스 설정 시 .webp CDN URL이 된다.
const CARD_IMAGE_VARIANTS: Record<string, string[]> = Object.fromEntries(
  Object.entries(RAW_VARIANTS).map(([id, urls]) => [id, urls.map(toImageSrc)]),
);

export { CARD_IMAGE_VARIANTS };

export function getCardImageVariants(
  cardId: string,
  defaultImageUrl?: string,
): string[] {
  const variants = CARD_IMAGE_VARIANTS[cardId];
  if (variants && variants.length > 0) return variants;
  return defaultImageUrl ? [defaultImageUrl] : [];
}

/**
 * 덱에 저장된 일러스트 URL을 현재 이미지 자산 기준으로 안전하게 해석한다.
 * 저장된 URL이 현재 변형 목록에 존재하면 그대로 사용하고,
 * 파일명이 바뀌었거나 삭제되어 더 이상 없으면 카드 기본 일러스트로 폴백한다.
 * (둘 다 없으면 undefined → 호출 측에서 플레이스홀더 표시)
 */
export function resolveStoredImage(
  cardId: string,
  storedUrl: string | undefined,
  defaultImageUrl: string | undefined,
): string | undefined {
  if (storedUrl) {
    const variants = getCardImageVariants(cardId, defaultImageUrl);
    // 저장 시점의 URL 형태(로컬 경로·구/신 CDN URL)와 무관하게 경로 공간으로 비교
    const stored = toImagePath(storedUrl);
    const hit = variants.find((v) => toImagePath(v) === stored);
    if (hit) return hit;
  }
  return defaultImageUrl;
}

/** 오버라이드가 유효한 변형이면 그것을, 아니면 카드 기본 imageUrl을 반환. */
export function resolveCardImage(
  cardId: string,
  defaultImageUrl: string | undefined,
  overrides?: Record<string, string>,
): string | undefined {
  const override = overrides?.[cardId];
  if (!override) return defaultImageUrl;
  const variants = getCardImageVariants(cardId, defaultImageUrl);
  const overridePath = toImagePath(override);
  return variants.find((v) => toImagePath(v) === overridePath) ?? defaultImageUrl;
}
