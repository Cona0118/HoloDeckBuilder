---
type: Change Log
title: "2026-05-26 — 게시판 추천(👍) 기능 출시"
description: 추천 토글·추천수 표시·최신순/추천순 정렬과 recommend_count 컬럼·RPC의 반영을 기록한다.
status: stable
---

# 2026-05-26 — 게시판 추천(👍) 기능 출시

- Event: Release + DB Migration
- Effective scope: 덱 공유 게시판 전체 — 추천/취소 토글(브라우저 단위 중복 차단), 추천수
  칩, `?sort=popular` 정렬 토글; `deck_posts.recommend_count` 컬럼과
  increment/decrement RPC 추가
- Specs: [게시판 추천 Feature Spec][spec] (소급 재구성 draft; 당시 규범 원문은
  [설계 문서][design])
- Changed Structure: [Architecture][arch] (Supabase 백엔드 절의 추천 컬럼·RPC)
- Evidence:
  [commit `cb77e1c` "feat(board): add recommend count field, sort, RPC wrappers"](https://github.com/Cona0118/HoloDeckBuilder/commit/cb77e1c8f016b9c05575ea29819a996e74698075),
  [`81f5670` "feat(board): add recent/popular sort toggle"](https://github.com/Cona0118/HoloDeckBuilder/commit/81f567082c60036d8d56b7a08dd1ddc94440388a),
  [`dc047d8` "feat(board): add 👍 recommend chip and toggle button"](https://github.com/Cona0118/HoloDeckBuilder/commit/dc047d84c593f66ce7891cd79202042856f803b6),
  [`d2bb7cf` "추천기능 추가"](https://github.com/Cona0118/HoloDeckBuilder/commit/d2bb7cfbe0803f69a04a6e5a657052eca5cb4b35);
  SQL 원본: [설계 문서][design]의 SQL 블록

> 소급 기록: 2026-08-25에 git 이력·세션 기록으로부터 재구성. DB 변경 실행은 세션 기록
> 기반이며 서버 측 실행 로그는 저장소 밖이다.

[spec]: ../specs/features/deck-board-recommend-v1/feature-spec.md
[design]: ../superpowers/specs/2026-05-26-deck-board-recommend-design.md
[arch]: ../structure/architecture.md
