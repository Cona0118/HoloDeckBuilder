---
type: Change Log
title: "2026-05-06 — 게시글 삭제 버그 수정과 bcrypt prefix 마이그레이션"
description: bcryptjs $2b$ 해시와 pgcrypto crypt() 불일치로 인한 삭제 실패의 수정과 일회성 DB 마이그레이션을 기록한다.
status: stable
---

# 2026-05-06 — 게시글 삭제 버그 수정과 bcrypt prefix 마이그레이션

- Event: Hotfix + DB Migration
- Effective scope: 덱 공유 게시판 삭제 기능 전체 — 클라이언트가 해시를 `$2a$` prefix로
  정규화해 저장하도록 수정하고, 기존 저장분의 `$2b$`/`$2y$` 해시를 `$2a$`로 일괄 변환
- Specs: [덱 공유 게시판 Feature Spec][spec] (알려진 결함·수정으로 기록됨)
- Changed Structure: [Architecture][arch] (비밀번호 해시 정규화 규칙)
- Evidence:
  [commit `a0f9b17` "삭제 버그 수정"](https://github.com/Cona0118/HoloDeckBuilder/commit/a0f9b1744cd50e689a8b5d282d423584c44a961c),
  [`be87597` "버그 수정, 신카 업뎃"](https://github.com/Cona0118/HoloDeckBuilder/commit/be87597ca970ad3ce2d5763daf0134e5aa327be7);
  마이그레이션 SQL 원본: [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) 5절

> 소급 기록: 2026-08-25에 git 이력·세션 기록으로부터 재구성. 원인은 bcryptjs 3.x가
> 생성하는 `$2b$` prefix를 Supabase `pgcrypto.crypt()`가 인식하지 못한 것. DB 마이그레이션
> SQL의 실제 실행은 세션 기록 기반이며 서버 측 실행 로그는 저장소 밖이다.

[spec]: ../specs/features/deck-board-v1/feature-spec.md
[arch]: ../structure/architecture.md
