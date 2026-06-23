// Deck Log JP publish 계약(contract).
//
// ⚠️ 아래 PUBLISH_URL / CONTENT_TYPE / HEADERS / RESPONSE_CODE_FIELD 는
//    "가정값"이다. 실제 Deck Log JP에 덱을 한 번 발행하며 네트워크 요청을
//    캡처해 정확한 값으로 교체해야 한다(플랜 Task 1 스파이크).
//    그 전까지는 발행이 동작하지 않을 수 있다.

/** hololive OCG JP 게임 타이틀 ID. */
export const DECKLOG_GAME_TITLE_ID_JP = 9;

/** 발행된 덱 공유 링크 베이스 (JP). */
export const DECKLOG_VIEW_BASE_JP = 'https://decklog.bushiroad.com/view/';

/** 실제 발행 엔드포인트 — 스파이크에서 캡처값으로 교체. */
export const DECKLOG_PUBLISH_URL =
  'https://decklog.bushiroad.com/system/app/api/publish/9';

/** 업스트림이 기대하는 바디 인코딩 — 캡처한 Content-Type에 맞춤. */
export const DECKLOG_PUBLISH_CONTENT_TYPE: 'json' | 'form' = 'json';

/** 업스트림 요청에 부착할 헤더 — 캡처값으로 교체. */
export const DECKLOG_PUBLISH_HEADERS: Record<string, string> = {
  Referer: 'https://decklog.bushiroad.com/',
  Origin: 'https://decklog.bushiroad.com',
  'X-Requested-With': 'XMLHttpRequest',
};

/** 발행 응답에서 새 덱 코드를 담는 필드명 — 캡처값으로 교체. */
export const DECKLOG_RESPONSE_CODE_FIELD = 'deck_id';
