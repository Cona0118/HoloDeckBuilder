# 게임 셋업 단계 + 로비 솔로 대전 — 설계 문서

작성일: 2026-06-02
범위: Hololive TCG 게임의 **셋업 단계**(덱 배치 → 라이프 → 선후공 → 멀리건 → 데뷔 배치)와,
이를 테스트하기 위한 **로비 솔로(핫시트) 대전** 진입점.

> 이 단계의 종료 상태 = 양쪽 플레이어가 데뷔를 센터에 배치하고 셋업이 완료된 `ready`.
> 실제 턴 진행(메인 페이즈, 공격 등)은 **이번 범위 밖**.

---

## 1. 결정 사항 (확정)

| 항목 | 결정 |
|------|------|
| 구현 범위 | **로컬 우선** — 게임 상태 머신 전체를 로컬로 구현. 네트워크 동기화는 다음 단계. |
| 상대 진행 | **핫시트** — 한 화면에서 P1/P2 양쪽을 내가 수동 조작(패스앤플레이). |
| 카드 조작 | **클릭 방식** — 패에서 카드 탭 → 배치 가능 zone 강조 → zone 탭으로 이동. |
| 아키텍처 | **순수 규칙 모듈(`src/game/`) + Zustand `gameStore`** — 규칙/상태/UI 분리. |
| 추가 기능 | **로비 솔로 대전** — 저장된 덱 2개를 골라 핫시트 게임 시작(룸/Supabase 불필요). |
| 테스트 | 빌드 검증 + 수동 테스트. 규칙은 순수 함수로 유지해 추후 vitest 추가 가능. |
| RNG | 시드 가능한 PRNG 경유 — 재현성·테스트·향후 공유시드 네트워크 대비. |

---

## 2. 모듈 구조

```
src/game/
  types.ts        # GameState, PlayerState, CardInstance, Phase, PlayerId 등 타입
  rng.ts          # mulberry32 기반 시드 PRNG + shuffle(array, rng)
  setup.ts        # 순수 규칙 함수 (프레임워크 비의존)
src/store/
  gameStore.ts    # Zustand: GameState 보관 + setup.ts 호출로 액션 구현
src/components/game/
  SetupOverlay.tsx    # 현재 phase 안내 + 행동 컨트롤 (선후공/멀리건/페널티/시작)
  HandArea.tsx        # 클릭 선택 가능한 패 (GamePage의 기존 패 로직을 이전/일반화)
src/pages/
  GamePage.tsx        # gameStore 구독으로 재작성. solo 모드 init.
  LobbyPage.tsx       # "혼자 연습 대전" 섹션 추가 (덱 2개 선택 → /game/solo)
src/components/
  GameBoard.tsx       # zone에 실제 카드 렌더 + 배치 가능 zone 하이라이트 지원 (확장)
```

기존 패턴 준수: 상태는 Zustand(`deckStore`와 일관), 컴포넌트는 함수형 + Tailwind v4.

---

## 3. 상태 모델 (`src/game/types.ts`)

```ts
type PlayerId = 'p1' | 'p2';

// 메인덱 카드 인스턴스 — 같은 카드 여러 장을 uid로 구분.
type CardInstance = { uid: string; card: Card; imageUrl?: string };

type PlayerState = {
  name: string;
  oshi: Card | null;
  oshiImageUrl?: string;
  deck: CardInstance[];        // 셔플된 메인덱, index 0 = 맨 위
  hand: CardInstance[];
  cheerDeck: CardColor[];      // 셔플된 옐덱, index 0 = 맨 위
  life: CardColor[];           // 라이프(뒷면). cheerDeck 위에서 oshi.life장
  center: CardInstance | null; // 센터 (데뷔 필수)
  back: (CardInstance | null)[];  // 백 1~5 (길이 5, null = 빈 슬롯)
  mulliganUsed: boolean;       // 임의 멀리건 1회 사용 여부
  forcedMulligans: number;     // 데뷔 없음으로 강제 재멀리건한 횟수 (페널티 카운트)
  penaltyDone: boolean;        // 페널티 카드 반납 완료
  ready: boolean;              // 데뷔 배치 확정
};

type Phase =
  | 'idle'        // 게임 시작 전 (init 대기)
  | 'firstPlayer' // 시스템이 무작위 지목한 플레이어가 선/후공 결정
  | 'mulligan'    // 각 플레이어 임의 멀리건(유지/다시) 결정
  | 'debutCheck'  // 데뷔 없으면 공개 + 강제 재멀리건 반복
  | 'penalty'     // 강제 멀리건 횟수만큼 패 → 덱 맨 아래
  | 'placeDebut'  // 센터(필수) + 백(선택) 데뷔 배치
  | 'ready';      // 셋업 완료

type GameState = {
  phase: Phase;
  mode: 'solo' | 'dev' | 'online';   // 향후 online 확장 대비
  players: Record<PlayerId, PlayerState>;
  randomlyPicked: PlayerId | null;   // 선후공 결정권자 (시스템 무작위)
  firstPlayer: PlayerId | null;      // 선공 확정
  activeActor: PlayerId;             // 핫시트: 지금 조작 대상
  seed: number;
};
```

