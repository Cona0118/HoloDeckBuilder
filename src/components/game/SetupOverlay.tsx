import type { PlayerId, PlayerState, Phase } from '../../game/types';

interface SetupOverlayProps {
  phase: Phase;
  activeActor: PlayerId;
  actorState: PlayerState;
  randomlyPicked: PlayerId | null;
  penaltyRemaining: number; // 페널티에서 더 골라야 하는 수
  canPlaceConfirm: boolean; // 센터에 데뷔 배치됨
  onDecideFirst: (first: PlayerId) => void;
  onMulligan: (redraw: boolean) => void;
  onForcedMulligan: () => void;
  onApplyPenalty: () => void;
  onConfirmReady: () => void;
}

function actorLabel(pid: PlayerId): string {
  return pid === 'p1' ? 'P1' : 'P2';
}

const btn =
  'px-3 py-1.5 rounded-md text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

export default function SetupOverlay(props: SetupOverlayProps) {
  const { phase, activeActor, actorState, randomlyPicked, penaltyRemaining, canPlaceConfirm } = props;
  const who = actorLabel(activeActor);

  return (
    <div className="shrink-0 flex items-center justify-center gap-3 px-3 py-2 bg-gray-900/80 border-b border-gray-800 min-h-[44px] flex-wrap">
      {phase === 'firstPlayer' && (
        <>
          <span className="text-xs text-gray-300">
            시스템이 <b className="text-amber-300">{actorLabel(randomlyPicked ?? activeActor)}</b>를 뽑았습니다. 선/후공을 결정하세요.
          </span>
          <button className={`${btn} bg-indigo-600 hover:bg-indigo-500 text-white`} onClick={() => props.onDecideFirst(activeActor)}>
            선공
          </button>
          <button className={`${btn} bg-gray-700 hover:bg-gray-600 text-white`} onClick={() => props.onDecideFirst(activeActor === 'p1' ? 'p2' : 'p1')}>
            후공
          </button>
        </>
      )}

      {phase === 'mulligan' && (
        <>
          <span className="text-xs text-gray-300"><b className="text-amber-300">{who}</b>: 멀리건 (7장 다시 뽑기)?</span>
          <button className={`${btn} bg-gray-700 hover:bg-gray-600 text-white`} onClick={() => props.onMulligan(false)}>그대로</button>
          <button className={`${btn} bg-indigo-600 hover:bg-indigo-500 text-white`} onClick={() => props.onMulligan(true)} disabled={actorState.mulliganUsed}>다시 뽑기</button>
        </>
      )}

      {phase === 'debutCheck' && (
        <>
          <span className="text-xs text-rose-300"><b>{who}</b>: 패에 데뷔가 없습니다. 패를 공개하고 다시 뽑습니다. (강제 {actorState.forcedMulligans}회)</span>
          <button className={`${btn} bg-rose-600 hover:bg-rose-500 text-white`} onClick={props.onForcedMulligan}>패 공개 후 다시 뽑기</button>
        </>
      )}

      {phase === 'penalty' && (
        <>
          <span className="text-xs text-gray-300"><b className="text-amber-300">{who}</b>: 강제 멀리건 {actorState.forcedMulligans}회 → 패에서 {actorState.forcedMulligans}장을 골라 덱 아래로. (남은 선택 {penaltyRemaining})</span>
          <button className={`${btn} bg-indigo-600 hover:bg-indigo-500 text-white`} onClick={props.onApplyPenalty} disabled={penaltyRemaining !== 0}>확정</button>
        </>
      )}

      {phase === 'placeDebut' && (
        <>
          <span className="text-xs text-gray-300"><b className="text-amber-300">{who}</b>: 패의 데뷔 카드를 센터(필수)·백(선택)에 배치하세요.</span>
          <button className={`${btn} bg-emerald-600 hover:bg-emerald-500 text-white`} onClick={props.onConfirmReady} disabled={!canPlaceConfirm}>시작</button>
        </>
      )}

      {phase === 'ready' && <span className="text-sm text-emerald-300 font-bold">셋업 완료! (턴 진행은 다음 단계)</span>}
    </div>
  );
}
