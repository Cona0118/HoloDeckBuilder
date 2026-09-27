# Specs — 합의된 기능 스냅샷

기능(capability)별로 현재 유효한 Spec set을 가리키는 내비게이션 레지스트리.
이 인덱스 자체는 동작의 권위가 아니다.

> 아래 Feature Spec들은 모두 2026-08-25에 세션 기록과 git 이력으로부터 **소급 재구성한
> `draft`**다. 개발 당시의 인간 승인 증거가 없으므로 `stable`로 표시하지 않는다.
> 개발 당시의 원본 설계 문서는 [../superpowers/specs/](../superpowers/specs/)와
> [../superpowers/plans/](../superpowers/plans/)에 legacy 위치 그대로 남아 있으며, 각 Spec이
> `sources`로 링크한다.

| 기능 | 현재 Spec set | 상태 |
| --- | --- | --- |
| 덱 공유 게시판 | [features/deck-board-v1/feature-spec.md](features/deck-board-v1/feature-spec.md) | draft (소급 재구성) |
| 게시판 추천(👍) | [features/deck-board-recommend-v1/feature-spec.md](features/deck-board-recommend-v1/feature-spec.md) | draft (소급 재구성) |
| PWA 설치 지원 | [features/pwa-install-v1/feature-spec.md](features/pwa-install-v1/feature-spec.md) | draft (소급 재구성) |
| 카드 일러스트 변형 선택 | [features/card-illustration-variants-v1/feature-spec.md](features/card-illustration-variants-v1/feature-spec.md) | draft (소급 재구성) |
| 멀티플레이어 대기실 | [features/multiplayer-lobby-v1/feature-spec.md](features/multiplayer-lobby-v1/feature-spec.md) | draft (소급 재구성) |
| 게임 셋업 단계 + 솔로 대전 | [features/game-setup-phase-v1/feature-spec.md](features/game-setup-phase-v1/feature-spec.md) | draft (소급 재구성) |
| Deck Log 발행 | [features/decklog-publish-v1/feature-spec.md](features/decklog-publish-v1/feature-spec.md) | draft (소급 재구성) |

Spec이 아직 없는 기능(덱 빌더 코어, 카드 검색 확장, 클립보드 덱 가져오기, 금지/제한 검증,
이벤트컵 카드풀 등)의 현재 동작은 [../structure/architecture.md](../structure/architecture.md)가
요약하고, 변경 이력은 [../logs/index.md](../logs/index.md)가 기록한다.
