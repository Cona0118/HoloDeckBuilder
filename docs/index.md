---
okf_version: "0.2"
---

# Holo 덱빌더 문서 인덱스

홀로라이브 TCG 덱 빌더(holo덱빌더, `github.com/Cona0118/HoloDeckBuilder`)의 저장소 SSOT
(single source of truth) 번들 루트. 세 가지 질문을 서로 다른 영역이 담당한다.

| 영역 | 질문 | 진입점 |
| --- | --- | --- |
| Structure | 지금 프로덕션에서 무엇이 참인가? | [structure/index.md](structure/index.md) |
| Specs | 무엇을 왜, 어떻게 만들기로 했는가? | [specs/index.md](specs/index.md) |
| Log | 무엇이 언제 실제로 바뀌었고 증거는 어디 있는가? | [logs/index.md](logs/index.md) |

운영 규칙은 [governance.md](governance.md)에 있다.

## 권위(authority) 빠른 규칙

- 현재 시스템 형상과 기능 횡단 규칙 → Structure가 권위.
- 합의된 기능 범위·요구사항 → 해당 Feature Spec이 권위.
- 실제 발생한 변경의 시점·범위·증거 → 날짜별 Log 파일이 권위.
- 실행 가능한 계약(SQL, 타입, 설정 파일)은 원본 파일이 권위이며 문서는 링크만 한다.

## 기존(legacy) 문서와의 관계

아래 문서들은 이 OKF 번들 도입 이전부터 존재하며, 원래 위치에 그대로 유지된다.
OKF concept 규칙(frontmatter 등)은 적용되지 않은 legacy 문서다.

- [../README.md](../README.md) — Vite 템플릿 기본 README. 프로젝트 설명 권위 없음(템플릿 원문).
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) — **Supabase 스키마·RLS·RPC 셋업 SQL의 실행 계약 권위.**
  `deck_posts` 테이블 정의, RLS 정책, `delete_deck_post` RPC, 입상덱 컬럼·bcrypt prefix
  마이그레이션이 여기에 있다. Structure는 이 파일을 링크로 참조한다.
- [superpowers/specs/](superpowers/specs/), [superpowers/plans/](superpowers/plans/) — 개발 당시
  작성된 설계·구현 계획 문서(2026-05-03 덱 게시판, 2026-05-26 추천, 2026-06-02 게임 셋업,
  2026-06-23 Deck Log 발행). **작성 시점의 설계 의도에 대한 역사적 권위**이며, 현재 합의의
  요약은 [specs/](specs/index.md)의 Feature Spec이 담당한다. 두 문서가 충돌하면 최신 코드와
  Log 증거를 우선 확인한다.
- [../db_migration_image_overrides.sql](../db_migration_image_overrides.sql) — 2026-05-08 일러스트
  변형 재설계 DB 마이그레이션 SQL 원본(실행 계약 권위).

> 참고: `okf_version: "0.2"` 선언은 이 인덱스와 `governance.md`, `structure/`, `specs/`,
> `logs/` 아래의 신규 concept에 적용된다. 위 legacy 문서들은 점진적 마이그레이션 대상으로
> 남아 있으며 번들 전체의 OKF 적합성을 주장하지 않는다.
