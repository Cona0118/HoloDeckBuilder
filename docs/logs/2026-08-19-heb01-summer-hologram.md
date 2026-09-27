---
type: Change Log
title: "2026-08-19 — hEB01 「섬머 홀로그램」 추가와 카드 상세 UI 정리"
description: 엑스트라 부스터 hEB01 34장 추가, 카드 상세 이미지 크기 고정, 오시 스킬 레이블 통일, 이벤트컵 필터 숨김의 반영을 기록한다.
status: stable
---

# 2026-08-19 — hEB01 「섬머 홀로그램」 추가와 카드 상세 UI 정리

- Event: Release (카드 세트 + UI 정리)
- Effective scope: 전체 사용자 — 엑스트라 부스터 hEB01 「섬머 홀로그램」 34장
  (오시 3·홀로멤 19·서포트 10)과 타 세트 변형 이미지 59개 추가, 카드 상세 이미지
  40vh/80vh + 63:88 비율 고정, 오시 능력 레이블 표준화(오시 스킬 / SP오시 스킬 /
  오시스테이지 스킬), 이벤트컵 카드풀 필터 UI 임시 숨김(`SHOW_EVENT_POOL_FILTER=false`,
  저장된 필터값 자동 초기화)
- Specs: 없음 (카드 데이터·UI 정리 — 데이터 권위는 `src/data/cards.ts`, 현재 동작 요약은
  [Architecture][arch])
- Changed Structure: [Architecture][arch] (카드 데이터 계층·이미지 처리 절)
- Evidence:
  [commit `a8021c5` "feat: 엑스트라 부스터 hEB01 「섬머 홀로그램」 34장 추가"](https://github.com/Cona0118/HoloDeckBuilder/commit/a8021c5917e42fb2e527bd9cb731025fb726f89a),
  [`b8f0306` "fix: 카드 상세 이미지 크기 고정 + 오시 스킬 레이블 통일"](https://github.com/Cona0118/HoloDeckBuilder/commit/b8f03065373d4cd6954e37190ff1aa46bbca0131),
  [`3cc87fc` "feat: 이벤트컵 카드풀 필터 UI 임시 숨김"](https://github.com/Cona0118/HoloDeckBuilder/commit/3cc87fc1519e3124734c8f1dd1710cf19c7ad8ae);
  `git push origin master` 완료는 2026-08-18 세션 기록(테스트 26/26·빌드 통과 포함)

> 소급 기록: 2026-08-25에 git 이력·세션 기록으로부터 재구성. 이벤트컵 필터 숨김은 revert로
> 롤백 가능한 임시 조치로 기록되어 있다.

[arch]: ../structure/architecture.md
