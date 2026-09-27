---
type: Change Log
title: "2026-06-24 — Deck Log 발행(JP) 출시"
description: 덱을 Bushiroad Deck Log JP에 발행하는 기능과 Supabase Edge Function 프록시의 출시를 기록한다.
status: stable
---

# 2026-06-24 — Deck Log 발행(JP) 출시

- Event: Release
- Effective scope: 전체 사용자 — 덱 패널의 "Deck Log에 업로드" 버튼(유효 덱 게이트),
  hocg_cards.json 기반 manage_id 매핑, Supabase Edge Function `decklog-publish` 프록시,
  발행 성공 시 view 링크 표시
- Specs: [Deck Log 발행 Feature Spec][spec] (소급 재구성 draft; 당시 규범 원문은
  [설계 문서][design])
- Changed Structure: [Architecture][arch] (Edge Function·외부 연동 절)
- Evidence:
  [commit `f8f2489` "feat: decklog publish"](https://github.com/Cona0118/HoloDeckBuilder/commit/f8f2489bdfae9a57c502f748fd84e0d9314aa4c0);
  Edge Function 배포와 실기기 발행 테스트 성공은 2026-06-23 세션 기록
  (`npx supabase functions deploy decklog-publish`, 발행 성공 확인)

> 소급 기록: 2026-08-25에 git 이력·세션 기록으로부터 재구성. Deck Log API는 비공식이며
> 실측(브라우저 캡처) 기반으로 계약값을 확정한 뒤 출시되었다.

[spec]: ../specs/features/decklog-publish-v1/feature-spec.md
[design]: ../superpowers/specs/2026-06-23-decklog-publish-design.md
[arch]: ../structure/architecture.md
