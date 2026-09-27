---
type: Feature Spec
title: Deck Log 발행
description: 앱의 덱을 Bushiroad Deck Log에 발행해 공유 코드를 얻는 기능의 합의 범위.
status: draft
tags: [decklog, supabase, edge-function]
sources:
  - id: design-doc
    resource: docs/superpowers/specs/2026-06-23-decklog-publish-design.md
    title: 사이트 덱 → Deck Log 업로드(publish) — 설계 문서 (2026-06-23)
  - id: impl-plan
    resource: docs/superpowers/plans/2026-06-23-decklog-publish.md
    title: Deck Log 업로드(publish) Implementation Plan
generated: { by: "agent:claude-code", at: 2026-08-24T18:00:00Z }
---

# Deck Log 발행

> **소급 재구성 노트**: 2026-08-25에 세션 기록·git 이력·legacy 설계 문서로부터 재구성한
> `draft`. 규범 원문은 `sources`의 설계 문서이며, 발행 대상은 출시 후 JP → EN(/ja·타이틀
> 108)으로 변경되었다(아래 Relationships의 Log 참조).

## 배경과 목적

앱에서 만든 덱을 공식 생태계(Bushiroad Deck Log)에 발행해 `view/<코드>` 공유 링크를 얻을
수 있게 한다. Deck Log API는 비공식이므로 실측(브라우저 캡처) 기반으로 계약을 확정한다.

## 기능 경계

포함:

- 덱 패널 액션 바의 "덱로그 업로드" 버튼. `getDeckErrors()`가 비어 있을 때만 활성화
  (공유 버튼과 동일 게이트).
- 카드번호 → Deck Log `manage_id` 매핑: 외부 카드 DB `hocg_cards.json`
  (Qrimpuff/hocg-fan-sim-assets)에서 인덱스를 만들어 사용. 옐 덱은 색상별 대표 옐카드
  (최저 카드번호)의 manage_id로 발행.
- 발행 페이로드는 평행 배열(`no/num/sub_no/sub_num/p_no/p_num` 등) 구조로 변환.
- CORS 우회 프록시: Supabase Edge Function `decklog-publish`가 `/create/`(익명 CAKEPHP
  세션·token 발급) → `/publish/108` 2단계 익명 플로우를 수행(`has_session:false`,
  로그인 불필요, `post_deckrecipe:false` — 공개 목록 미등재·링크 공유 전용).
- 발행 성공 시 `/ja/view/<코드>` 링크 표시(이후 2026-06-30 개선으로 덱 코드 자동 클립보드
  복사 추가).

제외(Non-goals): Deck Log에서의 가져오기(import)는 기존 기능, 계정 로그인 발행, 발행 덱
수정·삭제.

## 요구사항 요약

- 계약 권위: [src/utils/decklogApi.ts](../../../../src/utils/decklogApi.ts)(엔드포인트·
  타이틀 ID 상수), [src/utils/decklogPublish.ts](../../../../src/utils/decklogPublish.ts)
  (페이로드 변환·오케스트레이션),
  [supabase/functions/decklog-publish/index.ts](../../../../supabase/functions/decklog-publish/index.ts)
  (프록시).
- EN manage_id 미보유 카드가 덱에 포함되면 발행 불가 안내를 표시한다.
- 비공식 API이므로 엔드포인트·필드 변경 리스크를 상시 전제한다.

## 수용 기준(당시 검증 근거)

- Vitest 단위 테스트(12/12), tsc·ESLint·빌드 통과, 실기기 발행 테스트로 덱 코드 수신 확인.

## Relationships

- 관련 Log: [2026-06-24 JP 발행 출시](../../../logs/2026-06-24-decklog-publish-jp.md),
  [2026-06-26 EN(/ja·108) 전환](../../../logs/2026-06-26-decklog-en-switch.md)
- 현재 형상: [Architecture](../../../structure/architecture.md)
