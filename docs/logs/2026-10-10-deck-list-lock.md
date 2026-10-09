---
type: Change Log
title: "2026-10-10 — 덱리 잠금 추가"
description: 덱별 덱리 잠금(잠금 중 카드 목록 클릭으로 덱이 바뀌지 않음)의 프로덕션 반영을 기록한다.
status: stable
---

# 2026-10-10 — 덱리 잠금 추가

- Event: Release
- Effective scope: 전체 사용자 — 덱 빌더(`/`).
  - 덱 패널 오시 칸 우측 상단 자물쇠 버튼으로 활성 덱의 잠금을 토글한다. 모바일은 덱 시트의
    같은 위치(오시 칸을 접어도 헤더 줄에 남음).
  - 잠금 중에는 카드 목록에서 좌클릭/탭 추가, 우클릭 제거, 오시 선택이 모두 무시된다. 길게
    눌러 상세 보기는 그대로 동작한다. 카드 목록 툴바 안내 문구가 "덱리 잠금 중"으로 바뀐다.
  - 덱 패널 안의 편집(+/− 버튼, 엘 덱, 초기화, 일러스트 변경, 순서편집)은 잠그지 않는다.
  - 잠금은 덱별 `Deck.locked`로 `holo-deck-store`에 저장되어 새로고침 후에도 유지되고, 새 덱은
    잠기지 않은 상태로 시작한다.
- Specs: 없음 (빌더 편의 기능)
- Changed Structure: [Architecture][arch] (빌더 편의 기능 목록)
- Evidence:
  [commit `88c4b66` "feat: 덱리 잠금 — 잠금 중엔 카드 목록 클릭으로 덱이 바뀌지 않음"][c-feat];
  Vercel 커밋 상태 success. 2026-10-10 프로덕션(`holo-deck-builder.vercel.app`, 번들
  `index-Dzbq9aXo.js`) Playwright 검증 — 1400px: 잠금 중 좌클릭·우클릭·오시 클릭 후 덱 불변,
  새로고침 후 잠금 유지, 해제 후 추가 정상, 새 덱 미잠금; 344px 모바일: 덱 시트 자물쇠로 잠금 후
  카드 탭 시 덱 불변, 가로 넘침 없음.

[arch]: ../structure/architecture.md
[c-feat]: https://github.com/Cona0118/HoloDeckBuilder/commit/88c4b666abe3be9ae94fcf150355517140812c3e
