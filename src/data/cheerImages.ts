import type { CardColor } from "../types/card";
import { CHEER_IMAGE_VARIANTS as RAW_CHEER_VARIANTS } from "./cheerImageVariantsMap.generated";
import { toImagePath, toImageSrc } from "../utils/imageCdn";

// 표시용 URL로 변환된 옐 변형 맵 — CDN 베이스 설정 시 .webp CDN URL이 된다.
const CHEER_IMAGE_VARIANTS: Partial<Record<CardColor, string[]>> = Object.fromEntries(
  Object.entries(RAW_CHEER_VARIANTS).map(([color, urls]) => [color, urls.map(toImageSrc)]),
);

/** 옐(엘) 덱 색상 순서. */
export const CHEER_COLORS: CardColor[] = [
  "white",
  "green",
  "red",
  "blue",
  "purple",
  "yellow",
];

/** 색상별 기본 옐 이미지(생성 매니페스트가 비어 있을 때의 안전 폴백). */
const DEFAULT_CHEER_IMAGE: Record<CardColor, string> = {
  white: toImageSrc("/images/hY/hY01.png"),
  green: toImageSrc("/images/hY/hY02.png"),
  red: toImageSrc("/images/hY/hY03.png"),
  blue: toImageSrc("/images/hY/hY04.png"),
  purple: toImageSrc("/images/hY/hY05.png"),
  yellow: toImageSrc("/images/hY/hY06.png"),
};

/**
 * 색상별 옐 일러스트 변형 목록(첫 번째가 기본 hY, 그 뒤가 SY 변형).
 * 목록은 scripts/genCheerImageVariants.mjs 가 public/images/hY·SY 폴더를
 * 스캔해 cheerImageVariantsMap.generated.ts 로 자동 생성한다.
 * SY 폴더에 이미지를 추가하면 빌드/dev 시 자동으로 반영된다.
 */
export const CHEER_VARIANTS: Record<CardColor, string[]> = CHEER_COLORS.reduce(
  (acc, color) => {
    const list = CHEER_IMAGE_VARIANTS[color];
    acc[color] = list && list.length > 0 ? list : [DEFAULT_CHEER_IMAGE[color]];
    return acc;
  },
  {} as Record<CardColor, string[]>,
);

/** 색상별 기본 옐 이미지(= 변형 목록의 첫 번째). */
export const CHEER_IMAGE: Record<CardColor, string> = CHEER_COLORS.reduce(
  (acc, color) => {
    acc[color] = CHEER_VARIANTS[color][0];
    return acc;
  },
  {} as Record<CardColor, string>,
);

/**
 * 저장된 옐 이미지 URL을 안전하게 해석한다.
 * 현재 변형 목록에 있으면 그대로, 없으면(파일명 변경/삭제) 기본 이미지로 폴백.
 */
export function resolveCheerImage(color: CardColor, stored?: string): string {
  if (stored) {
    // 저장 시점의 URL 형태(로컬 경로·구/신 CDN URL)와 무관하게 경로 공간으로 비교
    const storedPath = toImagePath(stored);
    const hit = CHEER_VARIANTS[color].find((v) => toImagePath(v) === storedPath);
    if (hit) return hit;
  }
  return CHEER_VARIANTS[color][0];
}
