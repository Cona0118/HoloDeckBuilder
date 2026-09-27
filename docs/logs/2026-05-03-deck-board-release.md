---
type: Change Log
title: "2026-05-03 — 덱 공유 게시판 출시"
description: Supabase 기반 익명 덱 공유 게시판(/board)과 입상덱 마크·게시판 검색의 최초 출시를 기록한다.
status: stable
---

# 2026-05-03 — 덱 공유 게시판 출시

- Event: Release
- Effective scope: 전체 사용자 — `/board` 라우트 신설(목록·페이지네이션·업로드·비밀번호
  삭제·내 덱으로 불러오기), 입상덱 마크·오시 필터·카드 포함 검색, React Router 도입
- Specs: [덱 공유 게시판 Feature Spec][spec] (소급 재구성 draft; 당시 규범 원문은
  [설계 문서][design])
- Changed Structure: [Architecture][arch] (Supabase `deck_posts` 백엔드·라우팅 계층 추가)
- Evidence:
  [commit `f795166` "신카 추가, 덱리 공유 게시판 추가"](https://github.com/Cona0118/HoloDeckBuilder/commit/f79516632636be79f545697f5a27af9817d6063d),
  [`1ed8fba` "feat: 게시판 UI 개선 + 푸터 추가"](https://github.com/Cona0118/HoloDeckBuilder/commit/1ed8fbacdd95bce8ef613f5801170d4bb5e11ecb),
  [`55fd087` "feat: 입상덱 마크 + 게시판 검색(오시 필터) + 카드 상세 → 덱레시피 검색"](https://github.com/Cona0118/HoloDeckBuilder/commit/55fd0879bbde8a8be870ab05e5fe35dfae6a5609),
  당일 후속 수정 [`7e343b0` "덱리 검색 버그 수정"](https://github.com/Cona0118/HoloDeckBuilder/commit/7e343b0d3ed90ee7c389935ffcbef1ecedfbe806);
  DB 스키마·RLS·RPC 실행 계약: [SUPABASE_SETUP.md](../SUPABASE_SETUP.md)

> 소급 기록: 2026-08-25에 git 이력·세션 기록으로부터 재구성. Supabase 프로젝트 셋업(SQL
> 실행·환경변수)은 사용자가 수동 수행했으며 서버 측 실행 로그는 저장소 밖이다.

[spec]: ../specs/features/deck-board-v1/feature-spec.md
[design]: ../superpowers/specs/2026-05-03-deck-board-design.md
[arch]: ../structure/architecture.md
