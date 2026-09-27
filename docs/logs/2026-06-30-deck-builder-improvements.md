---
type: Change Log
title: "2026-06-30 — 덱빌더 개선 묶음(덱코드 자동복사·모바일 FAB·이벤트컵 카드풀·순서편집)"
description: 덱로그 코드 자동 클립보드 복사, 모바일 FAB 덱 액션, 이벤트컵(셀렉션 컵) 카드풀 필터, 덱 순서편집의 반영을 기록한다.
status: stable
---

# 2026-06-30 — 덱빌더 개선 묶음(덱코드 자동복사·모바일 FAB·이벤트컵 카드풀·순서편집)

- Event: Release
- Effective scope: 전체 사용자 — 덱로그 업로드 성공 시 덱 코드 자동 클립보드 복사·코드
  표시, 모바일 좌하단 + FAB 덱 액션 메뉴, 이벤트컵(셀렉션 컵) 카드풀 필터
  (`eventPools.ts`, 합법성 배지·풀 밖 카드 빨간 테두리), 덱 순서편집 ◀▶ 이동,
  eventPools 단위 테스트 추가
- Specs: [Deck Log 발행 Feature Spec][decklog-spec] (덱코드 자동복사 부분); 나머지는 소급
  Spec 미작성 — 현재 동작 요약은 [Architecture][arch]
- Changed Structure: [Architecture][arch] (빌더 편의 기능·카드 데이터 계층의 eventPools)
- Evidence:
  [commit `fa9d643` "feat: 덱빌더 개선 — 덱코드 자동복사·모바일 FAB·셀렉션컵 카드풀·순서편집 ◀▶"](https://github.com/Cona0118/HoloDeckBuilder/commit/fa9d643e019c1f9abaa2231a0e4bad1fb5e4155a)

> 소급 기록: 2026-08-25에 git 이력으로부터 재구성. 이벤트컵 카드풀 필터 UI는 이후
> 2026-08-19에 `SHOW_EVENT_POOL_FILTER=false`로 임시 숨김되었다
> ([2026-08-19 기록](2026-08-19-heb01-summer-hologram.md) 참조).

[decklog-spec]: ../specs/features/decklog-publish-v1/feature-spec.md
[arch]: ../structure/architecture.md
