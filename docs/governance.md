---
type: Documentation Governance
title: 문서 거버넌스
description: Holo 덱빌더 문서 번들의 권위 모델, 라이프사이클, 변경 규칙을 정의한다.
status: stable
---

# 문서 거버넌스

## 3영역 권위 모델

- **Structure** (`structure/`) — 현재 프로덕션에서 참인 것. 변경이 실제로 유효해질 때 갱신하는
  living 문서. 상세 근거와 대안은 원 Spec에 남기고 링크한다.
- **Specs** (`specs/`) — 만들기로 합의한 것과 그 이유·방법. draft 동안 자유롭게 수정한다.
- **Log** (`logs/`) — 실제로 유효해진 이벤트의 연대기. 이벤트당 날짜별 파일 하나.

하나의 주장(claim)은 정확히 하나의 concept 또는 실행 계약이 권위를 가지며, 다른 곳에서는
요약하고 링크만 한다. SQL·타입·설정 등 실행 가능한 계약은 원본 파일이 권위다.

## Concept 타입

`Documentation Governance`, `Architecture`, `Database Schema`, `Domain Rule`,
`Domain Reference`, `Design System`, `PRD`, `Feature Spec`, `Product Spec`, `Tech Spec`,
`Change Log`.

## 라이프사이클

- 상태 값은 `draft` / `stable` / `deprecated`. 모든 Spec은 상태를 명시한다.
- Spec의 `stable`은 "승인되어 소비 가능하며 동결됨"을 뜻하며, 별도 승인 증거가 있을 때만
  부여한다. 구현·배포·프로덕션 반영을 뜻하지 않는다.
- stable Spec의 규범 본문은 불변이다. 오타·깨진 링크 수정과 라이프사이클 주석(후속 관계 추가,
  `deprecated` 전환)만 허용한다. 의미가 바뀌는 릴리스 후 변경은 새로운 spec-set 경로 아래
  후속 Spec으로 만들고 상호 링크한다.
- Structure의 `stable`은 "현재 사용 가능한 지식"을 뜻할 뿐이며 living으로 계속 갱신한다.

## Log 불변 규칙

- 유효 이벤트당 `logs/YYYY-MM-DD-<slug>.md` 파일 하나. `type: Change Log`, `status: stable`.
- 이전 이벤트 파일을 의미적으로 고쳐 쓰거나 이동·개명하지 않는다. 정정·롤백·폐기는 이전
  이벤트를 링크하는 새 날짜 파일로 기록한다. 오타·링크 수정만 직접 고친다.
- 머지된 커밋/PR은 증거이지만 그 자체로 프로덕션 유효성의 증명은 아니다.

## 충돌 처리

두 문서가 같은 주장에 대해 다르게 말하면, 권위 문서(위 표)를 따르고 나머지를 수정한다.
최신 문서라는 이유만으로 권위를 부여하지 않는다. 코드·DB와 문서가 충돌하면 실행 계약이
이기고, 문서를 갱신한다.

## 이관(migration) 승인 게이트

기존 문서의 이동·병합·대체·폐기는 매핑과 영향 범위를 먼저 제시하고 명시적 승인 후에만
실행한다. 삭제는 별도의 명시적 승인이 필요하다.

## ADR 문턱

의사결정 맥락은 기본적으로 해당 Spec 안에 기록한다. 여러 Spec에서 반복 참조되거나 독립
라이프사이클·감사 기록이 필요한 결정만 별도 ADR로 승격한다. (현재 ADR 없음.)
