// Deck Log JP publish 계약. 실제 발행 요청 캡처로 확정(2026-06-24).
// 발행 엔드포인트/토큰 흐름은 Edge Function(supabase/functions/decklog-publish)이 소유한다.

/** hololive OCG JP 게임 타이틀 ID (발행 경로 .../publish/9). */
export const DECKLOG_GAME_TITLE_ID_JP = 9;

/** 발행된 덱 공유 링크 베이스 (JP). */
export const DECKLOG_VIEW_BASE_JP = 'https://decklog.bushiroad.com/view/';

/** 발행 응답에서 새 덱 코드를 담는 필드명.
 *  예: {"status":"OK","id":4584061,"deck_id":"3WATZ"} */
export const DECKLOG_RESPONSE_CODE_FIELD = 'deck_id';
