---
type: Feature Spec
title: 덱 공유 게시판
description: 회원가입 없이 덱을 게시판에 공유·검색·삭제하고 내 덱으로 불러오는 기능의 합의 범위.
status: draft
tags: [board, supabase]
sources:
  - id: design-doc
    resource: docs/superpowers/specs/2026-05-03-deck-board-design.md
    title: 덱 공유 게시판 — 설계 (2026-05-03)
  - id: impl-plan
    resource: docs/superpowers/plans/2026-05-03-deck-board.md
    title: 덱 공유 게시판 Implementation Plan
generated: { by: "agent:claude-code", at: 2026-08-24T18:00:00Z }
---

# 덱 공유 게시판

> **소급 재구성 노트**: 이 문서는 2026-08-25에 세션 기록·git 이력·legacy 설계 문서로부터
> 재구성한 `draft`다. 당시의 규범적 합의 원문은 `sources`의 설계 문서이며, 두 문서가
> 충돌하면 현재 코드와 [Log](../../../logs/index.md) 증거를 우선 확인한다.

## 배경과 목적

덱 빌더는 로컬(localStorage) 전용이었다. 사용자 간 덱 구성을 공유하는 커뮤니티 수요에
대응해, 회원가입 없이 익명으로 덱을 올리고 남의 덱을 자기 덱으로 가져올 수 있는 게시판을
추가한다. 댓글·계정 시스템은 의도적으로 배제한다.

## 기능 경계

포함:

- 덱 패널의 "덱 공유하기" → 게시글 이름·작성자명(기본 "익명")·삭제 비밀번호 입력 후 업로드.
- `/board` 목록: 아코디언 행(제목·작성자·오시 썸네일·작성일), 페이지당 20개, 최신순,
  URL 쿼리 기반 페이지 상태(`?page=`).
- 게시글 펼침 뷰: 오시 카드 좌측 대형 + 메인덱 그리드 자동 줄바꿈 + 옐 덱(B안 레이아웃).
- "내 덱으로 불러오기": 기존 덱을 덮어쓰지 않고 새 덱으로 추가, 클라이언트에 없는 카드는
  스킵 후 안내.
- 비밀번호 검증 삭제(작성자 본인만), 입상덱 마크(🏆)·대회명, 오시 필터·특정 카드 포함
  필터·입상덱만 필터(`?award=1`, 독립 조합).
- 추천(👍) 기능은 후속 [deck-board-recommend-v1](../deck-board-recommend-v1/feature-spec.md)이
  소유한다.

제외(Non-goals): 댓글, 계정/로그인, 수정 기능, 스팸 방지(1차 릴리스), 서버 측 카드
메타데이터 저장.

## 요구사항 요약

- 저장소는 Supabase Postgres `deck_posts` 단일 테이블. 덱은 cardId 기반 스냅샷
  (`DeckSnapshot`)으로 저장하고 카드 메타데이터는 클라이언트 `CARDS`와 join해 복원한다.
- 보안 모델: 비밀번호는 클라이언트 bcryptjs 해시로 저장, 삭제는 security definer RPC
  `delete_deck_post`의 pgcrypto 검증 경유만 허용, RLS로 직접 UPDATE/DELETE 차단,
  `password_hash` 컬럼은 anon SELECT 회수.
- 실행 계약 권위: [SUPABASE_SETUP.md](../../../SUPABASE_SETUP.md)(스키마·RLS·RPC·입상덱
  컬럼·bcrypt prefix 마이그레이션), [src/types/deckPost.ts](../../../../src/types/deckPost.ts),
  [src/api/deckPosts.ts](../../../../src/api/deckPosts.ts),
  [src/utils/deckSnapshot.ts](../../../../src/utils/deckSnapshot.ts).

## 수용 기준(당시 검증 근거)

- `npm run build`(tsc 포함) 통과, 12개 수동 시나리오 체크리스트(설계 문서)로 검증.
- 알려진 출시 후 결함과 수정: JSONB `.contains()` 기반 카드 검색 버그(2026-05-03 수정),
  bcryptjs `$2b$` prefix로 인한 삭제 실패(2026-05-06 수정·DB 마이그레이션).

## Relationships

- 관련 Log: [2026-05-03 게시판 출시](../../../logs/2026-05-03-deck-board-release.md),
  [2026-05-06 삭제 버그 수정](../../../logs/2026-05-06-deck-post-delete-fix.md)
- 후속 Spec: [deck-board-recommend-v1](../deck-board-recommend-v1/feature-spec.md)
- 현재 형상: [Architecture](../../../structure/architecture.md)
