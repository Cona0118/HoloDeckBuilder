-- 2026-05-08: 카드 일러스트 선택 기능을 entry 단위로 재설계.
-- 이전 image_overrides JSONB 컬럼은 더 이상 사용하지 않으며, 다음으로 대체:
--   1) oshi_image_url TEXT             — 오시 카드의 선택 일러스트 URL
--   2) main_deck JSONB 배열의 각 entry — { cardId, count, imageUrl? }
--      (JSONB이라 schema 변경 없이 imageUrl 필드를 추가로 저장)
-- 같은 cardId여도 imageUrl이 다르면 main_deck에 별개 entry로 저장된다.

ALTER TABLE deck_posts DROP COLUMN IF EXISTS image_overrides;
ALTER TABLE deck_posts ADD COLUMN IF NOT EXISTS oshi_image_url TEXT;
