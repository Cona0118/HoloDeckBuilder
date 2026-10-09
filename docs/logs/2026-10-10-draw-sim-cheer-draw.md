---
type: Change Log
title: "2026-10-10 — 드로우 시뮬 옐 덱 뽑기 추가"
description: 드로우 시뮬레이션에 메인덱과 별도로 섞은 옐 덱에서 한 장씩 뽑는 기능과 버튼을 추가한 변경을 기록한다.
status: stable
---

# 2026-10-10 — 드로우 시뮬 옐 덱 뽑기 추가

- Event: Release
- Effective scope: 전체 사용자 — 덱 빌더 드로우 시뮬레이션(데스크톱 덱 패널, 모바일 FAB 메뉴).
  - 시뮬 시작·멀리건 시 덱의 색상별 옐 매수로 옐 덱을 메인덱과 별도로 셔플한다.
  - 「옐 1장 드로우」 버튼으로 한 장씩 뽑아 패 아래 「옐 (n)」 영역에 표시한다(덱의 옐 일러스트
    선택 반영). 정보 줄에 「옐 잔여」를 표시하고, 옐 0장·소진 시 버튼을 비활성화한다.
  - 메인덱 「1장 드로우」는 뽑은 옐을 유지하고, 멀리건은 옐 덱도 다시 셔플한다.
  - 라이프 카드 분리는 하지 않는다(옐 덱 전체에서 뽑음).
  - 버튼 3개가 한 줄이 되어, 640px 미만에서는 멀리건 버튼의 「(다시 셔플)」 부연을 숨긴다.
- Specs: 없음 (빌더 편의 기능)
- Changed Structure: [Architecture][arch] (빌더 편의 기능 목록)
- Evidence:
  [commit `e92bb5f` "feat: 드로우 시뮬에 옐 덱 뽑기 추가"][c-feat]; Vercel 커밋 상태 success.
  2026-10-10 프로덕션(`holo-deck-builder.vercel.app`, 번들 `index-DM7d-2fF.js`) Playwright 검증 —
  1400px: 옐 0장 덱에서 버튼 비활성·「옐 잔여: 0장」, 20장 채운 덱에서 옐 3장+메인 1장 드로우 후
  「옐 (3)」·옐 잔여 17장, 20장 소진 시 비활성·뽑힌 색상 매수가 덱과 일치, 멀리건 후 옐 영역
  비움·잔여 20장; 344·390px 모바일(FAB → 드로우 시뮬): 옐 4장 드로우 정상, 액션 버튼 3개 한 줄
  (38px), 가로 넘침 없음, 페이지 오류 없음.

[arch]: ../structure/architecture.md
[c-feat]: https://github.com/Cona0118/HoloDeckBuilder/commit/e92bb5fc5e04ebc67476d2e20464570d985fc8fb
