---
type: Change Log
title: "2026-09-27 — R2 버킷 CORS 적용(덱 이미지 내보내기 카드 그림 복구)"
description: R2 holo-cards 버킷에 CORS 정책을 적용해 덱 이미지 내보내기에 CDN 카드 그림이 들어가게 된 변경을 기록한다.
status: stable
---

# 2026-09-27 — R2 버킷 CORS 적용(덱 이미지 내보내기 카드 그림 복구)

- Event: Infra config (Cloudflare R2)
- Effective scope: 덱 이미지 내보내기("이미지(전체)/이미지(요약)") 사용자. 같은 날
  [카드 이미지 404 복구][prev]에서 남긴 후속 조치 (1)의 완료.
  R2 `holo-cards` 버킷 CORS 정책 `[{"AllowedOrigins":["*"],"AllowedMethods":["GET","HEAD"],
  "AllowedHeaders":["*"],"MaxAgeSeconds":86400}]` — 공개 이미지라 모든 오리진 GET/HEAD 허용.
  사용자가 Cloudflare 대시보드에서 적용했다(`.env.r2` API 토큰은 객체 권한만 있어
  `PutBucketCors`가 AccessDenied).
- Specs: 없음
- Changed Structure: [Architecture][arch] (이미지 처리 절 — 덱 이미지 내보내기)
- Evidence: 2026-09-27 `Origin` 헤더 요청에 R2가 `Access-Control-Allow-Origin: *`, `Vary: Origin`
  응답(`?cors` 쿼리 포함 URL도 200). 프로덕션(`holo-deck-builder.vercel.app`)에서 Playwright로
  오시 1장 + 메인 7장 덱을 "이미지(전체)" 내보내기 → PNG에 CDN 카드 그림이 모두 그려짐, 콘솔
  에러 없음(적용 전에는 같은 절차에서 CORS 차단으로 빈 슬롯).

[prev]: 2026-09-27-cdn-image-bom-and-mobile-fold.md
[arch]: ../structure/architecture.md
