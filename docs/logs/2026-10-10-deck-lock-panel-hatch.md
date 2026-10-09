---
type: Change Log
title: "2026-10-10 — 덱리 잠금 범위 확대(덱 패널 매수 변경 차단·빗금 표시)"
description: 덱리 잠금이 덱 패널 안의 매수 변경까지 막고, 잠금 중 덱 패널에 빗금을 표시하도록 바뀐 변경을 기록한다.
status: stable
---

# 2026-10-10 — 덱리 잠금 범위 확대(덱 패널 매수 변경 차단·빗금 표시)

- Event: Release (같은 날 [덱리 잠금 추가][prev]의 후속)
- Effective scope: 전체 사용자 — 덱 빌더(`/`).
  - 잠금 중에는 오시·메인덱·엘 매수를 바꾸는 스토어 액션(`setOshi`, `addCard`, `removeCard`,
    `addCheer`, `removeCheer`, `fillCheers`, `clearCheers`, `clearDeck`)이 모두 무시된다. 이전에는
    카드 목록 클릭만 막고 덱 패널 편집은 허용했다.
  - 덱 패널: 오시 칸·메인덱·엘 덱 영역에 빗금 오버레이를 덮고, 카드 +/− 오버레이, 엘 덱
    「20장 채우기」·「초기화」, 덱 「초기화」 버튼을 숨긴다. 덱 선택·이름 변경·하단 내보내기
    버튼 영역에는 빗금을 덮지 않는다.
  - 길게 눌러 상세, 일러스트 변경, 순서 편집, 덱 이름 변경·삭제는 잠금 중에도 동작한다.
- Specs: 없음 (빌더 편의 기능)
- Changed Structure: [Architecture][arch] (빌더 편의 기능 목록)
- Evidence:
  [commit `ae1a1b5` "feat: 덱리 잠금 시 덱 패널 빗금 표시 · 덱 패널 매수 변경 차단"][c-feat]
  (스토어 잠금 가드 단위 테스트 `src/store/deckStore.test.ts` 포함); Vercel 커밋 상태 success.
  2026-10-10 프로덕션(`holo-deck-builder.vercel.app`, 번들 `index-Cs16q5qs.js`) Playwright 검증 —
  1400px: 잠금 중 덱 패널 카드 클릭·우클릭, 엘 클릭·우클릭 후 덱 불변, +/− 버튼 0개, 엘
  채우기/초기화·덱 초기화 버튼 0개, 빗금 오버레이 표시, 길게 눌러 상세 열림, 해제 후 덱 패널
  클릭 추가 정상·빗금 제거; 390px 모바일 덱 시트: 카드 탭 시 +/− 미표시·덱 불변, 가로 넘침
  없음; 카드 목록 잠금 회귀(잠금 중 불변, 해제 후 추가, 새 덱 미잠금) 통과.

[prev]: 2026-10-10-deck-list-lock.md
[arch]: ../structure/architecture.md
[c-feat]: https://github.com/Cona0118/HoloDeckBuilder/commit/ae1a1b566d622ee476dcb55021867dd96f43cdd6
