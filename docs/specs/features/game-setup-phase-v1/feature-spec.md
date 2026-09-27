---
type: Feature Spec
title: 게임 셋업 단계 + 솔로 대전
description: 대전 시작 전 셋업 플로우(선후공·멀리건·데뷔 배치)와 혼자 연습 대전 진입의 합의 범위.
status: draft
tags: [game, engine]
sources:
  - id: design-doc
    resource: docs/superpowers/specs/2026-06-02-game-setup-phase-design.md
    title: 게임 셋업 단계 + 로비 솔로 대전 — 설계 문서 (2026-06-02)
  - id: impl-plan
    resource: docs/superpowers/plans/2026-06-02-game-setup-phase.md
    title: 게임 셋업 단계 + 로비 솔로 대전 — 구현 계획
generated: { by: "agent:claude-code", at: 2026-08-24T18:00:00Z }
---

# 게임 셋업 단계 + 솔로 대전

> **소급 재구성 노트**: 2026-08-25에 세션 기록·git 이력·legacy 설계 문서로부터 재구성한
> `draft`. 규범 원문은 `sources`의 설계 문서다.

## 배경과 목적

빈 게임판 레이아웃만 있던 대전 화면에 실제 규칙 기반 셋업 단계를 구현하고, 상대 없이도
테스트할 수 있는 혼자 연습(솔로 핫시트) 대전 진입점을 로비에 추가한다.

## 기능 경계

포함:

- 순수 게임 엔진 모듈([src/game/](../../../../src/game/)): `rng.ts`(시드 가능 난수),
  `types.ts`(phase·`gameover`·`winner` 포함), `setup.ts`(셋업 로직과 `validateDeck` 덱
  유효성 검사).
- 셋업 플로우: 선후공 결정 → 멀리건 → 데뷔 체크(데뷔 홀로멤 없으면 강제 재멀리건, 6회
  도달 시 패배) → 페널티 → 데뷔 배치 → 시작. 핫시트 방식 phase 전환은
  [gameStore](../../../../src/store/gameStore.ts)가 소유.
- UI: GameBoard(존 레이아웃, 라이프 카드 색상 비노출), HandArea(컨테이너 쿼리 기반 카드
  크기), SetupOverlay(멀리건 UI), 선후공 결정 전 패 숨김.
- 로비 "혼자 연습 대전" 진입점, 빈 덱이면 `/`로 리다이렉트, `validateDeck` 실패 시 게임
  진입 차단.

제외(Non-goals): 셋업 이후의 본편 턴 진행(메인/아츠/엔드 단계) 완성 — 이후 "대전 기능
업데이트 중" 상태로 남아 있으며 이 Spec의 범위가 아니다. 네트워크 동기화 대전(현재 상대
패 장수는 임시값).

## 요구사항 요약

- 게임 로직은 React와 분리된 순수 모듈로 유지하고, 상태 전환만 Zustand 스토어가 담당한다.
- 진입 경로: `/game/:code`(방 경유)와 `/game`(개발용 미리보기)·솔로 모드.

## 수용 기준(당시 검증 근거)

- 빌드·대상 파일 ESLint 0 에러, 코드 리뷰 지적사항(빈 덱 리다이렉트, 비데뷔 배치 안내,
  멀리건 6회 패배, 라이프 색상 노출 버그) 반영 커밋까지 포함해 master 반영.

## Relationships

- 진입 기능: [multiplayer-lobby-v1](../multiplayer-lobby-v1/feature-spec.md)
- 관련 Log: [2026-06-03 게임 셋업·로비 반영](../../../logs/2026-06-03-game-setup-and-lobby-merge.md)
- 현재 형상: [Architecture](../../../structure/architecture.md)
