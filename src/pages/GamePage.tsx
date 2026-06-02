import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import GameBoard from '../components/GameBoard';
import HandArea from '../components/game/HandArea';
import SetupOverlay from '../components/game/SetupOverlay';
import CardDetailPanel, { type SelectedCard } from '../components/CardDetailPanel';
import { useGameStore } from '../store/gameStore';
import { useDeckStore } from '../store/deckStore';
import { canConfirmReady } from '../game/setup';
import type { CardInstance, PlayerId, Slot } from '../game/types';

export default function GamePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const decks = useDeckStore((s) => s.decks);
  const activeDeckId = useDeckStore((s) => s.activeDeckId);

  const g = useGameStore();
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null); // 배치용 단일 선택
  const [penaltyUids, setPenaltyUids] = useState<string[]>([]);

  // ---- 마운트 시 게임 init (mode별) ----
  useEffect(() => {
    const state = location.state as { p1DeckId?: string; p2DeckId?: string } | null;
    if (code === 'solo') {
      const p1 = decks.find((d) => d.id === state?.p1DeckId);
      const p2 = decks.find((d) => d.id === state?.p2DeckId);
      if (!p1 || !p2) {
        navigate('/lobby');
        return;
      }
      useGameStore.getState().initGame(p1, p2, { mode: 'solo', p1Name: 'P1', p2Name: 'P2' });
    } else {
      // dev/online(임시): 활성 덱을 양쪽에 사용
      const d = decks.find((x) => x.id === activeDeckId) ?? decks[0];
      if (!d) return;
      useGameStore.getState().initGame(d, d, { mode: code ? 'online' : 'dev' });
    }
    return () => useGameStore.getState().reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // phase 바뀌면 선택 상태 초기화
  useEffect(() => {
    setSelectedUid(null);
    setPenaltyUids([]);
  }, [g.phase, g.activeActor]);

  if (g.phase === 'idle') {
    return (
      <div className="force-landscape flex items-center justify-center text-gray-400" style={{ background: '#0f0f1a' }}>
        덱을 불러오는 중...
      </div>
    );
  }

  const actor = g.activeActor;
  const actorState = g.players[actor];

  // 데뷔 배치 가능 슬롯 (배치 단계에서 데뷔 선택했을 때만 강조)
  const highlightSlots: Slot[] =
    g.phase === 'placeDebut' && selectedUid
      ? [{ zone: 'center' }, { zone: 'back', index: 0 }, { zone: 'back', index: 1 }, { zone: 'back', index: 2 }, { zone: 'back', index: 3 }, { zone: 'back', index: 4 }]
      : [];

  // 패 카드 클릭
  function onHandCardClick(ci: CardInstance) {
    setSelectedCard({ card: ci.card, imageUrl: ci.imageUrl });
    if (g.phase === 'penalty') {
      setPenaltyUids((prev) =>
        prev.includes(ci.uid)
          ? prev.filter((u) => u !== ci.uid)
          : prev.length < actorState.forcedMulligans
            ? [...prev, ci.uid]
            : prev,
      );
    } else if (g.phase === 'placeDebut') {
      setSelectedUid((prev) => (prev === ci.uid ? null : ci.uid));
    }
  }

  // 슬롯 클릭 (배치/해제)
  function onSlotClick(slot: Slot) {
    if (g.phase !== 'placeDebut') return;
    const occupied = slot.zone === 'center' ? actorState.center : actorState.back[slot.index];
    if (selectedUid) {
      g.placeDebut(selectedUid, slot);
      setSelectedUid(null);
    } else if (occupied) {
      g.unplaceDebut(slot);
    }
  }

  const penaltyRemaining = g.phase === 'penalty' ? actorState.forcedMulligans - penaltyUids.length : 0;
  const selectedUidsForHand = g.phase === 'penalty' ? penaltyUids : selectedUid ? [selectedUid] : [];

  // P1 하단 / P2 상단(mirrored). activeActor 보드 강조.
  const renderBoard = (pid: PlayerId, mirrored: boolean) => (
    <div className={`w-full rounded-lg ${pid === actor ? 'ring-1 ring-amber-300/40' : ''}`}>
      <GameBoard
        player={g.players[pid]}
        mirrored={mirrored}
        highlightSlots={pid === actor ? highlightSlots : []}
        onSlotClick={pid === actor ? onSlotClick : undefined}
      />
    </div>
  );

  return (
    <div className="force-landscape flex flex-col overflow-hidden" style={{ background: '#0f0f1a' }}>
      {/* 상단 바 */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-gray-800">
        <button onClick={() => navigate('/lobby')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          나가기
        </button>
        <span className="text-xs text-gray-500 truncate">{code === 'solo' ? '혼자 연습 대전' : code ? `방코드 ${code}` : '게임판 (개발용)'}</span>
        <span className="w-12" />
      </div>

      {/* phase 안내 + 행동 */}
      <SetupOverlay
        phase={g.phase}
        activeActor={actor}
        actorState={actorState}
        randomlyPicked={g.randomlyPicked}
        penaltyRemaining={penaltyRemaining}
        canPlaceConfirm={canConfirmReady(actorState)}
        onDecideFirst={g.decideFirstPlayer}
        onMulligan={g.mulligan}
        onForcedMulligan={g.forcedMulligan}
        onApplyPenalty={() => g.applyPenalty(penaltyUids)}
        onConfirmReady={g.confirmReady}
      />

      {/* 본문 2분할: 좌(카드 상세) / 중앙(상대판·내판·패) */}
      <div className="flex-1 min-h-0 flex">
        <aside className="w-[clamp(116px,20%,260px)] shrink-0 border-r border-gray-800 bg-gray-950/40">
          <CardDetailPanel selected={selectedCard} />
        </aside>

        <div className="flex-1 min-w-0 [container-type:size]">
          <div className="w-full h-full flex flex-col gap-1 p-2 overflow-hidden">
            {/* 상단: P2 보드 */}
            <div className="flex-1 min-h-0 [container-type:size] flex flex-col items-center justify-center">
              {renderBoard('p2', true)}
            </div>

            <div className="w-[min(100%,1100px)] h-px shrink-0 bg-gradient-to-r from-transparent via-gray-700 to-transparent self-center" />

            {/* 하단: P1 보드 */}
            <div className="flex-1 min-h-0 [container-type:size] flex flex-col items-center justify-center">
              {renderBoard('p1', false)}
            </div>

            {/* 패: activeActor의 패 (클릭) */}
            <div className="shrink-0 flex flex-col gap-0.5">
              <HandArea
                hand={actorState.hand}
                selectedUids={selectedUidsForHand}
                onCardClick={onHandCardClick}
                debutOnly={g.phase === 'placeDebut'}
                emptyText="패가 비어 있습니다."
              />
              <span className="ml-1 text-[10px] font-medium text-indigo-400/70">
                {actor === 'p1' ? 'P1' : 'P2'} 패 <span className="text-gray-600">{actorState.hand.length}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
