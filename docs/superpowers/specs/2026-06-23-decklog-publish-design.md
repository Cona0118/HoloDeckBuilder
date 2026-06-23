# 사이트 덱 → Deck Log 업로드(publish) — 설계 문서

- 작성일: 2026-06-23
- 상태: 설계 검토 대기 (사용자 검토용)
- 범위: 앱에서 만든 덱을 Bushiroad **JP** Deck Log(`decklog.bushiroad.com`)에 발행하고 공유 링크를 받는다.

## 1. 목표 / 비목표

### 목표
- 사용자가 앱의 현재 덱을 "Deck Log에 업로드" 하면, Deck Log에 새 덱이 생성되고 `https://decklog.bushiroad.com/view/{code}` 링크를 돌려받는다.
- 받은 링크를 화면에 표시하고 복사할 수 있다.

### 비목표 (이번 범위 제외)
- EN Deck Log(`decklog-en.bushiroad.com`) — 추후.
- Deck Log → 앱 가져오기(view/import) — 이번 작업 아님.
- 일러스트(아트 변형) 보존 — 업로드 시 각 카드의 **기본 인쇄(base print)** manage_id를 사용한다(아래 5번).

## 2. 핵심 제약과 결정

- 앱은 백엔드 없는 정적 클라이언트 앱이며, Bushiroad Deck Log API는 브라우저 CORS를 허용하지 않는다.
- publish는 Bushiroad 서버에 덱을 **생성하는 POST**이며, 공개 CORS 프록시는 POST 바디 미전달 또는 `Referer`/`Origin` 검증 실패로 거부될 수 있다.
- **결정: Supabase Edge Function을 서버측 프록시로 사용**해 적절한 `Referer`/`Origin` 헤더로 Deck Log에 POST한다. (사용자 선택)
- **결정: JP만 지원** (`game_title_id: 9`). (사용자 선택)
- 인증/쿠키/CSRF는 불필요한 것으로 보인다(hocg-deck-convert의 비인증 publish 흐름 근거). 스파이크에서 최종 확인.

## 3. 미확정 항목 (구현 1단계 스파이크에서 확정)

> 정확한 Deck Log publish 엔드포인트·헤더·바디 인코딩은 공개 문서가 없고 hocg-deck-convert의 백엔드도 비공개다. **Task 1(스파이크)에서 실제 Deck Log JP에 덱을 한 번 발행하며 네트워크 요청을 캡처해 다음을 확정한다.**

확정 대상 = "Deck Log publish 계약(contract)":
- 실제 엔드포인트 경로 (가정: `POST https://decklog.bushiroad.com/system/app/api/...`)
- Content-Type 및 바디 인코딩 (JSON vs form-urlencoded)
- 응답에서 새 덱 코드를 담는 필드명 (가정: `deck_id` 또는 유사)
- 필요한 헤더 (가정: `Referer`/`Origin: https://decklog.bushiroad.com`, `X-Requested-With: XMLHttpRequest`)

이 계약이 확정되기 전까지는 아래의 **가정된 계약**을 기준으로 작성하며, 스파이크 결과로 상수만 교체한다.

## 4. 전체 아키텍처

```
[앱 클라이언트]
  현재 덱 + getDeckErrors() 통과 확인
  → hocg_cards.json 받아 card_number → manage_id(jp) 맵 구성
  → Deck Log 페이로드(JSON) 빌드 (오시/메인/옐 + manage_id)
  → POST  (Supabase Edge Function URL)
            │
            ▼
[Supabase Edge Function: decklog-publish]
  Referer/Origin 등 헤더 부착
  → POST  실제 Deck Log publish 엔드포인트
  ← { deck_id }  그대로 클라이언트로 반환 (+CORS 헤더)
            │
            ▼
[앱 클라이언트]
  https://decklog.bushiroad.com/view/{deck_id} 링크 표시 + 복사
```

**역할 분담**: manage_id 매핑과 페이로드 빌드는 **클라이언트(TS, 테스트 용이)** 가 담당하고, Edge Function은 **헤더만 붙여 그대로 전달하는 얇은 프록시**다. (함수 로직 최소화)

## 5. manage_id 매핑

- 소스: `https://qrimpuff.github.io/hocg-fan-sim-assets/hocg_cards.json` (GitHub Pages, CORS 허용).
- 구조: 카드별 `illustrations[].manage_id.jp: number[]`.
- 규칙: 각 `card_number`에 대해 **첫 일러스트의 첫 JP manage_id** (`illustrations[0].manage_id.jp[0]`)를 사용 = 기본 인쇄. hocg-deck-convert의 `first_manage_id`와 동일 개념.
- 결과적으로 앱에서 고른 아트 변형은 업로드에 반영되지 않고 기본 인쇄로 발행된다(수용된 한계, UI에서 1줄 안내).
- 맵은 1회 fetch 후 메모리 캐시.

### 옐(cheer) 매핑
앱은 옐을 색상별 매수(`Partial<Record<CardColor, number>>`)로만 저장한다. publish에는 실제 옐 카드 `card_number` + `manage_id`가 필요하다.
- 각 색상 → 대표 옐 카드 1종을 hocg_cards.json에서 선택: `card_number`가 `hY0N`(N=1..6) 접두사이고 JP manage_id가 있는 것 중 기본(가장 낮은 번호)을 채택.
- 색상↔접두사: `hY01=백, hY02=녹, hY03=적, hY04=청, hY05=자, hY06=황` (cheerImages.ts 기준).
- `sub_list`에 `{ card_number, num=색상매수, manage_id }`로 채운다.

