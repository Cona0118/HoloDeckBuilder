---
type: Change Log
title: "2026-06-23 — 옐(치어) 이미지 변형 선택 추가"
description: 일러스트 변형 선택을 옐(치어) 카드로 확장한 반영을 기록한다.
status: stable
---

# 2026-06-23 — 옐(치어) 이미지 변형 선택 추가

- Event: Release
- Effective scope: 전체 사용자 — 옐(치어) 카드도 이미지 변형 선택 지원,
  `genCheerImageVariants.mjs` 매니페스트 생성 스크립트 추가
- Specs: [카드 일러스트 변형 선택 Feature Spec][spec] (기능 확장으로 기록)
- Changed Structure: [Architecture][arch] (이미지 처리 절)
- Evidence:
  [commit `51c0f64` "옐 이미지 변형 선택 기능 추가"](https://github.com/Cona0118/HoloDeckBuilder/commit/51c0f6403c9972c30822ef5c2e7db9514f534ea3)

> 소급 기록: 2026-08-25에 git 이력·세션 기록으로부터 재구성.

[spec]: ../specs/features/card-illustration-variants-v1/feature-spec.md
[arch]: ../structure/architecture.md
