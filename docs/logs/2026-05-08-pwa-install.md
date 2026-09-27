---
type: Change Log
title: "2026-05-08 — PWA 설치 지원 출시"
description: vite-plugin-pwa 도입, 설치 아이콘, Workbox precache 최적화(334MB→1.26MB)의 반영을 기록한다.
status: stable
---

# 2026-05-08 — PWA 설치 지원 출시

- Event: Release
- Effective scope: 전체 사용자 — 모바일·데스크톱에서 "holo덱빌더" 설치 가능,
  `registerType: autoUpdate`, 카드 이미지는 precache 제외 후 런타임 CacheFirst
- Specs: [PWA 설치 지원 Feature Spec][spec] (소급 재구성 draft)
- Changed Structure: [Architecture][arch] (PWA·캐싱 전략 절)
- Evidence:
  [commit `2214be6` "고레어추가, 다운기능 추가"](https://github.com/Cona0118/HoloDeckBuilder/commit/2214be6c13eb34dff6e13a06248e05b1005e88a6)
  — 커밋 메시지에는 없지만 이 커밋이 `vite-plugin-pwa` 의존성·PWA 아이콘·manifest 설정을
  도입했다(`git log -S 'vite-plugin-pwa'`로 확인); 설정 원본:
  [vite.config.ts](../../vite.config.ts)

> 소급 기록: 2026-08-25에 git 이력·세션 기록으로부터 재구성. precache 334MB → 1.26MB
> 최적화 수치는 2026-05-07 세션 기록 기준이다.

[spec]: ../specs/features/pwa-install-v1/feature-spec.md
[arch]: ../structure/architecture.md