스토어 액션(개략):
`initGame(p1Deck, p2Deck, opts)`, `decideFirstPlayer(first: PlayerId)`,
`mulligan(pid, redraw: boolean)`, `resolveDebutCheck(pid)`,
`applyPenalty(pid, uids: string[])`, `placeDebut(pid, uid, slot)`,
`unplaceDebut(pid, slot)`, `confirmReady(pid)`, `setActiveActor(pid)`, `reset()`.

---

## 4. 셋업 플로우 (사용자 설명 순서 그대로)

1. **배치 (자동, `initGame`)** — 양쪽:
   - 오시를 오시 포지션에 배치.
   - 메인덱(`deck.mainDeck` 전개: card×count)을 시드 셔플 → `deck`.
   - 옐덱(`deck.cheers` 색상 전개)을 시드 셔플 → `cheerDeck`.
2. **라이프 (자동)** — `cheerDeck` 위에서 `oshi.life`장을 `life`로 이동(뒷면).
   *(사용자 설명대로 선후공보다 먼저 배치)*. 옐 부족 시 가능한 만큼.
3. **선후공 (`firstPlayer`)** — 시스템이 `p1`/`p2`를 무작위 지목(`randomlyPicked`) →
   그 플레이어가 **선공/후공** 선택 → `firstPlayer` 확정 → `mulligan` 진입.
4. **멀리건 (`mulligan`)** — 각 플레이어: 7장 드로우(이미 됨). 선택:
   - **그대로**, 또는 **다시**(패 7장 전부 덱에 넣고 셔플 후 7장 — **1회, 페널티 없음**).
5. **데뷔 체크 (`debutCheck`)** — 멀리건 결정 후 패에 데뷔(holomem·`debut`)가 없으면:
   **패 전체 공개 → 덱에 넣고 셔플 → 7장 드로우**를 데뷔가 나올 때까지 반복.
   반복 1회마다 `forcedMulligans++`.
6. **페널티 (`penalty`)** — `forcedMulligans > 0`이면 그 수만큼 패에서 카드 선택 → **덱 맨 아래**로.
7. **데뷔 배치 (`placeDebut`)** — 패의 데뷔 카드 탭 → 강조된 **센터**(필수) 또는 **백 1~5**(선택)에 배치.
   - 센터에 데뷔가 있어야 **시작 확정(`confirmReady`)** 가능.
   - 백에는 데뷔를 0~5장 자유 배치(선택).
8. **ready** — 양쪽 모두 `confirmReady` 시 `phase = 'ready'`. (이후 턴 진행은 범위 밖.)

> 멀리건/데뷔체크/페널티/데뷔배치는 플레이어별로 수행. 핫시트에서는 P1 → P2 순서로
> `activeActor`를 전환하며 진행(SetupOverlay가 현재 행동 안내).

### 멀리건 규칙 해석 (확정)

- **임의 멀리건(4단계)** = 페널티 없는 1회 전체 재드로우.
- **강제 재멀리건(5단계, 데뷔 없음)** = 데뷔 나올 때까지 반복, 그 횟수만 `forcedMulligans`에 카운트.
- 페널티(6단계) 반납 장수 = `forcedMulligans` (= "추가 멀리건 횟수").

---

## 5. 클릭 조작 + 핫시트 UX

