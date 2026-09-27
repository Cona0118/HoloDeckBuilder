---
type: Change Log
title: "2026-09-27 — hBP09 「볼륨 볼텍스」 추가, 셀렉션 컵 카드풀 갱신, 전 카드 공식 원문 대조 정정"
description: hBP09 111장 추가, 셀렉션 컵 카드풀을 공식 sele09 기준으로 교체하고 이벤트컵 필터를 다시 노출, 기존 카드 데이터를 공식 일본어 원문과 대조해 정정한 배포를 기록한다.
status: stable
---

# 2026-09-27 — hBP09 「볼륨 볼텍스」 추가, 셀렉션 컵 카드풀 갱신, 전 카드 공식 원문 대조 정정

- Event: Release (카드 세트 + 이벤트컵 카드풀 + 카드 데이터 정정)
- Effective scope: 전체 사용자.
  - 부스터 hBP09 「볼륨 볼텍스」 111장(오시 7·홀로멤 82·서포트 22)과 일러스트 229장,
    재록 변형 이미지 18장, 옐 SY 이미지 6장을 추가했다.
  - 셀렉션 컵 카드풀을 공식 【使用可能カード】セレクションカップ(`expansion=sele09`) 기준으로
    교체했다. 새 풀은 hBP08·hEB01·hBP09 세트 전체와 재록 개별 93장이다. 이전 풀의 hBP07과
    hSD14~19는 빠졌다.
  - 2026-08-19에 [숨겼던][heb01] 이벤트컵 필터 UI를 다시 노출했다(`SHOW_EVENT_POOL_FILTER=true`).
  - 기존 카드 1,308장을 공식 일본어 원문과 대조해 440장을 정정했다.
    - 구조값 144건: HP·코스트·대미지·특공·배턴 터치·Buzz 룰·엑스트라 룰·nameJp 오타.
    - 문장 289장 343곳: 조건·대상·수치의 누락이나 오역, 다른 카드 문장, 카드명·태그 오표기.
    - 용어 표기 통일: SP오시 스킬, 스텝, 대미지, 팬 부착 문구, 홀로아츠 X 옐 등.
- Specs: 없음. 카드 데이터의 권위는 `src/data/cards.ts`, 카드풀의 권위는 `src/data/eventPools.ts`다.
- Changed Structure: [Architecture][arch] (카드 데이터 계층 — 세트 범위·이벤트컵 필터 상태)
- Evidence:
  - commit `0a55439` "feat: hBP09 「볼륨 볼텍스」 추가 · 셀렉션 컵 카드풀 갱신 · 전 카드 공식
    원문 대조 정정"을 origin/master에 푸시했다. 테스트 38/38과 빌드가 통과했다.
  - 푸시 약 80초 뒤 프로덕션(`holo-deck-builder.vercel.app`) 번들에서 `hBP09-111`,
    `Booster Pack Vol.9`, `selection-cup`을 확인했다.
  - 새 이미지 253개는 `npm run img:cdn`으로 R2에 업로드했고, r2.dev URL HEAD 요청이 모두 200이었다.
  - 원문 대조 결과는 별도 검증 에이전트가 무작위 표본 75장(정정 50장, 미정정 25장)으로 확인했고,
    회귀나 누락 오류는 0건이었다.

[heb01]: 2026-08-19-heb01-summer-hologram.md
[arch]: ../structure/architecture.md
