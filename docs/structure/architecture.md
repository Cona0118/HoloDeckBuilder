---
type: Architecture
title: 시스템 아키텍처
description: holo덱빌더의 현재 시스템 구성 — SPA 프론트엔드, Supabase 백엔드, 카드 데이터 계층, 이미지 처리, 빌드·배포.
status: stable
generated: { by: "agent:claude-code", at: 2026-08-24T18:00:00Z }
---

# 시스템 아키텍처

> 이 문서는 2026-08-23에 실제 코드와 세션 기록을 바탕으로 재구성하고 2026-08-25에 코드와
> 대조 검증한 living 문서다. 프로덕션에 유효한 변경이 생길 때마다 갱신한다.

## 개요

holo덱빌더는 홀로라이브 OCG(hololive OFFICIAL CARD GAME) 덱을 만들고 공유하는 한국어 웹
앱이다. 클라이언트는 React SPA + PWA이고, 서버 상태(덱 게시판, 실시간 방, Deck Log 발행
프록시)는 Supabase가 담당한다. 별도 자체 서버는 없다.

- 저장소: `github.com/Cona0118/HoloDeckBuilder` (기본 브랜치 `master`)
- 스택: React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS v4 · Zustand 5 ·
  React Router 7 · @supabase/supabase-js 2 · vite-plugin-pwa · Vitest

## 프론트엔드 SPA

라우트 ([src/router.tsx](../../src/router.tsx)):

| 경로 | 페이지 | 역할 |
| --- | --- | --- |
| `/` | BuilderPage | 덱 빌더 본체 (카드 검색·필터, 덱 패널, 카드 상세) |
| `/board` | BoardPage | 덱 공유 게시판 (목록, 필터, 추천, 페이지네이션) |
| `/lobby` | LobbyPage | 멀티플레이어 대기실 + 혼자 연습 대전 진입점 |
| `/room/:code` | RoomPage | 방(호스트/게스트, 덱 선택, 준비/시작) |
| `/game/:code`, `/game` | GamePage | 대전 화면 (게임판 2개 + 패, 셋업 오버레이) |

상태 관리 (Zustand):

- [deckStore](../../src/store/deckStore.ts) — 덱 목록·활성 덱·필터. `persist`로
  localStorage `holo-deck-store`에 저장(`decks`, `activeDeckId`만 partialize). 덱 규칙 검증
  (`getDeckErrors`: 메인 50장 `MAIN_DECK_MAX`, 치어 20장 `CHEER_MAX`, 카드별 `limit` 기반
  금지/제한 합산 검증) 포함.
- [gameStore](../../src/store/gameStore.ts) — 대전 셋업 단계 상태(핫시트 phase 전환).
  순수 게임 로직은 [src/game/](../../src/game/) (`rng.ts`, `types.ts`, `setup.ts` —
  선후공·멀리건·데뷔 배치·`validateDeck`).
- [lobbyStore](../../src/store/lobbyStore.ts) — 플레이어 이름 persist.

Spec 없이 Structure가 요약하는 빌더 편의 기능(현재 유효): 검색 범위 드롭다운·효과 텍스트
검색·홀로멤 기프트/콜라보/블룸 서브필터, 클립보드 텍스트 덱 가져오기(`parseDeckText`)와
텍스트 내보내기, 드로우 시뮬레이션, 금지/제한(`limit`) 위반 카드 빨간 배지, 덱 순서편집
◀▶ 이동, 모바일 좌하단 FAB 덱 액션 메뉴, 덱리 잠금(오시 칸 자물쇠, 덱별 `Deck.locked` —
잠금 중엔 카드 목록 클릭·우클릭·오시 선택으로 덱이 바뀌지 않음, 덱 패널 내 편집은 허용).
(공식 QnA 검색 링크는 아래 외부 연동 참조.)

빌더 레이아웃: `min-width: 48rem`(Tailwind `md`와 동일) 미디어 쿼리로 데스크톱(카드 목록 + 우측
덱 패널)과 모바일(카드 목록 + 하단 덱 바·시트) 중 **하나만** 마운트한다. 카드 그리드 열 수는
뷰포트가 아니라 목록 폭 컨테이너 쿼리(`@container`, M 기준 4 → `@md` 5 → `@xl` 6열)로 정해져
Galaxy Fold 커버(280~344px)·펼침(882px)에서도 카드가 과도하게 작아지지 않는다.

