---
type: Change Log
title: "2026-06-03 — 멀티플레이어 로비·게임 셋업 단계 반영"
description: Supabase Realtime 대기실과 대전 셋업 플로우(선후공·멀리건·데뷔 배치)·솔로 연습 대전의 master 반영을 기록한다.
status: stable
---

# 2026-06-03 — 멀티플레이어 로비·게임 셋업 단계 반영

- Event: Release (숨김 기능)
- Effective scope: 로고 5회 클릭 이스터에그로 진입하는 사용자 — `/lobby`·`/room/:code`·
  `/game/:code` 라우트, 2인 대기실(Presence/Broadcast), 게임 엔진 순수 모듈과 셋업 플로우,
  로비 "혼자 연습 대전". 셋업 이후의 본편 턴 진행은 이 시점에 미완
  ("대전 기능 업데이트 중")
- Specs: [멀티플레이어 대기실 Feature Spec][lobby-spec],
  [게임 셋업 단계 Feature Spec][setup-spec] (모두 소급 재구성 draft; 당시 규범 원문은
  [설계 문서][design])
- Changed Structure: [Architecture][arch] (라우팅·gameStore·Realtime 절)
- Evidence:
  [commit `fcefebf` "게임 셋업: 게임 엔진 순수 모듈(rng/types/setup) 추가"](https://github.com/Cona0118/HoloDeckBuilder/commit/fcefebf7dece53d135ab5ba23179f1faeb52cb89),
  [`d26cf93` gameStore](https://github.com/Cona0118/HoloDeckBuilder/commit/d26cf938f5d58a4f8673eb9df1900f981e0dae09),
  [`4f7865c` 게임 UI 컴포넌트](https://github.com/Cona0118/HoloDeckBuilder/commit/4f7865c8ec8f9ee18907045773015f3dbd5c14dd),
  [`a5662de` GamePage 연결 + 로비 솔로 진입점](https://github.com/Cona0118/HoloDeckBuilder/commit/a5662de128c02a161400cf42bdaf08200530d65c),
  [`4c4317e` 리뷰 수정](https://github.com/Cona0118/HoloDeckBuilder/commit/4c4317e54aab82eff39eca7b71a0a0232466aa62),
  [`9c735b1` 피드백 1~5 반영](https://github.com/Cona0118/HoloDeckBuilder/commit/9c735b10d057fb417a51b575e14148659e38ad87),
  [`7416231` "대전 기능 업데이트 중"](https://github.com/Cona0118/HoloDeckBuilder/commit/741623100cb0446b68291d64508c823551265558)

> 소급 기록: 2026-08-25에 git 이력·세션 기록으로부터 재구성. 로비 UI 자체는 2026-06-01
> 세션에서 구현되었으나 관련 파일의 최초 커밋은 2026-06-03이므로 반영일을 기준으로 했다.

[lobby-spec]: ../specs/features/multiplayer-lobby-v1/feature-spec.md
[setup-spec]: ../specs/features/game-setup-phase-v1/feature-spec.md
[design]: ../superpowers/specs/2026-06-02-game-setup-phase-design.md
[arch]: ../structure/architecture.md
