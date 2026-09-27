---
type: Change Log
title: "2026-05-31 — 카드 검색 확장"
description: 효과 텍스트 검색, 검색 범위 드롭다운, 홀로멤 기프트/콜라보/블룸 서브필터의 반영을 기록한다.
status: stable
---

# 2026-05-31 — 카드 검색 확장

- Event: Release
- Effective scope: 덱 빌더 검색 전체 — 검색 범위(모두/카드명/태그/효과) 드롭다운,
  `abilities.description` 등 효과 텍스트 통합 검색, 홀로멤 타입 선택 시 기프트/콜라보/블룸
  ToggleChip 서브필터
- Specs: 없음 (소급 Spec 미작성 — 현재 동작 요약은 [Architecture][arch]의 빌더 편의 기능)
- Changed Structure: [Architecture][arch]
- Evidence:
  [commit `1bec46c` "검색 업데이트"](https://github.com/Cona0118/HoloDeckBuilder/commit/1bec46cf67c6fc13cb6551a970d09d5a2a621561)

> 소급 기록: 2026-08-25에 git 이력·세션 기록(2026-05-31 구현·빌드 통과)으로부터 재구성.

[arch]: ../structure/architecture.md
