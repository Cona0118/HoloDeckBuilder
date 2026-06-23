import { describe, it, expect } from 'vitest';
import { buildManageIdIndex } from './decklogPublish';

const RAW = [
  { card_number: 'hBD24-001', illustrations: [{ card_number: 'hBD24-001', manage_id: { jp: [199] } }] },
  { card_number: 'hBP08-001', illustrations: [
      { card_number: 'hBP08-001', manage_id: { jp: [501] } },
      { card_number: 'hBP08-001', manage_id: { jp: [502] } },
  ] },
  { card_number: 'hY01-001', illustrations: [{ card_number: 'hY01-001', manage_id: { jp: [10] } }] },
  { card_number: 'hY01-002', illustrations: [{ card_number: 'hY01-002', manage_id: { jp: [11] } }] },
  { card_number: 'hY03-001', illustrations: [{ card_number: 'hY03-001', manage_id: { jp: [30] } }] },
  { card_number: 'hBP99-XXX', illustrations: [{ card_number: 'hBP99-XXX', manage_id: {} }] }, // jp 없음
];

describe('buildManageIdIndex', () => {
  it('카드번호→첫 JP manage_id(문자열) 매핑', () => {
    const idx = buildManageIdIndex(RAW);
    expect(idx.byCardNumber.get('hBD24-001')).toBe('199');
    expect(idx.byCardNumber.get('hBP08-001')).toBe('501'); // 첫 일러스트 첫 id
  });

  it('JP manage_id 없는 카드는 인덱스에 없음', () => {
    const idx = buildManageIdIndex(RAW);
    expect(idx.byCardNumber.has('hBP99-XXX')).toBe(false);
  });

  it('색상별 대표 옐카드는 가장 낮은 번호', () => {
    const idx = buildManageIdIndex(RAW);
    expect(idx.yellByColor.white).toEqual({ cardNumber: 'hY01-001', manageId: '10' });
    expect(idx.yellByColor.red).toEqual({ cardNumber: 'hY03-001', manageId: '30' });
    expect(idx.yellByColor.green).toBeUndefined(); // hY02 없음
  });
});
