import { beforeEach, describe, it, expect } from 'vitest';
import { useDeckStore } from './deckStore';
import { CARDS } from '../data/cards';

const holomem = CARDS.find((c) => c.type === 'holomem')!;
const [oshiA, oshiB] = CARDS.filter((c) => c.type === 'oshi');

const store = () => useDeckStore.getState();
const active = () => store().getActiveDeck()!;

beforeEach(() => {
  useDeckStore.setState({ decks: [], activeDeckId: null });
  store().createDeck('테스트덱');
});

describe('덱리 잠금', () => {
  it('잠금 중엔 오시·메인덱·엘 매수를 바꾸는 액션이 모두 무시된다', () => {
    store().setOshi(oshiA);
    store().addCard(holomem);
    store().addCheer('white');
    store().toggleDeckLock();
    const locked = active();

    store().setOshi(oshiB);
    store().addCard(holomem);
    store().removeCard(holomem);
    store().addCheer('white');
    store().removeCheer('white');
    store().fillCheers();
    store().clearCheers();
    store().clearDeck();

    expect(active()).toBe(locked);
  });

  it('해제하면 다시 매수를 바꿀 수 있다', () => {
    store().toggleDeckLock();
    store().toggleDeckLock();
    store().addCard(holomem);
    expect(active().locked).toBe(false);
    expect(active().mainDeck[0]?.count).toBe(1);
  });

  it('잠금은 덱별이라 다른 덱은 편집된다', () => {
    store().toggleDeckLock();
    store().createDeck('새 덱');
    store().addCard(holomem);
    expect(active().locked).toBeFalsy();
    expect(active().mainDeck[0]?.count).toBe(1);
    expect(store().decks[0].locked).toBe(true);
  });
});
