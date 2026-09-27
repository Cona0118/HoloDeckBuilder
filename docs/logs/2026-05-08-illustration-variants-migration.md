---
type: Change Log
title: "2026-05-08 — 일러스트 변형 선택 출시와 image_overrides 마이그레이션"
description: 덱 엔트리 단위 일러스트 선택 기능의 출시와 deck_posts 컬럼 재설계(oshi_image_url 도입) 마이그레이션을 기록한다.
status: stable
---

# 2026-05-08 — 일러스트 변형 선택 출시와 image_overrides 마이그레이션

- Event: Release + DB Migration
- Effective scope: 전체 사용자 — 오시/비오시 카드 일러스트 변형 선택, 게시판 공유
  파이프라인 반영, 변형 매니페스트 자동 생성 스크립트 도입; `deck_posts`는
  `image_overrides` 컬럼 제거·`oshi_image_url` 추가
- Specs: [카드 일러스트 변형 선택 Feature Spec][spec] (소급 재구성 draft)
- Changed Structure: [Architecture][arch] (이미지 처리 절)
- Evidence:
  [commit `2214be6`](https://github.com/Cona0118/HoloDeckBuilder/commit/2214be6c13eb34dff6e13a06248e05b1005e88a6)
  (마이그레이션 SQL 파일·`oshiImageUrl` 코드·고레어 이미지 도입),
  [`800ccaa` "썸네일 버그 수정"](https://github.com/Cona0118/HoloDeckBuilder/commit/800ccaa9b6e730dbff9657533beb54b4f78026ed)
  (게시판 썸네일에 선택 일러스트 반영); 마이그레이션 SQL 원본:
  [db_migration_image_overrides.sql](../../db_migration_image_overrides.sql)

> 소급 기록: 2026-08-25에 git 이력·세션 기록으로부터 재구성. DB 마이그레이션의 실제 실행은
> 세션 기록(2026-05-07 확인 안내) 기반이며 서버 측 실행 로그는 저장소 밖이다.

[spec]: ../specs/features/card-illustration-variants-v1/feature-spec.md
[arch]: ../structure/architecture.md