- 화면: **P1 하단 / P2 상단** 고정(기존 GamePage 상하 분할 재사용). `activeActor` 보드를 테두리 강조.
- 상단 `SetupOverlay`: 현재 phase·actor 안내 + 행동 버튼.
  - 예) `firstPlayer`: "P1, 선공/후공을 결정하세요" → [선공][후공].
  - 예) `mulligan`: "P1, 멀리건?" → [그대로][다시] (다시는 mulliganUsed=false일 때만).
  - 예) `debutCheck`: 데뷔 없으면 패 공개 + [다시 뽑기] 자동 안내, 데뷔 있으면 자동 통과.
  - 예) `penalty`: "N장을 골라 덱 아래로" → 패에서 N장 선택 → [확정].
  - 예) `placeDebut`: "센터에 데뷔를 배치하세요" → 패 데뷔 탭 후 zone 탭 → [시작].
- **데뷔 배치 상호작용**: 패에서 데뷔 카드 탭 → 배치 가능 zone(센터/백) 점멸 강조 → zone 탭 시 이동.
  비데뷔 카드 탭 시 "데뷔 카드만 배치 가능" 토스트/안내.
- 핫시트라 양쪽 패가 모두 보임(테스트 주체가 나 하나). 실제 패 숨김은 네트워크 단계에서.
- 카드 상세는 기존 좌측 `CardDetailPanel` 재사용(탭한 카드 표시).

---

## 6. 로비 솔로 대전 진입점

- **LobbyPage**에 "혼자 연습 대전" 섹션 추가:
  - 저장된 덱(`deckStore.decks`)에서 **P1 덱 / P2 덱**을 각각 드롭다운으로 선택(같은 덱 선택 허용).
  - 오시가 없는 덱은 비활성/경고(셋업 불가).
  - [대전 시작] → `navigate('/game/solo', { state: { p1DeckId, p2DeckId } })`.
- **라우팅**: 기존 `/game/:code`가 `/game/solo`를 `code='solo'`로 매칭.
  - GamePage에서 `code === 'solo'` → solo 모드. route state의 두 덱 id로 `initGame`.
  - state 없음(새로고침 등) → 로비로 복귀 안내.
- **GamePage init 규칙**:
  - solo (`code==='solo'` + state) → 선택한 두 덱으로 `initGame(mode:'solo')`.
  - `/game` (dev, 레거시) → `activeDeck`을 양쪽에 사용 `initGame(mode:'dev')` (기존 동작 유지·테스트용).
  - `/game/:code` (online, 향후) → 당분간 dev와 동일하게 동작(네트워크는 다음 단계).
  - 마운트 시 1회 init, 언마운트/`reset` 시 정리.

---

## 7. 데이터 / 엣지 케이스

- **옐 카드·라이프 = 색상 토큰 카드**(개별 아트 없음). 라이프는 뒷면 카드로 표시.
  옐덱 zone은 남은 장수 표시.
- **메인덱 카드 인스턴스**: 동일 카드 여러 장 → `uid`로 구분(`${cardId}#${seq}`).
- **불완전 덱 허용**: 50/20 미만이어도 있는 만큼 진행. 라이프는 옐 가능 범위 내.
- **오시 없음**: 해당 덱은 셋업 시작 차단 + 안내(로비에서 비활성).
- **데뷔 없는 덱**: 5단계 강제 멀리건이 무한 반복될 수 있음 → 덱에 데뷔가 전혀 없으면
  안전장치로 일정 횟수 후 중단 + 안내(정상 덱이면 발생 안 함).
- **셔플·라이프·선후공 무작위**: 모두 `rng.ts` 시드 RNG 경유.

---

## 8. 비범위 (이번 단계 제외)

- 실제 턴 진행(드로우 페이즈, 콜라보/블룸, 아츠/공격, 데미지·라이프 소실, 승패).
- 네트워크 2인 동기화(Supabase) — 인터페이스만 분리해 둠(`mode:'online'` 자리).
- 패 숨김(상대에게 비공개) — 핫시트라 불필요. 네트워크 단계에서.
- 데뷔 외 카드(서포트/1st 등) 배치, 옐 부착, 홀로파워 등.

---

## 9. 검증

- `npm run build` 타입/컴파일 통과.
- `npm run lint` 통과.
- 수동: 로비 → 혼자 연습 대전 → 덱 2개 선택 → 셋업 전 플로우(선후공→멀리건→
  데뷔체크→페널티→데뷔배치→ready)를 핫시트로 끝까지 진행 확인.
