---
type: Change Log
title: "2026-09-27 — 카드 이미지 전면 404(CDN env BOM) 복구와 모바일·Galaxy Fold UI/성능 개선"
description: VITE_IMAGE_BASE_URL 앞 BOM으로 프로덕션 전 카드 이미지가 깨진 장애의 복구, SW 이미지 캐시 정책 변경, 덱 이미지 내보내기 tainted canvas 수정, Fold 화면 대응을 기록한다.
status: stable
---

# 2026-09-27 — 카드 이미지 전면 404(CDN env BOM) 복구와 모바일·Galaxy Fold UI/성능 개선

- Event: Incident fix + Release (이미지 서빙 복구, 모바일 UI·성능)
- Effective scope: 전체 사용자.
  - **장애**: 2026-09-25 카드 이미지 R2 CDN 이전([`5981614`][c-cdn]) 이후, Vercel env
    `VITE_IMAGE_BASE_URL` 값 앞에 BOM(U+FEFF)이 붙어 번들에 `"\uFEFFhttps://pub-….r2.dev"`로
    들어갔다. 브라우저가 이를 상대 경로로 해석해 `/%EF%BB%BFhttps://…` → 308 → 404가 되어
    카드·옐 이미지가 기기와 무관하게 전부 표시되지 않았다(모바일/Fold 사용자 신고로 발견).
  - **복구**: `normalizeImageBase`로 BOM·제로폭 문자·공백·끝 슬래시 제거, http(s) 절대 URL이
    아니면 빌드 실패, vite `define`으로 정규화 값 주입.
  - SW 런타임 이미지 캐시를 same-origin 200 응답만으로 제한하고 `card-images` →
    `card-images-v2`로 교체(구 캐시 삭제). opaque 응답은 status를 알 수 없어 r2.dev 429(빠른
    ~800건 요청 시 재현)·5xx까지 30일 캐시될 수 있었고, Chrome은 opaque 1건을 ~7MB 쿼터로 계산한다.
  - 덱 이미지 내보내기: CDN 이미지를 그대로 canvas에 그려 `Tainted canvases may not be exported`
    예외로 실패하던 문제를 CORS 모드 로드로 수정. **R2 버킷 CORS는 미적용**(R2 API 토큰이 객체 권한만
    있어 `PutBucketCors` AccessDenied) — 적용 전까지 내보내기 PNG의 카드 자리는 빈 슬롯.
  - 모바일/Fold: body `min-width:320px` 제거(280px 커버 우측 잘림), 400px 미만 검색줄 아이콘 버튼
    (344px에서 검색창이 아이콘만 남던 문제), 카드 열 수를 목록 폭 컨테이너 쿼리로(데스크톱 6열 유지,
    카드 폭 344px 50→77px·882px 펼침 70→107px), 터치 기기 안내 문구.
  - 성능: 레이아웃 1벌만 마운트(카드 DOM 2벌→1벌), 필터 `useDeferredValue`, CardItem `memo`+개별
    selector. Fold 커버 CPU 4x 스로틀 기준 메인스레드 블로킹: 검색 타이핑 ~270→~35ms, 검색 해제
    ~820→~90ms, 카드 3장 추가 ~475→~58ms, 초기 로드 ~1350→~710ms.
- Specs: 없음 (버그 수정·반응형 대응)
- Changed Structure: [Architecture][arch] (빌더 레이아웃, 이미지 처리 절)
- Evidence:
  [commit `cc7dc53` "fix: 프로덕션 카드 이미지 전면 404(env BOM) + 모바일·Fold UI/성능 개선"][c-fix];
  2026-09-27 프로덕션(`holo-deck-builder.vercel.app`, 번들 `index-CmqLiv59.js`, SW
  `card-images-v2`) Playwright 에뮬레이션 검증 — 280/344/390/882px 모두 가로 넘침 없음, 화면 내
  카드 이미지 전부 200 로드, 1440px 데스크톱 6열 유지, 덱 이미지 내보내기 다운로드 성공.
  배포 전 동일 절차로 수정 전 프로덕션(`index-B0GjJJUa.js`)에서 화면 내 이미지 0장 로드 확인.

> 후속 조치: (1) Cloudflare 대시보드에서 R2 `holo-cards` CORS(GET/HEAD) 적용 시 내보내기에 카드
> 그림 포함. (2) Vercel env 값 자체의 BOM 제거 권장(코드가 정규화하므로 동작엔 영향 없음).
> (3) r2.dev는 레이트리밋되는 개발용 주소라 운영은 커스텀 도메인 연결 권장.

[arch]: ../structure/architecture.md
[c-cdn]: https://github.com/Cona0118/HoloDeckBuilder/commit/5981614d8d8cfc3c27d92cd54302b969c39e1781
[c-fix]: https://github.com/Cona0118/HoloDeckBuilder/commit/cc7dc53b5afab72ac1d15ac1df3bb605e9ab9f6a
