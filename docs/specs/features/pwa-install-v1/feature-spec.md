---
type: Feature Spec
title: PWA 설치 지원
description: 웹 앱을 모바일·데스크톱에 앱처럼 설치할 수 있게 하는 PWA 도입의 합의 범위.
status: draft
tags: [pwa, build]
generated: { by: "agent:claude-code", at: 2026-08-24T18:00:00Z }
---

# PWA 설치 지원

> **소급 재구성 노트**: 2026-08-25에 세션 기록과 git 이력으로부터 재구성한 `draft`.
> 이 기능은 별도 설계 문서 없이 세션 안에서 합의·구현되었다.

## 배경과 목적

웹페이지를 iOS·Android·데스크톱에서 앱처럼 설치해 쓰고 싶다는 요구에 대해, Electron/Tauri
(데스크톱 전용) 대신 모바일까지 커버하는 PWA를 채택했다. 덱 데이터가 이미 Zustand
persist(localStorage)라 오프라인 사용과 궁합이 좋다는 점이 근거였다.

## 기능 경계

포함:

- `vite-plugin-pwa` 기반 manifest(앱 이름 "holo덱빌더", 아이콘, theme color,
  `display: standalone`) + service worker 자동 생성, `registerType: autoUpdate`.
- 아이콘: `logo.png` 원본에서 PNG 3종+(pwa-192/512, apple-touch-icon) 생성.
- Workbox precache 용량 최적화: 카드 이미지 전체(334MB)를 precache에서 제외해 1.26MB로
  축소, 카드 이미지는 런타임 `CacheFirst`(최대 500개·30일), Supabase API는 `NetworkFirst`.

제외(Non-goals): 푸시 알림(iOS Safari 제한), 완전 오프라인 게시판(게시판은 온라인 전용).

## 요구사항 요약

- 설정 권위: [vite.config.ts](../../../../vite.config.ts) (manifest·Workbox 런타임 캐싱).
- 알려진 운영 제약: 설치된 standalone 모드에서 `window.open()` 스크립트 호출이 차단되므로
  외부 링크는 실제 `<a target="_blank">` 엘리먼트를 사용한다(2026-06-16 QnA 버튼 수정으로
  확립된 규칙, 현재 규칙의 권위는 [Architecture](../../../structure/architecture.md)).

## 수용 기준(당시 검증 근거)

- 프로덕션 빌드 성공, precache 용량 334MB → 1.26MB 확인(세션 기록).

## Relationships

- 관련 Log: [2026-05-08 PWA 설치 지원](../../../logs/2026-05-08-pwa-install.md)
- 현재 형상: [Architecture](../../../structure/architecture.md)
