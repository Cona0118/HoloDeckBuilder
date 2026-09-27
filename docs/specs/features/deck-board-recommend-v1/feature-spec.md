---
type: Feature Spec
title: 게시판 추천(👍)
description: 덱 공유 게시판에 로그인 없는 추천 토글과 최신순/추천순 정렬을 추가하는 합의 범위.
status: draft
tags: [board, supabase]
sources:
  - id: design-doc
    resource: docs/superpowers/specs/2026-05-26-deck-board-recommend-design.md
    title: 덱 공유 게시판 추천(좋아요) 기능 설계 (2026-05-26)
  - id: impl-plan
    resource: docs/superpowers/plans/2026-05-26-deck-board-recommend.md
    title: 덱 공유 게시판 추천 기능 Implementation Plan
generated: { by: "agent:claude-code", at: 2026-08-24T18:00:00Z }
---

# 게시판 추천(👍)

> **소급 재구성 노트**: 2026-08-25에 세션 기록·git 이력·legacy 설계 문서로부터 재구성한
> `draft`. 규범 원문은 `sources`의 설계 문서다.

## 배경과 목적

로그인 없는 게시판에서 좋은 덱이 목록에 묻히지 않도록, 가벼운 추천 수단과 추천순 정렬을
제공한다. 계정이 없으므로 엄격한 1인 1추천 보장은 목표가 아니다.

## 기능 경계

포함:

- 게시글 펼침 영역의 추천/취소 토글 버튼(👍)과 목록 행의 추천수 칩.
- 정렬 토글: 최신순 ⇄ 추천순, URL `?sort=popular` 파라미터 연동.
- 브라우저(localStorage) 단위 중복 추천 차단.

제외(Non-goals): IP/계정 단위 unique 보장, 댓글, 페이징 변경, 기존 게시글 백필.

## 요구사항 요약

- `deck_posts.recommend_count integer not null default 0` 컬럼과
  `increment_deck_post_recommends` / `decrement_deck_post_recommends` RPC(0 미만 방지)로
  서버 카운트를 관리한다. SQL 원본 권위:
  [설계 문서](../../../superpowers/specs/2026-05-26-deck-board-recommend-design.md)의 SQL 블록.
- 클라이언트 계약: [src/api/deckPosts.ts](../../../../src/api/deckPosts.ts)의 RPC 래퍼·정렬
  분기, [src/utils/recommendStorage.ts](../../../../src/utils/recommendStorage.ts)의 중복
  방지 헬퍼.

## 수용 기준(당시 검증 근거)

- lint·프로덕션 빌드 통과 후 3개 커밋으로 master 반영(2026-05-26). 이후 아이콘을 👍
  이모지로 교체.

## Relationships

- 부모 기능: [deck-board-v1](../deck-board-v1/feature-spec.md)
- 관련 Log: [2026-05-26 추천 기능 출시](../../../logs/2026-05-26-board-recommend-release.md)
- 현재 형상: [Architecture](../../../structure/architecture.md)
