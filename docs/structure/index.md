# Structure — 현재 프로덕션 형상

현재 시스템에서 참인 것을 담는 living 영역의 진입점.

- [architecture.md](architecture.md) — 시스템 전체 아키텍처(프론트엔드, Supabase 백엔드,
  데이터 모델, 이미지 처리, 빌드·배포)의 단일 진입점.

## 실행 계약(네이티브 권위) 링크

아래 파일들은 Structure 문서가 아니라 실행 계약 원본이며, 해당 내용의 권위다.

- [../SUPABASE_SETUP.md](../SUPABASE_SETUP.md) — `deck_posts` 스키마, RLS 정책,
  `delete_deck_post` RPC, 입상덱 컬럼·bcrypt prefix 마이그레이션 SQL (legacy 위치 유지).
- [../../db_migration_image_overrides.sql](../../db_migration_image_overrides.sql) —
  2026-05-08 일러스트 변형 재설계 마이그레이션 SQL.
- [../../src/types/card.ts](../../src/types/card.ts), [../../src/types/deckPost.ts](../../src/types/deckPost.ts)
  — 클라이언트 타입 계약.
- [../../supabase/functions/decklog-publish/index.ts](../../supabase/functions/decklog-publish/index.ts)
  — Deck Log 발행 프록시 Edge Function 소스.
- [../../vite.config.ts](../../vite.config.ts) — PWA manifest·Workbox 캐싱 설정.