## 카드 데이터 계층

- [src/data/cards.ts](../../src/data/cards.ts) — 전 카드 정적 배열 `CARDS`(약 3.1만 줄,
  hSD01~hSD19 스타터, hBP01~hBP09 부스터, hEB01 엑스트라, hBD24·hPR·hYS01 등). 카드
  데이터의 권위. 번들에 포함되어 JS 청크가 1.2MB를 넘는 알려진 제약이 있다.
- 이미지 변형 매니페스트 — `scripts/genCardImageVariants.mjs`·`genCheerImageVariants.mjs`가
  `public/images/` 실제 파일명을 스캔해 `src/data/*.generated.ts`를 생성한다. `npm run
  gen:variants`가 `predev`/`prebuild` 훅으로 자동 실행된다.
- [eventPools.ts](../../src/data/eventPools.ts) — 이벤트컵(대회)별 사용 가능 카드풀 정의.
  필터 UI는 `SHOW_EVENT_POOL_FILTER=true`로 표시 중이다. 현재 셀렉션 컵은 hBP08·hEB01·hBP09
  세트 전체와 재록 개별 카드로 구성되며, 공식 `cardsearch/?expansion=sele09` 목록을 기준으로 한다.

## 이미지 처리

- 원본: `public/images/<setId>/<cardNumber>_<rarity>.png` (예: `hBP08-001_OSR.png`).
  동일 카드번호의 복수 파일 = 일러스트 변형이며, 변형 정렬은 레어도 우선순위 기반.
- 덱 엔트리 단위 일러스트 선택: `DeckEntry.imageUrl`(비오시), `Deck.oshiImageUrl`(오시),
  치어 변형 선택 지원. 게시판 스냅샷에도 그대로 직렬화된다.
- 배포 서빙(CDN 모드): `VITE_IMAGE_BASE_URL`이 설정된 빌드는 [imageCdn.ts](../../src/utils/imageCdn.ts)의
  `toImageSrc`가 `/images/….png`를 `{BASE}/images/….webp`(Cloudflare R2 `holo-cards`)로 바꾸고
  빌드 산출물에서 `dist/images`를 제거한다. BASE 값은 [imageBase.ts](../../src/utils/imageBase.ts)로
  BOM·제로폭 문자·공백·끝 슬래시를 제거하며, http(s) 절대 URL이 아니면 빌드가 실패한다.
  PNG 원본은 `gen:variants` 스캔용으로 계속 git에 둔다(새 이미지는 `npm run img:cdn`으로 업로드).
- PWA 캐싱: precache에서 `images/**` 제외, 런타임 `CacheFirst`(`card-images-v2`, **same-origin
  200 응답만**, 최대 500개 30일)·Supabase API는 `NetworkFirst`. CDN(크로스 오리진) 이미지는 SW가
  캐시하지 않고 R2의 `Cache-Control: max-age=31536000, immutable` HTTP 캐시에 맡긴다(opaque
  응답은 status를 알 수 없어 429·5xx까지 캐시되므로). 설정 권위는 [vite.config.ts](../../vite.config.ts).
- 덱 이미지 내보내기(canvas): 크로스 오리진 이미지는 `crossOrigin="anonymous"` + `?cors` 캐시 키로
  로드한다. R2 버킷 `holo-cards`에 CORS(`AllowedOrigins: *`, GET/HEAD, MaxAge 86400)가 설정돼 있어
  카드 그림이 그대로 그려진다(CORS가 빠지면 해당 카드만 빈 슬롯). CORS는 Cloudflare 대시보드에서
  관리한다(`.env.r2` 토큰은 객체 권한만 있어 버킷 설정 변경 불가).
- 카드 상세 모달은 실물 비율 63:88 고정 렌더링(파일 해상도 무관).

## Supabase 백엔드

클라이언트는 [src/lib/supabase.ts](../../src/lib/supabase.ts)에서 `VITE_SUPABASE_URL`/
`VITE_SUPABASE_ANON_KEY`(.env.local)로 초기화한다(`persistSession: false`).

