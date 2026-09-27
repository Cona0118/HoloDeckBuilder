---
type: Change Log
title: "2026-06-26 — Deck Log 발행 대상 EN(/ja·타이틀 108) 전환"
description: 발행 대상을 JP(/9)에서 decklog-en /ja 로케일(타이틀 108)·익명 2단계 플로우로 전환한 변경을 기록한다.
status: stable
---

# 2026-06-26 — Deck Log 발행 대상 EN(/ja·타이틀 108) 전환

- Event: Change (외부 연동 대상 전환)
- Effective scope: Deck Log 발행 기능 전체 — 발행 엔드포인트를
  `decklog-en.bushiroad.com` `/ja`(타이틀 108, `app-ja` prefix)로 전환, 익명 발행 확정
  (`/create/` 세션 → `/publish/108`, `has_session:false`, 로그인 불필요), 뷰 링크
  `/ja/view/`, 발행 버튼 레이아웃 개선
- Specs: [Deck Log 발행 Feature Spec][spec]
- Changed Structure: [Architecture][arch] (Edge Function 절의 EN /ja 플로우)
- Evidence:
  [commit `22dcb65` "feat: decklog 발행을 decklog-en /ja(타이틀 108)로 전환 + 발행 버튼 레이아웃 개선"](https://github.com/Cona0118/HoloDeckBuilder/commit/22dcb654004230e50be65c526bc81c500a2be1ef)

> 소급 기록: 2026-08-25에 git 이력·세션 기록으로부터 재구성. 초기에 "로그인 필수"로
> 오진했다가 익명 발행 가능(실측 덱 4BMBR 발행)으로 정정된 이력이 있다. 커밋 시점에 Edge
> Function 재배포가 별도로 필요했고(재배포 전까지 구버전 JP 함수 동작), 재배포의 정확한
> 시점 증거는 저장소 안에 없어 미검증으로 남긴다.

[spec]: ../specs/features/decklog-publish-v1/feature-spec.md
[arch]: ../structure/architecture.md
