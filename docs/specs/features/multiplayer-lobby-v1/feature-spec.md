---
type: Feature Spec
title: 멀티플레이어 대기실
description: Supabase Realtime 기반 2인 대기실(방 생성·입장·준비/시작)의 합의 범위.
status: draft
tags: [multiplayer, realtime]
generated: { by: "agent:claude-code", at: 2026-08-24T18:00:00Z }
---

# 멀티플레이어 대기실

> **소급 재구성 노트**: 2026-08-25에 세션 기록과 git 이력으로부터 재구성한 `draft`.
> 별도 설계 문서 없이 세션 안에서 설계·구현되었다.

## 배경과 목적

2인 대전 기능의 진입 계층으로, DB 저장 없는 임시(ephemeral) 방을 Supabase Realtime으로
운영하는 대기실을 만든다. 정식 공개 전 기능이므로 진입점은 로고 5회 클릭 이스터에그로
숨긴다.

## 기능 경계

포함:

- `/lobby`: 플레이어 이름 입력(persist, 기본 "player"), 방 만들기, 방코드 입장.
- 방코드: 6자리 랜덤(혼동 문자 0/O/I/1 제외), 정원 2명(호스트+게스트), 초과 입장 차단.
- `/room/:code`: 플레이어 슬롯, 내 덱 선택 드롭다운(deckStore 재사용), 게스트 준비 →
  호스트 시작 버튼 활성화, `game_start` broadcast로 양쪽 `/game/:code` 이동.
- 덱 이름 상대방 비공개: Presence 전송 시 `deckName: null` 마스킹(네트워크)과 `isMe` 분기
  (UI) 이중 방어. 상대에게는 "덱 선택 완료/미선택"만 표시.
- 모바일 가로모드 레이아웃(`mobile-landscape` Tailwind custom variant, max-height 600px).

제외(Non-goals): 방 목록/검색, 관전, 재접속 복구, 서버 저장 방 상태, 3인 이상.

## 요구사항 요약

- Presence로 플레이어 상태 동기화, Broadcast로 시작 신호 전달. DB 테이블 없음.
- 계약 권위: [src/hooks/useRoom.ts](../../../../src/hooks/useRoom.ts),
  [src/store/lobbyStore.ts](../../../../src/store/lobbyStore.ts),
  [src/pages/LobbyPage.tsx](../../../../src/pages/LobbyPage.tsx),
  [src/pages/RoomPage.tsx](../../../../src/pages/RoomPage.tsx).
- React StrictMode 중복 presence 엔트리 문제를 해결한 상태를 전제로 한다.

## 수용 기준(당시 검증 근거)

- ESLint 무오류·프로덕션 빌드 성공, 760×360(가로)·400×820(세로) 스크린샷 시각 검증.

## Relationships

- 소비 기능: [game-setup-phase-v1](../game-setup-phase-v1/feature-spec.md) (시작 후 대전 셋업)
- 관련 Log: [2026-06-03 게임 셋업·로비 반영](../../../logs/2026-06-03-game-setup-and-lobby-merge.md)
- 현재 형상: [Architecture](../../../structure/architecture.md)
