---
type: Feature Spec
title: 카드 일러스트 변형 선택
description: 같은 카드의 복수 일러스트 중 하나를 덱 엔트리 단위로 선택·공유하는 기능의 합의 범위.
status: draft
tags: [deck-builder, images]
generated: { by: "agent:claude-code", at: 2026-08-24T18:00:00Z }
---

# 카드 일러스트 변형 선택

> **소급 재구성 노트**: 2026-08-25에 세션 기록·git 이력·마이그레이션 SQL 주석으로부터
> 재구성한 `draft`. 별도 설계 문서는 없다.

## 배경과 목적

동일 카드번호에 고레어 등 복수 일러스트 파일이 존재한다. 사용자가 덱에서 카드별로 원하는
일러스트를 고르고, 그 선택이 게시판 공유·불러오기까지 그대로 전달되도록 한다.

## 기능 경계

포함:

- 카드 상세보기에서 일러스트 변형 선택. 오시 카드(`Deck.oshiImageUrl`)와 비오시 카드
  (덱 엔트리 단위 `DeckEntry.imageUrl` — 같은 cardId라도 imageUrl이 다르면 별개 엔트리)
  모두 지원. 2026-06-23부터 옐(치어) 카드 변형도 지원.
- 게시판 스냅샷 직렬화에 선택 일러스트 포함(`oshi_image_url` 컬럼 + `main_deck` JSONB
  엔트리의 `imageUrl` 필드), 게시판 썸네일에도 반영.
- 변형 매니페스트 자동 생성: `scripts/genCardImageVariants.mjs`·`genCheerImageVariants.mjs`가
  `public/images/` 실제 파일명을 스캔해 `src/data/*.generated.ts`를 만들고
  `predev`/`prebuild` 훅으로 자동 실행 — 변형 추가·삭제 시 코드 수정 불필요.
- 변형 정렬은 레어도 우선순위 기반(2026-06-19 개선).

제외(Non-goals): 서버 측 이미지 저장·변환, 일러스트별 별도 카드 데이터.

## 요구사항 요약

- 초기 구현의 `image_overrides` JSONB 컬럼 방식은 entry 단위 재설계로 폐기되었고, DB는
  `oshi_image_url TEXT` 추가 + `image_overrides` 제거 마이그레이션을 적용한다. SQL 원본
  권위: [db_migration_image_overrides.sql](../../../../db_migration_image_overrides.sql).
- 클라이언트 계약: [src/types/card.ts](../../../../src/types/card.ts),
  [src/types/deckPost.ts](../../../../src/types/deckPost.ts),
  [src/utils/deckSnapshot.ts](../../../../src/utils/deckSnapshot.ts),
  [src/data/cardImageVariants.ts](../../../../src/data/cardImageVariants.ts).

## 수용 기준(당시 검증 근거)

- 프로덕션 빌드 통과, 게시판 썸네일 오버라이드 반영 버그 수정(2026-05-08)까지 포함해
  master 반영.

## Relationships

- 관련 Log: [2026-05-08 일러스트 변형 재설계·마이그레이션](../../../logs/2026-05-08-illustration-variants-migration.md),
  [2026-06-23 옐 이미지 변형](../../../logs/2026-06-23-cheer-image-variants.md)
- 현재 형상: [Architecture](../../../structure/architecture.md)