## 6. Deck Log 페이로드 (가정된 계약)

```jsonc
{
  "game_title_id": 9,
  "deck_id": "",                 // 신규 발행은 빈 문자열
  "title": "덱이름(최대 25자 절단)",
  "p_list":  [ { "game_title_id": 9, "card_number": "...", "num": 1, "manage_id": "199" } ],
  "list":    [ { "game_title_id": 9, "card_number": "...", "num": 4, "manage_id": "..." }, ... ],
  "sub_list":[ { "game_title_id": 9, "card_number": "hY01-001", "num": 10, "manage_id": "..." }, ... ]
}
```
- `manage_id`는 문자열로 직렬화(원본 변환기와 동일). 빌더는 number→string 변환.

## 7. 클라이언트 모듈/함수 (신규 `src/utils/decklogPublish.ts`)

- `loadManageIdMap(): Promise<ManageIdIndex>` — hocg_cards.json fetch + 캐시. `card_number → manage_id`(string) 및 색상별 대표 옐 카드 구성.
- `buildDeckLogPayload(deck: Deck, index: ManageIdIndex): { payload, unpublishable: string[] }`
  - 오시/메인은 `card_number`로 manage_id 조회. 옐은 색상별 대표 카드 사용.
  - manage_id를 못 찾은 카드 `card_number`를 `unpublishable`에 모은다.
- `publishToDeckLog(deck: Deck): Promise<{ url: string }>`
  - 맵 로드 → 페이로드 빌드 → `unpublishable`이 있으면 에러(throw, 목록 포함) → Edge Function POST → `{ deck_id }` → URL 조립.

## 8. Supabase Edge Function: `decklog-publish`

- 위치: `supabase/functions/decklog-publish/index.ts`
- 입력: 클라이언트가 만든 Deck Log 페이로드(JSON).
- 동작: 실제 Deck Log publish 엔드포인트로 `Referer`/`Origin` 등 헤더를 붙여 POST → 응답 본문을 그대로 반환.
- CORS: 앱 오리진 허용(OPTIONS preflight 처리, `Access-Control-Allow-Origin`).
- 비밀: Deck Log는 비인증이라 별도 시크릿 불필요. (스파이크에서 재확인)

## 9. UI

- 위치: `DeckPanel.tsx`의 `ExportPanel`(또는 그 근처). "덱 공유하기" 옆/아래에 **"Deck Log에 업로드"** 추가.
- 게이트: `getDeckErrors()`가 비어 있을 때만 활성(기존 "덱 공유하기"와 동일한 검증 재사용).
- 동작: 클릭 → 업로드 중 표시 → 성공 시 결과 모달/영역에 Deck Log 링크 표시 + "링크 복사" + "열기".
- 아트 변형 미반영 안내 1줄.

## 10. 에러 처리

| 상황 | 처리 |
|---|---|
| 덱 검증 오류(오시 없음/50장 미만 등) | 버튼 비활성(기존 공유 게이트와 동일) |
| 일부 카드 manage_id 없음 | 업로드 중단 + "다음 카드는 Deck Log에 발행할 수 없습니다: …" 목록 안내 |
| 카드 DB(hocg_cards.json) fetch 실패 | "카드 정보를 불러오지 못했습니다. 잠시 후 다시 시도" |
| Edge Function/Deck Log 오류 | "Deck Log 업로드에 실패했습니다." (가능하면 상태코드 노출) |
| 성공 | 링크 표시 + 복사 |

## 11. 수용된 리스크
1. 비공식 API — Bushiroad가 엔드포인트/스키마 변경 시 깨질 수 있음. → 계약을 한 곳(상수)에 모아 교체 쉽게.
2. manage_id 최신성 — hocg_cards.json이 신규 카드를 아직 반영 못 했으면 해당 카드는 발행 불가(명확히 안내).
3. 익명 발행 가능 여부 — 스파이크에서 실제 확인(만약 세션/토큰 필요하면 Edge Function에서 처리하도록 설계 확장).

## 12. 검증 방법
- 스파이크: 실제 Deck Log JP에 수동 발행 → 캡처한 요청으로 Edge Function 재현 → 동일 응답(코드) 수신.
- 유효한 50장 덱 업로드 → 받은 링크를 열어 오시/메인/옐 색상 분포가 원본과 일치하는지 확인.
- manage_id 누락 카드를 포함한 덱 → 업로드 중단 + 정확한 목록 안내 확인.
- 기존 "덱 공유하기/텍스트 복사/이미지" 기능 회귀 없음 확인.

## 13. 변경/신규 파일 요약
- 신규: `src/utils/decklogPublish.ts` (맵 로드 + 페이로드 빌드 + 발행)
- 신규: `supabase/functions/decklog-publish/index.ts` (얇은 프록시)
- 수정: `src/components/DeckPanel.tsx` (`ExportPanel`에 업로드 버튼/결과 UI)
- (선택) `src/types/`에 Deck Log 페이로드 타입 추가