- **Postgres `deck_posts`** — 덱 게시판 저장소. 컬럼·RLS(anon select/insert 허용,
  update/delete 차단)·`delete_deck_post(post_id, password)` RPC(pgcrypto bcrypt 검증,
  security definer)·입상덱 컬럼(`is_award`, `tournament_name`)·추천 컬럼(`recommend_count`)
  및 `increment/decrement_deck_post_recommends` RPC. SQL 권위: 기본 스키마·RLS·입상덱·bcrypt
  prefix 마이그레이션은 [../SUPABASE_SETUP.md](../SUPABASE_SETUP.md), 일러스트 변형 컬럼은
  [db_migration_image_overrides.sql](../../db_migration_image_overrides.sql), 추천 컬럼·RPC는
  [추천 기능 설계 문서](../superpowers/specs/2026-05-26-deck-board-recommend-design.md)의
  SQL 블록이 각각 원본이다. 비밀번호는 클라이언트 bcryptjs 해시(`$2a$` prefix로 정규화) 저장.
- **Realtime** — [useRoom](../../src/hooks/useRoom.ts)이 Presence(플레이어 상태)와
  Broadcast(`game_start`)로 임시 방을 운영한다. DB 저장 없음, 방코드 6자리, 정원 2명,
  상대에게 덱 이름 비공개(네트워크·UI 이중 마스킹).
- **Edge Function `decklog-publish`** — Bushiroad Deck Log EN(`decklog-en.bushiroad.com`)
  `/ja` 로케일(타이틀 108) 발행 프록시. `/create/`로 익명 CAKEPHP 세션·token을 받아
  `/publish/108`에 전달하는 2단계 익명 플로우(`has_session:false`, 로그인 불필요). 소스:
  [supabase/functions/decklog-publish/index.ts](../../supabase/functions/decklog-publish/index.ts).

## 데이터 모델 요약

- `Card`(oshi/holomem/support, `limit`, abilities timing `bloom|collab|gift`) —
  권위: [src/types/card.ts](../../src/types/card.ts).
- `Deck` → `DeckSnapshot`(cardId 기반 + entry별 `imageUrl` + `oshiImageUrl`) → `deck_posts`
  행. 복원은 `resolveSnapshot`이 `CARDS`와 매핑 —
  권위: [src/types/deckPost.ts](../../src/types/deckPost.ts),
  [src/utils/deckSnapshot.ts](../../src/utils/deckSnapshot.ts).
- Deck Log 발행 페이로드(평행 배열 `no/num/sub_no/...`, `manage_id.jp` 사용, 카드번호→
  manage_id 매핑은 외부 `hocg_cards.json`) —
  권위: [src/utils/decklogPublish.ts](../../src/utils/decklogPublish.ts),
  [src/utils/decklogApi.ts](../../src/utils/decklogApi.ts).

## 외부 연동

- Bushiroad Deck Log EN — 비공식 API(실측 역분석 기반). 엔드포인트·필드가 예고 없이 바뀔
  수 있는 장기 리스크.
- 공식 QnA 검색 — 카드 상세 모달에서 `cardNumber` 기반 외부 링크(`<a target="_blank">`,
  PWA 팝업 차단 회피를 위해 `window.open` 사용 금지).
- `hocg_cards.json`(Qrimpuff/hocg-fan-sim-assets) — 카드번호→Deck Log manage_id 매핑 소스.

## 빌드·테스트·배포

- `npm run dev`(변형 매니페스트 재생성 포함), `npm run build`(`tsc -b && vite build`),
  `npm run test`(Vitest — decklogPublish, eventPools 단위 테스트), `npm run lint`.
- CI 워크플로 없음. PWA는 `registerType: autoUpdate`.
- 배포: `master` 푸시 후 배포되는 것으로 세션 기록에 나타나지만, 저장소 안에 호스팅·배포
  설정 파일이 없어 **프로덕션 호스팅 방식은 미검증(unverified)** 상태다.

## 관계

- 기능별 합의: [../specs/index.md](../specs/index.md)
- 변경 연대기: [../logs/index.md](../logs/index.md)
