// Deck Log 발행 계약. decklog-en 도메인의 일본어(/ja) 로케일로 발행한다(2026-06-26 확정).
// 출처: https://decklog-en.bushiroad.com/ja/conf/const.js (ja_game_title_ids.HOCG = 108, lang_path '/ja')
// 이 경로는 JP 카드 세트를 다루므로 카드 식별자는 manage_id.jp 를 그대로 쓴다.
// 발행 엔드포인트/토큰 흐름은 Edge Function(supabase/functions/decklog-publish)이 소유한다.

/** hololive OCG 게임 타이틀 ID (decklog-en /ja, 발행 경로 .../publish/108). */
export const DECKLOG_GAME_TITLE_ID = 108;

/** 발행된 덱 공유 링크 베이스 (decklog-en /ja 로케일). */
export const DECKLOG_VIEW_BASE = 'https://decklog-en.bushiroad.com/ja/view/';

/** 발행 응답에서 새 덱 코드를 담는 필드명.
 *  예: {"status":"OK","id":4584061,"deck_id":"3WATZ"} */
export const DECKLOG_RESPONSE_CODE_FIELD = 'deck_id';
