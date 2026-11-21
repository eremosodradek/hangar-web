/* duel-play.js  정예 대전 보고서를 카드 배틀처럼 재생하는 독립 부품(2026-11-12 ART 세션).
   이유: 사용자 「대전 과정이 카드 배틀 느낌이 나게」. 판정은 서버가 끝냈고 화면은 보고서(report)만 재생한다.
   쓰는 법:
     const p = duelPlay(el, report, {art:(girl, side) => 초상 HTML, t:번역, nameText:소녀 이름 번역, clsName:클래스 이름, clsIcon:클래스 아이콘 HTML, facilityIcon:시설 아이콘 HTML, facilityFace:(시설 열쇠, 편, 소대전 번호) => 담당 소녀 초상 HTML, facilityWho:(시설 열쇠, 편, 소대전 번호) => 담당 소녀 이름, jobName:전직 이름, onClose, onText, onDone});
     p.play() p.pause() p.toggle() p.step() p.setSpeed(1|2|4) p.skipBout() p.toResult() p.restart() p.destroy() p.state()
   기록 설명 옵션(설명도 엔진 내역도 없으면 노드를 만들지 않는다):
     opts.skillNote(girl, side) 그 소대전에서 유효한 보고서 소녀의 액티브 설명. 다른 판이나 격납고 글을 받치지 않는다. side 는 0 공격 편, 1 방어 편. 모함에는 부르지 않는다.
     opts.hitNote(line, bout) 이미 번역된 내역. 공격 회복 방어막 줄에서 원본 log 줄과 소대전을 넘긴다. 문자열이 있으면 엔진 내역보다 먼저 쓴다.
     opts.passiveNote(girl, side) 그 소대전 보고서 소녀의 패시브 설명. 패시브 발동 때만 덧붙이며 모함에는 부르지 않는다.
     opts.instinctNote(code, girl) 그 보고서 제공자 소녀의 본능 설명. 다른 판이나 격납고 글을 받치지 않는다. 발동 때만 흐린 글로 덧붙인다.
     설명은 라운드 본문을 처음 펼칠 때만 부르고, HTML 로 해석하지 않는다.
   순수 함수(화면 없이 돈다):
     duelPlay.beats(report)  소대전마다 박자 배열. 모든 log 줄은 정확히 한 박자에 든다.
     duelPlay.apply(state, line)  log 한 줄을 상태에 반영. 화면도 이 함수로만 상태를 바꾼다.
     duelPlay.plan(report, opts)  박자마다 걸리는 시간과 전체 길이. opts.facilityCut 은 시설 담당 소녀 컷인이 잡히는지(true 는 모든 시설, 함수면 (시설 열쇠, 편, 소대전 번호) => 참 거짓). 없으면 컷인 없는 전의 계획.
     duelPlay.fresh(bout) 처음 상태, duelPlay.settle(state, bout) 끝 상태(final)로 맞춤.
     duelPlay.fwBout(report, i, viewSide) 함대전 판 보고서의 소대전 하나를, duelPlay.fwMatch(report, viewSide) 판 전체를 이 부품이 받는 보고서로 바꾼다(파일 끝).
   콜백: onDone(report) 은 결과 화면이 열릴 때마다 한 번 부른다(끝까지 재생, 결과 단추, 마지막 소대전 건너뛰기, startAt 이 result 나 log 일 때는 만들자마자).
     다시 보기로 처음부터 재생해 결과가 다시 열리면 또 부른다. 처음 한 번만 할 일(봉인 풀기 등)은 부르는 쪽이 한 번만 하게 막는다.
     opts.sideLayout = {ship, wrap:[공격 편, 방어 편], tall} 은 번호 폭과 별개인 배치다. wrap 은 좁은 화면에서 한 줄에 놓을 카드 수다.
     opts.facilityActor(line) 은 출처 줄의 담당 이름과 초상 {name,html}을 돌려준다. 한 교전에 모함이 여럿이면 출처마다 첫 발동에 컷인이 뜬다.
   함대전(소대 이어 싸우기)의 소대전 하나를 재생할 때만 쓰는 선택 칸 둘. 둘 다 없는 보고서(정예 대전)는 전과 똑같이 그린다.
     bout.start = [[번호, 체력, 방어막], …]  final 과 같은 꼴과 단위. 이 소대전을 시작할 때의 상태.
       적지 않은 번호는 가득 찬 체력으로 시작한다. 체력 0 은 처음부터 쓰러진 카드.
     bout.hpBase 는 체력, 방어막, 피해, 회복 정수의 분모다. 생략하면 1000 이다.
     opts.facilityUnits: 약탈과 출격 기록의 시설을 공용 모함 띠로 옮긴다. 시설 담당은 facilityWho 와 facilityFace 로 받는다.
     opts.facilityBuilding(시설 열쇠, 편, 소대전 번호): 담당 초상이 없을 때 띠와 기록에 쓸 시설 그림 HTML. 컷인에는 쓰지 않는다.
     bout.support = [{index:10|11, side:0|1, name:'모함 이름', facilities:{turret:1, flak:0, …}}, …]  모함 지원.
       log 의 행위자 번호 10 은 공격 편(side 0) 모함, 11 은 방어 편(side 1) 모함이다(한 척 판은 30 과 31, 아래 size shipIds). 모함은 카드가 아니고 맞지 않으며 최다 피해와 라운드 요약 셈에 넣지 않는다.
       facilities 는 이 소대전에서 쓴 시설(참이면 밝게). 이름이 없으면 꼬리표 「모함」만 보인다.
     모함이 쓴 스킬 줄 [라운드, 10|11, -1, 2, 시설 순서, …] 의 다섯째 값은 FACILITY 의 순서다.
     시설 담당 소녀(2026-11-16 사용자 「시설 소녀가 스킬을 쓸 때 격납고 소녀처럼 컷인」). 둘 다 없는 판은 전과 똑같다.
       opts.facilityWho(시설 열쇠, 편, 소대전 번호)  그 소대전에서 그 편의 그 시설을 맡은 소녀의 이름(이미 번역된 글). 행동 글, 기록의 행위자 이름, 컷인 이름표, 띠 칸의 풍선 글에 쓴다.
       opts.facilityFocus(시설 열쇠, 편, 소대전 번호)  띠 초상만 {x, y, zoom} 으로 확대. x y 는 얼굴 가운데 퍼센트(기본 50 30), zoom 은 배율(기본 1). 없으면 기존 cover. 컷인에는 쓰지 않는다.
       opts.facilityFace(시설 열쇠, 편, 소대전 번호)  그 소녀의 초상 HTML. 모함 띠의 시설 칸에도 쓰고, 주면 그 소대전에서 그 편의 그 시설이 처음 움직이는 박자에 컷인이 뜬다(격납고 소녀의 스킬 컷인과 같은 띠, 그 편 모함 띠 쪽).
         같은 소대전에서 같은 시설이 다시 움직이면 전처럼 띠와 탄 줄기만. 초상은 만들 때 소대전과 편과 시설마다 한 번씩 받아 두고 같은 HTML 은 노드 하나를 돌려 쓴다.
       편은 0 공격 편, 1 방어 편. 소대전 번호는 0 부터. 연합 모함처럼 소대전마다 담당이 달라지는 판은 셋째 인자로 가른다(판 전체 변환의 bout.seat.ally).
   함대전 판 전체(소대전 14개 안팎을 이어 재생, 2026-11-16 사용자 「함대전 연출은 정예 대전 전투과정 연출과 동일한거」)에서 쓰는 선택 칸. 모두 없는 보고서는 전과 똑같이 그린다.
     bout.side = [{name, note}, {name, note}]  [공격 편(a), 방어 편(d)] 차례. 이 소대전이 보이는 동안 머리줄의 편 이름과 덧글을 이 글로 바꾼다(노드는 그대로, 글만).
       결과 화면의 소대전 줄, 기록 보기의 소대전 머리와 끝 요약도 이 이름을 쓴다. 이미 번역된 글이라 번역 함수에 넘기지 않는다.
       opts.boutSide(i, bout.seat) 이 같은 꼴을 돌려주면 그 값이 먼저다(빈 칸은 bout.side 의 값). 게임이 덧글(「2소대」)을 지어 넣는 자리다.
     bout.seat = {pos, ship, squad, carried}  자리 정보(각 [공격 편, 방어 편]). 부품은 읽지 않고 opts.boutSide 에 그대로 넘긴다.
     bout.score = {before:[공격 편, 방어 편], after:[…]}  남은 소대 수. 있으면 머리줄 가운데에 승수 점 대신 「7 : 7」과 작은 글 「남은 소대」를 그리고 소대전이 끝나는 장면에서 after 로 바뀐다.
       마지막 소대전의 after 는 결과 화면의 큰 숫자가 된다(소대전 승수 대신).
     bout.draw = true  둘 다 빠진 소대전(무승부). report.draw = true 는 판 무승부(결과 도장이 「무승부」).
     report.chain = true  같은 소녀가 여러 소대전에 나오는 판(이어 싸우기). 최다 피해를 소대전마다가 아니라 소녀마다 더한다.
     소대전이 셋보다 많으면 결과 화면의 소대전 칸이 한 줄 요약 목록이 되고 기록 보기의 소대전 단추는 번호만 적어 여러 줄로 놓는다.
   함대전 「모함 한 척 = 한 소대(정예 15인)」 판(2026-11-16 사용자 「연출도 5인이 아닌 15인 기준으로 컨셉은 유지하되 배치를 바꿔야 하지 않을까?」)에서 쓰는 선택 칸. 없는 보고서는 전과 똑같다.
     report.size, bout.size       한 편 소녀 번호 폭(한 척 판은 15). 소녀 번호는 편 × size + 자리. 없으면 5.
     report.shipIds, bout.shipIds  모함 번호 [공격 편, 방어 편](한 척 판은 [30, 31]). 없으면 [10, 11], size 만 있으면 2 × size + 편.
       소대전(bout)의 값이 먼저고 없으면 보고서(report)의 값을 쓴다. 서버의 큰 기록에 있는 size 와 shipIds 를 duelPlay.fwBout 과 duelPlay.fwMatch 가 보고서와 모든 소대전에 그대로 싣는다.
       순수 함수는 그 값을 소대전에서 읽는다: fresh(bout) apply(state, line) settle(state, bout) beats(report) plan(report) rounds(report) mvp(report).
       소대전에 값이 없는 보고서를 소대전 하나씩 다룰 때만 fresh(bout, report), duelPlay.numbers(bout, report) 처럼 보고서를 덧붙인다(안 붙이면 5 와 [10, 11]).
     size 가 다섯보다 큰 소대전이 있는 판은 15인 배치를 쓴다(뿌리 표시 dp-ship, 배치는 duel-play.css 끝 구역): 휴대폰과 세운 태블릿은 8장과 나머지 두 줄, 넓은 화면은 한 줄, 눕힌 휴대폰은 한 줄의 작은 카드.
       units 순서대로 왼쪽부터 놓고 두 줄 배치에서는 여덟마다 줄을 바꾼다. 인원이 적으면 마지막 줄이 짧다. 결과 화면은 소대전 수와 상관없이 한 줄 요약이고 기록 보기의 소대전 단추는 번호만 적는다.
       카드별 등장 지연과 여러 대상의 엇박은 다섯 장 때의 길이로 줄이고, 효과 아이콘은 셋까지만 보인다. 대상이 셋 이상이어도 그 편의 서 있는 카드 절반을 넘지 않으면 「적 전체」 대신 이름을 늘어놓는다.
   게임 전역에 기대지 않는다. 게임 함수는 모두 opts 로 넘겨 받는다(배포본은 이름을 줄인다).
   재생 중에는 카드와 그림 노드를 다시 만들지 않는다. 재생 구조는 build 에서 한 번 만들고 값만 바꾼다. 기록 줄은 처음 펼칠 때 mk 로 만들고 보관한다.
   이 파일에는 꼬리표를 닫는 글자(script, style)와 반영 도구의 표시 글자를 적지 않는다(tools/duel-play-sync.js 가 index.html 에 넣는다).
   줄 설명은 이 꼴의 묶음 주석만 쓴다. */
(function (root) {
  'use strict';

  const ROUNDS = 12, SQUAD = 5, FX_SHOW = 4, PIPS = 3;
  const OP = {hit: 1, skill: 2, effect: 3, heal: 4, skip: 5, supply: 6, expire: 7, snapshot: 8};
  const FLAG = {crit: 1, evade: 2, counter: 4, pierce: 8, pursuit: 16};
  const EFFECT = {shield: 1, taunt: 2, stun: 3, disrupt: 4, mark: 5, burn: 6, regen: 7, cleanse: 8, counter: 9, pierce: 10, stealth: 11};
  const HARM = {3: 1, 4: 1, 5: 1, 6: 1};
  /* 모함 시설. 판정 엔진이 모함 스킬 줄에 적는 순서 그대로다. 모함 띠의 아이콘도 이 순서로 놓는다. */
  const FACILITY = ['turret', 'flak', 'railgun', 'laser', 'ecm', 'radar', 'hull'];
  const ALIVE = {down: false};   /* 모함은 쓰러지지 않는다 */

  /* 글 표. 한국어 원문이 열쇠이고 화면에 낼 때 opts.t 로 감싼다. 스킬과 패시브 이름은 설계서 3-1절의 임시 이름. */
  const TEXT = {
    op: {1: '공격', 2: '스킬', 3: '효과', 4: '회복', 5: '기절로 건너뜀', 6: '보급', 7: '효과 끝남', 8: '라운드 끝'},
    flag: {1: '치명', 2: '회피', 4: '반격', 8: '관통', 16: '추격'},
    overlap: {overwrite: '덮음', extend: '갱신'},
    overlapEffect: {accuracyDown: '명중 감소', accuracyUp: '명중 증가', speedDown: '속도 감소', speedUp: '속도 증가', evadeUp: '회피 증가', evadeDown: '회피 감소'},
    effect: {1: '방어막', 2: '도발', 3: '기절', 4: '교란', 5: '표식', 6: '화상', 7: '회복 지속', 8: '정화', 9: '반격 태세', 10: '관통', 11: '은신'},
    dmg: {base: '화력', damage: '피해', trait: '상성', jitter: '변동', crit: '치명', command: '지휘', disrupt: '교란', mark: '표식', weak: '약점',
      reduce: '방진', instinct: '본능', shield: '방어막', cap: '초과', branch: '갈래', slot: '능력치', ship: '모함', support: '시설 지원',
      laststand: '마지막 저항', burn: '화상', death: '포성', evade: '회피', heal: '회복', refresh: '갱신', tactic: '작전', pierce: '관통'},
    log: {
      overwrite: '{e} 효과가 더 강해졌다.',
      extendEffect: '{t}의 {e} 효과는 그대로이고 {r}라운드까지 기간만 갱신되었다.',
      areaExtendEffect: '{side} {k}명의 {e} 효과는 그대로이고 {r}라운드까지 기간만 갱신되었다.',
      foeName: '상대 {a}',
      attack: '{a}(이)가 {t}(을)를 공격했다.',
      skillAttack: '{a}(이)가 {s}(으)로 {t}(을)를 공격했다.',
      area: '{a}(이)가 {s}(으)로 적 {n}명을 공격했다.',
      bossVolley: '{a}(이)가 {s}(으)로 거함 부위 {n}곳을 공격했다.',
      skill: '{a}(이)가 {s} 스킬을 썼다.',
      guardField: '방진 효과로 아군이 받는 공격 피해가 줄었다.',
      commandField: '지휘 효과로 아군의 화력과 치명 확률이 높아졌다.',
      facility: '{ship}의 {f} 시설이 적 {n}명을 공격했다.',
      facilityWho: '{a}(이)가 {f} 시설로 적 {n}명을 공격했다.',
      counter: '{a}(이)가 {t}에게 반격했다.',
      pursuit: '{a}(이)가 추격으로 {t}(을)를 추가 공격했다.',
      skip: '{a}(은)는 기절해 행동 차례를 한 번 건너뛰었다.',
      burn: '{t}(이)가 화상으로 피해를 입었다.',
      death: '{a}의 포성으로 {t}(이)가 피해를 입었다.',
      cleanupHit: '{t}(이)가 피해를 {n} 받았다.',
      cleanupDamage: '{m}명이 받은 피해는 총 {n}이다.',
      regen: '{t}(이)가 체력을 회복했다.',
      heal: '{t}의 체력이 {n} 회복되었다.',
      supply: '{t}의 다음 행동이 바로 앞당겨졌다.',
      supplyNext: '{t}(은)는 다음 라운드에 먼저 행동한다.',
      grow: '{x} 효과로 피해가 늘었다.',
      stack: '{list} 효과가 겹쳐 피해가 늘었다.',
      shieldBlock: '{t}의 방어막이 피해를 {n} 막았다.',
      reduce: '{x} 효과로 피해가 {n} 줄었다.',
      reduceBy: '{a}의 {x} 효과로 피해가 {n} 줄었다.',
      growBy: '{a}의 {x} 효과로 피해가 늘었다.',
      blocked: '방어막이 피해를 모두 막아 체력이 줄지 않았다.',
      fallen: '{t}(이)가 쓰러졌다.',
      evade: '{t}(이)가 공격을 피했다.',
      areaDamage: '{m}명이 받은 피해는 총 {n}이다.',
      areaBlocked: '{k}명은 방어막이 피해를 모두 막았고 {m}명이 받은 피해는 총 {n}이다.',
      areaAllBlocked: '{k}명의 방어막이 피해를 모두 막았다.',
      areaFallen: '{k}명이 쓰러졌다.',
      bossFallen: '부위 {k}곳이 파괴됐다.',
      areaEvade: '{k}명이 공격을 피했다.',
      areaBurn: '{n}명이 화상으로 피해를 입었다.',
      areaRegen: '{n}명이 체력을 회복했다.',
      areaDisrupt: '{side} {k}명의 화력이 교란으로 {r}라운드까지 {n}% 낮아진다.',
      areaDisruptPlain: '{side} {k}명의 화력이 교란으로 낮아진다.',
      areaMark: '{side} {k}명이 표식으로 {r}라운드까지 받는 공격 피해가 {n}% 늘어난다.',
      areaMarkPlain: '{side} {k}명이 표식으로 받는 공격 피해가 늘어난다.',
      areaStun: '{side} {k}명이 기절해 {r}라운드까지 다음 행동을 한 번 건너뛴다.',
      areaStunPlain: '{side} {k}명이 기절해 다음 행동을 한 번 건너뛴다.',
      areaTaunt: '{r}라운드까지 적의 일반 공격이 {side} {k}명에게 먼저 향한다.',
      areaTauntPlain: '적의 일반 공격이 {side} {k}명에게 먼저 향한다.',
      areaBurnEffect: '{side} {k}명이 {r}라운드까지 라운드 끝마다 화상 피해를 약 {n}씩 받는다.',
      areaBurnEffectPlain: '{side} {k}명이 화상으로 라운드 끝마다 피해를 받는다.',
      areaRegenEffect: '{side} {k}명이 회복 지속으로 {r}라운드까지 라운드 끝마다 체력을 약 {n}씩 회복한다.',
      areaRegenEffectPlain: '{side} {k}명이 회복 지속으로 라운드 끝마다 체력을 회복한다.',
      areaShield: '{side} {k}명이 방어막을 얻었다.',
      areaRefresh: '{side} {k}명의 방어막이 {n}씩 남은 채 {r}라운드까지 유지된다.',
      areaRefreshPlain: '{side} {k}명의 방어막이 남은 양을 유지한 채 갱신되었다.',
      areaCounterEffect: '{side} {k}명이 {r}라운드까지 반격 태세로, 공격을 받으면 기본 {n}% 확률로 반격한다.',
      areaCounterEffectPlain: '{side} {k}명이 반격 태세로, 공격을 받으면 일정 확률로 반격한다.',
      areaPierce: '{side} {k}명이 {r}라운드까지 관통으로 피해 감소 효과와 방어막을 {n}% 무시한다.',
      areaPiercePlain: '{side} {k}명이 관통으로 피해 감소 효과와 방어막의 일부를 무시한다.',
      areaStealth: '{side} {k}명이 {r}라운드까지 은신해 일반 공격의 대상에서 숨는다.',
      areaStealthPlain: '{side} {k}명이 은신해 일반 공격의 대상에서 숨는다.',
      areaAccuracy: '{side} {k}명의 명중이 {r}라운드까지 {n}%p 낮아진다.',
      areaAccuracyPlain: '{side} {k}명의 명중이 떨어진다.',
      areaSpeed: '{side} {k}명의 속도가 {r}라운드까지 {n}% 낮아진다.',
      areaSpeedPlain: '{side} {k}명의 속도가 떨어진다.',
      areaEvadeEffect: '{side} {k}명의 회피가 {r}라운드까지 {n}%p 높아진다.',
      areaEvadeEffectPlain: '{side} {k}명의 회피가 늘어난다.',
      areaWeak: '{side} {k}명이 약점으로 {r}라운드까지 다음에 맞히는 공격의 화력이 {n}% 낮아진다.',
      areaWeakPlain: '{side} {k}명이 약점으로 다음에 맞히는 공격의 화력이 낮아진다.',
      areaCleanse: '정화로 {side} {k}명의 해로운 효과를 모두 없앴다.',
      areaSupply: '{side} {k}명의 다음 행동이 바로 앞당겨졌다.',
      areaSupplyNext: '{side} {k}명은 다음 라운드에 먼저 행동한다.',
      areaHeal: '{side} {k}명의 체력이 각각 {n} 회복되었다.',
      areaHealPlain: '{side} {k}명의 체력이 회복되었다.',
      areaEffect: '{n}명에게 {e}(이)가 적용되었다.',
      areaExpire: '{n}명에게 적용된 {e}(이)가 끝났다.',
      disrupt: '{t}의 화력이 교란으로 {r}라운드까지 {n}% 낮아진다.',
      mark: '{t}(은)는 표식으로 {r}라운드까지 받는 공격 피해가 {n}% 늘어난다.',
      stun: '{t}(은)는 기절해 {r}라운드까지 다음 행동을 한 번 건너뛴다.',
      taunt: '{r}라운드까지 적의 일반 공격이 {t}에게 먼저 향한다.',
      burnEffect: '{t}(은)는 {r}라운드까지 라운드 끝마다 화상 피해를 약 {n} 받는다.',
      regenEffect: '{t}(은)는 회복 지속으로 {r}라운드까지 라운드 끝마다 체력을 약 {n} 회복한다.',
      cleanse: '정화로 {t}의 해로운 효과를 모두 없앴다.',
      shield: '{t}(이)가 {r}라운드까지 피해 {n}(을)를 막는 방어막을 얻었다.',
      refresh: '{t}의 방어막이 {n} 남은 채 {r}라운드까지 유지된다.',
      counterEffect: '{t}(은)는 {r}라운드까지 반격 태세로, 공격을 받으면 기본 {n}% 확률로 반격한다.',
      pierce: '{t}(은)는 {r}라운드까지 관통으로 피해 감소 효과와 방어막을 {n}% 무시한다.',
      stealth: '{t}(은)는 {r}라운드까지 은신해 일반 공격의 대상에서 숨는다.',
      accuracy: '{t}의 명중이 {r}라운드까지 {n}%p 낮아진다.',
      speed: '{t}의 속도가 {r}라운드까지 {n}% 낮아진다.',
      evadeEffect: '{t}의 회피가 {r}라운드까지 {n}%p 높아진다.',
      weak: '{t}(은)는 약점으로 {r}라운드까지 다음에 맞히는 공격의 화력이 {n}% 낮아진다.',
      effect: '{t}에게 {e}(이)가 적용되었다.',
      expire: '{t}에게 적용된 {e}(이)가 끝났다.',
      roundLoss: '적 {n}명과 우리 편 {m}명이 쓰러졌다.',
      roundWin: '적 {n}명이 쓰러졌다.',
      roundOwn: '우리 편 {m}명이 쓰러졌다.',
      instinct: '{a}의 본능이 발동했다.',
      branchActive: '{a}(이)가 {x} 갈래의 {s}(을)를 썼다.',
      branchPassive: '{a}의 {x} 갈래 효과가 발동했다.',
      branchFeat: '{a}의 {x} 갈래 특기가 발동했다.',
      branchFacility: '{f}의 {x} 갈래 효과가 발동했다.',
      branchPlain: '{a}의 갈래 효과가 발동했다.',
      branchFeatPlain: '{a}의 갈래 특기가 발동했다.',
      branchFacilityPlain: '{f}의 갈래 효과가 발동했다.',
      passive: '{a}의 {c} 패시브가 발동했다.',
      laststand: '소대가 모두 쓰러져 마지막 저항이 발동했다.',
      laststandFire: '{ship}의 무기 시설이 일제히 사격했다.',
      roundNone: '쓰러진 소녀는 없었다.',
      roundHit: '이번 라운드에 소녀가 한 번에 준 가장 큰 피해는 {a}의 {n}이다.'
    },
    logMore: {more: '나머지 {n}개 기록 보기', less: '접기', fallen: '쓰러짐 {k}명'},
    glossary: {
      overwrite: '같은 효과가 걸려 있었지만 새 값이 더 커서 새 값으로 바뀌었다.',
      extend: '이미 걸린 같은 효과가 같거나 더 강해 값은 그대로이고 기간만 다시 정해졌다.',
      passive: '스킬을 쓰지 않아도 조건에 따라 적용되는 효과이다.',
      feat: '갈래의 특기 단계에서 열리는 조건부 효과이다.',
      crit: '치명이 발생하면 공격 피해가 늘어난다.', evade: '공격을 피해 체력과 방어막이 줄지 않았다.',
      counter: '공격을 받으면 공격한 쪽에 되받아친다.', pierce: '피해 감소와 방어막의 일부를 무시한다.',
      pursuit: '적을 쓰러뜨린 뒤나 정해진 조건에서 적을 추가로 공격한다.', mark: '표식이 있는 동안 받는 공격 피해가 늘어난다.',
      disrupt: '교란이 있는 동안 화력이 떨어진다.', taunt: '적의 일반 공격이 먼저 향하는 효과이다.',
      stun: '행동 차례를 한 번 건너뛴다.', burn: '라운드 끝마다 최대 체력의 일정 비율만큼 피해를 받는다.',
      regen: '라운드 끝마다 최대 체력의 일정 비율만큼 회복한다.', cleanse: '대상의 해로운 상태 효과를 없앤다.',
      counterEffect: '공격을 받으면 일정 확률로 공격자에게 반격한다.', stealth: '일반 공격의 대상에서 숨지만 레이더와 일부 갈래에는 드러난다.',
      shield: '체력에 닿기 전에 피해를 흡수한다.', block: '방어막이 흡수한 피해이다.',
      base: '화력에 공격 배율을 곱한 기본 피해이다.', trait: '공격자의 클래스와 대상의 특성에 따라 피해가 달라진다.',
      command: '아군의 화력과 치명 확률을 높인다.', weak: '다음에 맞히는 공격의 화력을 낮추고 사라진다.',
      reduce: '방진으로 아군이 받는 공격 피해를 줄인다.', instinct: '소녀마다 정해진 조건에 따라 적용되는 고유 효과이다.',
      branch: '전직 갈래에 따라 능력치나 스킬 효과가 달라진다.', laststand: '소대가 모두 쓰러지면 모함의 무기 시설이 한 번씩 사격한다.',
      jitter: '공격마다 피해량이 무작위로 조금씩 달라진다.', cap: '남은 체력이나 최대 체력을 넘는 양은 제외한다.',
      refresh: '방어막의 남은 양을 유지하며 지속 시간을 갱신한다.', death: '쓰러질 때 남긴 포성으로 피해를 주었다.'
    },
    tactic: {weak: '가장 약한 적', strong: '가장 센 적', support: '지원형 먼저', advantage: '상성 유리한 적'},   /* 2026-11-13 게임 화면과 편성 부품(duelForm)의 작전 글로 통일 */
    cls: {carrier: '캐리어', striker: '스트라이커', bulwark: '불워크', hauler: '프레이터', medic: '메딕', jammer: '재머',
      flagship: '플래그십', breacher: '브리처', siege: '시즈', pathfinder: '패스파인더', phalanx: '팔랑크스'},
    skill: {striker: '연속 사격', pathfinder: '표적 지정', jammer: '교란파', carrier: '보급', medic: '긴급 수리', hauler: '긴급 자재',
      bulwark: '도발', siege: '포격', flagship: '일제 사격', breacher: '돌파', phalanx: '방진'},
    passive: {striker: '추격', pathfinder: '관측', jammer: '전파 방해', carrier: '회피 기동', medic: '회복 지속', hauler: '잔해 회수',
      bulwark: '반격', siege: '관통탄', flagship: '지휘', breacher: '선봉', phalanx: '철벽'},
    facility: {turret: '포탑', flak: '대공', railgun: '레일건', laser: '레이저', ecm: 'ECM', radar: '레이더', hull: '격벽'},
    team: {flagship: '화력 치명 상승', phalanx: '받는 피해 감소'},
    ui: ['본능 {a}', '갈래', '마지막 저항', '특기', '정예 대전 재생', '{0}소대전', '소대전 시작', '라운드 {0}/{1}', '라운드 {0}', '작전', '공격', '방어',
      '승리', '패배', '판정승', '판정패', '남은 체력 {0}% 대 {1}%', '{0}라운드', '시간 초과', '기록은 여기까지다.',
      '점수', '다시 보기', '기록', '닫기', '재생', '멈춤', '다음 행동', '{0}배', '건너뛰기', '결과',
      '막음', '바로 행동', '다음 선두', '적 전체', '아군 전체', '라운드 정리', '효과 없음', '패시브', 'VS', '숙련 {0}단계', '최다 피해', '{0}소대', '승', '패', '상대 남은 {0}명',
      '점수 {0}', '{0}분', '{0}시간', '획득', '코어', '합금', '부품', '연료', '프리즘', '소대전', '피해', '쓰러짐', '스킬 {0}', '치명 {0}', '내 편', '상대', '기록이 잘려 마지막 상태로 건너뛰었다', '모함', '남은 소대', '무승부', '{0}라운드까지', '라운드마다 최대 체력의 {0}%', '명중', '속도', '적', '아군', '다음 차례 앞당김', '뒤로', '다음', '격벽']
  };

  /* 박자 기본 시간(ms). plan 이 판마다 배율(TIME.min~TIME.max)을 곱해 전체를 TIME.target 가까이에 맞춘다. */
  /* 2026-11-13 사용자 「강도는 좋고 1배가 너무 빠르다」: 목표 62초(배율 0.5~1.6)에서 90초(배율 0.8~1.1)로.
     전에는 촘촘한 판을 절반까지 줄여 재생했다. 이제 1배는 박자 기본 시간에 가깝고, 빨리 보려면 2배 4배를 쓴다. */
  const TIME = {target: 90000, min: 0.8, max: 1.1,
    intro: 1700, outro: 1900, trunc: 1500, final: 900,
    cutin: 580, support: 320, strike: 430, area: 600, pursuit: 360, counter: 300, fx: 460, aura: 400, finish: 1700,
    tick: 360, tidy: 140, skip: 400, snap: 100, round: 380,
    floorIntro: 950, floorOutro: 1100, floorFinal: 500, floorFrame: 60, floorFinish: 700, pace: 0.7};

  /* 연출 표. 판정 규칙이 아니라 보이는 꼴만 정한다.
     RANGED: 설계서 3-1절의 역할에서 쏘는 클래스와 지원형은 원거리형(제자리에서 반동하며 탄을 쏜다).
       표에 없는 클래스(불워크 브리처 팔랑크스 프레이터처럼 몸으로 받아 내고 뚫는 쪽)는 근접형(돌진해 부딪힌다).
     MOVE: 움직임 꼴마다 [카드 움직임 클래스, 닿는 시각(기본 속도 ms), 대상 쪽으로 가는 거리(두 카드 사이 거리의 몫)].
     KNOCK: 맞는 세기마다 [반응 클래스, 밀리는 거리(카드 폭의 몫), 기우는 각도]. HEAVY LIGHT 는 세기를 가르는 피해(천분율). */
  const RANGED = {striker: 1, pathfinder: 1, jammer: 1, carrier: 1, medic: 1, siege: 1, flagship: 1};
  const MOVE = {melee: ['dp-lunge', 240, 0.72], meleeCrit: ['dp-lungec', 240, 0.74], combo: ['dp-lunge2', 150, 0.72],
    ranged: ['dp-shot', 210, 0], counter: ['dp-riposte', 120, 0.62], chase: ['dp-chase', 207, 0.74]};
  const KNOCK = {light: ['dp-hit1', 0.05, 2], mid: ['dp-hit', 0.1, 4], heavy: ['dp-hit3', 0.16, 6], crit: ['dp-hitc', 0.2, 8], ko: ['dp-ko', 0.3, 7]};
  const HEAVY = 240, LIGHT = 90, FLIGHT = 90, STAGGER = 55, SUPPORT_HIT = 130;   /* SUPPORT_HIT: 모함 탄이 닿는 시각(기본 속도 ms) */
  const HP_BASE = 1000;

  function fill(s, v) {
    s = String(s);
    return v ? s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? String(v[k]) : m; }) : s;
  }
  function sideOf(w) { return w === 'd' || w === 1 || w === '1' ? 1 : 0; }
  /* 판 크기(2026-11-16 함대전 「모함 한 척 = 한 소대」). 한 편 소녀 번호 폭 size 와 모함 번호 ships([공격 편, 방어 편]).
     소대전(bout)의 size shipIds 가 먼저고, 없으면 보고서(report)의 값, 그것도 없으면 5 와 [10, 11](정예 대전, 옛 함대전).
     size 만 있으면 모함 번호는 엔진 규칙(2 × size + 편)으로 센다. 소녀 번호는 늘 편 × size + 자리다. */
  const BASE = {size: SQUAD, ships: [2 * SQUAD, 2 * SQUAD + 1]};
  function dims(bout, report) {
    function take(key, ok) { return bout && ok(bout[key]) ? bout[key] : report && ok(report[key]) ? report[key] : null; }
    const size = take('size', function (v) { return typeof v === 'number' && v > 0 && Math.floor(v) === v; });
    const ids = take('shipIds', function (v) { return Array.isArray(v) && typeof v[0] === 'number' && typeof v[1] === 'number'; });
    if (!size && !ids) return BASE;
    const n = size || SQUAD;
    return {size: n, ships: ids ? [ids[0], ids[1]] : [2 * n, 2 * n + 1]};
  }
  /* 모함 번호면 그 편(0 1), 아니면 -1 */
  function shipSide(d, n) { return n === d.ships[0] ? 0 : n === d.ships[1] ? 1 : -1; }
  function numSide(d, n) { const s = shipSide(d, n); return s >= 0 ? s : n >= d.size ? 1 : 0; }

  /* units 의 배열 자리마다 log 번호. 판정 엔진은 번호를 편×5+자리(한 척 판은 편×size+자리)로 매기고 final 을 units 와 같은 순서로 낸다.
     소대가 그 폭보다 적으면 배열 자리와 번호가 달라지므로 final 의 번호를 믿고, 없으면 편×폭+자리로 센다.
     report 는 판 크기를 소대전에 싣지 않은 보고서에서만 쓴다(없어도 된다). */
  function nums(bout, report) {
    const units = bout.units || [], fin = bout.final || [], pos = [0, 0], out = [], size = dims(bout, report).size;
    const useFinal = fin.length === units.length;
    for (let k = 0; k < units.length; k++) {
      const side = units[k].side ? 1 : 0;
      out.push(useFinal && fin[k] && typeof fin[k][0] === 'number' ? fin[k][0] : side * size + pos[side]);
      pos[side]++;
    }
    return out;
  }

  /* 상태: {round, u:{번호:{n, k, side, hp, sh, fx:[{e, v, until, by}], down}}, order:[번호]} 체력과 방어막은 기록의 눈금 그대로다.
     판 크기가 기본값(5 와 [10, 11])이 아닌 소대전만 상태에 dim 을 싣는다. apply 와 settle 이 그 값으로 번호의 편과 모함을 가른다. */
  function fresh(bout, report) {
    const order = nums(bout, report), units = bout.units || [], st = {round: 0, u: {}, order: order}, d = dims(bout, report);
    if (d !== BASE) st.dim = d;
    if (bout.hpBase) st.hpBase = bout.hpBase;
    for (let k = 0; k < order.length; k++) st.u[order[k]] = {n: order[k], k: k, side: units[k].side ? 1 : 0, hp: st.hpBase || HP_BASE, sh: 0, fx: [], down: false};
    /* 이어 싸운 소대는 앞 소대전에서 남긴 체력과 방어막으로 시작한다(start 가 있을 때만). */
    (bout.start || []).forEach(function (row) {
      const u = row ? st.u[row[0]] : null;
      if (!u || typeof row[1] !== 'number') return;
      u.hp = row[1]; u.sh = typeof row[2] === 'number' ? row[2] : 0; u.down = u.hp <= 0;
    });
    return st;
  }
  function unit(st, n) {
    const d = st.dim || BASE;
    if (!st.u[n]) { st.u[n] = {n: n, k: -1, side: numSide(d, n), hp: st.hpBase || HP_BASE, sh: 0, fx: [], down: false}; if (shipSide(d, n) < 0) st.order.push(n); }
    return st.u[n];
  }
  function fxAt(u, e) {
    for (let i = 0; i < u.fx.length; i++) if (u.fx[i].e === e) return i;
    return -1;
  }
  /* 겹침은 효과 줄의 마지막 문자열로만 읽는다. src 생략 여부와 옛 줄의 길이로 추정하지 않는다. */
  function overlap(L) {
    if (!Array.isArray(L) || L[3] !== OP.effect) return '';
    const last = L[L.length - 1];
    return last === 'overwrite' || last === 'extend' ? last : '';
  }
  function lineLength(L) { return L.length - (overlap(L) ? 1 : 0); }
  function sourceSlot(L) {
    const op = L[3];
    return op === OP.hit ? 10 : op === OP.heal ? 7 : op === OP.effect ? (L[4] === EFFECT.cleanse ? 5 : L[4] === EFFECT.shield ? 8 : 7) : op === OP.skill ? (L[2] === -1 && typeof L[4] === 'number' ? 6 : 4) : op === OP.supply ? 6 : op === OP.expire ? 5 : -1;
  }
  function sourceTuple(L) {
    const at = sourceSlot(L);
    if (at < 0 || lineLength(L) !== at + 1) return null;
    const x = L[at];
    return Array.isArray(x) && x.length === 3 && Number.isInteger(x[0]) && typeof x[1] === 'string' && Number.isInteger(x[2]) ? x : null;
  }
  function apply(st, L) {
    const op = L[3];
    let t, i;
    st.round = L[0];
    if (op === OP.hit) {
      t = unit(st, L[2]); t.hp = L[5]; t.sh = L[6]; t.down = t.hp <= 0;
    } else if (op === OP.effect) {
      t = unit(st, L[2]);
      if (L[4] !== EFFECT.cleanse) {
        i = fxAt(t, L[4]);
        const mode = overlap(L), src = mode === 'overwrite' ? sourceTuple(L) : null;
        if (i >= 0) {
          t.fx[i].v = L[5]; t.fx[i].until = L[6];
          if (mode === 'overwrite') t.fx[i].by = src ? src[2] : L[1];
        } else t.fx.push({e: L[4], v: L[5], until: L[6], by: mode === 'extend' ? null : src ? src[2] : L[1]});
      }
      if (L[4] === EFFECT.shield) t.sh = L[5];
    } else if (op === OP.heal) {
      t = unit(st, L[2]); t.hp = L[5]; t.down = t.hp <= 0;
    } else if (op === OP.expire) {
      t = unit(st, L[1] >= 0 ? L[1] : L[2]);
      i = fxAt(t, L[4]);
      if (i >= 0) t.fx.splice(i, 1);
      if (L[4] === EFFECT.shield) t.sh = 0;
    } else if (op === OP.snapshot) {
      const rows = L[4] || [];
      for (i = 0; i < rows.length; i++) { t = unit(st, rows[i][0]); t.hp = rows[i][1]; t.sh = rows[i][2]; t.down = t.hp <= 0; }
    }
    return st;
  }
  /* 끝 상태로 맞춘다. 잘린 기록(truncated)이나 건너뛰기에서 쓴다. */
  function settle(st, bout) {
    const fin = bout.final || [];
    for (let i = 0; i < fin.length; i++) {
      const t = unit(st, fin[i][0]);
      t.hp = fin[i][1]; t.sh = fin[i][2]; t.down = t.hp <= 0;
      if (t.down) t.fx.length = 0;
    }
    return st;
  }

  /* 기록의 각 공격 줄을 화면 피해 숫자와 같은 단위로 더한다. 판정이나 피해 공식을 계산하지 않는다.
     후보는 units 의 소녀뿐이라 모함(번호 10 11, 한 척 판은 30 31)이 쏜 줄은 누구 몫으로도 세지 않는다.
     side 는 0(공격) 또는 1(방어), 생략하면 보고서를 보는 편. 동률은 소대전과 units 에 먼저 나온 소녀. */
  function mvp(report, side, eligible) {
    report = report || {};
    side = side == null ? (report.attacking ? 0 : 1) : sideOf(side);
    const girls = ((side ? report.d : report.a) || {}).girls || [], candidates = [];
    const chain = report.chain === true, same = {};   /* 이어 싸우기 판은 같은 소녀(편 안에서 번호가 같다)가 여러 소대전에 나온다. 그 몫을 한 후보에 더하고 초상은 처음 나온 소대전의 카드를 쓴다 */
    (report.bouts || []).forEach(function (bo, b) {
      const order = nums(bo, report), units = bo.units || [], by = {};
      units.forEach(function (u, k) {
        if ((u.side ? 1 : 0) !== side) return;
        if (chain && same[u.id]) { by[order[k]] = same[u.id]; return; }
        const c = {girl: girls.find(function (g) { return g.id === u.id; }) || {id: u.id, name: '?', cls: u.cls}, bout: b, n: order[k], damage: 0};
        if (eligible && !eligible(c, u)) return;
        by[order[k]] = c; candidates.push(c);
        if (chain) same[u.id] = c;
      });
      (bo.log || []).forEach(function (L) {
        if (L[3] !== OP.hit || !(L[4] > 0) || !by[L[1]]) return;
        const target = units[order.indexOf(L[2])];
        if (!target) return;
        by[L[1]].damage += hpAmount(Number(target.maxHp) || 0, L[4], bo.hpBase);
      });
    });
    let best = null;
    candidates.forEach(function (c) { if (c.damage > 0 && (!best || c.damage > best.damage)) best = c; });
    return best;
  }
  function hpAmount(max, v, hpBase = HP_BASE) {
    if (!(max > 0)) return v;
    const amount = Math.round(v * max / hpBase);
    return v > 0 ? Math.max(1, amount) : amount;
  }
  function comma(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function endState(bout, report) {
    const state = fresh(bout, report);
    (bout.log || []).forEach(function (L) { apply(state, L); });
    return settle(state, bout);
  }

  function isVolley(L) { return L && L[2] === -1 && L[3] === OP.skill && L[4] === 'flagship' && Number.isInteger(L[5]) && L[5] > 0; }

  /* 한 소대전의 log 를 박자로 묶는다.
     박자 = {kind, actor, round, lines:[줄 번호], frames:[{type, lines:[줄 번호], hits, heavy}]}
     kind: skill(스킬 발동과 그 효과), supply(캐리어 보급 스킬), attack(스킬 없는 공격), skip(기절), cleanup(라운드 끝 정리), snapshot(라운드 끝 상태).
       모함(번호 10 11, 한 척 판은 30 31)이 시설을 쓴 박자도 skill 이다. 그 첫 장면은 support 표시가 붙은 짧은 cutin 이고(컷인 띠 없이 모함 띠만 밝아진다) 줄 없는 aura 장면을 덧붙이지 않는다.
       소대가 처음 나설 때의 격벽 방어막은 라운드 0 의 cleanup 박자로 묶인다.
       그 소대전에서 그 편의 그 시설이 처음 움직이는 장면에는 lead:[[편, 시설 열쇠], …] 가 붙는다(스킬 줄의 시설, 라운드 0 방어막은 격벽). 담당 소녀 컷인을 띄울 자리이고
       띄울지는 plan 의 opts.facilityCut 이 정한다. 라운드 0 은 두 편의 격벽이 한 장면에 들 수 있어 목록이다. 모함이 없는 판에는 이 칸이 없다.
     frames 는 한 박자 안에서 차례로 터지는 장면. 같은 frame 의 줄은 같이 터진다(포격 같은 광역).
     type: cutin(스킬 줄), strike(공격), counter(반격), fx(효과 회복 보급), aura(줄 없는 스킬의 연출 자리), tick(정리), skip, snap.
     판정 엔진(api/duel.js)이 줄을 내는 순서를 그대로 따른다:
       방어막이 다 닳으면 expire 가 그 hit 줄 바로 앞에 나온다. 기절은 expire 뒤에 skip 이 나온다.
       화상 피해는 불을 붙인 소녀가 행동자인 hit 줄로 라운드 끝에 나온다. 패시브 회복도 라운드 끝.
       남의 차례 중간에 나오는 effect 줄은 패시브(프레이터 잔해 회수, 팔랑크스 철벽). */
  function boutBeats(bout, report) {
    const log = bout.log || [], st = fresh(bout, report), out = [], dm = dims(bout, report);
    function supportNum(n) { return shipSide(dm, n) >= 0; }
    let cur = null, round = null, acted = {}, ending = false, carry = -1, L = null;
    const burnBy = {}, moved = {};
    /* 시설의 첫 움직임을 그 장면에 적는다. 같은 소대전에서 그 편의 그 시설이 다시 움직이면 적지 않는다 */
    function lead(f, a, key) {
      if (!key || !TEXT.facility[key] || moved[a + key]) return;
      moved[a + key] = 1;
      (f.lead || (f.lead = [])).push([numSide(dm, a), key]);
    }
    function open(kind, actor) {
      cur = {kind: kind, actor: actor, round: L[0], lines: [], frames: [], hit: {}, area: null, last: null, fx: null, heal: false, clean: false, done: false};
      out.push(cur);
      return cur;
    }
    function frame(type) {
      const f = {type: type, lines: [], hits: 0, heavy: false, tg: {}, pursuit: false, support: false};
      cur.frames.push(f);
      return f;
    }
    function place(f, i) {
      if (carry >= 0) { f.lines.push(carry); cur.lines.push(carry); carry = -1; }
      f.lines.push(i); cur.lines.push(i);
    }
    function fxFrame() { return cur.fx || (cur.fx = frame('fx')); }
    function tidy() {
      if (!cur || cur.kind !== 'cleanup') { open('cleanup', -1); cur.fx = frame('tick'); }
      return cur.fx;
    }
    function turn() { return cur && (cur.kind === 'skill' || cur.kind === 'supply' || cur.kind === 'attack'); }
    function onlyCountersAfter(f) {
      for (let j = cur.frames.indexOf(f) + 1; j < cur.frames.length; j++) if (cur.frames[j].type !== 'counter') return false;
      return true;
    }
    for (let i = 0; i < log.length; i++) {
      L = log[i];
      const a = L[1], tg = L[2], op = L[3], nx = log[i + 1];
      let f;
      if (L[0] !== round) { round = L[0]; acted = {}; ending = false; cur = null; }
      if (op === OP.snapshot) {
        open('snapshot', -1); place(frame('snap'), i); cur = null;
      } else if (isVolley(L) && i + L[5] < log.length) {
        /* 거함 기록의 일제 사격은 뒤에 붙은 시설, 부위 타격과 반격까지 한 장면이다. */
        open('skill', a); acted[a] = 1; f = frame('strike'); place(f, i);
        const end = i + L[5];
        for (; i < end;) {
          const row = log[++i];
          if (row[3] === OP.hit && row[1] === a) f.hits++;
          place(f, i); apply(st, row);
        }
        cur = null;
        continue;
      } else if (op === OP.skill) {
        ending = false; open('skill', a); acted[a] = 1; f = frame('cutin'); f.support = supportNum(a); place(f, i);
        if (f.support) lead(f, a, FACILITY[L[4]]);
      } else if (op === OP.skip) {
        if (!(cur && cur.kind === 'skip' && cur.actor === a && !cur.done)) { ending = false; open('skip', a); cur.fx = frame('skip'); }
        place(cur.fx, i); cur.done = true; acted[a] = 1;
      } else if (op === OP.expire) {
        const same = nx && nx[0] === L[0];
        if (L[4] === EFFECT.stun && same && nx[3] === OP.skip && nx[1] === a) {
          ending = false; open('skip', a); cur.fx = frame('skip'); place(cur.fx, i);
        } else if (L[4] === EFFECT.shield && same && nx[3] === OP.hit && nx[2] === a && carry < 0) {
          carry = i;   /* 다음 hit 과 같은 장면에 넣는다 */
        } else if (!ending && cur && cur.kind === 'skill' && cur.heal && !cur.clean) {
          place(fxFrame(), i);   /* 메딕 긴급 수리의 정화 */
        } else {
          ending = true; place(tidy(), i);
        }
      } else if (op === OP.effect) {
        if (ending || !turn()) { f = tidy(); if (supportNum(a)) f.heavy = true; place(f, i); }   /* 모함이 건 효과는 읽을 틈을 준다 */
        else {
          if (a === cur.actor && cur.area && cur.area.tg[tg]) f = cur.area;
          else if (cur.last) f = cur.last;
          else f = fxFrame();
          place(f, i);
          if (L[4] === EFFECT.cleanse && a === cur.actor) cur.clean = true;
        }
        if (supportNum(a) && L[0] === 0 && L[4] === EFFECT.shield) lead(f, a, 'hull');   /* 소대를 내보내며 거는 격벽 방어막 */
      } else if (op === OP.heal) {
        if (!ending && cur && cur.kind === 'skill' && a === cur.actor && !cur.heal && !cur.clean && !cur.last) {
          cur.heal = true; place(fxFrame(), i);
        } else {
          ending = true; f = tidy(); f.heavy = true; place(f, i);
        }
      } else if (op === OP.supply) {
        if (!ending && cur && cur.kind === 'skill' && a === cur.actor) cur.kind = 'supply';
        else { ending = false; open('supply', a); acted[a] = 1; }
        place(fxFrame(), i);
      } else if (op === OP.hit) {
        const fl = L[7] || 0;
        if (fl & FLAG.counter) {
          if (ending || !turn()) { f = tidy(); f.heavy = true; f.hits++; place(f, i); }
          else { f = frame('counter'); f.hits = 1; f.tg[tg] = 1; cur.last = f; place(f, i); }
        } else {
          const su = supportNum(a) ? ALIVE : st.u[a], mine = !ending && turn() && cur.actor === a;
          const burn = !(fl & FLAG.pursuit) && burnBy[tg] === a &&
            (ending || !su || su.down || (!!acted[a] && !(mine && cur.kind === 'skill' && !cur.hit[tg])));
          if (burn) {
            ending = true; f = tidy(); f.heavy = true; f.hits++; place(f, i);
          } else if (mine && (cur.kind === 'skill' || (fl & FLAG.pursuit))) {
            const area = cur.area;
            if (area && !(fl & FLAG.pursuit) && !area.pursuit && !area.tg[tg] && onlyCountersAfter(area)) f = area;
            else { f = frame('strike'); f.pursuit = !!(fl & FLAG.pursuit); cur.area = f; }
            f.tg[tg] = 1; f.hits++; cur.hit[tg] = 1; cur.last = f; place(f, i);
          } else {
            ending = false; open('attack', a); acted[a] = 1;
            f = frame('strike'); f.pursuit = !!(fl & FLAG.pursuit); f.tg[tg] = 1; f.hits = 1;
            cur.area = f; cur.last = f; cur.hit[tg] = 1; place(f, i);
          }
        }
      } else {
        place(tidy(), i);   /* 모르는 줄도 빠뜨리지 않는다 */
      }
      if (op === OP.effect && L[4] === EFFECT.burn && (overlap(L) === 'overwrite' || !overlap(L) && burnBy[tg] == null)) {
        const src = sourceTuple(L); burnBy[tg] = overlap(L) === 'overwrite' && src ? src[2] : a;
      }
      if (op === OP.expire && L[4] === EFFECT.burn) delete burnBy[a];
      apply(st, L);
    }
    if (carry >= 0) { L = log[carry]; const i2 = carry; carry = -1; place(tidy(), i2); }
    /* 소대전을 끝내는 마지막 쓰러짐 장면에 fin 을 적는다(느린 화면 연출 자리). 시간 초과나 잘린 기록, 화상 피해로 끝난 판에는 없다. */
    let finF = null;
    if (!bout.timeout && !bout.truncated) {
      for (let k = out.length - 1; k >= 0 && !finF; k--) for (let j = out[k].frames.length - 1; j >= 0 && !finF; j--) {
        const f = out[k].frames[j];
        if (f.lines.some(function (i) { return log[i][3] === OP.hit && log[i][4] > 0 && log[i][5] <= 0; })) finF = f;
      }
      if (finF && finF.type !== 'strike' && finF.type !== 'counter') finF = null;
    }
    return out.map(function (b) {
      const frames = b.frames.map(function (f) {
        const o = {type: f.type, lines: f.lines, hits: f.hits, heavy: f.heavy, pursuit: f.pursuit};
        if (f === finF) o.fin = true;
        if (f.support) o.support = true;
        if (f.lead) o.lead = f.lead;
        return o;
      });
      if (b.kind === 'skill' && frames.length === 1 && frames[0].type === 'cutin' && !supportNum(b.actor)) frames.push({type: 'aura', lines: [], hits: 0, heavy: false, pursuit: false});
      return {kind: b.kind, actor: b.actor, round: b.round, lines: b.lines, frames: frames};
    });
  }
  function beats(report) {
    return ((report && report.bouts) || []).map(function (bo) { return boutBeats(bo, report); });
  }

  /* 라운드 요약도 재생 박자와 apply 만 읽는다. 줄 직전과 직후 체력, 직후 방어막, 쓰러짐 전환을 한 번 보관한다.
     소대전마다 {rounds:[{round, beats:[박자 자리], fallen:[번호], skills, crit}], rows, final, truncated}.
     잘린 기록은 부분 행동을 보이지 않고 끝 상태만 쓴다. 원본 보고서와 박자는 바꾸지 않는다. */
  function rounds(report, all) {
    all = all || beats(report);
    return ((report && report.bouts) || []).map(function (bo, b) {
      const st = fresh(bo, report), list = [], rows = {}, providers = {}, dm = dims(bo, report);
      if (!bo.truncated) (all[b] || []).forEach(function (bt, k) {
        let r = list[list.length - 1];
        if (!r || r.round !== bt.round) { r = {round: bt.round, beats: [], fallen: [], skills: 0, crit: 0}; list.push(r); }
        if (bt.kind !== 'snapshot') r.beats.push(k);
        bt.lines.forEach(function (i) {
          const L = bo.log[i], n = L[3] === OP.expire || L[3] === OP.skip ? L[1] : L[2];
          const before = st.u[n], down = before ? before.down : false, preHp = before ? before.hp : null;
          const mode = overlap(L), key = n + ':' + L[4];
          if (L[3] === OP.effect && L[4] !== EFFECT.cleanse && mode !== 'extend') providers[key] = {cause: source(L, bo.srcLog), owner: L[1]};
          const provider = providers[key], effectLabel = L[3] === OP.expire ? overlapEffectName(L, st) : null;
          apply(st, L);
          const u = st.u[n], fallen = !!u && !down && u.down;
          rows[i] = {effectLabel: effectLabel, fallen: fallen, before: preHp, hp: u ? u.hp : null, sh: u ? u.sh : null};
          if (mode) {
            rows[i].valueCause = provider ? provider.cause : null;
            rows[i].valueProvider = provider ? provider.cause ? provider.cause.owner : provider.owner : null;
          }
          if (L[3] === OP.expire) delete providers[key];
          if (fallen && r.fallen.indexOf(n) < 0) r.fallen.push(n);
          if (shipSide(dm, L[1]) >= 0) return;   /* 스킬과 치명 수는 소녀만 센다 */
          if (L[3] === OP.skill) r.skills++;
          if (L[3] === OP.hit && (L[7] & FLAG.crit)) r.crit++;
        });
      });
      if (bo.truncated) (bo.log || []).forEach(function (L) { apply(st, L); });
      settle(st, bo);
      return {rounds: list, rows: rows, final: st, truncated: !!bo.truncated};
    });
  }
  /* 조사 선택은 글만 다루는 순수 함수다. 숫자는 마지막 숫자의 한국어 읽기(영 일 이 삼 사 오 육 칠 팔 구), 영문은 끝 글자 L M N R 의 받침을 따른다. */
  function particles(text) {
    return String(text).replace(/(\(이\)가|\(을\)를|\(은\)는|\(으\)로|\(와\)과)/g, function (mark, group, at, whole) {
      const ch = whole.slice(0, at).trim().slice(-1), code = ch.charCodeAt(0);
      const tail = code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 : /[013678]/.test(ch) && ch ? ({0: 21, 1: 8, 3: 16, 6: 1, 7: 8, 8: 8}[ch]) : /[LMNR]/i.test(ch) && ch ? (/[LR]/i.test(ch) ? 8 : 16) : 0;
      if (mark === '(으)로') return tail && tail !== 8 ? '으로' : '로';
      return ({'(이)가': tail ? '이' : '가', '(을)를': tail ? '을' : '를', '(은)는': tail ? '은' : '는', '(와)과': tail ? '과' : '와'})[mark];
    });
  }
  function uniqueSentences(items, ctx) {
    const seen = new Set();
    return items.filter(function (item) { const text = sentenceText(item, ctx && ctx.t); if (seen.has(text)) return false; seen.add(text); return true; });
  }
  function sentence(key, values) { return {key: key, values: values || {}}; }
  /* 번역한 완전한 틀을 값 토큰과 글 토큰으로 나눈다. HTML 이 아닌 textContent 로만 표시한다.
     번역 함수에는 이름 자리도 그대로 넘긴다. _t 는 이름 자리 표시를 지원한다. */
  function sentenceParts(item, translate) {
    const values = item.values, slots = {};
    Object.keys(values).forEach(function (k) { slots[k] = '{' + k + '}'; });
    const template = (translate || fill)(TEXT.log[item.key], slots), parts = [];
    const re = /\{(\w+)\}(\(이\)가|\(을\)를|\(은\)는|\(으\)로|\(와\)과)?/g;
    let m, at = 0;
    while ((m = re.exec(template))) {
      if (m.index > at) parts.push({text: template.slice(at, m.index)});
      const value = values[m[1]], text = value == null ? '' : String(value);
      parts.push({text: text, name: ['a', 't', 'ship'].indexOf(m[1]) >= 0});
      if (m[2]) parts.push({text: particles(text + m[2]).slice(text.length)});
      at = re.lastIndex;
    }
    if (at < template.length) parts.push({text: template.slice(at)});
    return parts;
  }
  function sentenceText(item, translate) { return sentenceParts(item, translate).map(function (p) { return p.text; }).join(''); }
  function detailArray(L) {
    const at = L[3] === OP.hit ? 9 : L[3] === OP.heal ? 6 : L[3] === OP.effect && L[4] === EFFECT.shield ? 7 : -1;
    return at >= 0 && lineLength(L) > at ? L[at] : null;
  }
  function detailParts(L, head) {
    if (!head || head.v !== 1 || !Array.isArray(head.codes) || !(head.scale > 0)) return [];
    const xs = detailArray(L);
    return Array.isArray(xs) ? xs.filter(function (x) { return Array.isArray(x) && Number.isFinite(x[2]); }).map(function (x) { return {key: head.codes[x[0]], value: x[1], delta: x[2]}; }) : [];
  }
  /* 마지막 칸만 읽는다. 내역은 배열의 배열이며 기존 숫자 칸은 원인이 될 수 없다. */
  function source(L, head) {
    if (!head || head.v !== 1 || !Array.isArray(head.codes) || !Array.isArray(L)) return null;
    const x = sourceTuple(L);
    if (!x) return null;
    const kind = head.codes[x[0]];
    if (['skill', 'instinct', 'branch', 'tactic', 'ship', 'support', 'laststand', 'ally'].indexOf(kind) < 0) return null;
    const bits = x[1].split(':');
    return {kind: kind, key: x[1], owner: x[2], id: bits[0], slot: bits[1] || ''};
  }
  function activationSources(action, ctx) {
    const found = [], seen = {};
    (action.lines || []).forEach(function (L) {
      const s = source(L, ctx.srcHead);
      if (!s || ['instinct', 'branch', 'laststand'].indexOf(s.kind) < 0 && !(s.kind === 'skill' && s.slot !== 'active')) return;
      if (L[3] === OP.expire || action.kind === 'cleanup' && L[3] === OP.heal && s.slot !== 'passive' || L[3] === OP.hit && (detailParts(L, ctx.head).some(function (p) { return p.key === 'burn'; }) || action.kind === 'cleanup' && !detailParts(L, ctx.head).length)) return;
      const key = s.kind + ':' + s.key + ':' + s.owner;
      if (!seen[key]) { seen[key] = true; found.push(s); }
    });
    return found;
  }
  function originSentence(s, ctx) {
    const tr = ctx.t || fill, person = (ctx.people || {})[s.owner];
    if (!person) return null;
    const v = {a: person.name, ship: person.name, s: ctx.skill || tr(TEXT.op[2])};
    if (s.kind === 'instinct') return sentence('instinct', v);
    if (s.kind === 'laststand') return sentence('laststand');
    if (s.kind === 'skill') { v.c = typeof ctx.clsName === 'function' ? ctx.clsName(s.id) : tr(TEXT.op[2]); return sentence('passive', v); }
    let x = ''; try { x = typeof ctx.jobName === 'function' ? ctx.jobName(s.id) : ''; } catch (e) { x = ''; }
    if (typeof x !== 'string') x = '';
    v.x = x; v.f = tr(TEXT.facility[s.slot] || TEXT.op[2]);
    const kind = FACILITY.indexOf(s.slot) >= 0 ? 'Facility' : s.slot === 'feat' ? 'Feat' : s.slot === 'active' ? 'Active' : 'Passive';
    return sentence(x ? 'branch' + kind : kind === 'Facility' ? 'branchFacilityPlain' : kind === 'Feat' ? 'branchFeatPlain' : 'branchPlain', v);
  }
  /* 첫 자리는 행동 주인에게 고정한다. 지원하는 원인이 없는 옛 판은 기존 선택을 그대로 쓴다. */
  /* 명중과 속도는 양수를 빼는 종류, 회피는 양수를 더하는 종류다. 만료는 값이 없으면 사라지기 직전 상태를 읽는다. */
  function overlapEffectName(L, st) {
    const e = L[4], u = st && st.u[L[1] >= 0 ? L[1] : L[2]], fx = u && u.fx.find(function (x) { return x.e === e; });
    const v = L[3] === OP.expire ? typeof L[5] === 'number' && isFinite(L[5]) ? L[5] : fx && fx.v : L[5];
    if ([12, 13, 14].indexOf(e) >= 0 && typeof v === 'number' && isFinite(v) && v !== 0) {
      return TEXT.overlapEffect[({12: 'accuracy', 13: 'speed', 14: 'evade'})[e] + (e === 14 ? v > 0 ? 'Up' : 'Down' : v > 0 ? 'Down' : 'Up')];
    }
    return TEXT.effect[e] || ({12: '명중', 13: '속도', 14: TEXT.flag[2], 15: TEXT.dmg.weak})[e] || TEXT.op[3];
  }
  function overlapSentences(action, ctx) {
    const tr = ctx && ctx.t || fill;
    return uniqueSentences((action.lines || []).filter(function (L) { return overlap(L) === 'overwrite'; }).map(function (L) {
      return sentence(overlap(L), {e: tr(overlapEffectName(L))});
    }), ctx);
  }
  function narrate(action, ctx) {
    const base = narrateCore(action, ctx);
    const extra = overlapSentences(action, ctx);
    return extra.length ? uniqueSentences(base.concat(extra), ctx).slice(0, 3) : base;
  }
  function narrateCore(action, ctx) {
    ctx = ctx || {};
    const base = narrateBase(action, ctx);
    if (!ctx.srcHead || ctx.srcHead.v !== 1 || !Array.isArray(ctx.srcHead.codes)) return base;
    const lines = action.lines || [], causes = activationSources(action, ctx);
    if (!lines.some(function (L) { return source(L, ctx.srcHead); })) return base;
    const items = causes.map(function (s) { return {src: s, item: originSentence(s, ctx)}; }).filter(function (x) { return x.item; });
    if (!items.length && action.kind === 'cleanup') return base;
    const same = function (a, b) { return a && b && a.kind === b.kind && a.key === b.key && a.owner === b.owner; };
    const skill = lines.find(function (L) { return L[3] === OP.skill && L[1] === action.actor; });
    const lead = skill && source(skill, ctx.srcHead);
    const volley = ctx.hpBase && isVolley(lines[0]);
    const ownHits = lines.filter(function (L) { return L[3] === OP.hit && L[1] === action.actor && (volley || !(L[7] & FLAG.counter)); });
    const hits = ownHits.length ? ownHits : lines.filter(function (L) { return L[3] === OP.hit && (action.kind === 'cleanup' || L[1] === action.actor); });
    const onlyActivation = !skill && hits.every(function (L) {
      const s = source(L, ctx.srcHead);
      return s && s.owner === action.actor && (s.kind === 'instinct' || s.slot === 'passive');
    });
    const primary = items.find(function (x) { return same(x.src, lead) && (lead.kind === 'laststand' || lead.kind === 'branch' && lead.slot === 'active'); }) ||
      (onlyActivation || action.kind === 'cleanup' ? items.find(function (x) { return action.kind === 'cleanup' || x.src.owner === action.actor; }) : null);
    if (primary && primary.src.kind === 'laststand') {
      const dead = Array.from(new Set(hits.filter(function (L) { return L[4] > 0 && L[5] === 0; }).map(function (L) { return L[2]; })));
      const result = dead.length ? [dead.length > 1 ? sentence('areaFallen', {k: dead.length}) : sentence('fallen', {t: ((ctx.people || {})[dead[0]] || {}).name})] : base.filter(function (x) { return ['areaDamage', 'areaBlocked', 'areaAllBlocked'].indexOf(x.key) >= 0; }).slice(0, 1);
      return [primary.item, sentence('laststandFire', {ship: ctx.ship || ((ctx.people || {})[primary.src.owner] || {}).name})].concat(result);
    }
    const attached = items.filter(function (x) { return x !== primary; });
    const firstHit = hits.length ? lines.indexOf(hits[0]) : -1;
    const mainLines = lines.filter(function (L) {
      const s = source(L, ctx.srcHead);
      if (L[3] === OP.hit && hits.indexOf(L) >= 0) return true;
      if (same(s, lead)) return true;
      if (L[3] === OP.effect && s && s.owner === action.actor && firstHit >= 0 && lines.indexOf(L) < firstHit) return true;
      if (action.kind === 'cleanup' && L[3] === OP.heal) return true;
      return !attached.some(function (x) { return same(x.src, s); });
    });
    const death = onlyActivation && hits.some(function (L) { return detailParts(L, ctx.head).some(function (p) { return p.key === 'death'; }); });
    const main = narrateBase({kind: death ? 'cleanup' : action.kind, actor: action.actor, lines: mainLines}, ctx, true);
    const first = primary ? primary.item : main[0];
    if (!first) return base;
    const resultKeys = ['fallen', 'evade', 'areaFallen', 'areaEvade', 'bossFallen'];
    const minorKeys = ['expire', 'areaExpire'].concat(primary && !hits.length ? [] : ['refresh', 'areaRefresh', 'areaRefreshPlain']);
    const reasonKeys = ['grow', 'growBy', 'stack', 'reduce', 'reduceBy', 'shieldBlock', 'blocked'];
    const rest = primary ? main.filter(function (x, i) { return i > 0 || action.kind === 'cleanup' || onlyActivation; }) : main.slice(1);
    /* 같은 대상의 뒤 타격도 읽는다. 딸린 반격이나 포성의 대상은 원래 공격 대상에 섞지 않는다. */
    const targets = Array.from(new Set(hits.map(function (L) { return L[2]; })));
    const dead = targets.filter(function (n) { return hits.some(function (L) { return L[2] === n && L[5] === 0; }); });
    const evaded = targets.filter(function (n) { return hits.some(function (L) { return L[2] === n && L[7] & FLAG.evade; }); });
    const results = dead.length ? [volley ? sentence('bossFallen', {k: dead.length}) : targets.length === 1 ? sentence('fallen', {t: ((ctx.people || {})[dead[0]] || {}).name}) : sentence('areaFallen', {k: dead.length})] :
      evaded.length ? [targets.length === 1 ? sentence('evade', {t: ((ctx.people || {})[evaded[0]] || {}).name}) : sentence('areaEvade', {k: evaded.length})] : [];
    const effects = rest.filter(function (x) { return resultKeys.concat(minorKeys, reasonKeys).indexOf(x.key) < 0; });
    const reasons = rest.filter(function (x) { return reasonKeys.indexOf(x.key) >= 0; });
    const minor = [];
    const extras = attached.map(function (x) { return x.item; });
    attached.forEach(function (x) {
      const ls = lines.filter(function (L) { return same(source(L, ctx.srcHead), x.src) && L[3] !== OP.skill; });
      const death = ls.some(function (L) { return L[3] === OP.hit && detailParts(L, ctx.head).some(function (p) { return p.key === 'death'; }); });
      const detail = narrateBase({kind: action.kind === 'cleanup' || death ? 'cleanup' : 'attack', actor: x.src.owner, lines: ls}, ctx, true);
      detail.filter(function (v) { return v.key !== 'skill' && resultKeys.indexOf(v.key) < 0; }).forEach(function (v) { minor.push(v); });
    });
    minor.push.apply(minor, rest.filter(function (x) { return minorKeys.indexOf(x.key) >= 0; }));
    const selected = [first];
    results.concat(effects, reasons, extras, minor).forEach(function (x) {
      if (selected.length < 3 && !selected.some(function (y) { return sentenceText(x, ctx.t) === sentenceText(y, ctx.t); })) selected.push(x);
    });
    return selected;
  }
  /* 행동 하나(원본 줄들)에서 문장 배열을 만든다. 판정 없이 받은 꼬리표, 최종 값, 내역 변화량만 읽는다.
     ctx 는 표시용 이름과 단위, 번역을 공급한다. 원인 없는 옛 문장의 조립은 그대로 유지한다. */
  function narrateBase(action, ctx, all) {
    ctx = ctx || {};
    const lines = action.lines || [], people = ctx.people || {}, tr = ctx.t || fill, head = ctx.head;
    const name = function (n) { return people[n] && people[n].name || tr('모함'); };
    const format = ctx.formatAmount || comma;
    const amount = function (n, v, show = format) { const max = people[n] && people[n].max; return max > 0 ? show(hpAmount(max, v, ctx.hpBase)) : String(v || 0); };
    const effectName = function (L) { return tr(ctx.effectName ? ctx.effectName(L) : overlapEffectName(L)); };
    const desc = function (key, v) { return sentence(key, v); };
    if (action.kind === 'snapshot') return [];
    if (action.kind === 'skip') return [desc('skip', {a: name(action.actor)})];
    const volley = ctx.hpBase && isVolley(lines[0]);
    const ownHits = lines.filter(function (L) { return L[3] === OP.hit && L[1] === action.actor && (volley || !(L[7] & FLAG.counter)); });
    const hits = ownHits.length ? ownHits : lines.filter(function (L) { return L[3] === OP.hit; });
    const targets = Array.from(new Set(hits.map(function (L) { return L[2]; }))), out = [];
    const put = function (key, v) { out.push(desc(key, v)); };
    const a = ctx.actorName || name(action.actor), skill = ctx.skill || tr(TEXT.op[1]);
    const cleanup = action.kind === 'cleanup';
    if (!cleanup && hits.length) {
      const L = hits[0], values = {a: a, t: name(L[2]), s: skill, n: targets.length, ship: ctx.ship || a, f: ctx.facility || skill};
      put(volley ? 'bossVolley' : ctx.facility ? (ctx.actorName ? 'facilityWho' : 'facility') : L[7] & FLAG.counter ? 'counter' : L[7] & FLAG.pursuit ? 'pursuit' : targets.length > 1 ? 'area' : action.kind === 'skill' ? 'skillAttack' : 'attack', values);
    } else if (!cleanup && (action.kind === 'skill' || action.kind === 'supply')) put('skill', {a: a, s: skill});
    if (hits.length && targets.length > 1) {
      const allBurn = cleanup && hits.every(function (L) { return detailParts(L, head).some(function (p) { return p.key === 'burn'; }); });
      if (allBurn) put('areaBurn', {n: targets.length});
      else if (ctx.aggregateDamage !== false || Number.isFinite(ctx.actionDamage)) {
        const blocked = targets.filter(function (n) { const ls = hits.filter(function (L) { return L[2] === n; }); return ls.every(function (L) { return !L[4] && L[8] > 0; }); }).length;
        const hurt = targets.filter(function (n) { return hits.some(function (L) { return L[2] === n && L[4] > 0; }); }).length;
        const total = ctx.aggregateDamage === false ? ctx.actionDamage : hits.reduce(function (v, L) { return v + Number(amount(L[2], L[4], comma).replace(/,/g, '')); }, 0);
        const shown = format(ctx.aggregateDamage === false ? Math.round(total) : total);
        if (cleanup) put('cleanupDamage', {m: targets.length, n: shown});
        else if (hurt || blocked) put(blocked ? (hurt ? 'areaBlocked' : 'areaAllBlocked') : 'areaDamage', {k: blocked, m: hurt, n: shown});
      }
      const fallen = targets.filter(function (n) { return hits.some(function (L) { return L[2] === n && L[5] === 0; }); }).length;
      const evaded = targets.filter(function (n) { return hits.some(function (L) { return L[2] === n && (L[7] & FLAG.evade); }); }).length;
      if (fallen) put(volley ? 'bossFallen' : 'areaFallen', {k: fallen}); else if (evaded) put('areaEvade', {k: evaded});
    } else if (hits.length) {
      const L = hits[0], t = name(L[2]), parts = detailParts(L, head), burnt = parts.some(function (p) { return p.key === 'burn'; });
      if (cleanup) {
        const key = L[7] & FLAG.counter ? 'counter' : parts.some(function (p) { return p.key === 'death'; }) ? 'death' : burnt ? 'burn' : 'cleanupHit';
        put(key, key === 'cleanupHit' ? {t: t, n: amount(L[2], L[4])} : {a: name(L[1]), t: t});
      }
      const choices = [];
      if (!(L[7] & FLAG.evade)) {
        if (!L[4] && L[8] > 0) choices.push({weight: Infinity, item: desc('blocked')});
        else {
          const changes = parts.filter(function (p) { return ['crit', 'mark', 'weak', 'trait', 'command', 'instinct', 'disrupt', 'reduce', 'shield'].indexOf(p.key) >= 0 && p.delta; }).sort(function (x, y) { return Math.abs(y.delta) - Math.abs(x.delta); }).slice(0, 2);
          const increases = changes.filter(function (p) { return p.delta > 0; });
          /* 제공자 번호는 본능의 배열 표시값에만 있다. 0번도 유효하며, 이름을 모르면 기존 틀을 쓴다. */
          const provider = function (p) { return p.key === 'instinct' && Array.isArray(p.value) && Number.isInteger(p.value[0]) && people[p.value[0]] && people[p.value[0]].name; };
          if (increases.length) {
            const p = increases[0], owner = provider(p);
            choices.push({weight: Math.abs(p.delta), item: desc(increases.length > 1 ? 'stack' : owner ? 'growBy' : 'grow', {a: owner, x: tr(TEXT.dmg[p.key]), list: increases.map(function (p) { return tr(TEXT.dmg[p.key]); }).join(', ')})});
          }
          changes.filter(function (p) { return p.delta < 0; }).forEach(function (p) {
            const x = p.key === 'reduce' && Array.isArray(p.value) && p.value[0] === 'taunt' ? tr(TEXT.effect[EFFECT.taunt]) : tr(TEXT.dmg[p.key]);
            const owner = provider(p);
            choices.push({weight: Math.abs(p.delta), item: desc(p.key === 'shield' ? 'shieldBlock' : owner ? 'reduceBy' : 'reduce', {a: owner, t: t, n: amount(L[2], Math.abs(p.delta) * (ctx.hpBase || HP_BASE) / head.scale), x: x})});
          });
          if (!parts.length) {
            if (L[7] & FLAG.crit) choices.push({weight: 1, item: desc('grow', {x: tr(TEXT.flag[1])})});
            if (L[8] > 0) choices.push({weight: 2, item: desc('shieldBlock', {t: t, n: amount(L[2], L[8])})});
          }
        }
      }
      const result = L[5] === 0 ? (volley ? desc('bossFallen', {k: 1}) : desc('fallen', {t: t})) : L[7] & FLAG.evade ? desc('evade', {t: t}) : null;
      choices.sort(function (x, y) { return y.weight - x.weight; });
      choices.slice(0, result ? 1 : 2).forEach(function (x) { out.push(x.item); });
      if (result) out.push(result);
    }
    /* 효과는 같은 종류와 대상별로 한 번. 세 문장 제한은 첫 문장, 결과, 효과 순으로 지킨다. */
    if (lines.length === 1 && lines[0][3] === OP.skill && ctx.team) put(ctx.team === 'phalanx' ? 'guardField' : 'commandField');
    const effectAt = out.length;
    const effects = lines.filter(function (L) { return L[3] === OP.effect || L[3] === OP.heal || L[3] === OP.expire || L[3] === OP.supply; });
    const actorSide = function (L) { const person = people[action.actor] || people[L[1]]; return person && person.side; };
    const targetSide = function (L) { return people[L[3] === OP.expire ? L[1] : L[2]] && people[L[3] === OP.expire ? L[1] : L[2]].side; };
    const groups = {};
    effects.forEach(function (L) {
      const renewing = overlap(L) === 'extend';
      const key = L[3] + ':' + (L[3] === OP.effect || L[3] === OP.expire ? L[4] : L[3] === OP.supply ? L[5] : '') + ':' + targetSide(L) + ':' + actorSide(L) + (renewing ? ':extend' + (L[4] === EFFECT.shield ? '' : ':' + L[6]) + ':' + overlapEffectName(L) : '') + (L[3] === OP.expire ? ':' + effectName(L) : '');
      (groups[key] || (groups[key] = [])).push(L);
    });
    const grouped = Object.keys(groups).map(function (key) {
      const group = groups[key], op = group[0][3];
      return {lines: group, targets: Array.from(new Set(group.map(function (L) { return op === OP.expire ? L[1] : L[2]; })))};
    }).sort(function (x, y) { return y.targets.length - x.targets.length; });
    grouped.forEach(function (group) {
      const ls = group.lines, L = ls[0], op = L[3], e = L[4], ns = group.targets;
      const value = function (l, show) { return op === OP.heal ? amount(l[2], l[4], show) :
        [1, 6, 7].indexOf(e) >= 0 ? amount(l[2], l[5], show) : String(Math.round((l[5] || 0) / 10 * 100) / 100); };
      if (overlap(L) === 'extend' && e !== EFFECT.shield) {
        put(ns.length === 1 ? 'extendEffect' : 'areaExtendEffect', {t: name(ns[0]), e: tr(overlapEffectName(L)), r: L[6], side: tr(targetSide(L) === actorSide(L) ? '아군' : '적'), k: ns.length});
        return;
      }
      const effectKey = function (l) { if ([6, 7].indexOf(e) >= 0 && !(people[l[2]] && people[l[2]].max > 0)) return 'effect'; return ({1: overlap(l) === 'extend' || detailParts(l, head).some(function (p) { return p.key === 'refresh'; }) ? 'refresh' : 'shield', 2: 'taunt', 3: 'stun', 4: 'disrupt', 5: 'mark', 6: 'burnEffect', 7: 'regenEffect', 8: 'cleanse', 9: 'counterEffect', 10: 'pierce', 11: 'stealth', 12: 'accuracy', 13: 'speed', 14: 'evadeEffect', 15: 'weak'})[e] || 'effect'; };
      const key = op === OP.heal ? (cleanup ? 'regen' : 'heal') : op === OP.expire ? 'expire' : op === OP.supply ? (L[5] ? 'supplyNext' : 'supply') : effectKey(L);
      const v = {t: name(ns[0]), a: name(L[1]), e: effectName(L), r: L[6], n: value(L, format)};
      if (ns.length === 1) { put(key, v); return; }
      if (key === 'expire' || key === 'regen' || key === 'effect') {
        put(key === 'expire' ? 'areaExpire' : key === 'regen' ? 'areaRegen' : 'areaEffect', {n: ns.length, e: effectName(L)});
        return;
      }
      const areaKey = 'area' + key[0].toUpperCase() + key.slice(1), original = value(L, comma);
      const same = ls.every(function (l) {
        return (TEXT.log[areaKey].indexOf('{n}') < 0 || value(l, comma) === original) && (TEXT.log[areaKey].indexOf('{r}') < 0 || l[6] === v.r) && (op !== OP.effect || effectKey(l) === key);
      });
      v.k = ns.length; v.side = tr(targetSide(L) === actorSide(L) ? '아군' : '적');
      put(!same && TEXT.log[areaKey + 'Plain'] ? areaKey + 'Plain' : areaKey, v);
    });
    const extra = out.splice(effectAt);
    const follow = lines.find(function (L) { return L[3] === OP.hit && ((L[7] & FLAG.counter) || (L[7] & FLAG.pursuit)) && L !== hits[0]; });
    if (follow) extra.unshift(desc(follow[7] & FLAG.counter ? 'counter' : 'pursuit', {a: name(follow[1]), t: name(follow[2])}));
    const unique = uniqueSentences(out, ctx), remaining = uniqueSentences(out.concat(extra), ctx).slice(unique.length);
    out.splice.apply(out, [0, out.length].concat(unique)); extra.splice.apply(extra, [0, extra.length].concat(remaining));
    if (all) return out.concat(extra);
    if (!out.length) return extra.length ? extra.slice(0, 3) : [desc('skill', {a: a, s: skill})];
    const results = out.slice(1).filter(function (x) { return ['fallen', 'evade', 'areaFallen', 'areaEvade', 'bossFallen'].indexOf(x.key) >= 0; }).slice(0, 1);
    const details = extra.filter(function (x) { return x.key !== 'expire' && x.key !== 'areaExpire'; });
    const selected = (details.length ? details : out.length < 3 ? extra : []).slice(0, 2 - results.length);
    const reasons = out.slice(1).filter(function (x) { return results.indexOf(x) < 0; }).slice(0, 2 - results.length - selected.length);
    return [out[0]].concat(reasons, selected, results);

  }
  /* 쓰러짐은 카드와 같은 기록 정밀도로 판단한다. 보는 편 기준의 고유 대상 수와 한 줄의 체력 피해만 집계한다. */
  function roundNarrative(round, lines, ctx) {
    const people = ctx.people, own = round.fallen.filter(function (n) { return people[n] && people[n].side === ctx.mine; }).length;
    const enemy = round.fallen.length - own;
    const out = [sentence(own && enemy ? 'roundLoss' : enemy ? 'roundWin' : own ? 'roundOwn' : 'roundNone', {n: enemy, m: own})];
    if (ctx.aggregateDamage === false) {
      const hit = ctx.roundTopHit, person = hit && people[hit.actor];
      if (person && !person.support && Number.isFinite(hit.damage)) out.push(sentence('roundHit', {a: person.name, n: (ctx.formatAmount || comma)(Math.round(hit.damage))}));
      return out;
    }
    let best = null, value = 0;
    lines.forEach(function (L) {
      if (L[3] !== OP.hit || !people[L[1]] || people[L[1]].support || !people[L[2]] || !(people[L[2]].max > 0)) return;
      const v = hpAmount(people[L[2]].max, L[4], ctx.hpBase);
      if (v > value) { value = v; best = L; }
    });
    if (best) out.push(sentence('roundHit', {a: people[best[1]].name, n: comma(value)}));
    return out;
  }
  let logSerial = 0;

  /* 함대전은 기존 띠와 컷인 초상을 유지하고 기록에 쓸 시설만 응답에서 고른다. */
  function keeperOptions(report, art, facilityPortraits) {
    if (!report.bouts.some(function (b) { return Array.isArray(b.facilityKeepers) && b.facilityKeepers.length; })) return {};
    function keeper(key, side, b) {
      const rows = report.bouts[b]?.facilityKeepers;
      if (!Array.isArray(rows)) return;
      return rows.find(function (row) {
        return row && row.facility === key && row.side === side && typeof row.keeperId === 'string' && row.keeperId;
      });
    }
    if (!art) return {facilityLogFace: function (key, side, b) {
      const portrait = keeper(key, side, b)?.portrait;
      return typeof portrait === 'string' && !!portrait;
    }};
    return {
      facilityPortraits: facilityPortraits === true,
      facilityWho: function (key, side, b) { return keeper(key, side, b)?.keeperName; },
      facilityFace: function (key, side, b) {
        const portrait = keeper(key, side, b)?.portrait;
        return typeof portrait === 'string' && portrait ? art(portrait) : '';
      }
    };
  }

  /* 재생 계획. cues 는 차례로 실행할 장면 목록이고 ms 는 기본 속도의 시간.
     {total, scale, cues:[{t:intro|frame|trunc|outro|final, b, k, f, ms, at}], bouts:[{at, ms, beats:[{at, ms}]}], beats}
     시설 담당 소녀 컷인: opts.facilityCut 이 true(모든 시설)이거나 함수 (시설 열쇠, 편, 소대전 번호) => 참 이면, 시설의 첫 움직임 장면(박자의 lead) 가운데 참인 것에 컷인이 잡힌다.
       그 장면은 격납고 소녀의 스킬 컷인과 같은 길이(TIME.cutin)가 되고 cue 에 kcut:[[편, 시설 열쇠], …] 와 plain(컷인이 없을 때의 ms)이 붙는다.
       화면이 초상을 받았는지는 화면 옵션이라 duelPlay 가 이 값으로 넘긴다. 없으면 kcut 이 하나도 없고 시간도 전과 같다. */
  const FRONT_CARDS = 15;

  /* 재생 보고서가 보낸 시설 열쇠와 편 번호를 그대로 쓴다. 임시 포대는 icon 에 열쇠가 있다. */
  function frontFacilities(report) {
    const teams = [report.a, report.d].map(function (side) {
      return new Map(((side && side.girls) || []).map(function (g) { return [g.id, g]; }));
    });
    return (report.bouts || []).map(function (bo) {
      const order = nums(bo, report), facilities = {};
      bo.units.forEach(function (u, i) {
        const side = u.side ? 1 : 0, g = teams[side].get(u.id);
        const key = g && g.structure && (g.icon || g.structure);
        if (FACILITY.indexOf(key) >= 0) facilities[order[i]] = {side: side, key: key, max: u.maxHp};
      });
      return facilities;
    });
  }

  /* 합류 전선에 소녀가 더 들어와도 동시에 펼치는 자리는 한 편에 열다섯이다.
     한 장면에 그보다 많은 대상이 실렸으면 기록의 줄을 순서대로 나눠 모든 대상을 차례로 보여 준다. */
  function frontBeats(report, all, structures) {
    return all.map(function (list, b) {
      const bo = report.bouts[b], sideOfCard = new Map(), size = [0, 0];
      nums(bo, report).forEach(function (n, i) {
        if (structures[b][n]) return;
        const side = bo.units[i].side ? 1 : 0;
        sideOfCard.set(n, side);
        size[side]++;
      });
      if (Math.max(size[0], size[1]) <= FRONT_CARDS) return list;
      return list.map(function (beat) {
        return Object.assign({}, beat, {frames: beat.frames.flatMap(function (fr) {
          const groups = [];
          let lines, actors;
          function next() { lines = []; actors = new Set([beat.actor]); groups.push({lines: lines, actors: actors}); }
          next();
          fr.lines.forEach(function (line) {
            const L = bo.log[line], added = new Set([L[1], L[2]]), count = [0, 0];
            actors.forEach(function (n) { if (sideOfCard.has(n)) count[sideOfCard.get(n)]++; });
            added.forEach(function (n) { if (!actors.has(n) && sideOfCard.has(n)) count[sideOfCard.get(n)]++; });
            if (Math.max(count[0], count[1]) > FRONT_CARDS) next();
            lines.push(line);
            added.forEach(function (n) { actors.add(n); });
          });
          if (groups.length === 1) return [Object.assign({}, fr, {frontActors: Array.from(actors)})];
          return groups.map(function (group, i) {
            return Object.assign({}, fr, {lines: group.lines, frontActors: Array.from(group.actors),
              hits: group.lines.filter(function (line) { return bo.log[line][3] === OP.hit; }).length,
              lead: i === 0 ? fr.lead : undefined, fin: i === groups.length - 1 ? fr.fin : undefined});
          });
        })});
      });
    });
  }

  function frontGroups(bouts) {
    if (!bouts.every(function (bo) {
      return Number.isInteger(bo.front) && bo.front >= 0 && Number.isInteger(bo.roundNo) && bo.roundNo >= 0;
    })) return null;
    const groups = new Map();
    bouts.forEach(function (bo, b) {
      if (!groups.has(bo.front)) groups.set(bo.front, []);
      groups.get(bo.front).push(b);
    });
    return Array.from(groups.keys()).sort(function (a, b) { return a - b; }).map(function (front) {
      return groups.get(front).sort(function (a, b) { return bouts[a].roundNo - bouts[b].roundNo; });
    });
  }

  function plan(report, opts, fronts) {
    opts = opts || {};
    const bouts = (report && report.bouts) || [], sourceBeats = opts.beats || beats(report);
    if (fronts === undefined && opts.logByFront) fronts = frontGroups(bouts);
    const original = bouts.map(function (_, b) { return [b]; });
    const structures = opts.facilityUnits ? frontFacilities(report) : null;
    const target = opts.target > 0 ? opts.target : TIME.target;
    const hullLines = opts.facilityUnits ? bouts.map(function (bo) {
      return bo.hull && bo.hull.max > 0 ? new Set((bo.hull.hits || []).map(function (hit) { return hit.line; })) : null;
    }) : [];
    const cutOk = opts.facilityCut === true ? function () { return true; } : typeof opts.facilityCut === 'function' ? opts.facilityCut : null;
    function hasCut(x, b) {
      try { return !!cutOk(x[1], x[0], b); } catch (e) { return false; }
    }
    let all = structures ? frontBeats(report, sourceBeats, structures) : sourceBeats;
    if (structures) all = all.map(function (list, b) {
      const direct = structures[b], seen = new Set();
      if (!Object.keys(direct).length) return list;
      return list.map(function (bt) {
        if (!cutOk && !direct[bt.actor]) return bt;
        const frames = bt.frames.flatMap(function (fr) {
          const unit = fr.type === 'cutin' && direct[bt.actor];
          if (unit) fr = Object.assign({}, fr, {support: true, lead: [[unit.side, unit.key]]});
          (fr.lead || []).forEach(function (x) { seen.add(x.join(':')); });
          if (!cutOk) return [fr];
          const leads = [];
          fr.lines.forEach(function (i) {
            const line = bouts[b].log[i], unit = direct[line[1]];
            if (!unit || line[3] !== OP.hit) return;
            const pair = [unit.side, unit.key], key = pair.join(':');
            if (seen.has(key) || !hasCut(pair, b)) return;
            seen.add(key);
            leads.push(pair);
          });
          if (!leads.length) return [fr];
          /* 카드 번호로 기록된 첫 사격도 시설의 일반 컷인 박자를 거친다. 타격 줄은 원래 장면에 둔다. */
          return [{type: 'cutin', lines: [], support: true, lead: leads, frontActors: fr.frontActors}, fr];
        });
        return Object.assign({}, bt, {frames: frames});
      });
    });
    const cuts = !cutOk && !opts.facilityCutAt ? null : all.map(function (list, b) {
      const seen = structures && Object.keys(structures[b]).length ? new Set() : null;
      const indexed = opts.facilityCutAt ? new Set() : null;
      return (list || []).map(function (bt) {
        return bt.frames.map(function (fr) {
          const bo = bouts[b], first = indexed && bo.log?.[fr.lines[0]];
          if (indexed && (isVolley(first) || fr.support && fr.type === 'cutin')) {
            for (const i of isVolley(first) ? fr.lines : fr.lines.slice(0, 1)) {
              const L = bo.log[i], src = L[3] === OP.skill && source(L, bo.srcLog);
              if (!src) continue;
              const key = src.key + ':' + src.owner;
              if (indexed.has(key) || !opts.facilityCutAt(b, i)) continue;
              indexed.add(key);
              return [[numSide(dims(bo, report), L[1]), FACILITY[L[4]], i]];
            }
            return null;
          }
          const on = (fr.lead || []).filter(function (x) {
            if (!seen) return hasCut(x, b);
            const key = x.join(':');
            if (seen.has(key)) return false;
            seen.add(key);
            return hasCut(x, b);
          });
          return on.length ? on : null;
        });
      });
    });
    function base(fr, last) {
      if (fr.fin) return TIME.finish;
      if (fr.type === 'cutin') return fr.support ? TIME.support : TIME.cutin;
      if (fr.type === 'strike') return fr.pursuit ? TIME.pursuit : fr.hits > 1 ? TIME.area : TIME.strike;
      if (fr.type === 'counter') return TIME.counter;
      if (fr.type === 'fx') return TIME.fx;
      if (fr.type === 'aura') return TIME.aura;
      if (fr.type === 'tick') return fr.heavy ? TIME.tick : TIME.tidy;
      if (fr.type === 'skip') return TIME.skip;
      return TIME.snap + (last ? 0 : TIME.round);
    }
    function build(scale, groups) {
      const cues = [], info = [];
      let at = 0;
      function cue(c, ms, floor) { c.ms = Math.max(floor, Math.round(ms * scale)); c.at = at; at += c.ms; cues.push(c); return c; }
      groups.forEach(function (group) { group.forEach(function (b, round) {
        const bi = {at: at, ms: 0, beats: []}, list = all[b] || [];
        if (round === 0) cue({t: 'intro', b: b}, TIME.intro, TIME.floorIntro);
        for (let k = 0; k < list.length; k++) {
          const bt = {at: at, ms: 0}, last = k === list.length - 1;
          for (let f = 0; f < list[k].frames.length; f++) {
            const fr = list[k].frames[f], plain = base(fr, last), cut = cuts ? cuts[b][k][f] : null;
            const hull = hullLines[b], absorbing = hull && fr.lines.some(function (line) { return hull.has(line); });
            /* 4배에서도 다음 흡수 숫자가 오기 전에 이번 숫자를 읽을 시간을 둔다. */
            const floor = fr.fin ? TIME.floorFinish : absorbing ? 320 : TIME.floorFrame;
            const c = cue({t: 'frame', b: b, k: k, f: f}, cut ? Math.max(TIME.cutin, plain) : plain, floor);
            if (cut) { c.kcut = cut; c.plain = Math.max(floor, Math.round(plain * scale)); }
            if (fr.type === 'snap' && !last) c.rd = true;
            if (fr.fin) c.fin = true;
            bt.ms += c.ms;
          }
          bi.beats.push(bt);
        }
        if (bouts[b].truncated) cue({t: 'trunc', b: b}, TIME.trunc, TIME.floorOutro);
        if (round === group.length - 1) cue({t: 'outro', b: b}, TIME.outro, TIME.floorOutro);
        bi.ms = at - bi.at; info[b] = bi;
      }); });
      cue({t: 'final'}, TIME.final, TIME.floorFinal);
      return {total: at, scale: scale, cues: cues, bouts: info, beats: all};
    }
    /* 기존 교전의 박자는 그대로 두고 전선 안의 등장과 끝 장면 시간만 덜어 낸다. */
    const order = fronts || original;
    const scale = opts.scale > 0 ? opts.scale : bouts.length === 1 && bouts[0].playbackScale;
    if (scale > 0) return build(scale, order);
    let lo = TIME.min, hi = TIME.max;
    if (build(lo, original).total >= target) return build(lo, order);
    if (build(hi, original).total <= target) return build(hi, order);
    for (let n = 0; n < 24; n++) {
      const mid = (lo + hi) / 2;
      if (build(mid, original).total > target) hi = mid; else lo = mid;
    }
    return build(Math.round(lo * 1000) / 1000, order);
  }

  /* 상태 효과 아이콘(16 눈금, 선 그림)과 조작 단추 아이콘(20 눈금, 채운 그림). */
  const ICON = {
    1: 'M8 1.6l5 2v4c0 3.3-2.1 5.6-5 6.8-2.9-1.2-5-3.5-5-6.8v-4z',
    2: 'M8 1.5l6.5 6.5L8 14.5 1.5 8zM8 5v3.6M8 10.7v.3',
    3: 'M9.2 1.5L4 9h3.4l-.9 5.5L12 6.8H8.5z',
    4: 'M1.5 8q1.6-4.2 3.2 0t3.3 0 3.2 0 3.3 0M3.5 13l9-10',
    5: 'M8 3.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM8 1v3.5M8 11.5V15M1 8h3.5M11.5 8H15',
    6: 'M8 1.5c.5 2.6 3.6 4 3.6 7.6a3.6 3.6 0 0 1-7.2 0c0-1.5.8-2.5 1.5-3.1.2 1.2.8 1.9 1.5 2.1C7.5 6.5 7 4 8 1.5z',
    7: 'M8 4.8v6.4M4.8 8h6.4M13.8 8A5.8 5.8 0 1 1 8 2.2M8 2.2l2.2 1.5M8 2.2l1.7-1.5',
    8: 'M8 1.5l1.5 4.6L14.5 8l-5 1.5L8 14.5 6.5 9.5 1.5 8l5-1.9z',
    9: 'M2.5 6H12L9.5 3.5M13.5 10H4l2.5 2.5',
    10: 'M5.5 2.5v11M1.5 8H14M11 5l3 3-3 3',
    11: 'M1.5 8c2-3.4 4.1-4.6 6.5-4.6s4.5 1.2 6.5 4.6c-2 3.4-4.1 4.6-6.5 4.6S3.5 11.4 1.5 8zM3 13L13 3'
  };
  const CTL = {
    play: 'M6 3.5l11 6.5-11 6.5z',
    pause: 'M4.5 3.5h4v13h-4zM11.5 3.5h4v13h-4z',
    step: 'M4 3.5l9 6.5-9 6.5zM14 3.5h2.5v13H14z',
    speed: 'M2.5 4l7 6-7 6zM10.5 4l7 6-7 6z',
    skip: 'M3 4l6 6-6 6zM9.5 4l6 6-6 6zM15.5 4H18v12h-2.5z',
    attack: 'M3 14L14 3l3 0 0 3L6 17zM3 10l7 7M2 18l3-3',
    result: 'M4 2.5h1.8v15H4zM7 3.5h9.5L14 7l2.5 3.5H7z'
  };
  function glyph(d, box) {
    return '<svg viewBox="0 0 ' + box + ' ' + box + '" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
  }

  function duelPlay(el, report, opts) {
    opts = opts || {};
    report = report || {};
    if (!el || typeof document === 'undefined') throw new Error('duelPlay 는 화면 요소가 필요하다');
    const hasTranslation = typeof opts.t === 'function';
    const tr = hasTranslation ? function (s, v) { return String(opts.t(s, v)); } : fill;
    const lang = hasTranslation ? document.documentElement?.lang : '';
    function first(s) {
      const ch = Array.from(String(s == null ? '' : s))[0] || '?';
      return lang === 'en' ? ch.toUpperCase() : ch;
    }
    /* 이름은 조립 전에 한 번 옮긴다. 계정과 모함 이름은 이 길을 타지 않는다. */
    function nameText(name, side, girl, cls = girl?.cls) {
      if (hasTranslation && (cls === 'npc' || girl?.owner === 'npc')) {
        const drift = /^표류기 (\d+)$/.exec(name);
        return drift ? tr('표류기 {0}', [drift[1]]) : tr(name);
      }
      return typeof opts.nameText === 'function' ? String(opts.nameText(name, side, girl)) : name;
    }
    const bouts = report.bouts || [], sides = [report.a || {}, report.d || {}];
    /* 소대전마다 판 크기. 한 편 번호 폭이 다섯보다 큰 소대전이 있으면 한 척 판(ship)이고 15인 배치를 쓴다(뿌리 표시 dp-ship). 없는 판은 전과 똑같다 */
    const DM = bouts.map(function (bo) { return dims(bo, report); });
    const sideLayout = opts.sideLayout;
    const span = DM.reduce(function (m, d) { return Math.max(m, d.size); }, SQUAD), ship = sideLayout ? sideLayout.ship : span > SQUAD;
    const fxShow = ship ? 3 : FX_SHOW;   /* 한 척 판의 카드는 좁아 효과 아이콘을 셋까지만 보이고 나머지는 「+N」 */
    /* 맥락은 이미 번역된 글이다. 빈 글만 거르고 원문 그대로 보이며 보고서는 바꾸지 않는다. */
    function ctxObject(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
    function ctxText(v) { return typeof v === 'string' && v.trim() ? v : ''; }
    const inputCtx = ctxObject(opts.ctx), inputSides = ctxObject(inputCtx.sides);
    /* bout: 소대전 이름을 게임이 정할 때(함대전은 소대전 하나짜리 보고서를 넘기므로 「1소대전」 대신 그 판의 몇 번째인지). role: 편 이름 꼬리표를 「공격」「방어」 대신(함대전은 공격과 방어가 없다). 둘 다 없으면 전과 같다 */
    const context = {title: ctxText(inputCtx.title), bout: ctxText(inputCtx.bout), tags: [], sides: []};
    if (Array.isArray(inputCtx.tags)) for (let i = 0; i < inputCtx.tags.length && context.tags.length < 4; i++) {
      const tag = ctxObject(inputCtx.tags[i]), text = ctxText(tag.text);
      if (text) context.tags.push({text: text, tone: ['me', 'op', 'am', 'red'].indexOf(tag.tone) >= 0 ? tag.tone : 'dim'});
    }
    ['a', 'd'].forEach(function (key, side) {
      const v = ctxObject(inputSides[key]);
      context.sides[side] = {name: ctxText(v.name), tag: ctxText(v.tag), note: ctxText(v.note), role: ctxText(v.role)};
      if (context.sides[side].name) sides[side] = Object.assign({}, sides[side], {name: context.sides[side].name});
    });
    const ctxHeading = !!(context.title || context.tags.length);
    const boutLabel = typeof opts.boutLabel === 'function' ? opts.boutLabel : null;
    const resultSummary = opts.resultSummary, series = resultSummary && resultSummary.series;
    const logGroups = opts.logGroups;
    const frontReplay = opts.facilityUnits === true;
    const fronts = opts.logByFront ? frontGroups(bouts) : null;
    const logFronts = fronts && new Map(fronts.map(function (group) { return [bouts[group[0]].front, group]; }));
    const logFrontTabs = fronts && fronts.map(function (group) { return group[0]; });
    const frontAt = [];
    if (fronts) fronts.forEach(function (group, i) { group.forEach(function (b) { frontAt[b] = i; }); });
    const firstBout = logFrontTabs?.[0] ?? 0;
    const lastBout = fronts?.at(-1)?.at(-1) ?? bouts.length - 1;
    function drawLabel() { return tr('무승부'); }
    function boutName(b) { return boutLabel ? boutLabel(b) : context.bout || tr('{0}소대전', [b + 1]); }
    const mine = report.attacking ? 0 : 1;   /* 보는 사람 편이 아래 */
    /* 소대전마다 바뀌는 편 이름과 덧글(함대전 판 전체). bout.side 와 opts.boutSide(i, seat) 를 합쳐 한 번만 정한다. 둘 다 없는 소대전은 null 이고 판의 편 이름을 그대로 쓴다 */
    const boutSides = bouts.map(function (bo, b) {
      let given = null;
      if (typeof opts.boutSide === 'function') { try { given = opts.boutSide(b, bo ? bo.seat : undefined); } catch (e) { given = null; } }
      const base = bo && Array.isArray(bo.side) ? bo.side : [], over = Array.isArray(given) ? given : [];
      const out = [0, 1].map(function (side) {
        const x = ctxObject(base[side]), y = ctxObject(over[side]);
        return {name: ctxText(y.name) || ctxText(x.name), note: ctxText(y.note) || ctxText(x.note)};
      });
      return out[0].name || out[0].note || out[1].name || out[1].note ? out : null;
    });
    const perBout = boutSides.some(Boolean);
    function sideName(side, b) { return (boutSides[b] && boutSides[b][side].name) || (sides[side].name == null ? '' : String(sides[side].name)); }
    function sideNote(side, b) { return (boutSides[b] && boutSides[b][side].note) || context.sides[side].note; }
    /* 남은 소대 수. 숫자 둘이 아닌 값은 버린다. before 나 after 하나만 있으면 그 값을 둘 다에 쓴다 */
    function pairOf(v) { return Array.isArray(v) && typeof v[0] === 'number' && typeof v[1] === 'number' && isFinite(v[0]) && isFinite(v[1]) ? [v[0], v[1]] : null; }
    const scores = bouts.map(function (bo) {
      const s = bo && bo.score && typeof bo.score === 'object' ? bo.score : null, before = s ? pairOf(s.before) : null, after = s ? pairOf(s.after) : null;
      return before || after ? {before: before || after, after: after || before} : null;
    });
    const hasScore = scores.some(Boolean), many = bouts.length > PIPS || ship;   /* many: 소대전이 셋보다 많은 판과 한 척 판(15인 초상 타일은 만들지 않는다). 결과 화면과 기록 보기의 소대전 칸을 촘촘한 꼴로 */
    const hasCtx = ctxHeading || perBout || hasScore || context.sides.some(function (s) { return s.name || s.tag || s.note; });
    const structures = frontReplay ? frontFacilities(report) : null;
    const facilityLog = opts.facilityPortraits || opts.facilityLogFace || opts.facilityBuilding;
    const supportLists = bouts.map(function (bo, b) {
      const original = bo.support || [];
      if (!structures) return original;
      const projected = original.map(function (a) {
        return Object.assign({}, a, {name: a.name || sideName(a.side, b), facilities: Object.assign({}, a.facilities)});
      });
      if (!Object.keys(structures[b]).length) return projected;
      const fired = new Set(bo.log.filter(function (line) { return line[3] === OP.hit; }).map(function (line) { return line[1]; }));
      Object.keys(structures[b]).forEach(function (n) {
        const unit = structures[b][n];
        const side = unit.side, index = DM[b].ships[side];
        let band = projected.find(function (a) { return a.index === index; });
        if (!band) {
          band = {index: index, side: side, name: sideName(side, b), facilities: {}};
          projected.push(band);
        }
        if (fired.has(Number(n))) band.facilities[unit.key] = 1;
      });
      return projected;
    });
    /* 시설 담당 소녀 초상: 소대전과 편과 시설마다 한 번씩 미리 받아 둔다(faceOf[소대전][편][시설 열쇠] = HTML). 모함 지원이 있는 소대전의 그 편만 묻는다.
       하나도 못 받은 판(정예 대전, 옵션 없는 판)은 컷인 노드도 계획의 컷인 박자도 없다 */
    let anyFace = false;
    const faceOf = bouts.map(function (_, b) {
      const m = {};
      if (typeof opts.facilityFace === 'function') supportLists[b].forEach(function (a) {
        const side = a ? shipSide(DM[b], a.index) : -1;
        if (side < 0 || m[side]) return;
        const row = m[side] = {};
        FACILITY.forEach(function (key) {
          let html = null;
          try { html = opts.facilityFace(key, side, b); } catch (e) { html = null; }
          if (typeof html === 'string' && html) { row[key] = html; anyFace = true; }
        });
      });
      return m;
    });
    function faceHtml(key, side, b) { const row = faceOf[b] && faceOf[b][side]; return (row && row[key]) || ''; }
    const facilityActorsAt = opts.facilityActor && bouts.map(function (bo) { return bo.log.map(opts.facilityActor); });
    const P = plan(report, {target: opts.target, facilityCut: anyFace ? function (key, side, b) { return !!faceHtml(key, side, b); } : undefined,
      facilityCutAt: facilityActorsAt && function (b, i) { return !!facilityActorsAt[b][i]?.html; },
      facilityUnits: frontReplay}, fronts), BE = P.beats, cues = P.cues;
    const girlBy = sides.map(function (s) {
      const m = {};
      (s.girls || []).forEach(function (g) { if (g && g.id != null) m[g.id] = g; });
      return m;
    });
    const hulls = frontReplay ? bouts.map(function (bo, b) {
      const h = bo.hull;
      if (!h || !(h.max > 0)) return null;
      const hits = new Map();
      (h.hits || []).forEach(function (hit) {
        if (!hits.has(hit.line)) hits.set(hit.line, []);
        hits.get(hit.line).push(hit);
      });
      let slots = 0;
      BE[b].forEach(function (beat) {
        beat.frames.forEach(function (frame) {
          slots = Math.max(slots, frame.lines.reduce(function (n, line) { return n + (hits.get(line) || []).length; }, 0));
        });
      });
      return {max: h.max, start: h.start, end: h.end, hits: hits, slots: slots};
    }) : [];
    const hullSummary = opts.hullProgress;
    const hullProgress = hullSummary && fronts && hulls.length && Number.isFinite(hullSummary.initial) &&
      hullSummary.initial >= 0 && Number.isFinite(hullSummary.left) && hullSummary.left >= 0 &&
      hullSummary.left <= hullSummary.initial && bouts.every(function (bo, b) {
        return hulls[b] && Number.isFinite(bo.hullDmg) && bo.hullDmg >= 0;
      }) ? [] : null;
    if (hullProgress) {
      let damage = 0, left = hullSummary.initial;
      fronts.forEach(function (group) { group.forEach(function (b) {
        const before = damage, start = left;
        damage += bouts[b].hullDmg;
        /* 마지막에는 보고서 잔량을 그대로 쓴다. 덧셈 순서로 생기는 부동소수점 오차도 이 값 아래로 가지 않게 한다. */
        left = b === lastBout ? hullSummary.left : Math.max(hullSummary.left, hullSummary.initial - damage);
        hullProgress[b] = {before: before, start: start, end: left};
      }); });
    }
    const won = typeof report.won === 'boolean' ? report.won : sideOf(report.winner) === mine;
    const drawn = report.draw === true;
    const introAt = [];
    cues.forEach(function (c, i) { if (c.t === 'intro') introAt[c.b] = i; });

    const extras = [], decks = [], arrivals = [];
    const ui = {}, logArts = [], logPanels = [], resultArts = [], cards = [], supports = [], facilityActors = [], sets = [], kq = [], pops = [], raised = [];
    const activeKicks = new Map();
    let sunk = null;
    const boutFaces = bouts.map(function () { return []; });
    let rootEl = null, st = null, pos = 0, timer = 0, speed = 1, pace = 1;   /* pace: 움직임 시간 배율(--dp-spd 와 같은 값) */
    let hullSeen = 0;
    let view = 'play', logFrom = 'play', logData = null, logFocus = null;
    let helpAnchor = null, helpPinned = false, helpHover = false;
    const logId = 'dp-log-' + (++logSerial);
    let playing = false, stepping = false, done = false, doneSent = false, dead = false;
    let curB = -1, curBeat = -1, curRound = 0, frameNo = 0, cueNo = 0, actCard = null, ctx = null;
    let cutCard = null, firstArt = null, openingLog = opts.startAt === 'log';

    /* 재생 창 하나의 그림 요청과 받은 주소. 원본은 한 번만 읽고 카드와 배경에는 같은 객체 주소를 쓴다. */
    const artTemplate = typeof root.Image === 'function' && document.createElement('template');
    const artStop = artTemplate && new AbortController(), artUrls = new Set(), probes = new Set();
    const artSources = new WeakMap(), artChoices = new Map(), artRequests = new Map(), artQueue = [], artRefine = [];
    /* 화면 배율과 배치 종류로 그림 판을 고른다. 카드나 초상 칸의 크기를 재는 일은 없다. */
    const denseArt = root.devicePixelRatio >= 2;
    const wideCut = denseArt && (!opts.fill || root.devicePixelRatio >= 3 || root.matchMedia('(min-width: 720px)').matches);
    let artActive = 0;
    async function readArt(url) {
      let blob = '', probe = null, ready = false;
      try {
        const parsed = new URL(url);
        if (/^https?:$/.test(parsed.protocol) && parsed.origin === root.location.origin) {
          const response = await fetch(url, {signal: artStop.signal});
          if (!response.ok) return '';
          blob = URL.createObjectURL(await response.blob());
        }
        if (dead) return '';
        probe = new root.Image();
        probes.add(probe);
        probe.src = blob || url;
        await probe.decode();
        if (dead) return '';
        if (blob) artUrls.add(blob);
        ready = true;
        return blob || url;
      } catch (e) {
        return '';
      } finally {
        if (probe) probes.delete(probe);
        if (blob && !ready) URL.revokeObjectURL(blob);
      }
    }
    function pumpArt() {
      while (!dead && artActive < 6 && (artQueue.length || artRefine.length)) {
        const item = artQueue.shift() || artRefine.shift();
        artActive++;
        readArt(item.url).then(item.resolve).finally(function () { artActive--; pumpArt(); });
      }
    }
    function requestArt(src, refine) {
      let url;
      try { url = new URL(src, document.baseURI).href; } catch (e) { return ''; }
      if (!artRequests.has(url)) {
        const queue = refine ? artRefine : artQueue;
        const request = new Promise(function (resolve) { queue.push({url: url, resolve: resolve}); });
        artRequests.set(url, request);
        pumpArt();
      }
      return artRequests.get(url);
    }
    function isSmallArt(src) { return /\.s\.webp(?:[?#]|$)/.test(src); }
    function artStem(src) { return src.replace(/(?:\.[sm])?\.(?:webp|png)(?=[?#]|$)/, ''); }
    function stageArt(img, sources) {
      if (!artTemplate || !img) return;
      if (!sources) {
        try { sources = JSON.parse(img.getAttribute('data-srcs')); } catch (e) { sources = null; }
        if (!Array.isArray(sources)) sources = [img.getAttribute('src')];
      }
      sources = sources.filter(Boolean);
      if (typeof opts.artSmall === 'function') sources = sources.flatMap(function (src) {
        const small = opts.artSmall(src);
        return small ? [small, src] : [src];
      });
      img.removeAttribute('src');
      img.removeAttribute('onerror');
      img.loading = 'eager';
      sources = Array.from(new Set(sources));
      const key = JSON.stringify(sources);
      if (!artChoices.has(key)) artChoices.set(key, {sources: sources, url: '', medium: ''});
      artSources.set(img, {art: artChoices.get(key)});
    }
    function previewArt(art) {
      if (!art.preview) art.preview = Promise.resolve(requestArt(art.sources[0]));
      return art.preview;
    }
    function firstPicture(art) {
      if (!art.first) art.first = (async function () {
        for (const [i, src] of art.sources.entries()) {
          if (dead) return '';
          const url = await (i === 0 && isSmallArt(src) ? previewArt(art) : requestArt(src));
          if (dead) return '';
          if (!url) continue;
          art.url = url;
          if (isSmallArt(src)) {
            const stem = artStem(src);
            art.more = art.sources.slice(i + 1).filter(function (s) { return !isSmallArt(s) && artStem(s) === stem; });
          }
          return url;
        }
        return '';
      })();
      return art.first;
    }
    function mediumPicture(art) {
      if (!art.refine) art.refine = (async function () {
        await firstPicture(art);
        for (const src of art.more || []) {
          if (dead) return '';
          const url = await requestArt(src, true);
          if (dead) return '';
          if (url) return (art.medium = url);
        }
        return '';
      })();
      return art.refine;
    }
    function loadArt(img, large) {
      const state = artSources.get(img);
      if (!state || dead) return null;
      const art = state.art;
      if (!art.sources.length) return null;
      if (!state.shown) state.shown = firstPicture(art).then(async function (url) {
        if (dead) return;
        if (url) {
          img.src = (large && art.medium) || url;
          try { await img.decode(); return; } catch (e) { img.removeAttribute('src'); }
        }
        if (!dead && img.parentNode) {
          const cl = img.parentNode.classList;
          if (cl.contains('art')) cl.add('fb'); else cl.add('dp-noart');
        }
      });
      if (large && !state.sharp) state.sharp = state.shown.then(function () {
        if (dead) return;
        return mediumPicture(art).then(function (url) {
          /* 같은 노드에서 이미 받은 그림으로 바꾼다. 새 주소가 준비될 때까지 src 는 그대로다. */
          if (!dead && url) img.src = url;
        });
      });
      /* 첫 등장의 대기는 작은 판에만 건다. 없는 판은 기존 후보를 뒤에서 받는다. */
      return isSmallArt(art.sources[0]) ? previewArt(art).then(function (url) { if (url) return state.shown; }) : null;
    }
    function warmBout(b, large) {
      if (!artTemplate || !cards[b]) return [];
      const images = [];
      Object.values(cards[b]).forEach(function (c) {
        const w = extras[b].windows[c.row];
        if (!w || (fronts && curB !== b ? w.initial.includes(c.el) : c.el.parentNode !== w.bench)) images.push(loadArt(c.img, large));
      });
      return images.concat(boutFaces[b].map(function (img) { return loadArt(img); })).filter(Boolean);
    }
    function artBackground(holder, img, large, current) {
      if (dead) return;
      function paint(url) {
        if (!dead && (!current || current())) holder.style.backgroundImage = url ? 'url(' + JSON.stringify(url) + ')' : '';
      }
      const state = artSources.get(img);
      if (!state) {
        paint(img && img.naturalWidth ? img.currentSrc || img.src : '');
        return;
      }
      const art = state.art, ready = (large && art.medium) || art.url;
      paint(ready);
      if (!ready) firstPicture(art).then(function (url) { if (!(large && art.medium)) paint(url); });
      if (large && !art.medium) mediumPicture(art).then(function (url) { if (url) paint(url); });
    }
    function mk(tag, cls, parent, text) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = String(text);
      if (parent) parent.appendChild(n);
      return n;
    }
    /* 전직한 소녀는 클래스 이름 자리에 전직 이름을 보인다(사용자 2026-11-13 「클래스명도 전직하면 전직 명으로」).
       게임이 opts.jobName(branch) 으로 번역된 전직 이름을 넘긴다. 없거나 빈 글이면 클래스 이름 그대로. 클래스 아이콘은 바꾸지 않는다(상성은 클래스로 읽는다). */
    function jobLabel(g) {
      const j = g && g.job;
      if (!j || !j.branch || !(Number(j.stage) >= 1) || typeof opts.jobName !== 'function') return '';
      let s = null;
      try { s = opts.jobName(j.branch); } catch (e) { s = null; }
      return typeof s === 'string' ? s : '';
    }
    function clsLabel(cls) {
      let s = null;
      if (typeof opts.clsName === 'function') { try { s = opts.clsName(cls); } catch (e) { s = null; } }
      return s == null || s === '' ? tr(TEXT.cls[cls] || String(cls)) : String(s);
    }
    /* 행위자는 카드이거나 모함({support:true, n, side, name, given, el, icons})이다. */
    function actor(b, n) { return cards[b][n] || supports[b][n] || facilityActors[b][n]; }
    /* 모함 박자가 쓴 시설 이름. 스킬 줄이 없으면(스킬 없는 사격) 빈 글. */
    function facilityKey(b, bt) {
      const direct = facilityActors[b][bt.actor];
      if (direct) return direct.key;
      const log = bouts[b].log;
      for (let i = 0; i < bt.lines.length; i++) {
        const L = log[bt.lines[i]];
        if (L[3] === OP.skill && L[1] === bt.actor) return TEXT.facility[FACILITY[L[4]]] ? FACILITY[L[4]] : '';
      }
      return '';
    }
    function facilityText(b, bt) { const key = facilityKey(b, bt); return key ? tr(TEXT.facility[key]) : ''; }
    /* 시설을 맡은 소녀(사용자 2026-11-16 「연출에 방어 소녀 전투도 나와?」 → 행동 글과 기록에 그 이름, 같은 날 「그냥 2번으로」 → 스킬 컷인).
       게임이 opts.facilityWho(시설 열쇠, 편, 소대전 번호) 로 이미 번역한 이름을 준다. 연합 모함은 담당이 달라 소대전마다 물어본다. 없으면 빈 글 */
    function facilityWho(key, side, b) {
      let s = null;
      if (key && typeof opts.facilityWho === 'function') { try { s = opts.facilityWho(key, side, b); } catch (e) { s = null; } }
      return typeof s === 'string' && s.trim() ? nameText(s) : '';
    }
    /* 모함 박자의 행위자 이름: 그 박자가 쓴 시설의 담당 소녀. 시설을 알 수 없는 박자나 이름을 안 받은 판은 빈 글(모함 이름을 쓴다) */
    function supportWho(b, bt, a) {
      if (!a?.support) return '';
      return facilityActorsAt ? facilityActorsAt[b][bt.lines[0]]?.name || '' : facilityWho(facilityKey(b, bt), a.side, b);
    }
    function skillText(b, bt, a) {
      if (isVolley(bouts[b].log[bt.lines[0]])) return tr(TEXT.skill.flagship);
      return (a && a.support ? facilityText(b, bt) : '') || tr(TEXT.skill[a ? a.cls : ''] || TEXT.op[2]);
    }
    function tacText(side, b) {
      const k = (sides[side].tactics || [])[b];
      return k ? tr('작전') + ' ' + tr(TEXT.tactic[k] || String(k)) : '';
    }

    /* 구조는 여기서 한 번만 만든다. 그림과 아이콘 글(innerHTML)도 여기서만 넣는다. */
    function build() {
      function raw(node, s) { node.innerHTML = s; return node; }
      function mountArt(holder, out) {
        if (typeof out === 'string') {
          if (!artTemplate) return raw(holder, out).querySelector('img');
          raw(artTemplate, out);
          const img = artTemplate.content.querySelector('img');
          stageArt(img);
          holder.appendChild(artTemplate.content);
          return img;
        }
        const img = out.matches && out.matches('img') ? out : out.querySelector('img');
        stageArt(img);
        holder.appendChild(out);
        return img;
      }
      function contextLine(parent, cls) {
        if (!ctxHeading) return null;
        const line = mk('div', 'dp-ctx' + (cls ? ' ' + cls : ''), parent);
        context.tags.forEach(function (tag) { mk('span', 'dp-ctag dp-t-' + tag.tone, line, tag.text); });
        if (context.title) mk('b', 'dp-ctitle', line, context.title).title = context.title;
        return line;
      }
      function sideTag(parent, side) {
        if (context.sides[side].tag) mk('span', 'dp-wtag dp-t-' + (side === mine ? 'me' : 'op'), parent, context.sides[side].tag);
      }
      function btn(parent, cls, key, label, icons) {
        const b = mk('button', 'dp-btn ' + cls, parent);
        b.type = 'button'; b.setAttribute('data-dp', key);
        b.setAttribute('aria-label', label);
        (icons || []).forEach(function (ic) { raw(mk('span', 'dp-bi dp-bi-' + ic, b), glyph(CTL[ic], 20)); });
        return mk('span', 'dp-bl', b, label);
      }
      function portrait(holder, g, side) {
        let out = null;
        if (typeof opts.art === 'function') { try { out = opts.art(g, side); } catch (e) { out = null; } }
        if (out && (typeof out === 'string' || out.nodeType === 1)) return mountArt(holder, out);
        if (g.name == null) { holder.classList.add('dp-noart'); return; }   /* 이름 없는 합성 자료는 첫 글자 판 */
        const dir = String(opts.artBase == null ? 'assets' : opts.artBase).replace(/[/]+$/, ''), nm = encodeURIComponent(String(g.name));
        const srcs = [dir + '/girls/' + nm + '.m.webp', dir + '/girls/' + nm + '.webp'], im = mk('img', 'dp-im', holder);
        let at = 0;
        im.alt = ''; im.decoding = 'async'; im.draggable = false;
        if (artTemplate) stageArt(im, srcs);
        else {
          im.addEventListener('error', function () { at++; if (at < srcs.length) im.src = srcs[at]; else holder.classList.add('dp-noart'); });
          im.src = srcs[0];
        }
        return im;
      }
      function card(set, b, k, n, slot, earlier) {
        const u = bouts[b].units[k], side = u.side ? 1 : 0;
        /* 같은 편과 id 로 고른 명단의 얕은 사본에 그 소대전의 설명 칸만 합친다. 빈 칸도 보고서 값이다. */
        const g = Object.assign({}, girlBy[side][u.id] || {id: u.id, name: u.name != null ? u.name : '?', cls: u.cls, rar: '', hidden: false});
        ['txt', 'instinct'].forEach(function (key) { if (u[key] && typeof u[key] === 'object') g[key] = Object.assign({}, g[key], u[key]); });
        if (frontReplay && u.job) g.job = u.job;
        const cls = String(u.cls || g.cls || ''), rar = /^[A-Z]{1,3}$/.test(String(g.rar)) ? String(g.rar) : '';
        const given = g.name != null ? g.name : u.name;   /* 명단에서 이름을 받지 못했으면 units 의 이름. 명단에 없는 소녀는 전처럼 물음표 */
        const unnamed = given == null || !String(given).trim();   /* 빈 이름도 클래스 이름으로 받치고, 이름을 직접 받은 소녀와 구분한다 */
        const displayHp = bouts[b].partDisplayHp?.[n] ?? u.maxHp;
        const max = Number(displayHp) > 0 ? Number(displayHp) : 0;
        const hpBase = bouts[b].hpBase || HP_BASE;
        /* 기록은 교전마다 받은 설명과 번호를 쓰고 전장 노드와 그림은 같은 전선에서 공유한다. */
        if (earlier) return Object.assign({}, earlier, {n: n, slot: slot, dk: slot, girl: g, max: max, hpBase: hpBase});
        const el2 = mk('div', 'dp-card dp-q-' + (g.hidden ? 'H' : rar || 'X'), set), mv = mk('div', 'dp-cm', el2), frm = mk('div', 'dp-fr', mv), pt = mk('div', 'dp-pt', frm);
        if (frontReplay || sideLayout) el2.setAttribute('data-dp-unit', n);
        const c = {n: n, side: side, slot: slot, cls: cls, rawName: unnamed ? clsLabel(cls) : String(given), name: unnamed ? clsLabel(cls) : nameText(String(given), side, g, cls), clsName: clsLabel(cls), el: el2, mv: mv, frm: frm, pt: pt, fx: {}, nums: [], ni: 0, nf: 0, nfNo: -1, passNo: -1, vHp: -1, vSh: -1, slo: 1, lNo: -9, lx: 0, ly: 0, dk: slot};
        c.girl = g;
        c.max = max;
        c.hpBase = hpBase;
        const job = jobLabel(g);
        c.role = job || (unnamed ? '' : c.clsName);   /* 카드와 컷인의 작은 글. 큰 글이 클래스를 대신하면 전직만 남긴다 */
        el2.style.setProperty('--dp-k', String(slot));
        mk('span', 'dp-ph', pt, first(c.name));
        const art = mk('div', 'dp-art', pt);
        c.img = portrait(art, g, side);
        c.logLinks = [];
        if (c.img && !artTemplate) c.img.addEventListener('load', function () {
          c.logLinks.forEach(function (link) { link(); });
          if (cutCard && cutCard.el === c.el) artBackground(ui.ca, c.img);
        });
        c.fl = mk('i', 'dp-fl', pt);
        c.sw = mk('i', 'dp-sw', pt);   /* 빛 훑기(차례, 회복, 강화, 약화) */
        c.sl = mk('i', 'dp-sl', pt);
        c.ck = mk('i', 'dp-ck', pt);   /* 쓰러질 때 한 번 번쩍이는 금 */
        mk('span', 'dp-rar', pt, (g.hidden ? '★' : '') + rar);
        /* 숙련 단계 작은 표시: 보고서의 sk.lv 가 첫 단계를 넘은 소녀만(sk 가 없는 옛 보고서는 표시 없음). 등급 표시 아래에 한 번 만들고 재생 중에는 바뀌지 않는다 */
        const plv = g.sk ? Math.floor(Number(g.sk.lv) || 0) : 0;
        if (plv > 1) mk('span', 'dp-prof', pt, plv).setAttribute('aria-label', tr('숙련 {0}단계', [plv]));
        const chip = mk('span', 'dp-cls', pt);
        let icon = null;
        if (typeof opts.clsIcon === 'function') { try { icon = opts.clsIcon(cls); } catch (e) { icon = null; } }
        if (typeof icon === 'string' && icon) raw(chip, icon); else chip.textContent = sideLayout && !c.clsName ? '' : first(c.clsName);
        chip.setAttribute('aria-label', c.clsName);
        c.shn = mk('span', 'dp-shn', pt);
        const nb = mk('span', 'dp-nb', pt);
        mk('b', 'dp-nm', nb, c.name);
        if (g.tag) mk('small', 'dp-wnote', nb, g.tag).title = g.tag;
        const jb = mk('span', 'dp-jb' + (job ? ' dp-job' : ''), nb, c.role);
        if (job) mk('i', 'dp-jn', jb, String(Math.floor(Number(g.job.stage))));   /* 전직 단계 숫자를 작게 곁들인다 */
        const stp = mk('div', 'dp-st', frm), bar = mk('div', 'dp-hp', stp);
        c.hpg = mk('i', 'dp-hpg', bar); c.hpf = mk('i', 'dp-hpf', bar); c.sh = mk('i', 'dp-sh', bar);
        c.hpn = mk('span', 'dp-hpn', bar);
        const fxs = mk('div', 'dp-fxs', stp);
        for (let e = 1; e <= 11; e++) {
          c.fx[e] = raw(mk('i', 'dp-fx dp-e' + e, fxs), glyph(ICON[e], 16));
          c.fx[e].setAttribute('aria-label', tr(TEXT.effect[e]));
        }
        c.more = mk('span', 'dp-fxn', fxs);
        /* 효과 노드는 여기서 한 번 만들어 돌려 쓴다: 충격 고리(방어막 고리도 겸함), 불꽃 조각, 카드 뒷면 */
        c.rg = mk('i', 'dp-rg', el2);
        c.sp = mk('i', 'dp-sp', el2);
        mk('i', 'dp-bk', el2);
        for (let j = 0; j < 4; j++) {
          const nn = mk('span', 'dp-num', el2);
          c.nums.push({el: nn, v: mk('b', '', nn), g: mk('i', '', nn)});
        }
        return c;
      }

      rootEl = mk('div', 'dp' + (opts.fill ? ' dp-fill' : ''));   /* opts.fill: 받은 칸(el)의 높이까지 채운다. el 에 높이가 있어야 한다. 크기 맞춤은 CSS 만으로 한다(듣는 것 없음) */
      rootEl.tabIndex = 0;
      rootEl.setAttribute('role', 'group');
      rootEl.setAttribute('aria-label', tr('정예 대전 재생'));
      const inn = mk('div', 'dp-in', rootEl);
      if (frontReplay && ship && opts.fill) inn.setAttribute('data-dp-front', '');
      if (sideLayout?.tall) rootEl.classList.add('dp-tall');
      if (hasCtx) rootEl.classList.add('dp-hasctx');
      if (many) rootEl.classList.add('dp-many');
      if (ship) {
        /* 한 척 판: 전체 장 수, 두 줄 배치의 최대 줄 수, 한 줄 배치의 다섯 장 묶음 수. 묶음 수는 줄 수와 별개다 */
        rootEl.classList.add('dp-ship');
        rootEl.style.setProperty('--dp-per', String(span));
        rootEl.style.setProperty('--dp-ln', String(Math.ceil(span / 8)));
        rootEl.style.setProperty('--dp-groups', String(Math.ceil(span / SQUAD)));
      }
      const playContext = contextLine(inn, '');

      /* 머리줄: 왼쪽 나, 가운데 승수 점과 소대전 라운드, 오른쪽 상대 */
      const head = mk('div', 'dp-head', inn);
      function who(cls, side) {
        const w = mk('div', 'dp-who ' + cls, head), top = mk('div', 'dp-wl', w);
        mk('small', 'dp-wr', top, context.sides[side].role || (side === 0 ? tr('공격') : tr('방어')));
        ui.wn[side] = mk('b', 'dp-wn', top, sides[side].name == null ? '' : sides[side].name);
        if (context.sides[side].tag) {
          top.classList.add('dp-withtag');
          sideTag(top, side);
        }
        if (context.sides[side].note) (ui.wnote[side] = mk('small', 'dp-wnote', w, context.sides[side].note)).title = context.sides[side].note;
        else if (boutSides.some(function (s) { return s && s[side].note; })) ui.wnote[side] = mk('small', 'dp-wnote', w, '');   /* 소대전마다 덧글이 오는 판: 자리만 만들고 글은 showBout 이 넣는다 */
        return mk('span', 'dp-wt', w);
      }
      ui.wn = []; ui.wnote = [];
      ui.tacMe = who('dp-me', mine);
      const ctr = mk('div', 'dp-ctr' + (hasScore ? ' dp-hasscore' : ''), head);
      ui.pips = [];
      if (hasScore) {
        /* 남은 소대 수(함대전 판 전체): 승수 점 자리에 내 편 숫자, 쌍점, 상대 숫자와 작은 글. 숫자 글만 바꾼다 */
        ui.score = mk('div', 'dp-score', ctr);
        ui.score.setAttribute('role', 'img');
        const sn = mk('div', 'dp-scn', ui.score);
        ui.sc = [mk('b', 'dp-sca', sn), null];
        mk('i', '', sn, ':');
        ui.sc[1] = mk('b', 'dp-scb', sn);
        mk('small', 'dp-scl', ui.score, tr('남은 소대'));
      } else {
        const pp = mk('div', 'dp-pips', ctr);
        /* 승수 점은 여러 소대전을 겨루는 판의 것이다. 게임이 소대전 이름을 따로 넘긴 재생(함대전의 소대전 하나)에서는 그리지 않는다 */
        for (let i = 0; i < (context.bout || boutLabel ? 0 : Math.max(PIPS, fronts ? fronts.length : bouts.length)); i++) ui.pips.push(mk('i', 'dp-pip', pp));
      }
      const inf = mk('div', 'dp-inf', ctr);
      ui.bn = mk('b', 'dp-bn', inf);
      ui.rn = mk('span', 'dp-rn', inf);
      ui.tacOp = who('dp-op', 1 - mine);

      /* 전장: 위 상대 줄, 가운데 행동 글 띠, 아래 내 줄. 소대전 셋의 카드를 처음에 다 만들고 보이기만 바꾼다. */
      ui.field = mk('div', 'dp-field', inn);
      ui.rows = mk('div', 'dp-rows', ui.field);
      const rowF = mk('div', 'dp-row dp-foe', ui.rows);
      ui.mid = mk('div', 'dp-mid', ui.rows);
      ui.ma = mk('span', 'dp-ma', ui.mid);
      ui.ms = mk('b', 'dp-ms', ui.mid);
      ui.mt = mk('span', 'dp-mt', ui.mid);
      ui.rd = mk('div', 'dp-rd', ui.mid);
      const rowO = mk('div', 'dp-row dp-own', ui.rows);
      ui.shock = [mk('i', 'dp-shock', rowF), mk('i', 'dp-shock', rowO)];   /* 여러 대상 공격의 충격파. 줄마다 하나 */
      ui.dim = mk('i', 'dp-dim', ui.rows);   /* 컷인과 마무리 일격 때 전장을 살짝 어둡게 덮는 층 */
      for (let b = 0; b < bouts.length; b++) {
        const order = nums(bouts[b], report), slot = [0, 0], map = {};
        const deck = fronts && (decks[frontAt[b]] ||= {pair: [mk('div', 'dp-set', rowF), mk('div', 'dp-set', rowO)], bank: [new Map(), new Map()], bench: []});
        const pair = deck ? deck.pair : [mk('div', 'dp-set', rowF), mk('div', 'dp-set', rowO)];
        if (sideLayout) pair.forEach(function (set, row) {
          set.setAttribute('data-dp-wrap', sideLayout.wrap[row ? mine : 1 - mine]);
        });
        if (deck && !deck.bench.length) deck.bench = pair.map(function (set) {
          const bench = mk('div', 'dp-bench', set.parentNode);
          bench.hidden = true;
          return bench;
        });
        const defense = mine === 1 ? rowO : rowF, extra = {hull: null, windows: []};
        extras.push(extra);
        if (hulls[b]) {
          const h = hulls[b];
          const el = mk('div', 'dp-hull', defense), label = hullProgress ? hullSummary.label : tr('격벽');
          el.hidden = true;
          if (hullProgress) el.setAttribute('title', hullSummary.title);
          mk('span', 'dp-hull-label', el, label);
          const bar = mk('div', 'dp-hp', el);
          bar.setAttribute('role', 'progressbar');
          bar.setAttribute('aria-label', label);
          bar.setAttribute('aria-valuemax', h.max);
          const fill = mk('i', 'dp-hpf', bar), value = mk('span', 'dp-hull-value', el);
          extra.hull = {el: el, bar: bar, fill: fill, value: value, nums: [], ni: 0};
          const effects = mk('div', 'dp-hull-effects', el);
          for (let j = 0; j < h.slots; j++) {
            const nn = mk('span', 'dp-num', mk('span', 'dp-hull-slot', effects));
            extra.hull.nums.push({el: nn, v: mk('b', '', nn), g: mk('i', '', nn)});
          }
        }
        if (deck) extra.roster = [[], []];
        for (let k = 0; k < order.length; k++) {
          const u = bouts[b].units[k], own = (u.side ? 1 : 0) === mine ? 1 : 0;
          if (structures && structures[b][order[k]]) continue;
          const bank = deck && deck.bank[own], earlier = bank && u.id != null ? bank.get(u.id) : null;
          const c = map[order[k]] = card(deck ? deck.bench[own] : pair[own], b, k, order[k], slot[own]++, earlier);
          if (deck) {
            if (!earlier && u.id != null) bank.set(u.id, c);
            extra.roster[own].push(c);
          }
          c.row = own;
        }
        if (deck) pair.forEach(function (set, row) {
          if (slot[row] <= FRONT_CARDS) return;
          const initial = extra.roster[row].slice(0, FRONT_CARDS).map(function (c) { return c.el; });
          extra.windows[row] = {set: set, bench: deck.bench[row], initial: initial};
        });
        else if (frontReplay) pair.forEach(function (set, row) {
          if (slot[row] <= FRONT_CARDS) return;
          const bench = mk('div', 'dp-bench', set.parentNode), nodes = Array.from(set.children);
          bench.hidden = true;
          const initial = nodes.slice(0, FRONT_CARDS);
          nodes.slice(FRONT_CARDS).forEach(function (node) { bench.appendChild(node); });
          extra.windows[row] = {set: set, bench: bench, initial: initial};
        });
        if (!deck) for (const n in map) {
          const cc = map[n], count = extra.windows[cc.row] ? FRONT_CARDS : slot[cc.row];
          setCardSlot(cc, cc.slot, count);
        }
        if (ship && !deck) pair.forEach(function (set, row) { if (slot[row] <= 8) set.classList.add('dp-single'); });
        /* 모함 띠: support 가 있는 소대전에만 편마다 하나. 전장 줄 묶음(.dp-rows)의 자식이고 놓는 자리는 CSS 가 정한다
           (상대 띠는 위 줄의 위, 내 띠는 아래 줄의 아래. 눕힌 휴대폰 꼴은 행동 글 띠 양옆). 보이기는 showBout 이 바꾼다. */
        const support = {};
        supportLists[b].forEach(function (a) {
          const side = a ? shipSide(DM[b], a.index) : -1;
          if (side < 0 || support[a.index]) return;
          const own = side === mine, used = a.facilities && typeof a.facilities === 'object' ? a.facilities : {};
          const given = typeof a.name === 'string' && a.name.trim() ? a.name : '';
          const band = mk('div', 'dp-support ' + (own ? 'dp-own' : 'dp-foe'), ui.rows);
          band.hidden = true;
          band.setAttribute('data-dp-support', String(a.index));
          mk('small', 'dp-stag ' + (own ? 'dp-t-me' : 'dp-t-op'), band, tr('모함'));
          const nm = mk('b', 'dp-sname', band, given);
          if (given) nm.title = given;
          const box = mk('span', 'dp-facilities', band), icons = {};
          FACILITY.forEach(function (key) {
            const who = facilityWho(key, side, b), label = (who ? who + ' ' : '') + tr(TEXT.facility[key]), icon = mk('i', 'dp-facility' + (used[key] ? ' dp-used' : ''), box);
            icon.title = label; icon.setAttribute('role', 'img'); icon.setAttribute('aria-label', label);
            /* 미리 받은 초상 HTML 을 띠에도 한 번 넣는다. 소대전마다 노드를 만들어 보이기만 바꾸고 컷인 노드는 그대로 둔다. */
            const face = faceHtml(key, side, b);
            let badge = icon;
            if (face) {
              band.classList.add('dp-sfaces'); icon.classList.add('dp-fface');
              const img = mountArt(mk('span', 'dp-ffart', icon), face);
              boutFaces[b].push(img);
              /* 얼굴 자리는 띠 노드를 만들 때만 묻는다. 컷인은 원래 초상 HTML 그대로 쓴다 */
              let focus = null;
              if (typeof opts.facilityFocus === 'function') { try { focus = opts.facilityFocus(key, side, b); } catch (e) { focus = null; } }
              if (focus && typeof focus === 'object') {
                const value = function (v, def) { return typeof v === 'number' && isFinite(v) ? v : def; };
                icon.classList.add('dp-ffocus');
                icon.style.setProperty('--dp-fx', String(Math.max(0, Math.min(100, value(focus.x, 50)))) + '%');
                icon.style.setProperty('--dp-fy', String(Math.max(0, Math.min(100, value(focus.y, 30)))) + '%');
                icon.style.setProperty('--dp-fz', String(Math.max(1, value(focus.zoom, 1))));
              }
              badge = opts.facilityPortraits && img ? null : mk('span', 'dp-fbadge', icon);
              if (badge) badge.setAttribute('aria-hidden', 'true');
            } else if (typeof opts.facilityBuilding === 'function') {
              const html = opts.facilityBuilding(key, side, b);
              if (typeof html === 'string' && /<img\b/i.test(html)) {
                icon.classList.add('dp-fbuilding');
                boutFaces[b].push(mountArt(mk('span', 'dp-ffart', icon), html));
                badge = null;
              }
            }
            if (badge) {
              let html = null;
              if (typeof opts.facilityIcon === 'function') { try { html = opts.facilityIcon(key); } catch (e) { html = null; } }
              if (typeof html === 'string' && html) raw(badge, html); else badge.textContent = first(tr(TEXT.facility[key]));
            }
            icons[key] = icon;
          });
          support[a.index] = {n: a.index, side: side, name: given || tr('모함'), given: given, support: true, el: band, icons: icons, bout: b};
        });
        const direct = {};
        if (structures) Object.keys(structures[b]).forEach(function (n) {
          const unit = structures[b][n], band = support[DM[b].ships[unit.side]], label = tr(TEXT.facility[unit.key]);
          direct[n] = Object.assign({}, band, {n: Number(n), key: unit.key, max: unit.max, given: band.given || tr('모함'), name: label});
        });
        facilityActors.push(direct);
        supports.push(support);
        sets.push(pair); cards.push(map);
      }
      ui.beams = [];
      /* 줄기 노드: 한 척 판은 한 번에 맞는 대상이 열다섯까지라 더 만든다 */
      for (let i = 0; i < (ship ? span + 3 : 8); i++) { const bm = mk('i', 'dp-beam', ui.field); mk('i', '', bm); mk('b', '', bm); ui.beams.push(bm); }
      ui.beamAt = 0;
      ui.edge = mk('i', 'dp-edge', ui.field);
      ui.vs = mk('b', 'dp-vs', ui.field, tr('VS'));

      /* 스킬 컷인: 어두운 띠 하나를 돌려 쓴다 */
      ui.cut = mk('div', 'dp-cut', ui.field);
      const cp = mk('div', 'dp-cp', ui.cut);
      mk('i', 'dp-cv', cp);   /* 띠 안을 흐르는 속도선 */
      const cav = mk('div', 'dp-cav', cp);
      ui.cph = mk('span', 'dp-cph', cav);
      ui.ca = mk('i', 'dp-ca', cav);
      const cx = mk('div', 'dp-cx', cp), cl = mk('div', 'dp-cl', cx);
      ui.cc = mk('small', 'dp-cc', cl);
      ui.cn = mk('span', 'dp-cn', cl);
      ui.cs = mk('b', 'dp-cs', cx);

      /* 시설 담당 소녀 컷인: 초상을 받은 판에만 편마다 띠 하나. 위 스킬 컷인과 같은 구조와 클래스(띠, 속도선, 초상 칸, 이름표, 큰 글)에 표시 dp-kcut 만 더한다.
         놓는 자리는 CSS 가 정한다(내 편은 전장 아래 끝, 상대는 위 끝 = 그 편 모함 띠 쪽). 초상 칸에는 그 편이 받은 초상을 HTML 마다 하나씩 미리 넣어 두고 보이기만 바꾼다 */
      ui.kcut = [null, null];
      if (anyFace || facilityActorsAt) [0, 1].forEach(function (side) {
        const htmls = [];
        faceOf.forEach(function (m) { const row = m[side]; if (row) FACILITY.forEach(function (key) { if (row[key] && htmls.indexOf(row[key]) < 0) htmls.push(row[key]); }); });
        facilityActorsAt?.forEach(function (actors, b) {
          actors.forEach(function (item, i) {
            if (item?.html && shipSide(DM[b], bouts[b].log[i][1]) === side && !htmls.includes(item.html)) htmls.push(item.html);
          });
        });
        if (!htmls.length) return;
        const cut = mk('div', 'dp-cut dp-kcut ' + (side === mine ? 'dp-own' : 'dp-foe'), ui.field), kp = mk('div', 'dp-cp', cut);
        mk('i', 'dp-cv', kp);
        const kav = mk('div', 'dp-cav', kp), ph = mk('span', 'dp-cph', kav);
        const faces = htmls.map(function (html) {
          const face = mk('i', 'dp-kf', kav);
          mountArt(face, html);
          return face;
        });
        const kx = mk('div', 'dp-cx', kp), kl = mk('div', 'dp-cl', kx), cc = mk('small', 'dp-cc', kl, tr('모함'));
        ui.kcut[side] = {el: cut, ph: ph, htmls: htmls, faces: faces, on: -1, cc: cc, cn: mk('span', 'dp-cn', kl), cs: mk('b', 'dp-cs', kx)};
      });

      /* 소대전 시작과 결과 알림 */
      ui.ban = mk('div', 'dp-ban', ui.field);
      ui.bs = mk('small', 'dp-bs', ui.ban);
      ui.bt = mk('b', 'dp-bt', ui.ban);
      ui.bu = mk('span', 'dp-bu', ui.ban);

      /* 진행 막대와 조작 줄 */
      ui.pg = mk('i', '', mk('div', 'dp-prog', inn));
      const ctl = mk('div', 'dp-ctl', inn);
      ui.playL = btn(ctl, 'dp-main', 'play', tr('재생'), ['play', 'pause']);
      btn(ctl, '', 'step', tr('다음 행동'), ['step']);
      ui.speedL = btn(ctl, '', 'speed', tr('{0}배', [1]), ['speed']);
      btn(ctl, '', 'skip', tr('건너뛰기'), ['skip']);
      btn(ctl, '', 'result', tr('결과'), ['result']);
      btn(ctl, '', 'log', tr('기록'));
      ui.playParts = [head, ui.field, ui.pg.parentNode, ctl];
      if (playContext) ui.playParts.push(playContext);

      /* 마지막 결과 화면 */
      const wins = report.wins || {};
      let myW = Number(wins[mine ? 'd' : 'a']), opW = Number(wins[mine ? 'a' : 'd']);
      if (!resultSummary && (!isFinite(myW) || !isFinite(opW))) {
        myW = 0; opW = 0;
        bouts.forEach(function (bo) { if (sideOf(bo.winner) === mine) myW++; else opW++; });
      }
      /* 남은 소대 수가 있는 판(함대전)은 소대전 승수 대신 마지막 소대전 뒤의 남은 소대 수를 큰 숫자로 보인다 */
      const lastScore = !resultSummary && hasScore ? scores[scores.length - 1] : null;
      const resultScore = resultSummary && pairOf(resultSummary.score);
      if (resultScore) { myW = resultScore[mine]; opW = resultScore[1 - mine]; }
      if (lastScore) { myW = lastScore.after[mine]; opW = lastScore.after[1 - mine]; }
      const resultTone = series ? resultSummary.tone === 'good' ? 'dp-win' : resultSummary.tone === 'bad' ? 'dp-lose' : 'dp-draw'
        : drawn ? 'dp-draw' : won ? 'dp-win' : 'dp-lose';
      ui.res = mk('div', 'dp-res ' + resultTone, inn);
      ui.res.setAttribute('aria-hidden', 'true');
      if (resultSummary) ui.res.classList.add('dp-summary');
      if (series) ui.res.classList.add('dp-series');
      /* 결과 화면의 그림 노드도 여기서 한 번 만든다. 전장 카드의 그림 주소만 결과가 열릴 때 연결한다. */
      function resultPortrait(parent, c, small, girl) {
        const q = c ? c.el.className.split(' ').find(function (v) { return v.indexOf('dp-q-') === 0; }) || 'dp-q-X'
          : 'dp-q-' + (girl.hidden ? 'H' : /^[A-Z]{1,3}$/.test(girl.rar) ? girl.rar : 'X');
        const name = c ? c.name : nameText(girl.name, undefined, girl);
        const p = mk('div', 'dp-rportrait ' + q + (small ? ' dp-mini' : ''), parent);
        p.setAttribute('role', 'img'); p.setAttribute('aria-label', name);
        mk('span', 'dp-ph', p, first(name));
        const art = mk('i', 'dp-rart', p);
        let img = c && c.img;
        const large = !small && denseArt;
        const link = function () { artBackground(art, img, large); };
        if (c) {
          resultArts.push(link);
          if (img && !artTemplate) img.addEventListener('load', function () { if (done) link(); });
        } else {
          let loaded = false;
          resultArts.push(function () {
            if (loaded) return;
            loaded = true;
            img = portrait(art, girl, mine);
            if (!img) return;
            if (!artTemplate) img.addEventListener('load', link);
            loadArt(img, large);
            link();
          });
        }
        return p;
      }
      const body = ui.resultBody = mk('div', 'dp-rbody', ui.res), content = ui.resultContent = mk('div', 'dp-rcontent', body);
      contextLine(content, 'dp-rctx');
      if (context.sides.some(function (s) { return s.note; })) {
        const notes = mk('div', 'dp-rnotes', content);
        [mine, 1 - mine].forEach(function (side) {
          const s = context.sides[side];
          if (!s.note) return;
          const group = mk('span', 'dp-rnote', notes);
          mk('span', 'dp-rnname', group, sides[side].name == null ? '' : sides[side].name);
          sideTag(group, side);
          mk('small', 'dp-wnote', group, s.note).title = s.note;
        });
      }
      const hero = mk('div', 'dp-rhero', content), seal = mk('div', 'dp-rseal', hero);
      mk('b', 'dp-rw', seal, resultSummary ? resultSummary.label : drawn ? tr('무승부') : won ? tr('승리') : tr('패배'));
      const suppliedBest = resultSummary && Object.hasOwn(resultSummary, 'best');
      const best = series || suppliedBest ? resultSummary.best : mvp(report, mine, resultSummary && function (c) {
        const structure = structures && structures[c.bout][c.n];
        return !structure;
      });
      if (best) {
        const star = mk('div', 'dp-mvp', hero);
        const card = !series && !suppliedBest && cards[best.bout][best.n];
        resultPortrait(star, card, false, best.girl);
        const info = mk('div', 'dp-mvpinfo', star);
        mk('small', 'dp-mvptag', info, tr('최다 피해'));
        mk('b', 'dp-mvpname', info, card ? card.name : nameText(best.girl.name, undefined, best.girl));
        if (series || !suppliedBest || Number.isFinite(best.damage)) mk('b', 'dp-mvpdamage', info, comma(frontReplay ? Math.round(best.damage) : best.damage));
      }
      const detail = mk('div', 'dp-rdetail', content), stats = mk('div', 'dp-rstats', detail);
      if (!resultSummary || resultScore) {
        const sc = mk('div', 'dp-rs', stats);
        mk('b', 'dp-rsa', sc, myW); mk('i', '', sc, ':'); mk('b', 'dp-rsb', sc, opW);
      }
      if (resultSummary) resultSummary.stats.forEach(function (entry) {
        const cell = mk('small', 'dp-rating', stats, entry[0] + ' ');
        mk('b', 'dp-rsa', cell, entry[1]);
      });
      if (lastScore) mk('small', 'dp-rsl', stats, tr('남은 소대'));
      if (typeof report.delta === 'number' && isFinite(report.delta)) {
        const d = Math.round(report.delta), dl = mk('div', 'dp-rdl ' + (d > 0 ? 'dp-up' : d < 0 ? 'dp-dn' : ''), stats);
        dl.setAttribute('aria-label', tr('점수'));
        mk('b', '', dl, (d > 0 ? '+' : '') + String(d === 0 ? 0 : d));
      }
      /* ratingText: 게임이 이미 번역해 넘기는 글(함대전은 「등급 N」). 있으면 「점수 N」 대신 그 글을 그대로 보인다 */
      if (typeof opts.ratingText === 'string' && opts.ratingText.trim()) mk('small', 'dp-rating', stats, opts.ratingText);
      else if (typeof opts.rating === 'number' && isFinite(opts.rating)) mk('small', 'dp-rating', stats, tr('점수 {0}', [comma(opts.rating)]));
      const entries = resultSummary && resultSummary.cards;
      const rowList = resultSummary?.tiles ? false : resultSummary?.standardCards ? many : entries ? entries.length > PIPS || frontReplay && ship : many;
      const standardCards = !resultSummary || resultSummary.standardCards && bouts.length > 0;
      const showList = resultSummary && resultSummary.standardCards ? standardCards : !entries || entries.length;
      const compact = rowList ? ' dp-rlist' + (resultSummary && frontReplay ? ' dp-rstandard' : '') : '';
      const list = showList ? mk('div', 'dp-rl' + compact, entries || resultSummary?.standardCards ? null : detail) : null;
      /* 소대전이 많은 판(함대전 14~17개)은 초상 타일 대신 한 줄 요약: 번호, 승패, 내 소대, 남은 소대 수, 상대 소대, 라운드 */
      function resultRow(bo, i, w, dr) {
        const row = mk('div', 'dp-rrow ' + (dr ? 'dp-tie' : w ? 'dp-w' : 'dp-l'), list);
        row.style.setProperty('--dp-i', String(i));
        const number = mk('small', 'dp-rrno', row, frontReplay && bo.front != null ? bo.front + 1 : boutLabel ? boutName(i) : i + 1);
        if (frontReplay && boutLabel) number.setAttribute('aria-label', boutName(i));
        mk('b', 'dp-rrmark', row, dr ? drawLabel() : w ? tr('승') : tr('패'));
        [mine, 1 - mine].forEach(function (side, j) {
          if (j) {
            const sc2 = mk('span', 'dp-rrsc', row);
            if (scores[i]) { mk('b', 'dp-rsa', sc2, scores[i].after[mine]); mk('i', '', sc2, ':'); mk('b', 'dp-rsb', sc2, scores[i].after[1 - mine]); }
            else mk('i', '', sc2, tr('VS'));
          }
          const cell = mk('span', 'dp-rrside ' + (j ? 'dp-foe' : 'dp-own'), row), name = sideName(side, i) || (j ? tr('상대') : tr('내 편')), note = sideNote(side, i);
          mk('b', 'dp-rrname', cell, name).title = name;
          if (note) mk('small', 'dp-rrnote', cell, note);
        });
        const end = mk('span', 'dp-rrend', row);
        mk('small', 'dp-rr3', end, tr('{0}라운드', [frontReplay ? bo.roundNo ?? bo.rounds : bo.roundNo || bo.rounds]));
        if (bo.timeout) mk('em', 'dp-rr5', end, tr('시간 초과'));
      }
      if (standardCards) bouts.forEach(function (bo, i) {
        const w = sideOf(bo.winner) === mine, dr = bo.draw === true;
        if (rowList) { resultRow(bo, i, w, dr); return; }
        const final = endState(bo, report), order = nums(bo, report);
        const tile = mk('div', 'dp-rr ' + (dr ? 'dp-tie' : w ? 'dp-w' : 'dp-l'), list);
        tile.style.setProperty('--dp-i', String(i));
        const top = mk('div', 'dp-rrtop', tile);
        mk('b', 'dp-rr2', top, dr ? drawLabel() : w ? tr('승') : tr('패'));
        mk('small', 'dp-rr1', top, boutLabel ? boutName(i) : tr('{0}소대', [i + 1]));
        const own = mk('div', 'dp-rteam', tile), foe = mk('div', 'dp-rfoe', tile);
        let alive = 0;
        order.forEach(function (n, k) {
          if (structures && structures[i][n]) return;
          const u = bo.units[k], down = final.u[n].down;
          if ((u.side ? 1 : 0) === mine) {
            const p = resultPortrait(own, cards[i][n], true);
            if (down) p.classList.add('dp-fallen');
          } else {
            mk('i', 'dp-rdot' + (down ? ' dp-fallen' : ''), foe);
            if (!down) alive++;
          }
        });
        foe.setAttribute('role', 'img'); foe.setAttribute('aria-label', tr('상대 남은 {0}명', [alive]));
        const meta = mk('div', 'dp-rrmeta', tile);
        mk('small', 'dp-rr3', meta, tr('{0}라운드', [frontReplay ? bo.roundNo ?? bo.rounds : bo.rounds]));
        if (bo.timeout) mk('em', 'dp-rr5', meta, tr('시간 초과'));
      });
      if (list && entries) entries.forEach(function (e, i) {
        const tone = e.tone === 'good' ? ' dp-w' : e.tone === 'bad' ? ' dp-l' : e.tie ? ' dp-tie' : '';
        const card = mk('div', (rowList ? 'dp-rrow' : 'dp-rr') + tone, list);
        card.style.setProperty('--dp-i', String(i));
        const head = rowList ? card : mk('div', 'dp-rrtop', card);
        if (rowList) {
          const number = mk('small', 'dp-rrno', head, frontReplay && e.front != null ? e.front + 1 : e.label);
          if (frontReplay && e.front != null) number.setAttribute('aria-label', e.label);
        }
        if (e.result) mk('b', rowList ? 'dp-rrmark' : 'dp-rr2', head, e.result);
        if (!rowList) mk('small', 'dp-rr1', head, e.label);
        if (e.tag) mk('small', 'dp-wnote', head, e.tag).title = e.tag;
        if (e.names) {
          const names = e.names;
          const left = mk('span', 'dp-rrside dp-own', card);
          if (names[0]) mk('b', 'dp-rrname', left, names[0]).title = names[0];
          const score = mk('span', 'dp-rrsc', card);
          if (e.score) {
            mk('b', 'dp-rsa', score, e.score[0]); mk('i', '', score, ':'); mk('b', 'dp-rsb', score, e.score[1]);
            score.setAttribute('aria-label', e.scoreLabel);
          } else if (names[0] && names[1]) mk('i', '', score, tr('VS'));
          const right = mk('span', 'dp-rrside dp-foe', card);
          if (names[1]) mk('b', 'dp-rrname', right, names[1]).title = names[1];
        }
        if (!rowList && (e.bout != null || e.girls)) {
          const own = mk('div', 'dp-rteam', card);
          if (e.bout != null) {
            const bo = bouts[e.bout], final = endState(bo, report);
            final.order.forEach(function (n) {
              const c = cards[e.bout][n];
              if (!c || c.side !== mine) return;
              const p = resultPortrait(own, c, true);
              if (final.u[n].down) p.classList.add('dp-fallen');
            });
          } else e.girls.forEach(function (girl) { resultPortrait(own, null, true, girl); });
          mk('div', 'dp-rfoe', card);
        }
        if (e.round != null) {
          const meta = mk('div', rowList ? 'dp-rrend' : 'dp-rrmeta', card);
          mk('small', 'dp-rr3', meta, tr('{0}라운드', [e.round]));
        }
        if (e.notes && e.notes.length) {
          const notes = mk('div', 'dp-rrmeta', card);
          e.notes.forEach(function (note) { mk('small', 'dp-rating', notes, note); });
        }
      });
      /* got 은 판이 끝날 때 실제로 계정에 더한 자원 수(즉시 지급, 사용자 2026-11-13 「결과화면에서 보상이 표기되고 즉시지급」).
         있으면 「획득」과 자원 수를, 없으면 reward 의 시간을 보인다. 수는 받은 값을 보일 뿐 셈하지 않는다 */
      const reward = opts.reward || report.reward, rewards = [], got = opts.got && typeof opts.got === 'object' ? opts.got : null;
      const count = function (n) {
        let s = null;
        if (typeof opts.num === 'function') { try { s = opts.num(n); } catch (e) { s = null; } }
        return typeof s === 'string' && s ? s : comma(Math.round(n));
      };
      /* 즉시 받은 보상(got)에는 코어와 프리즘도 올 수 있다(함대전). 시간으로 보이는 reward 에는 없는 열쇠라 그쪽은 전과 같다 */
      [['cores', '코어'], ['alloy', '합금'], ['parts', '부품'], ['fuel', '연료'], ['prism', '프리즘']].forEach(function (entry) {
        const hours = got ? got[entry[0]] : reward && reward[entry[0] + '_h'];
        if (typeof hours === 'number' && isFinite(hours) && hours > 0) rewards.push([entry, hours]);
      });
      if (rewards.length) {
        const line = mk('div', 'dp-rewards' + (got ? ' dp-got' : ''), detail);
        if (got) mk('small', 'dp-gotk', line, tr('획득'));
        rewards.forEach(function (r) {
          const cell = mk('span', 'dp-reward', line), key = r[0][0], hours = r[1];
          const icon = mk('span', 'dp-resicon', cell);
          let html = null;
          if (typeof opts.resIcon === 'function') { try { html = opts.resIcon(key); } catch (e) { html = null; } }
          if (typeof html === 'string' && html) { raw(icon, html); icon.setAttribute('aria-label', tr(r[0][1])); icon.setAttribute('role', 'img'); }
          else icon.textContent = tr(r[0][1]);
          if (!got) { mk('b', '', cell, hours >= 1 ? tr('{0}시간', [hours]) : tr('{0}분', [Math.round(hours * 60 * 100) / 100])); return; }
          /* 받은 수는 자릿수마다 숫자 띠(0~9 세로 한 줄)를 굴려 올려 센다(사용자 2026-11-13 「카운팅 애니메이션 같은것도 있으면 좋을것 같고」).
             타이머 없이 결과 화면이 열릴 때 CSS transform 한 번. 읽는 글은 aria-label 과 data-v 에 온전한 수로 둔다 */
          rollCount(cell, count(hours));
        });
      }
      function rollCount(cell, text) {
        const val = mk('b', 'dp-cnt', cell);
        val.setAttribute('aria-label', text); val.setAttribute('data-v', text);
        for (let i = 0; i < text.length; i++) {
          const ch = text.charAt(i);
          if (ch >= '0' && ch <= '9') mk('i', 'dp-roll dp-d' + ch, mk('span', 'dp-od', val), '0\n1\n2\n3\n4\n5\n6\n7\n8\n9\n0\n1\n2\n3\n4\n5\n6\n7\n8\n9').setAttribute('aria-hidden', 'true');
          else mk('span', 'dp-oc', val, ch).setAttribute('aria-hidden', 'true');
        }
      }
      if (resultSummary) resultSummary.rewards.forEach(function (entry) {
        const cells = entry[1].filter(function (r) { return r.value > 0 || r.label; });
        if (!cells.length) return;
        const repair = cells.some(function (r) { return r.label; });
        const line = mk('div', 'dp-rewards dp-got' + (repair ? ' dp-repairs' : ''), detail);
        mk('small', 'dp-gotk', line, entry[0]);
        cells.forEach(function (r) {
          const cell = mk('span', 'dp-reward', line);
          if (repair && r.html) { raw(cell, r.html); return; }
          const icon = raw(mk('span', 'dp-resicon', cell), r.icon);
          icon.setAttribute('aria-label', r.name);
          icon.setAttribute('role', 'img');
          rollCount(cell, r.text);
        });
      });
      if ((entries || resultSummary?.standardCards) && list) detail.appendChild(list);
      const rb = mk('div', 'dp-rb', ui.res);
      if (opts.onAgain || !series && (bouts.length || !resultSummary)) btn(rb, 'dp-main', 'again', tr('다시 보기'));
      if (opts.onResultLog || !series && (bouts.length || !resultSummary)) btn(rb, '', 'log', tr('기록'));
      if (typeof opts.onClose === 'function') btn(rb, '', 'close', tr('닫기'));

      /* 기록 층의 머리줄만 미리 만든다. 소대전과 라운드 본문은 고를 때 만든다. */
      ui.logIcons = {};
      Object.keys(ICON).concat(['attack']).forEach(function (key) {
        ui.logIcons[key] = raw(mk('span'), glyph(key === 'attack' ? CTL.attack : ICON[key], key === 'attack' ? 20 : 16)).querySelector('svg');
      });
      ui.log = mk('div', 'dp-log', inn);
      ui.log.setAttribute('aria-hidden', 'true');
      ui.log.setAttribute('role', 'region'); ui.log.setAttribute('aria-label', tr('기록'));
      const lh = mk('div', 'dp-lhead', ui.log), lt = mk('div', 'dp-ltitle', lh);
      mk('b', '', lt, tr('기록'));
      if (ctxHeading) {
        lt.classList.add('dp-lctx');
        contextLine(lt, '');
      }
      ui.logBack = btn(lt, 'dp-main', 'log-back', tr('재생'));
      if (typeof opts.onClose === 'function') btn(lt, '', 'close', tr('닫기'));
      if (logGroups && logGroups.labels.length > 1) {
        const group = mk('div', 'dp-ltabs dp-lmany', lh);
        group.setAttribute('role', 'group'); group.setAttribute('aria-label', tr('기록'));
        logGroups.labels.forEach(function (label, i) {
          const tab = btn(group, '', 'log-group-' + i, label).parentNode;
          tab.setAttribute('aria-pressed', String(i === logGroups.selected));
        });
      }
      ui.logTabs = [];
      const tabs = mk('div', 'dp-ltabs' + (many || logFronts ? ' dp-lmany' : ''), lh);   /* 소대전이 많으면 번호만 적은 작은 단추를 여러 줄로 놓는다(넘치지 않게) */
      tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', tr('소대전'));
      function logTab(b) {
        let bo = bouts[b];
        const group = logFronts && logFronts.get(bo.front);
        if (group) bo = bouts[group[group.length - 1]];
        const w = sideOf(bo.winner) === mine, dr = bo.draw === true, label = boutLabel && !frontReplay ? boutName(b) : many ? String(b + 1) : tr('{0}소대', [b + 1]);
        const t = btn(tabs, '', 'log-bout-' + b, group ? String(bo.front + 1) : label).parentNode;
        t.setAttribute('aria-label', (group ? boutName(b) : frontReplay && boutLabel ? tr('라운드 {0}', [bo.roundNo]) + ' ' + boutName(b) : many && !boutLabel ? tr('{0}소대전', [b + 1]) : label) + ' ' + (dr ? drawLabel() : tr(w ? '승리' : '패배')));
        t.setAttribute('aria-pressed', 'false');
        mk('i', 'dp-ldot ' + (dr ? 'dp-tie' : w ? 'dp-w' : 'dp-l'), t);
        ui.logTabs[b] = t;
      }
      if (logFrontTabs) logFrontTabs.forEach(logTab);
      else if (!sideLayout || bouts.length > 1) bouts.forEach(function (_, b) { logTab(b); });
      ui.logScroll = mk('div', 'dp-lscroll', ui.log);
      if (logGroups && logGroups.error) mk('p', 'dp-ltruncated', ui.logScroll, logGroups.error).setAttribute('role', 'status');
      ui.help = mk('div', 'dp-lhelp', ui.log);
      ui.help.id = logId + '-help'; ui.help.setAttribute('role', 'tooltip'); ui.help.hidden = true;
    }

    /* 기록 초상은 새 img 없이 카드가 이미 받은 주소만 배경으로 연결한다. */
    /* 한 부품에 풍선 하나. 이벤트는 위임하며 스크롤, 초점 이동, 바깥 누름에 닫는다. */
    const glossaryLabels = {crit: TEXT.flag[1], evade: TEXT.flag[2], counter: TEXT.flag[4], pierce: TEXT.flag[8], pursuit: TEXT.flag[16],
      mark: TEXT.effect[5], disrupt: TEXT.effect[4], taunt: TEXT.effect[2], stun: TEXT.effect[3], burn: TEXT.effect[6], regen: TEXT.effect[7],
      cleanse: TEXT.effect[8], counterEffect: TEXT.effect[9], stealth: TEXT.effect[11], shield: TEXT.effect[1], block: '막음',
      base: TEXT.dmg.base, trait: TEXT.dmg.trait, command: TEXT.dmg.command, weak: TEXT.dmg.weak, reduce: TEXT.dmg.reduce,
      instinct: TEXT.dmg.instinct, branch: TEXT.dmg.branch, laststand: TEXT.dmg.laststand, jitter: TEXT.dmg.jitter,
      cap: TEXT.dmg.cap, refresh: TEXT.dmg.refresh, death: TEXT.dmg.death, passive: '패시브', feat: '특기'};
    let glossaryWords = null;
    function helpTerm(node, key) {
      if (!key || !TEXT.glossary[key]) return node;
      node.classList.add('dp-lterm'); node.setAttribute('data-term', key); node.setAttribute('tabindex', '0');
      return node;
    }
    function termKey(text) {
      if (Object.keys(TEXT.overlapEffect).some(function (k) { return text === tr(TEXT.overlapEffect[k]); })) return;
      const keys = Object.keys(glossaryLabels);
      return keys.find(function (k) { return text === tr(glossaryLabels[k]); }) || keys.find(function (k) { return text.indexOf(tr(glossaryLabels[k]) + ' ') === 0; });
    }
    function hideHelp() {
      if (helpAnchor) helpAnchor.removeAttribute('aria-describedby');
      helpAnchor = null; helpPinned = false; helpHover = false;
      ui.help.hidden = true;
    }
    function showHelp(anchor, pinned) {
      const key = anchor.getAttribute('data-term');
      if (!TEXT.glossary[key]) return;
      if (helpAnchor && helpAnchor !== anchor) helpAnchor.removeAttribute('aria-describedby');
      helpAnchor = anchor; helpPinned = !!pinned;
      ui.help.textContent = tr(TEXT.glossary[key]); ui.help.hidden = false;
      anchor.setAttribute('aria-describedby', ui.help.id);
      const r = anchor.getBoundingClientRect(), box = ui.log.getBoundingClientRect(), tip = ui.help.getBoundingClientRect();
      const width = document.documentElement.clientWidth, height = document.documentElement.clientHeight;
      const left = Math.max(Math.max(8, box.left + 4), Math.min(r.left, Math.min(width - 8, box.right - 4) - tip.width));
      let top = r.bottom + 6;
      if (top + tip.height > Math.min(height - 8, box.bottom - 4)) top = r.top - tip.height - 6;
      top = Math.max(Math.max(8, box.top + 4), top);
      ui.help.style.left = (left - box.left) + 'px'; ui.help.style.top = (top - box.top) + 'px';
    }
    function termAt(e) { return e.target && e.target.closest ? e.target.closest('.dp-lterm') : null; }
    function onHelpOver(e) {
      const anchor = termAt(e);
      if (!anchor || !ui.log.contains(anchor) || helpPinned) return;
      helpHover = true; showHelp(anchor, false);
    }
    function onHelpOut(e) {
      if (!helpAnchor || helpPinned || !helpHover || (e.relatedTarget && helpAnchor.contains(e.relatedTarget))) return;
      hideHelp();
    }
    function onHelpFocus(e) { const anchor = termAt(e); if (anchor && ui.log.contains(anchor)) { showHelp(anchor, false); helpHover = false; } }
    function onHelpBlur(e) { if (helpAnchor && !(e.relatedTarget && helpAnchor.contains(e.relatedTarget))) hideHelp(); }
    function onHelpOutside(e) { if (helpAnchor && !helpAnchor.contains(e.target)) hideHelp(); }
    const sharedNames = [];
    /* 편 이름(ctx, boutSide)은 보는 편을 정하지 않는다. 명시된 attacking만 동명 구별에 쓴다. */
    function logName(b, person) {
      if (!person || person.support || typeof report.attacking !== 'boolean' || person.side === mine) return person ? person.name : '';
      if (!sharedNames[b]) {
        const names = [new Set(), new Set()];
        /* 정예는 한 판 전체, 이어 싸우는 함대전은 지금 소대전 안에서만 동명을 찾는다. */
        (report.chain ? [cards[b]] : cards).forEach(function (team) {
          Object.keys(team).forEach(function (n) { const x = team[n]; names[x.side].add(x.rawName); });
        });
        sharedNames[b] = new Set(Array.from(names[0]).filter(function (name) { return names[1].has(name); }));
      }
      return sharedNames[b].has(person.rawName) ? tr(TEXT.log.foeName, {a: person.name}) : person.name;
    }
    let noteObserver = null;
    function observeNote(row, tag) {
      if (typeof root.ResizeObserver !== 'function') return;
      if (!noteObserver) noteObserver = new root.ResizeObserver(function (entries) {
        const rows = new Set();
        entries.forEach(function (entry) { rows.add(entry.target.closest('.dp-lnote')); });
        const layout = [];
        rows.forEach(function (node) {
          if (node && node.clientWidth) layout.push([node, node.clientWidth - node.firstElementChild.getBoundingClientRect().width - 8 < 120]);
        });
        layout.forEach(function (x) { x[0].classList.toggle('dp-lnote-stacked', x[1]); });
      });
      noteObserver.observe(row); noteObserver.observe(tag);
    }
    /* 대상 줄과 설명 줄이 같은 원인 부품과 색을 쓴다. 제공자는 편 구별을 마친 표시 이름이다. */
    function logOrigin(parent, b, cause) {
      const by = cause && actor(b, cause.owner);
      if (!by) return null;
      let label = '';
      if (cause.kind === 'instinct') label = tr('본능 {a}', {a: logName(b, by)});
      else if (cause.kind === 'branch') {
        let job = ''; try { job = typeof opts.jobName === 'function' ? opts.jobName(cause.id) : ''; } catch (e) { job = ''; }
        if (typeof job !== 'string') job = '';
        label = tr('갈래') + (job ? ' ' + job : '');
      } else if (cause.kind === 'skill' && cause.slot === 'passive') label = tr('패시브');
      else if (cause.kind === 'laststand') label = tr('마지막 저항');
      if (!label) return null;
      const box = mk('small', 'dp-lsource dp-lorigin', parent);
      box.setAttribute('data-origin', cause.kind);
      helpTerm(mk('span', 'dp-ltag dp-lorigin-' + cause.kind, box, label), cause.kind === 'skill' ? 'passive' : cause.kind);
      if (cause.kind !== 'instinct') mk('span', '', box, ' ' + logName(b, by));
      if (cause.kind === 'branch') facilityLogArt(box, by, cause.slot);
      return box;
    }
    function narrativeContext(b, bt) {
      const people = {}, c = bt ? actor(b, bt.actor) : null;
      Object.keys(cards[b]).forEach(function (n) { const x = cards[b][n]; people[n] = {name: logName(b, x), max: x.max, side: x.side, girl: x.girl}; });
      Object.keys(supports[b]).forEach(function (n) { const x = supports[b][n]; people[n] = {name: x.name, max: 0, side: x.side, support: true}; });
      Object.keys(facilityActors[b]).forEach(function (n) {
        const x = facilityActors[b][n];
        people[n] = {name: x.name, max: x.max, side: x.side, support: true};
      });
      return {effectName: function (L) { const i = bouts[b].log.indexOf(L); return logData[b].rows[i] && logData[b].rows[i].effectLabel || overlapEffectName(L); }, people: people, mine: mine, hpBase: bouts[b].hpBase, head: bouts[b].dmgLog, srcHead: bouts[b].srcLog, jobName: opts.jobName, clsName: clsLabel, t: tr, actorName: bt && c && c.support ? supportWho(b, bt, c) : '',
        skill: bt ? skillText(b, bt, c) : '', team: c && TEXT.team[c.cls] ? c.cls : '', facility: bt && c && c.support ? facilityText(b, bt) : '', ship: c && (c.key ? c.given : c.name),
        aggregateDamage: opts.aggregateLogDamage, formatAmount: opts.formatAmount,
        actionDamage: opts.aggregateLogDamage === false && bt ? bouts[b].actionDamageTotals?.find(function (x) { return x.line === bt.lines[0]; })?.damage : undefined,
        roundTopHit: opts.aggregateLogDamage === false ? bouts[b].roundTopHit : undefined};
    }
    function narrativeText(parent, items) {
      if (!glossaryWords) glossaryWords = Object.keys(glossaryLabels).map(function (k) { return {key: k, word: tr(glossaryLabels[k])}; }).filter(function (x) { return x.word; }).sort(function (a, b) { return b.word.length - a.word.length; });
      function words(text) {
        let rest = text;
        while (rest) {
          let match = null, at = rest.length;
          glossaryWords.forEach(function (x) { const i = rest.indexOf(x.word); if (i >= 0 && i < at) { at = i; match = x; } });
          if (!match) { parent.appendChild(document.createTextNode(rest)); break; }
          if (at) parent.appendChild(document.createTextNode(rest.slice(0, at)));
          const tone = ['shield', 'block'].indexOf(match.key) >= 0 ? 'shield' : ['mark', 'disrupt', 'stun', 'burn', 'weak'].indexOf(match.key) >= 0 ? 'hex' : 'skill';
          helpTerm(mk('span', 'dp-l-' + tone, parent, match.word), match.key);
          rest = rest.slice(at + match.word.length);
        }
      }
      items.forEach(function (item, i) {
        if (i) parent.appendChild(document.createTextNode(' '));
        sentenceParts(item, tr).forEach(function (part) { if (part.name) mk('b', '', parent, part.text); else if (part.text === item.values.e && Object.keys(TEXT.overlapEffect).some(function (key) { return part.text === tr(TEXT.overlapEffect[key]); })) parent.appendChild(document.createTextNode(part.text)); else words(part.text); });
      });
    }
    function facilitySource(L, owner, s) {
      if (s && s.owner === owner) {
        const key = s.kind === 'branch' ? s.slot : s.kind === 'support' || s.kind === 'ship' ? s.id : '';
        if (TEXT.facility[key]) return key;
      }
      if (L[1] === owner && L[0] === 0 && L[3] === OP.effect && L[4] === EFFECT.shield) return 'hull';
      return '';
    }
    function facilityLogArt(chip, c, key) {
      if (!facilityLog || !c.support) return;
      const facility = c.key || key;
      if (opts.facilityLogFace && !opts.facilityLogFace(facility, c.side, c.bout)) return;
      const img = c.icons[facility]?.querySelector('img');
      if (!img) return;
      chip.classList.add('dp-lfacility');
      const link = function () { artBackground(chip, img); };
      if (!artTemplate) img.addEventListener('load', link);
      logArts.push(link); link();
    }
    function logPortrait(parent, c, down, key) {
      if (!c) return;
      if (c.support) {
        const chip = mk('small', 'dp-stag ' + (c.side === mine ? 'dp-t-me' : 'dp-t-op'), parent, tr('모함'));
        facilityLogArt(chip, c, key);
        return chip;
      }
      const p = mk('span', 'dp-lportrait ' + (c.side === mine ? 'dp-own' : 'dp-foe') + (down ? ' dp-fallen' : ''), parent);
      p.setAttribute('role', 'img'); p.setAttribute('aria-label', c.name);
      mk('span', '', p, first(c.name));
      const art = mk('i', 'dp-lart', p);
      const link = function () { artBackground(art, c.img); };
      if (!artTemplate) c.logLinks.push(link);
      logArts.push(link); link();
      return p;
    }
    function logIcon(parent, key) {
      parent.appendChild(ui.logIcons[key].cloneNode(true));
    }
    function logTag(parent, text, tone) { return helpTerm(mk('span', 'dp-ltag' + (tone ? ' dp-l-' + tone : ''), parent, text), termKey(text)); }
    function logEffect(parent, e, direction) {
      const tag = logTag(parent, '', HARM[e] || [12, 13, 15].indexOf(e) >= 0 ? 'hex' : e === EFFECT.shield ? 'shield' : 'skill');
      if (ICON[e]) logIcon(tag, e);
      const extra = {12: '명중', 13: '속도', 14: TEXT.flag[2], 15: TEXT.op[1]};
      const label = tr(direction || TEXT.effect[e] || extra[e] || TEXT.op[3]);
      helpTerm(mk('span', '', tag, label), termKey(label));
    }
    /* 연속 값은 더하지 않고 기록 순서로 붙인다. */
    function logEntry(b, i) {
      const L = bouts[b].log[i], op = L[3];
      if (op === OP.skill || op === OP.snapshot || op === OP.skip) return;
      const n = op === OP.expire ? (L[1] >= 0 ? L[1] : L[2]) : L[2];
      return {L: L, op: op, n: n, c: cards[b][n] || facilityActors[b][n], meta: logData[b].rows[i] || {}};
    }
    function logValues(values, L, c, meta) {
      const op = L[3];
      /* icon 이 있으면 그림과 숫자를 한 묶음으로 둔다(색만으로 뜻을 가르지 않는다). */
      function value(v, tone, plus, label, icon) {
        const box = mk('span', 'dp-lvalue' + (icon ? ' dp-labs' : '') + ' dp-l-' + tone, values);
        helpTerm(mk('small', 'dp-lkey', box, label), termKey(label));
        if (icon) logIcon(box, icon);
        const num = mk('b', 'dp-lnum dp-l-' + tone, box, (plus ? '+' : '') + amt(c || {max: 0}, v));
        num.setAttribute('aria-label', label + ' ' + num.textContent);
      }
      if (op === OP.hit) {
        /* 재생 화면과 같은 규칙. 방어막이 다 막았으면 체력 피해 0 은 띄우지 않는다. */
        const hp = L[4] || 0, abs = L[8] > 0 ? L[8] : 0;
        if (L[7] & FLAG.evade) helpTerm(mk('b', 'dp-lnum dp-l-evade', values, tr(TEXT.flag[2])), 'evade');
        if (!(L[7] & FLAG.evade) && (hp > 0 || !abs)) value(hp, 'damage', false, tr('피해'));
        if (abs) value(abs, 'shield', false, tr('막음'), EFFECT.shield);
        [1, 2, 4, 8, 16].forEach(function (bit) { if ((L[7] & bit) && bit !== FLAG.evade) logTag(values, tr(TEXT.flag[bit]), 'skill'); });
      } else if (op === OP.heal) {
        value(L[4] || 0, 'heal', true, tr(TEXT.op[4]));
      } else if (op === OP.effect || op === OP.expire) {
        const direction = [12, 13, 14].indexOf(L[4]) >= 0 ? op === OP.expire ? meta && meta.effectLabel || overlapEffectName(L) : overlapEffectName(L) : null;
        const directed = Object.keys(TEXT.overlapEffect).some(function (key) { return TEXT.overlapEffect[key] === direction; });
        if (op === OP.expire || L[4] !== EFFECT.shield) logEffect(values, L[4], direction);
        const mode = overlap(L);
        const markOverlap = function () {
          if (!mode) return;
          const tag = helpTerm(logTag(values, tr(TEXT.overlap[mode])), mode); tag.classList.add('dp-loverlap'); tag.setAttribute('data-overlap', mode);
        };
        if (L[4] !== EFFECT.shield) markOverlap();
        if (op === OP.expire) logTag(values, tr(TEXT.op[7]));
        else {
          if (L[4] === EFFECT.shield) { value(L[5] || 0, 'shield', true, tr(TEXT.effect[1]), EFFECT.shield); markOverlap(); }
          else if (typeof L[5] === 'number' && [4, 5, 6, 7, 9, 10, 12, 13, 14, 15].indexOf(L[4]) >= 0) {
            /* burn 과 regen 은 최대 체력 비율, 나머지는 비율 세기다(api/duel.js). 판정식은 화면에서 다시 만들지 않는다. */
            const text = L[4] === EFFECT.burn || L[4] === EFFECT.regen
              ? tr('라운드마다 최대 체력의 {0}%', [String(Math.round(L[5] / 10 * 100) / 100)])
              : (directed ? '' : [12, 13, 15].indexOf(L[4]) >= 0 ? '−' : L[4] === 14 ? '+' : '') + String(Math.round((directed ? Math.abs(L[5]) : L[5]) / 10 * 100) / 100) + ([12, 14].indexOf(L[4]) >= 0 ? '%p' : '%');
            mk('small', 'dp-lstrength', values, text);
          }
          if (L[6] != null && L[4] !== EFFECT.cleanse && L[4] !== EFFECT.stun) mk('small', 'dp-luntil', values, tr('{0}라운드까지', [L[6]]));
        }
      } else if (op === OP.supply) logTag(values, tr(L[5] ? '다음 차례 앞당김' : '바로 행동'));
      else logTag(values, tr(TEXT.op[op] || TEXT.op[3]));
    }
    function logLine(parent, b, bt, i) {
      const entry = logEntry(b, i);
      if (!entry) return;
      const {L, op, n, c, meta} = entry, row = mk('div', 'dp-lline' + (meta.fallen ? ' dp-lko' : ''), parent);
      row.setAttribute('data-line', String(i));
      const target = mk('div', 'dp-ltarget', row);
      mk('span', 'dp-larrow', target, '→');
      const who = mk('div', 'dp-lwho', target);
      logPortrait(who, c, meta.fallen);
      mk('span', 'dp-lname', who, c ? c.name : '?');
      const values = mk('div', 'dp-lvalues', row);
      logValues(values, L, c, meta);
      const renewing = overlap(L) === 'extend', cause = renewing ? meta.valueCause : source(L, bouts[b].srcLog);
      const provider = renewing ? meta.valueProvider : cause ? cause.owner : L[1], src = provider == null ? null : actor(b, provider);
      if (logOrigin(values, b, cause)) { /* 원인 부품이 제공자까지 표시한다. */ } else if (src && src.support) {
        if (bt.kind === 'cleanup' || provider !== bt.actor) { logPortrait(values, src, false, facilityLog && facilitySource(L, provider, cause)); if (src.given) mk('small', 'dp-lsource', values).textContent = src.given; }
      } else if (src && (bt.kind === 'cleanup' || provider !== bt.actor)) {
        /* 원인이 대상 자신이면 이름을 되풀이하지 않는다. */
        const by = provider === n ? '' : logName(b, src);
        if (by) mk('small', 'dp-lsource', values).textContent = by;
      }
      /* hit 는 전부 막히거나 회피해도 같은 수치로 보인다. 효과만 건 줄은 빈 칸이다. */
      const health = mk('div', 'dp-lhealth', row);
      if ((op === OP.hit || op === OP.heal) && meta.before != null && meta.hp != null) {
        const bar = mk('span', 'dp-lbar', health), hpBase = bouts[b].hpBase || HP_BASE, pct = hpBase / 100;
        const pre = Math.max(0, Math.min(hpBase, meta.before)), hp = Math.max(0, Math.min(hpBase, meta.hp));
        bar.setAttribute('data-before', String(pre)); bar.setAttribute('data-hp', String(hp));
        mk('i', 'dp-lremain', bar).style.width = (Math.min(pre, hp) / pct) + '%';
        if (pre !== hp) {
          const change = mk('i', hp > pre ? 'dp-lgain' : 'dp-lloss', bar);
          change.style.left = (Math.min(pre, hp) / pct) + '%';
          change.style.width = (Math.abs(pre - hp) / pct) + '%';
        }
        mk('i', 'dp-lshield', bar).style.width = (Math.max(0, Math.min(hpBase, meta.sh || 0)) / pct) + '%';
        mk('span', 'dp-lhnums', health, amt(c || {max: 0}, meta.before) + ' → ' + amt(c || {max: 0}, meta.hp));
        if (meta.fallen) logTag(health, tr('쓰러짐'), 'damage');
      }
      if (op === OP.hit || op === OP.heal || (op === OP.effect && L[4] === EFFECT.shield)) logBreak(row, b, L, c);
      return row;
    }
    /* 변화량만 단위 변환한다. 표시 배율로 판정을 다시 계산하지 않는다.
       항목은 b 하나이며 이름표와 배율은 속성으로 둔다. 긴 줄에서도 이름과 숫자가 함께 꺾인다. */
    function logBreak(row, b, L, c) {
      let note = null;
      if (typeof opts.hitNote === 'function') { try { note = opts.hitNote(L, bouts[b]); } catch (e) { note = null; } }
      if (typeof note === 'string' && note.trim()) { mk('small', 'dp-lbreak', row, note); return; }
      const bo = bouts[b], head = bo.dmgLog;
      if (!head || head.v !== 1 || !(head.scale > 0) || !Array.isArray(head.codes)) return;
      const op = L[3], parts = detailArray(L);
      if (!Array.isArray(parts) || !parts.length) return;
      const items = parts.filter(function (x) { return Array.isArray(x) && Number.isFinite(x[2]); });
      if (!items.length) return;
      const tokens = [], card = c || {max: 0};
      const kind = function (x) { return head.codes[x[0]]; };
      const amount = function (v) { return amt(card, Math.abs(v) * (card.hpBase || HP_BASE) / head.scale); };
      const signed = function (v) { return (v < 0 ? '−' : '+') + amount(v); };
      const factor = function (v) { return Number.isFinite(v) ? '×' + String(Math.round(v * 100) / 100) : ''; };
      const basic = items.reduce(function (v, x) { return v + (kind(x) === 'damage' ? x[2] : 0); }, 0);
      function token(label, value, mult, tone, raw) {
        tokens.push({label: label, value: value, mult: mult, tone: tone, raw: raw});
      }
      items.forEach(function (x) {
        const k = kind(x), v = x[1], delta = x[2];
        let label = Object.prototype.hasOwnProperty.call(TEXT.dmg, k) ? tr(TEXT.dmg[k]) : '', mult = '';
        if (k === 'damage' || k === 'slot' || k === 'ship' || k === 'tactic') return;
        if (k === 'branch') {
          let name = '';
          if (Array.isArray(v) && typeof opts.jobName === 'function') { try { name = opts.jobName(v[0]); } catch (e) { name = ''; } }
          if (typeof name === 'string' && name.trim()) token('', name, '', 'tag');
          return;
        }
        if (k === 'support') {
          if (Array.isArray(v) && TEXT.facility[v[0]]) token('', tr(TEXT.facility[v[0]]), '', 'tag');
          return;
        }
        if (k === 'laststand') { token('', label, '', 'tag'); return; }
        if (k === 'pierce') {
          if (Number.isFinite(v) && v > 0) token(label, String(Math.round(v * 100)) + '%', '', 'source');
          return;
        }
        if (k === 'evade') { token('', label, '', 'tag'); return; }
        if (k === 'instinct' && Array.isArray(v)) {
          const by = actor(b, v[0]);
          if (by && by.name) label += ' ' + by.name;
        }
        if (['trait', 'crit', 'command', 'disrupt', 'mark', 'weak', 'reduce', 'instinct'].indexOf(k) >= 0) mult = factor(Array.isArray(v) ? v[1] : v);
        if (k === 'reduce' && Array.isArray(v) && v[0] === 'taunt') label = tr(TEXT.effect[EFFECT.taunt]);
        if (k === 'base' || k === 'burn' || k === 'death' || k === 'heal' || (k === 'shield' && op === OP.effect)) {
          if (k === 'base' && Array.isArray(v) && v[1] !== 1) mult = factor(v[1]);
          token(label, amount(delta + (k === 'base' ? basic : 0)), mult, 'base', delta + (k === 'base' ? basic : 0));
        } else if (delta !== 0) token(label, signed(delta), k === 'jitter' ? '' : mult, k === 'jitter' ? 'source' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'source');
      });
      const final = op === OP.effect ? L[5] : L[4];
      if (tokens.length === 1 && tokens[0].tone === 'base' && !tokens[0].mult && tokens[0].raw === final) return;
      token('=', amount(final), '', 'sum');
      const box = mk('small', 'dp-lbreak dp-ldmg', row);
      tokens.forEach(function (part) {
        const el = mk('b', 'dp-ldpart dp-ld-' + part.tone, box, part.value);
        if (part.label) el.setAttribute('data-label', part.label);
        helpTerm(el, termKey(part.label || part.value));
        if (part.mult) el.setAttribute('data-mult', part.mult);
        el.setAttribute('aria-label', [part.label, part.value, part.mult].filter(Boolean).join(' '));
      });
    }

    function logActionPortrait(b, head, c, key, i) {
      const chip = logPortrait(head, c, false, key), indexed = facilityActorsAt?.[b][i];
      if (!chip || !indexed?.html) return;
      const cut = ui.kcut[c.side], img = cut?.faces[cut.htmls.indexOf(indexed.html)]?.querySelector('img');
      if (!img) return;
      chip.classList.add('dp-lfacility');
      const link = function () { artBackground(chip, img); };
      if (!artTemplate) img.addEventListener('load', link);
      logArts.push(link); link();
    }
    function logBody(b, r, body) {
      const consumed = {};
      r.beats.forEach(function (k, at) {
        if (consumed[k]) return;
        let bt = BE[b][k];
        const last = bt.lines.some(function (i) { const s = source(bouts[b].log[i], bouts[b].srcLog); return bouts[b].log[i][3] === OP.skill && s && s.kind === 'laststand'; });
        if (last) {
          bt = Object.assign({}, bt, {lines: bt.lines.slice()});
          for (let j = at + 1; j < r.beats.length; j++) {
            const next = BE[b][r.beats[j]];
            if (next.actor !== bt.actor || !next.lines.some(function (i) { const s = source(bouts[b].log[i], bouts[b].srcLog); return bouts[b].log[i][3] === OP.skill && s && s.kind === 'laststand'; })) break;
            bt.lines = bt.lines.concat(next.lines); consumed[r.beats[j]] = true;
          }
        }
        const small = bt.kind === 'cleanup', c = actor(b, bt.actor);
        const card = mk('div', small ? 'dp-lcleanup' : 'dp-laction', body), head = mk('div', 'dp-lahead', card);
        if (small) mk('small', '', head, tr(bt.round === 0 ? '소대전 시작' : '라운드 정리'));   /* 라운드 0 은 모함이 소대를 내보내며 거는 방어막 */
        else {
          const key = facilityLog && c?.support && (facilityKey(b, bt) || bt.lines.reduce(function (key, i) {
            const line = bouts[b].log[i];
            return key || facilitySource(line, bt.actor, source(line, bouts[b].srcLog));
          }, ''));
          logActionPortrait(b, head, c, key, bt.lines[0]);
          const who = supportWho(b, bt, c);
          if (!c || !c.support || c.given || who) mk('b', 'dp-lname', head, c ? (c.support ? who || c.given : c.name) : '?');
          if (bt.kind === 'skill' || bt.kind === 'supply') logTag(head, skillText(b, bt, c), 'skill');
          else if (bt.kind === 'attack' && c && c.key) logTag(head, facilityText(b, bt), 'skill');
          else if (bt.kind === 'attack') {
            const tag = logTag(head, tr(TEXT.op[1])); logIcon(tag, 'attack');
          } else logTag(head, tr(bt.kind === 'skip' ? TEXT.op[5] : TEXT.op[6]));
          if ((bt.kind === 'skill' || bt.kind === 'supply') && bt.lines.length === 1 && TEXT.team[c && c.cls]) logTag(head, tr(TEXT.team[c.cls]), 'skill');
        }
        if (hulls[b]) {
          const absorbed = bt.lines.flatMap(function (i) { return hulls[b].hits.get(i) || []; });
          if (absorbed.length) logTag(head, tr('격벽') + ' ' + absorbed.map(function (h) { return '−' + comma(Math.round(h.absorbed)); }).join(' '), 'skill');
        }
        const paragraph = mk('p', 'dp-lnarrative', card);
        const action = {kind: bt.kind, actor: bt.actor, lines: bt.lines.map(function (i) { return bouts[b].log[i]; })}, context = narrativeContext(b, bt);
        const sentences = narrate(action, context);
        paragraph.setAttribute('data-sentences', String(sentences.length));
        narrativeText(paragraph, sentences);
        const notes = new Set(), pending = [];
        function collectNote(owner, cause, read) {
          if (!owner || owner.support || typeof read !== 'function') return;
          let text = ''; try { text = read(owner); } catch (e) { text = ''; }
          if (typeof text !== 'string' || !text.trim()) return;
          pending.push({owner: owner, cause: cause, text: text});
        }
        if ((bt.kind === 'skill' || bt.kind === 'supply') && typeof opts.skillNote === 'function') collectNote(c, null, function (owner) { return opts.skillNote(owner.girl, owner.side); });
        activationSources(action, context).forEach(function (x) {
          const owner = actor(b, x.owner);
          if (x.kind === 'instinct' && typeof opts.instinctNote === 'function') collectNote(owner, x, function (person) { return opts.instinctNote(x.key, person.girl); });
          if (x.kind === 'skill' && x.slot !== 'active' && typeof opts.passiveNote === 'function') collectNote(owner, Object.assign({}, x, {slot: 'passive'}), function (person) { return opts.passiveNote(person.girl, person.side); });
        });
        /* 자기 액티브 패시브 본능, 다른 제공자는 본문에 먼저 나온 순서 뒤 기록 순서. 정렬은 안정적이다. */
        const mentioned = [];
        sentences.forEach(function (item) { sentenceParts(item, tr).forEach(function (part) { if (part.name && mentioned.indexOf(part.text) < 0) mentioned.push(part.text); }); });
        function noteRank(item) {
          if (item.owner === c) return !item.cause ? 0 : item.cause.kind === 'skill' ? 1 : 2;
          const at = mentioned.indexOf(logName(b, item.owner));
          return 3 + (at < 0 ? mentioned.length : at);
        }
        pending.sort(function (a, z) { return noteRank(a) - noteRank(z); });
        let group = null;
        pending.forEach(function (item) {
          const row = mk('div', 'dp-lnote');
          const tag = item.cause ? logOrigin(row, b, item.cause) : logTag(row, skillText(b, bt, c) || tr(TEXT.op[2]), 'skill');
          if (!tag) return;
          const key = JSON.stringify([tag.textContent, item.text]);
          if (notes.has(key)) return;
          notes.add(key);
          if (!group) group = mk('div', 'dp-lnotes', card);
          group.appendChild(row); mk('span', 'dp-lnotetext', row, item.text); observeNote(row, tag);
        });
        const log = bouts[b].log, volley = isVolley(log[bt.lines[0]]);
        bt.lines.forEach(function (i) {
          const L = log[i], facility = volley && L[3] === OP.skill && FACILITY[L[4]];
          if (facility) {
            const fired = mk('div', 'dp-lahead', card), support = actor(b, L[1]);
            logActionPortrait(b, fired, support, facility, i);
            const name = facilityActorsAt?.[b][i]?.name || support?.given;
            if (name) mk('b', 'dp-lname', fired, name);
            logTag(fired, tr(TEXT.facility[facility]), 'skill');
          } else logLine(card, b, bt, i);
        });
      });
    }
    function logRound(b, entry, open) {
      if (!entry) return;
      if (open && !entry.made) { logBody(b, entry.data, entry.body); entry.made = true; }
      entry.body.hidden = !open;
      entry.btn.setAttribute('aria-expanded', String(open));
      entry.el.classList.toggle('dp-open', open);
    }
    function logSummary(parent, b) {
      const bo = bouts[b], fin = logData[b].final;
      const w = bo.unscored ? report.won === true : sideOf(bo.winner) === mine;
      const dr = bo.unscored ? report.draw === true : bo.draw === true;
      const end = mk('div', 'dp-lsummary', parent), h = mk('div', 'dp-lendhead', end);
      if (!bo.unscored || resultSummary?.label) mk('b', dr ? 'dp-l-skill' : w ? 'dp-l-heal' : 'dp-l-damage', h,
        bo.unscored ? resultSummary.label : dr ? drawLabel() : tr(w ? '승리' : '패배'));
      mk('small', '', h, tr('{0}라운드', [bo.rounds]));
      if (bo.timeout) logTag(h, tr('시간 초과'), 'skill');
      if (frontReplay && boutLabel && bo.roundNo) logTag(h, tr('라운드 {0}', [bo.roundNo]) + ' ' + boutName(b));
      if (resultSummary && b === bouts.length - 1) resultSummary.rewards.forEach(function (entry) {
        if (entry[2]) logTag(h, entry[0] + ' ' + entry[1].map(function (r) {
          return [r.name, r.text].filter(Boolean).join(' ');
        }).join(' '));
      });
      [mine, 1 - mine].forEach(function (side) {
        const line = mk('div', 'dp-lteam', end);
        mk('small', '', line, (boutSides[b] && boutSides[b][side].name) || context.sides[side].name || (side === mine ? tr('내 편') : tr('상대')));
        fin.order.forEach(function (n) {
          const c = cards[b][n], u = fin.u[n];
          if (!c || c.side !== side) return;
          const cell = mk('div', 'dp-lsurvivor', line);
          logPortrait(cell, c, u.down);
          const bar = mk('span', 'dp-lhp', cell);
          bar.setAttribute('aria-label', c.name + ' ' + amt(c, u.hp));
          mk('i', c.side === mine ? 'dp-own' : 'dp-foe', bar).style.transform = 'scaleX(' + Math.max(0, Math.min(1, u.hp / c.hpBase)) + ')';
        });
      });
    }
    function logPanel(b, showSummary) {
      if (!logPanels[b]) {
        const el2 = mk('div', 'dp-lpanel', ui.logScroll), entries = [];
        logPanels[b] = {el: el2, rounds: entries};
        if (boutSides[b] || logFronts) {
          /* 소대전마다 편이 바뀌는 판: 이 소대전에서 싸운 두 소대를 맨 위에 적는다(단추에는 번호만 있다) */
          const bh = mk('div', 'dp-lbout', el2);
          mk('b', '', bh, logFronts ? tr('라운드 {0}', [bouts[b].roundNo]) + ' ' + boutName(b) : boutName(b));
          if (boutSides[b]) [mine, 1 - mine].forEach(function (side, j) {
            if (j) mk('i', 'dp-lvs', bh, tr('VS'));
            const cell = mk('span', 'dp-lbside ' + (j ? 'dp-foe' : 'dp-own'), bh), note = sideNote(side, b);
            mk('span', 'dp-lbname', cell, sideName(side, b) || (j ? tr('상대') : tr('내 편')));
            if (note) mk('small', '', cell, note);
          });
        }
        if (logData[b].truncated) mk('p', 'dp-ltruncated', el2, tr('기록이 잘려 마지막 상태로 건너뛰었다'));
        logData[b].rounds.forEach(function (r, j) {
          const el3 = mk('section', 'dp-lround', el2), btn = mk('button', 'dp-btn dp-lroundhead', el3);
          btn.type = 'button'; btn.setAttribute('data-dp', 'log-round-' + b + '-' + j);
          btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', logId + '-' + b + '-' + j);
          mk('b', 'dp-lroundno', btn, r.round === 0 ? tr('소대전 시작') : tr('라운드 {0}', [r.round]));
          const tags = mk('span', 'dp-ltags', btn);
          if (r.fallen.length) {
            logTag(tags, tr('쓰러짐'), 'damage');
            r.fallen.forEach(function (n) { logPortrait(tags, cards[b][n], true); });
          }
          if (r.skills) logTag(tags, tr('스킬 {0}', [r.skills]), 'skill');
          if (r.crit) logTag(tags, tr('치명 {0}', [r.crit]), 'skill');
          mk('i', 'dp-lchevron', btn, '⌄');
          if (r.round > 0 && !bouts[b].unscored) {
            const flow = mk('span', 'dp-lflow', btn), lines = [];
            if (opts.aggregateLogDamage !== false) r.beats.forEach(function (k) { BE[b][k].lines.forEach(function (i) { lines.push(bouts[b].log[i]); }); });
            narrativeText(flow, roundNarrative(r, lines, narrativeContext(b)));
          }
          const body = mk('div', 'dp-lroundbody', el3);
          body.id = logId + '-' + b + '-' + j; body.hidden = true;
          entries.push({el: el3, btn: btn, body: body, data: r, made: false});
        });
        if (showSummary) logSummary(el2, b);
      }
    }
    function logSelect(b) {
      if (!(b >= 0 && b < bouts.length)) return;
      hideHelp();
      const selected = logFronts ? logFronts.get(bouts[b].front) : [b];
      selected.forEach(function (i, j) { logPanel(i, j === selected.length - 1); });
      logPanels.forEach(function (p, i) {
        const shown = selected.includes(i);
        if (shown || !p.el.hidden) p.rounds.forEach(function (entry) {
          if (!entry.body.hidden) logRound(i, entry, false);
        });
        p.el.hidden = !shown;
      });
      ui.logTabs.forEach(function (t, i) { t.setAttribute('aria-pressed', String(i === selected[0])); });
      ui.logScroll.scrollTop = 0;
    }
    function logVisible(on) {
      hideHelp();
      ui.log.classList.toggle('dp-on', on); ui.log.setAttribute('aria-hidden', String(!on)); ui.log.inert = !on;
      rootEl.classList.toggle('dp-logview', on);
      ui.playParts.forEach(function (n) { n.inert = on; });
      ui.res.inert = on;
      ui.res.setAttribute('aria-hidden', String(on || !done));
    }

    /* 애니메이션 클래스를 뗐다 다시 붙인다. 한 장면의 것을 모아 한 번만 다시 그리게 한다.
       d 는 그 움직임이 시작하는 때(닿는 시각, 기본 속도 ms). 노드마다 --dp-d 로 넘겨 타격 정지와 박자를 맞춘다.
       카드 전체가 아니라 움직이는 노드에 적는 까닭: 앞 장면에서 아직 떠 있는 숫자의 늦춤이 같이 바뀌어 튀지 않게. */
    function kick(node, cls, d) {
      if (d != null) {
        d = Math.max(0, Math.round(d));
        if (node.dpd !== d) { node.dpd = d; node.style.setProperty('--dp-d', String(d)); }
      }
      for (let i = 0; i < kq.length; i++) if (kq[i][0] === node) { kq[i][1] = cls; return; }
      kq.push([node, cls]);
    }
    function flush() {
      if (!kq.length || dead) { kq.length = 0; return; }
      for (let i = 0; i < kq.length; i++) if (kq[i][0].dpk) kq[i][0].classList.remove(kq[i][0].dpk);
      void rootEl.offsetWidth;
      for (let i = 0; i < kq.length; i++) { kq[i][0].classList.add(kq[i][1]); kq[i][0].dpk = kq[i][1]; }
      if (typeof rootEl.getAnimations === 'function') watchKicks();
      kq.length = 0;
    }
    /* 한 클래스가 여러 자식(등장, 줄기, 컷인)을 움직일 수 있다. 실제 CSS 시계가 모두 끝나면 그 발동만 걷는다. */
    function watchKicks() {
      const granted = new Map(kq.map(function (entry) { return [entry[0], []]; }));
      for (const a of rootEl.getAnimations({subtree: true})) {
        if (!a.animationName || a.playState === 'finished') continue;
        let n = a.effect.target;
        while (n && !n.dpk) n = n.parentElement;
        if (granted.has(n)) granted.get(n).push(a.finished);
      }
      for (const [node, finishes] of granted) {
        activeKicks.set(node, finishes);
        if (!finishes.length) unKick(node);
        else Promise.allSettled(finishes).then(function (results) {
          if (dead || activeKicks.get(node) !== finishes) return;
          if (node.dpk === 'dp-sink' && results.some(function (r) { return r.status === 'fulfilled'; })) {
            node.classList.add('dp-sunk');
            sunk = node;
          }
          unKick(node);
        });
      }
    }
    function clearKicks() {
      for (const node of activeKicks.keys()) unKick(node);
    }
    function jump(fn) {
      rootEl.classList.add('dp-jump');
      fn();
      void rootEl.offsetWidth;
      rootEl.classList.remove('dp-jump');
    }

    function paint(c, u) {
      const hpBase = c.hpBase;
      const hp = Math.max(0, Math.min(hpBase, u.hp || 0)), sh = Math.max(0, Math.min(hpBase, u.sh || 0));
      if (c.vHp !== hp) {
        c.hpf.style.setProperty('--dp-v', String(hp / hpBase)); c.hpg.style.setProperty('--dp-v', String(hp / hpBase));
        c.hpn.textContent = amt(c, hp);
        c.el.classList.toggle('dp-low', hp > 0 && hp / hpBase <= 0.3);
        c.vHp = hp;
      }
      if (c.vSh !== sh) {
        c.sh.style.setProperty('--dp-v', String(sh / hpBase));
        c.shn.textContent = sh ? amt(c, sh) : '';
        c.el.classList.toggle('dp-shd', sh > 0);
        c.vSh = sh;
      }
      c.el.classList.toggle('dp-down', !!u.down);
      let shown = 0, extra = 0;
      for (let e = 1; e <= 11; e++) {
        let on = !u.down && fxAt(u, e) >= 0;
        if (on) { if (shown < fxShow) shown++; else { on = false; extra++; } }
        c.fx[e].classList.toggle('dp-on', on);
      }
      const more = extra ? '+' + extra : '';
      if (c.more.textContent !== more) c.more.textContent = more;
    }
    function paintAll(C) {
      for (const n in C) if (st.u[n]) paint(C[n], st.u[n]);
    }
    function setRound() {
      const bo = bouts[curB], total = bo?.unscored ? bo.rounds : ROUNDS;
      ui.rn.textContent = bo?.roundNo ? tr('라운드 {0}', [bo.roundNo]) :
        tr('라운드 {0}/{1}', [Math.max(1, Math.min(total, curRound)), total]);
    }
    function pips(n, current = n) {
      for (let i = 0; i < ui.pips.length; i++) {
        const bo = bouts[fronts ? fronts[i]?.at(-1) : i], p = ui.pips[i];
        p.classList.toggle('dp-x', !bo);
        p.classList.toggle('dp-w', !!bo && i < n && !bo.unscored && !bo.draw && sideOf(bo.winner) === mine);
        p.classList.toggle('dp-l', !!bo && i < n && !bo.unscored && !bo.draw && sideOf(bo.winner) !== mine);
        p.classList.toggle('dp-now', !!bo && i === current);
      }
    }
    /* 남은 소대 수 글을 바꾼다. v 는 [공격 편, 방어 편]. pop 이면 바뀐 숫자가 한 번 튄다(소대전이 끝나는 장면) */
    function setScore(v, pop) {
      if (!ui.sc || !v) return;
      [mine, 1 - mine].forEach(function (side, j) {
        const n = ui.sc[j], t = String(v[side]);
        if (n.textContent === t) return;
        n.textContent = t;
        if (pop) kick(n, 'dp-scpop');
      });
      ui.score.setAttribute('aria-label', tr('남은 소대') + ' ' + v[mine] + ' : ' + v[1 - mine]);
    }
    /* 소대전마다 바뀌는 편 이름과 덧글. 덧글이 없는 소대전도 줄 높이가 바뀌지 않게 빈칸 글자를 둔다 */
    function setSides(b) {
      if (!perBout) return;
      [0, 1].forEach(function (side) {
        const name = sideName(side, b), note = sideNote(side, b), wn = ui.wn[side], nn = ui.wnote[side];
        if (wn && wn.textContent !== name) wn.textContent = name;
        if (wn && wn.title !== name) wn.title = name;
        if (nn && nn.textContent !== (note || '\u00a0')) { nn.textContent = note || '\u00a0'; nn.title = note; }
      });
    }
    function prog(at) {
      ui.pg.style.transform = 'scaleX(' + (P.total ? Math.max(0, Math.min(1, at / P.total)) : 0).toFixed(4) + ')';
    }
    function unAct() {
      if (actCard) { actCard.el.classList.remove('dp-act'); actCard = null; }
    }
    /* 공격하는 카드와 마무리 일격을 맞는 카드를 잠깐 위로 올린다. 돌아오는 동안 다른 카드 밑으로 꺼지지 않게 장면 둘 뒤에 내린다. */
    function raise(c, cls) {
      c.el.classList.add(cls);
      if (c.rz == null) raised.push(c);
      c.rz = cueNo;
    }
    function unRaise(all) {
      for (let i = raised.length - 1; i >= 0; i--) {
        const c = raised[i];
        if (all || cueNo - c.rz >= 2) { c.el.classList.remove('dp-atk'); c.el.classList.remove('dp-hot'); c.rz = null; raised.splice(i, 1); }
      }
    }
    function unKick(node) {
      if (!node.dpk) return;
      node.classList.remove(node.dpk); node.dpk = '';
      activeKicks.delete(node);
      if (node.parentElement?.classList.contains('dp-hull-slot')) node.parentElement.classList.remove('dp-hit');
    }
    function clearCardKicks(node) {
      unKick(node);
      for (const n of activeKicks.keys()) if (node.contains(n)) unKick(n);
    }
    function setCardSlot(c, slot, count) {
      const mid = (count - 1) / 2;
      c.slot = slot;
      c.inw = slot < mid ? 1 : slot > mid ? -1 : 0;
      c.edge = slot === 0 || slot === count - 1;
      /* 등장과 환호의 지연을 다섯 자리의 길이에 맞춘다. */
      if (ship && count > SQUAD) {
        c.dk = Math.round(slot * (SQUAD - 1) / (count - 1) * 1000) / 1000;
        c.el.style.setProperty('--dp-k', String(c.dk));
      }
    }
    function resetFrontCards(b) {
      extras[b].windows.forEach(function (w) {
        if (w.initial.every(function (node, i) { return w.set.children[i] === node; })) return;
        Array.from(w.set.children).forEach(function (node) { w.bench.appendChild(node); });
        w.initial.forEach(function (node, i) {
          w.set.appendChild(node);
          setCardSlot(cards[b][node.getAttribute('data-dp-unit')], i, FRONT_CARDS);
        });
      });
    }
    function placeRoundCards(b, continuing, ms) {
      const deck = decks[frontAt[b]], extra = extras[b];
      deck.pair.forEach(function (set, row) {
        const roster = extra.roster[row], count = Math.min(FRONT_CARDS, roster.length);
        const byNode = new Map(roster.map(function (c) { return [c.el, c]; }));
        const kept = new Set(set.children);
        const next = continuing ? Array.from(kept).filter(function (node) { return byNode.has(node); }) : [];
        for (const c of roster) {
          if (next.length === count) break;
          if (!next.includes(c.el)) next.push(c.el);
        }
        const visible = new Set(next);
        for (const node of kept) if (!visible.has(node)) deck.bench[row].appendChild(node);
        if (ship) set.classList.toggle('dp-single', count <= 8);
        roster.forEach(function (c) {
          c.el.setAttribute('data-dp-unit', c.n);
          c.vHp = -1; c.vSh = -1; c.nfNo = -1; c.passNo = -1; c.lNo = -9;
          [c.el, c.fl, c.sw, c.sl, c.ck, c.rg, c.sp].forEach(unKick);
          c.nums.forEach(function (n) { unKick(n.el); });
          Object.values(c.fx).forEach(unKick);
        });
        next.forEach(function (node, i) {
          if (set.children[i] !== node) set.insertBefore(node, set.children[i] || null);
          const c = byNode.get(node);
          if (count <= SQUAD) { c.dk = i; node.style.setProperty('--dp-k', String(i)); }
          setCardSlot(c, i, count);
          if (continuing && ms && !kept.has(node)) {
            node.style.setProperty('--dp-ims', Math.round(ms / (1 + c.dk * 0.04)) / speed + 'ms');
            kick(node, 'dp-deal');
            arrivals.push(node);
          }
        });
      });
    }
    function focusFrontCards(b, actors) {
      const C = cards[b], extra = extras[b], wanted = new Set(actors), visible = {};
      if (!extra || !extra.windows.length) return C;
      extra.windows.forEach(function (w) {
        const open = Array.from(w.set.children);
        for (const n of wanted) {
          const c = C[n];
          if (!c || c.el.parentNode !== w.bench) continue;
          const i = open.findLastIndex(function (node) { return !wanted.has(Number(node.getAttribute('data-dp-unit'))); });
          if (i < 0) continue;
          clearCardKicks(open[i]); clearCardKicks(c.el);
          w.set.replaceChild(c.el, open[i]);
          w.bench.appendChild(open[i]);
          open[i] = c.el;
          loadArt(c.img);
          setCardSlot(c, i, FRONT_CARDS);
        }
      });
      for (const n in C) {
        const c = C[n], w = extra.windows[c.row];
        if (!w || c.el.parentNode !== w.bench) visible[n] = c;
      }
      return visible;
    }
    function paintHull(b, value) {
      const h = extras[b] && extras[b].hull;
      if (!h) return;
      const max = hulls[b].max;
      h.bar.setAttribute('aria-valuenow', value);
      h.fill.style.setProperty('--dp-v', String(value / max));
      h.value.textContent = formatHull(value) + ' / ' + formatHull(max);
    }
    function formatHull(value) { return typeof opts.num === 'function' ? opts.num(value) : comma(value); }
    function showBout(b, waiting, continuing, ms, hullValue) {
      if (sunk) { sunk.classList.remove('dp-sunk'); sunk = null; }
      extras.forEach(function (extra, i) {
        if (extra.hull) {
          extra.hull.el.hidden = i !== b || !!waiting;
          extra.hull.nums.forEach(function (n) { unKick(n.el); n.el.parentNode.classList.remove('dp-hit'); });
        }
      });
      if (frontReplay) {
        if (!fronts) resetFrontCards(b);
        rootEl.classList.toggle('dp-hashull', !!hulls[b] && !waiting);
      }
      if (fronts) {
        if (!continuing) decks.forEach(function (deck) { deck.pair.forEach(function (set) {
          set.classList.toggle('dp-on', deck.pair === sets[b] && !waiting);
          unKick(set);
        }); });
        unKick(ui.ban); unKick(ui.vs); unKick(ui.rd);
      } else {
        for (let i = 0; i < sets.length; i++) for (let j = 0; j < 2; j++) { sets[i][j].classList.toggle('dp-on', i === b && !waiting); unKick(sets[i][j]); }
      }
      supports.forEach(function (map, i) {
        for (const n in map) { map[n].el.hidden = i !== b || !!waiting; unKick(map[n].el); for (const key in map[n].icons) unKick(map[n].icons[key]); }
      });
      /* 모함 띠가 있는 소대전만 뿌리에 표시를 붙인다. 채우기 꼴은 이 표시를 보고 카드 높이에서 띠 몫을 뺀다. */
      rootEl.classList.toggle('dp-hassupport', !!(supports[b][DM[b].ships[0]] || supports[b][DM[b].ships[1]]));
      if (anyFace) rootEl.classList.toggle('dp-sfaces', [0, 1].some(function (side) { return FACILITY.some(function (key) { return !!faceHtml(key, side, b); }); }));
      /* 건너뛰기나 다시 보기로 소대전이 바뀌면 떠 있던 담당 소녀 컷인을 바로 걷는다(앞 소대전의 초상이 새 소대전 위에 남지 않게) */
      for (let i = 0; i < 2; i++) if (ui.kcut[i]) unKick(ui.kcut[i].el);
      cutCard = null;
      curB = b; curBeat = -1; curRound = bouts[b].roundNo || 1; st = fresh(bouts[b], report);
      hullSeen = 0;
      unAct(); unRaise(true);
      if (fronts) placeRoundCards(b, continuing, ms);
      const C = cards[b];
      if (!frontReplay && bouts[b].roundNo) {
        const count = Math.max(sets[b][0].children.length, sets[b][1].children.length);
        const wide = Math.min(24, Math.max(15, count)), narrow = Math.max(8, Math.min(10, Math.ceil(count / 2)));
        rootEl.style.setProperty('--dp-per', String(wide));
        rootEl.style.setProperty('--dp-groups', String(Math.ceil(wide / SQUAD)));
        rootEl.style.setProperty('--dp-cols', String(narrow));
        rootEl.style.setProperty('--dp-ln', String(Math.ceil(count / narrow)));
        rootEl.style.setProperty('--dp-wide-ln', String(Math.ceil(count / wide)));
        rootEl.classList.toggle('dp-wrap-cards', count > wide);
      }
      for (const n in C) { unKick(C[n].mv); unKick(C[n].frm); }
      jump(function () { paintAll(C); if (hulls[b]) paintHull(b, hullValue ?? hullProgress?.[b].start ?? hulls[b].start); });
      ui.bn.textContent = boutName(b);
      setSides(b);
      if (ui.sc) { unKick(ui.sc[0]); unKick(ui.sc[1]); setScore(scores[b] && scores[b].before, false); }
      setRound();
      ui.tacMe.textContent = tacText(mine, b);
      ui.tacOp.textContent = tacText(1 - mine, b);
      ui.ma.textContent = ''; ui.ms.textContent = ''; ui.mt.textContent = '';
      ui.mid.classList.remove('dp-foe'); ui.mid.classList.remove('dp-own');
      pips(fronts ? frontAt[b] : b);
    }
    /* lead 는 띠가 뜨기 전에 비워 두는 몫(0~1). 소대전 끝의 승리 동작이 먼저 보이게 한다. */
    function banner(small, big, sub, tone, ms, lead) {
      ui.bs.textContent = small; ui.bt.textContent = big; ui.bu.textContent = sub;
      ui.ban.className = 'dp-ban' + (tone ? ' ' + tone : '');
      ui.ban.style.setProperty('--dp-banms', Math.max(200, Math.round(ms * (1 - (lead || 0)))) / speed + 'ms');
      ui.ban.style.setProperty('--dp-band', Math.round(ms * (lead || 0)) / speed + 'ms');
      kick(ui.ban, 'dp-go');
    }

    /* 여기부터 장면 연출. 값(글자, 너비, 클래스, transform)만 바꾼다. */
    /* 보고서의 눈금과 표시용 최대 체력으로 피해, 회복, 방어막을 표시한다.
       양수는 적어도 1로 보인다. 최대 체력이 없는 보고서의 숫자와 체력 막대 길이는 받은 비율 그대로다. */
    function amt(c, v) {
      v = Number(v) || 0;
      if (!(c.max > 0)) return String(v);
      return (opts.formatAmount || comma)(hpAmount(c.max, v, c.hpBase));
    }
    function num(c, val, tag, cls, d) {
      if (c.nfNo !== frameNo) { c.nfNo = frameNo; c.nf = 0; }
      const n = c.nums[c.ni];
      c.ni = (c.ni + 1) % c.nums.length;
      n.v.textContent = val; n.g.textContent = tag;
      n.el.className = 'dp-num ' + cls + (String(val).length >= 6 ? ' dp-n-long' : '');
      n.el.style.setProperty('--dp-nk', String(c.nf++));
      kick(n.el, 'dp-go', d || 0);
    }
    /* 카드에 미리 만든 효과 노드(번쩍임, 충격 고리, 빛 훑기) 하나를 이 장면에 쓴다. 한 장면에서 같은 노드를 두 번 쓰면 앞선 순위가 남는다. */
    function fxOn(node, base, cls, pri, d) {
      if (node.dpNo === frameNo && node.dpPri >= pri) return;
      node.dpNo = frameNo; node.dpPri = pri;
      node.className = base + ' ' + cls;
      kick(node, 'dp-go', d || 0);
    }
    /* 카드 뿌리는 움직이지 않으니(움직임은 안쪽 .dp-cm 과 .dp-fr) 연출 중에 재도 자리가 맞다. 그림 칸 가운데는 폭의 2/3 높이. */
    function center(c) {
      const r = c.el.getBoundingClientRect();
      /* 한 척 판의 작은 카드는 그림 칸이 가로로 넓어 폭의 2/3 가 카드 아래로 내려간다. 카드 높이의 0.45 를 넘지 않게 */
      return {x: r.left + r.width / 2, y: r.top + (ship ? Math.min(r.width * 0.667, r.height * 0.45) : r.width * 0.667), w: r.width};
    }
    /* 대상 하나의 맞는 방향 [가로, 세로, 카드 폭]. 한 척 판은 줄 안쪽이 어느 쪽인지와 전장 끝 칸인지를 실제 자리로 재서 덧붙인다
       (8장과 나머지 두 줄, 15장 한 줄은 CSS 가 가르므로 자리 번호로는 알 수 없다). F 는 전장 상자 */
    function aim(A, p, F) {
      const vx = p.x - A.x, vy = p.y - A.y, vl = Math.sqrt(vx * vx + vy * vy) || 1, out = [vx / vl, vy / vl, p.w];
      if (ship) {
        const mid = F.left + F.width / 2;
        out.push(p.x < mid - 1 ? 1 : p.x > mid + 1 ? -1 : 0, p.x - F.left < p.w * 1.2 || F.left + F.width - p.x < p.w * 1.2);
      }
      return out;
    }
    /* 여러 대상의 엇박. 돌려주는 것 {at:[대상마다 차례], step:차례 사이 ms, from:퍼지는 방향}.
       한 척 판은 공격 쪽에서 가까운 세로 줄부터 맞고(같은 세로 줄은 함께) 전체 길이가 다섯 장 때(차례 넷)를 넘지 않게 사이를 줄인다. fromX 는 공격 쪽의 가로 자리 */
    function spread(cs, pts, dir, fromX) {
      if (!ship) {
        const rank = cs.slice().sort(function (p, q) { return (p.slot - q.slot) * dir; });
        return {at: cs.map(function (t) { return rank.indexOf(t); }), step: STAGGER, from: dir};
      }
      const xs = [];
      pts.forEach(function (p) { const x = Math.round(p.x); if (xs.indexOf(x) < 0) xs.push(x); });
      xs.sort(function (p, q) { return p - q; });
      const from = fromX == null ? 1 : fromX <= (xs[0] + xs[xs.length - 1]) / 2 ? 1 : -1;
      if (from < 0) xs.reverse();
      return {at: pts.map(function (p) { return xs.indexOf(Math.round(p.x)); }), step: Math.min(STAGGER, (SQUAD - 1) * STAGGER / Math.max(1, xs.length - 1)), from: from};
    }
    /* 느린 화면 배율(마무리 일격)과 체력 막대가 줄기 시작하는 때를 카드에 적는다. 바뀔 때만 쓴다. */
    function slow(c, v) {
      if (c.slo !== v) { c.slo = v; c.mv.style.setProperty('--dp-slo', String(v)); }
    }
    function lag(c, d) {
      d = Math.max(0, Math.round(d));
      if (c.bd !== d) { c.bd = d; c.el.style.setProperty('--dp-bd', String(d)); }
    }
    function when(c) {
      return ctx ? (ctx.d[c.n] != null ? ctx.d[c.n] : ctx.base) : 0;
    }
    /* 밀려나는 방향과 거리(넉백). dir 은 [가로, 세로, 카드 폭], amt 는 카드 폭의 몫.
       쓰러질 때(ko)는 줄 안쪽으로 비스듬히 크게 튕긴다. 위아래로 곧게 튕기면 카드가 전장 밖으로 나가 잘린다. */
    function knock(c, dir, amt, deg, ko) {
      let ux = dir ? dir[0] : 0, uy = dir ? dir[1] : 0;
      const w = dir ? dir[2] : 0, s = c.el.style;
      const seen = !!dir && dir.length > 3, inw = seen ? dir[3] : c.inw, edge = seen ? dir[4] : c.edge;   /* 한 척 판은 aim 이 잰 자리, 그 밖에는 자리 번호 */
      const turn = (edge ? inw : Math.abs(ux) < 0.15 ? (c.slot % 2 ? 1 : -1) : ux > 0 ? 1 : -1) || 1;
      if (ko && dir) {
        ux = ux * 0.5 + turn * 0.75; uy = uy * 0.5;
        const l = Math.sqrt(ux * ux + uy * uy) || 1;
        ux /= l; uy /= l;
      }
      s.setProperty('--dp-kx', (ux * w * amt).toFixed(1) + 'px');
      s.setProperty('--dp-ky', (uy * w * amt).toFixed(1) + 'px');
      s.setProperty('--dp-kr', (turn * deg).toFixed(1) + 'deg');
    }
    /* 공격 줄기. a 에서 b 로. 근접은 넓은 잔상(w 가 폭), 원거리는 탄두가 날아가는 가는 줄기. 자리와 길이는 한 번 적고 움직임은 transform 으로만. */
    function beam(F, a, b, cls, d, w, slo) {
      const n = ui.beams[ui.beamAt];
      ui.beamAt = (ui.beamAt + 1) % ui.beams.length;
      const dx = b.x - a.x, dy = b.y - a.y;
      n.style.left = (a.x - F.left).toFixed(1) + 'px';
      n.style.top = (a.y - F.top).toFixed(1) + 'px';
      n.style.width = Math.sqrt(dx * dx + dy * dy).toFixed(1) + 'px';
      n.style.transform = 'rotate(' + Math.atan2(dy, dx).toFixed(4) + 'rad)';
      n.style.setProperty('--dp-bw', (w || 0).toFixed(1) + 'px');
      n.style.setProperty('--dp-slo', String(slo || 1));
      n.className = 'dp-beam ' + cls;
      kick(n, 'dp-go', d);
    }
    /* 치명: 전장 줄이 맞는 카드를 중심으로 살짝 커졌다 돌아온다. 모든 배속에서 같은 확대를 쓴다. */
    function punch(c, d) {
      const R = ui.rows.getBoundingClientRect(), p = center(c);
      ui.rows.style.transformOrigin = (p.x - R.left).toFixed(0) + 'px ' + (p.y - R.top).toFixed(0) + 'px';
      kick(ui.rows, 'dp-zoom', d);
    }
    function dimFor(ms) {
      ui.dim.style.setProperty('--dp-dimms', Math.max(160, Math.round(ms)) / speed + 'ms');
      kick(ui.dim, 'dp-go');
    }
    function cutIn(a, ms) {
      ui.cut.classList.toggle('dp-foe', a.side !== mine);
      ui.cs.textContent = tr(TEXT.skill[a.cls] || TEXT.op[2]);
      ui.cc.textContent = a.role;
      ui.cn.textContent = a.name;
      ui.cph.textContent = first(a.name);
      cutCard = a;
      artBackground(ui.ca, a.img, !ship || wideCut, function () { return cutCard === a; });
      ui.cut.style.setProperty('--dp-cutms', Math.max(160, Math.round(ms)) / speed + 'ms');
      kick(ui.cut, 'dp-go');
      kick(a.mv, 'dp-cast');
      dimFor(ms);
    }
    /* 시설 담당 소녀 컷인. x 는 [편, 시설 열쇠]. 미리 만든 그 편의 띠에서 글과 보일 초상만 바꾸고 스킬 컷인과 같은 움직임(dp-go)을 건다.
       이름표: 작은 글 「모함」, 담당 소녀 이름(없으면 모함 이름), 큰 글은 시설 이름(스킬 컷인의 스킬 이름 자리) */
    function facilityCut(b, x, ms) {
      const indexed = x.length > 2 ? facilityActorsAt[b][x[2]] : null;
      const k = ui.kcut[x[0]], at = k ? k.htmls.indexOf(indexed ? indexed.html : faceHtml(x[1], x[0], b)) : -1;
      if (at < 0) return false;
      loadArt(k.faces[at].querySelector('img'), wideCut);
      const a = supports[b][DM[b].ships[x[0]]], who = indexed ? indexed.name : facilityWho(x[1], x[0], b);
      const name = who || (a ? a.given : ''), what = tr(TEXT.facility[x[1]]);
      if (k.on !== at) {
        if (k.on >= 0) k.faces[k.on].classList.remove('dp-on');
        k.faces[at].classList.add('dp-on'); k.on = at;
      }
      k.cs.textContent = what;
      k.cn.textContent = name;
      k.ph.textContent = first(name || what);
      k.el.style.setProperty('--dp-cutms', Math.max(160, Math.round(ms)) / speed + 'ms');
      kick(k.el, 'dp-go');
      return true;
    }
    function targetText(beat, C) {
      const log = bouts[curB].log, seen = [];
      let foe = false;
      for (let i = 0; i < beat.lines.length; i++) {
        const L = log[beat.lines[i]], op = L[3];
        if (L[1] !== beat.actor || L[2] === beat.actor || L[2] < 0) continue;
        if (op === OP.hit ? (L[7] & FLAG.counter) : (op !== OP.effect && op !== OP.heal && op !== OP.supply)) continue;
        const target = C[L[2]] || facilityActors[curB][L[2]];
        if (seen.indexOf(L[2]) < 0 && target) { seen.push(L[2]); foe = target.side !== actor(curB, beat.actor).side; }
      }
      if (!seen.length) return '';
      let all = seen.length > 2;
      if (all && ship) {
        /* 한 척 판은 대상 셋인 무기와 스킬이 있다. 그 편의 서 있는 카드 절반을 넘을 때만 「전체」라 적고 아니면 이름을 늘어놓는다 */
        const tside = (C[seen[0]] || facilityActors[curB][seen[0]]).side;
        let alive = 0;
        for (const n in C) if (C[n].side === tside && st.u[n] && !st.u[n].down) alive++;
        all = seen.length * 2 > alive;
      }
      if (all) return foe ? tr('적 전체') : tr('아군 전체');
      return seen.map(function (n) { return (C[n] || facilityActors[curB][n]).name; }).join(lang === 'ja' ? '、' : ', ');
    }
    function beginBeat(c, beat, C, show) {
      curBeat = c.k; curRound = beat.round; setRound();
      unAct();
      if (beat.kind === 'snapshot') return;
      const a = actor(curB, beat.actor);
      if (a && !a.support && beat.kind !== 'cleanup') {
        a.el.classList.add('dp-act'); actCard = a;
        if (show) fxOn(a.sw, 'dp-sw', 'dp-w-turn', 0, 0);   /* 차례가 온 카드에 빛이 한 번 훑고 지나간다 */
      }
      ui.mid.classList.toggle('dp-foe', !!a && a.side !== mine);
      ui.mid.classList.toggle('dp-own', !!a && a.side === mine);
      ui.ma.textContent = a ? supportWho(curB, beat, a) || (a.key ? a.given : a.name) : '';
      let act = tr(beat.round === 0 ? '소대전 시작' : '라운드 정리'), tgt = '';
      if (beat.kind === 'skill' || beat.kind === 'supply') act = skillText(curB, beat, a);
      else if (beat.kind === 'attack') act = a && a.key ? facilityText(curB, beat) : tr(TEXT.op[1]);
      else if (beat.kind === 'skip') act = tr(TEXT.op[5]);
      if (a && beat.kind !== 'skip' && beat.kind !== 'cleanup') tgt = targetText(beat, C);
      ui.ms.textContent = act; ui.mt.textContent = tgt;
    }
    /* 공격 한 번: 예비 동작, 돌진(또는 제자리 반동과 탄), 타격 정지, 반동, 복귀. 움직임은 CSS keyframes 이고 여기서는 방향과 닿는 시각만 넘긴다.
       닿는 시각과 밀려날 방향을 대상마다 ctx 에 적어 두면 react 가 그 박자에 맞춰 대상 반응을 건다. */
    function strikeFx(c, beat, fr, log, C) {
      const tg = [];
      let actor = -1, crit = false;
      for (let i = 0; i < fr.lines.length; i++) {
        const L = log[fr.lines[i]];
        if (L[3] !== OP.hit) continue;
        if (actor < 0) actor = L[1];
        if (L[1] !== actor) continue;
        if (tg.indexOf(L[2]) < 0 && C[L[2]]) tg.push(L[2]);
        if ((L[7] & FLAG.crit) && !(L[7] & FLAG.evade) && L[4] > 0) crit = true;
      }
      const a = C[actor] || supports[curB][actor] || facilityActors[curB][actor];
      if (!a || !tg.length) return;
      const cs = tg.map(function (n) { return C[n]; }), wide = cs.length > 1;
      if (a.support) { supportShot(c, a, cs); return; }
      const kind = fr.type === 'counter' ? 'counter' : fr.pursuit ? 'chase' : RANGED[a.cls] ? 'ranged' : a.lNo === frameNo - 1 ? 'combo' : crit && !wide ? 'meleeCrit' : 'melee';
      const mv = MOVE[kind], slo = c.fin ? 2 : 1, col = a.side === mine ? 'me' : 'op';
      const A = center(a), pts = cs.map(center), F = ui.field.getBoundingClientRect();
      let x = 0, y = 0;
      pts.forEach(function (p) { x += p.x; y += p.y; });
      const dx = x / pts.length - A.x, dy = y / pts.length - A.y, len = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / len, uy = dy / len;
      const s = a.mv.style;
      s.setProperty('--dp-dx', (dx * mv[2]).toFixed(1) + 'px');
      s.setProperty('--dp-dy', (dy * mv[2]).toFixed(1) + 'px');
      s.setProperty('--dp-ux', ux.toFixed(3));
      s.setProperty('--dp-uy', uy.toFixed(3));
      s.setProperty('--dp-lean', ((ux >= 0 ? -1 : 1) * (4 + 4 * Math.abs(ux))).toFixed(1) + 'deg');
      if (kind === 'combo') { s.setProperty('--dp-sx', a.lx.toFixed(1) + 'px'); s.setProperty('--dp-sy', a.ly.toFixed(1) + 'px'); }
      if (mv[2]) { a.lNo = frameNo; a.lx = dx * mv[2] * 0.8; a.ly = dy * mv[2] * 0.8; }
      slow(a, slo);
      kick(a.mv, mv[0]);
      raise(a, 'dp-atk');
      ctx = {base: mv[1] * slo, d: {}, dir: {}, col: col, slo: slo, fin: slo > 1, power: beat.kind === 'skill' && !wide};
      /* 여러 대상은 공격 카드 쪽에서부터 차례로(엇박) 맞는다 */
      const sp = spread(cs, pts, a.inw < 0 ? -1 : 1, A.x), dir = sp.from;
      cs.forEach(function (t, i) {
        const p = pts[i];
        const d = (mv[1] + (wide ? sp.at[i] * sp.step : 0)) * slo;
        ctx.d[t.n] = d; ctx.dir[t.n] = aim(A, p, F);
        if (kind === 'ranged') beam(F, A, p, 'dp-b-bolt dp-b-' + col + (ctx.power || crit ? ' dp-b-big' : ''), d - FLIGHT * slo, 0, slo);
      });
      if (mv[2]) beam(F, A, {x: A.x + dx * mv[2], y: A.y + dy * mv[2]}, 'dp-b-trail dp-b-' + col, (mv[1] - 110) * slo, A.w * 0.5, slo);
      if (wide) {
        {
          const sh = ui.shock[cs[0].side === mine ? 1 : 0];
          sh.style.setProperty('--dp-sd', String(dir));
          sh.className = 'dp-shock dp-b-' + col;
          kick(sh, 'dp-go', mv[1] * slo - 40);
        }
        kick(ui.rows, 'dp-quake', mv[1] * slo);
      }
    }
    /* 모함 사격: 카드가 달려 나가지 않는다. 모함 띠에서 탄 줄기가 날아가고 맞는 카드는 여느 피격 연출을 그대로 쓴다.
       띠가 밝아지는 것은 supportGlow 가 한다. 여러 대상(대공)은 왼쪽 카드부터 엇박으로 맞는다. 소대전을 끝내는 한 발은 여느 마무리 일격처럼 느리게 보인다. */
    function supportShot(c, a, cs) {
      const slo = c.fin ? 2 : 1, col = a.side === mine ? 'me' : 'op';
      const R = a.el.getBoundingClientRect(), A = {x: R.left + R.width / 2, y: R.top + R.height / 2}, F = ui.field.getBoundingClientRect();
      const pts = cs.map(center), sp = spread(cs, pts, 1, null);
      ctx = {base: SUPPORT_HIT * slo, d: {}, dir: {}, col: col, slo: slo, fin: slo > 1, power: false};
      cs.forEach(function (t, i) {
        const p = pts[i];
        const d = (SUPPORT_HIT + (cs.length > 1 ? sp.at[i] * sp.step : 0)) * slo;
        ctx.d[t.n] = d; ctx.dir[t.n] = aim(A, p, F);
        beam(F, A, p, 'dp-b-bolt dp-b-' + col, d - FLIGHT * slo, 0, slo);
      });
    }
    /* 이 장면에 모함이 행위자인 줄이 있으면 그 편 모함 띠를 밝힌다. 스킬 줄이면 쓴 시설 아이콘도, 라운드 0 의 방어막이면 격벽 아이콘도. */
    function supportGlow(b, fr, log) {
      const map = supports[b];
      if (!fr.lines.length && fr.lead) fr.lead.forEach(function (x) {
        const band = map[DM[b].ships[x[0]]];
        if (band) { kick(band.el, 'dp-spulse'); kick(band.icons[x[1]], 'dp-fpulse'); }
      });
      for (let i = 0; i < fr.lines.length; i++) {
        const L = log[fr.lines[i]], s = shipSide(DM[b], L[1]) >= 0 ? map[L[1]] : facilityActors[b][L[1]];
        if (!s || L[3] === OP.expire || L[3] === OP.snapshot) continue;
        kick(s.el, 'dp-spulse');
        const key = s.key || (L[3] === OP.skill ? FACILITY[L[4]] : L[0] === 0 && L[3] === OP.effect && L[4] === EFFECT.shield ? 'hull' : '');
        if (key && s.icons[key]) kick(s.icons[key], 'dp-fpulse');
      }
    }
    function castFx(beat, fr, log, C) {
      const a = C[beat.actor], seen = [], list = [];
      if (!a) return;
      kick(a.mv, 'dp-cast');
      ctx = {base: 60, d: {}, dir: {}, col: a.side === mine ? 'me' : 'op', slo: 1, fin: false, power: false};
      for (let i = 0; i < fr.lines.length; i++) {
        const L = log[fr.lines[i]], op = L[3];
        if (L[1] !== beat.actor || L[2] === beat.actor || !C[L[2]] || seen.indexOf(L[2]) >= 0) continue;
        if (op !== OP.effect && op !== OP.heal && op !== OP.supply) continue;
        seen.push(L[2]); list.push(C[L[2]]);
      }
      if (!list.length) return;
      const A = center(a), pts = list.map(center), F = ui.field.getBoundingClientRect();
      list.forEach(function (t, i) {
        ctx.d[t.n] = 150;
        beam(F, A, pts[i], 'dp-b-bolt ' + (t.side === a.side ? 'dp-b-aid' : 'dp-b-hex'), 150 - FLIGHT, 0, 1);
      });
    }
    function aura(beat, C) {
      const a = C[beat.actor];
      if (!a) return;
      kick(a.mv, 'dp-cast');
      const team = TEXT.team[a.cls];
      if (!team) { num(a, '', tr('효과 없음'), 'dp-n-miss', 0); ui.mt.textContent = tr('효과 없음'); return; }
      /* 아군 강화: 호박색 빛이 쓴 카드에서부터 옆으로 번져 간다 */
      for (const n in C) if (C[n].side === a.side && st.u[n] && !st.u[n].down) {
        const d = 50 + Math.abs(C[n].dk - a.dk) * 45;
        fxOn(C[n].fl, 'dp-fl', 'dp-f-buff', 1, d);
        fxOn(C[n].sw, 'dp-sw', 'dp-w-buff', 1, d);
      }
      num(a, '', tr(team), 'dp-n-buff', 0);
      ui.mt.textContent = tr(team);
    }
    function react(L, pre, beat, fr, C) {
      const op = L[3];
      let c;
      if (op === OP.hit) {
        c = C[L[2]];
        if (!c) return;
        const fl = L[7] || 0, dmg = L[4] || 0, abs = L[8] || 0, tick = fr.type === 'tick', tag = [];
        const d = when(c), dir = ctx ? ctx.dir[c.n] : null, col = ctx ? ctx.col : 'op';
        lag(c, d);
        if (fl & FLAG.evade) { kick(c.frm, 'dp-dodge', d - 90); num(c, '', tr(TEXT.flag[2]), 'dp-n-miss', d); return; }
        if (tick) tag.push(tr(TEXT.effect[6]));
        [1, 4, 8, 16].forEach(function (bit) { if (fl & bit) tag.push(tr(TEXT.flag[bit])); });
        const crit = !!(fl & FLAG.crit), ko = !!pre && !pre.down && L[5] <= 0;
        if (dmg > 0) {
          num(c, amt(c, dmg), tag.join(' '), tick ? 'dp-n-burn' : crit ? 'dp-n-crit' : 'dp-n-dmg', d);
          fxOn(c.fl, 'dp-fl', tick ? 'dp-f-burn' : 'dp-f-hit', 5, d);
          if (tick) {
            if (ko) { knock(c, null, 0, KNOCK.ko[2]); slow(c, 1); kick(c.mv, 'dp-ko', d); }   /* 화상으로 쓰러짐: 밀려나지 않고 제자리에서 가라앉는다 */
            else kick(c.frm, 'dp-sting', d);
          } else {
            /* 맞는 세기 세 단계와 치명, 쓰러짐. 공격이 온 방향으로 밀렸다 돌아온다 */
            const permille = dmg / ((c.hpBase || HP_BASE) / HP_BASE);
            const k = KNOCK[ko ? 'ko' : crit ? 'crit' : permille >= HEAVY || (ctx && ctx.power) ? 'heavy' : permille < LIGHT ? 'light' : 'mid'];
            const tone = crit ? 'dp-r-crit' : 'dp-r-' + col;
            knock(c, dir, k[1], k[2], ko);
            if (ko) {
              slow(c, ctx ? ctx.slo : 1);
              kick(c.mv, k[0], d);
              kick(c.ck, 'dp-go', d);
              if (ctx && ctx.fin) raise(c, 'dp-hot');
            } else kick(c.frm, k[0], d);
            fxOn(c.rg, 'dp-rg', tone + (k[1] >= 0.16 ? ' dp-r-big' : ''), 5, d);
            if (k[1] >= 0.1) { c.sp.className = 'dp-sp ' + tone; kick(c.sp, 'dp-go', d); }
            c.sl.className = 'dp-sl ' + ((fl & FLAG.pierce) ? 'dp-s-pierce' : 'dp-s-slash'); kick(c.sl, 'dp-go', d);
            if (crit) { kick(ui.edge, 'dp-go', d); punch(c, d); }
          }
        }
        if (abs > 0) {
          num(c, amt(c, abs), dmg > 0 ? '' : tr('막음'), 'dp-n-sh', d);
          fxOn(c.fl, 'dp-fl', 'dp-f-sh', 4, d);
          if (!(dmg > 0)) { knock(c, dir, 0.05, 0); kick(c.frm, 'dp-block', d); fxOn(c.rg, 'dp-rg', 'dp-r-block', 4, d); }   /* 막음: 방어막 고리가 튕긴다 */
        }
        if (!(dmg > 0) && !(abs > 0)) num(c, '0', tag.join(' '), 'dp-n-miss', d);
      } else if (op === OP.effect) {
        c = C[L[2]];
        if (!c) return;
        const e = L[4], src = C[L[1]], d = when(c);
        if ((fr.type === 'counter' || fr.type === 'tick' || L[1] !== beat.actor) && src && src.passNo !== frameNo) {
          src.passNo = frameNo;
          num(src, '', TEXT.passive[src.cls] ? tr(TEXT.passive[src.cls]) : tr('패시브'), 'dp-n-pas', d);
        }
        if (e === EFFECT.cleanse) { num(c, '', tr(TEXT.effect[8]), 'dp-n-heal', d); fxOn(c.fl, 'dp-fl', 'dp-f-heal', 3, d); fxOn(c.sw, 'dp-sw', 'dp-w-heal', 3, d); return; }
        if (e === EFFECT.shield) {
          lag(c, d);
          num(c, amt(c, L[5] || 0), tr(TEXT.effect[1]), 'dp-n-sh', d);
          fxOn(c.fl, 'dp-fl', 'dp-f-sh', 4, d);
          fxOn(c.rg, 'dp-rg', 'dp-r-sh', 3, d);   /* 방어막: 하늘색 고리가 카드를 감싼다 */
        } else {
          num(c, '', tr(TEXT.effect[e] || TEXT.op[3]), HARM[e] ? 'dp-n-bad' : 'dp-n-buff', d);
          fxOn(c.fl, 'dp-fl', HARM[e] ? 'dp-f-bad' : 'dp-f-buff', 2, d);
          fxOn(c.sw, 'dp-sw', HARM[e] ? 'dp-w-hex' : 'dp-w-buff', 2, d);   /* 약화는 보라 물결, 강화는 호박색 빛 */
        }
        if (c.fx[e]) pops.push(c.fx[e]);
      } else if (op === OP.heal) {
        c = C[L[2]];
        if (!c) return;
        const d = when(c);
        lag(c, d);
        num(c, '+' + amt(c, L[4] || 0), '', fr.type === 'tick' ? 'dp-n-heal dp-n-sm' : 'dp-n-heal', d);
        fxOn(c.fl, 'dp-fl', 'dp-f-heal', 3, d);
        fxOn(c.sw, 'dp-sw', 'dp-w-heal', 3, d);   /* 회복: 초록 빛이 아래에서 위로 */
      } else if (op === OP.skip) {
        c = C[L[1]];
        if (!c) return;
        kick(c.mv, 'dp-stun');
        num(c, '', tr(TEXT.effect[3]), 'dp-n-bad', 0);
      } else if (op === OP.supply) {
        c = C[L[2]];
        if (!c) return;
        const d = when(c);
        num(c, '', L[5] ? tr('다음 선두') : tr('바로 행동'), 'dp-n-buff', d);
        fxOn(c.fl, 'dp-fl', 'dp-f-buff', 2, d);
        fxOn(c.sw, 'dp-sw', 'dp-w-buff', 2, d);
        kick(c.mv, 'dp-boost', d);
      }
    }
    function runFrame(c, quiet) {
      const beat = BE[c.b][c.k], fr = beat.frames[c.f], log = bouts[c.b].log, allCards = cards[c.b], show = !quiet;
      const C = fr.frontActors ? focusFrontCards(c.b, fr.frontActors) : allCards;
      const ms = c.ms;
      frameNo++; ctx = null;
      if (c.f === 0) beginBeat(c, beat, allCards, show);
      /* 배속은 길이만 나눈다. 시설 컷인과 마지막 일격도 같은 순서와 움직임을 쓴다. */
      if (show) supportGlow(c.b, fr, log);
      if (show && c.kcut) {
        let on = false;
        for (let i = 0; i < c.kcut.length; i++) if (facilityCut(c.b, c.kcut[i], ms)) on = true;
        if (on) dimFor(ms);
        /* 라운드 0 격벽은 띠가 빠져나갈 즈음 방어막을 올린다. 기본 속도 지연도 모든 배속에서 같다. */
        if (on && fr.type === 'tick') ctx = {base: Math.round(ms * 0.6 / speed / pace), d: {}, dir: {}, col: 'me', slo: 1, fin: false, power: false};
      }
      if (show && c.fin) dimFor(ms);
      if (show && fr.type === 'cutin' && !fr.support) {
        const a = C[beat.actor];
        if (a) cutIn(a, ms);
      } else if (show && fr.type === 'aura') aura(beat, C);
      else if (show && (fr.type === 'strike' || fr.type === 'counter')) strikeFx(c, beat, fr, log, C);
      else if (show && fr.type === 'fx') castFx(beat, fr, log, C);
      pops.length = 0;
      const hull = hulls[c.b], meter = hull && extras[c.b].hull;
      let hullHits = 0;
      for (let i = 0; i < fr.lines.length; i++) {
        const line = fr.lines[i], L = log[line], u = st.u[L[3] === OP.expire ? L[1] : L[2]], pre = u ? {hp: u.hp, sh: u.sh, down: u.down} : null;
        apply(st, L);
        if (show) react(L, pre, beat, fr, C);
        const hits = hull && hull.hits.get(line);
        if (hits) hits.forEach(function (hit) {
          if (hullProgress) {
            hullSeen += hit.absorbed;
            const p = hullProgress[c.b];
            /* 기록이 교전 합계보다 많이 보여도 끝에서 막대가 되돌아가지 않게 한다. */
            paintHull(c.b, Math.max(p.end, hullSummary.initial - (p.before + hullSeen)));
          } else paintHull(c.b, hit.left);
          if (!show) return;
          if (!hullHits++) meter.nums.forEach(function (n) { unKick(n.el); n.el.parentNode.classList.remove('dp-hit'); });
          meter.nums[meter.ni].el.parentNode.classList.add('dp-hit');
          num(meter, '−' + formatHull(hit.absorbed), '', 'dp-n-sh', 0);
        });
      }
      paintAll(allCards);
      if (show) for (let i = 0; i < pops.length; i++) kick(pops[i], 'dp-pop');
      if (fr.type === 'snap' && c.rd) {
        curRound = beat.round + 1; setRound();
        if (show) { ui.rd.textContent = tr('라운드 {0}', [curRound]); kick(ui.rd, 'dp-go'); }
      }
      return ms;
    }
    function runCue(quiet) {
      const c = cues[pos++];
      const prev = cues[pos - 2];
      /* 등장 뒤에도 줄에 클래스가 남으면 나중에 들어온 카드까지 다시 뒤집힌다. */
      if (prev?.t === 'intro') sets[prev.b].forEach(unKick);
      let ms = c.ms;
      cueNo++; unRaise(false);
      if (arrivals.length) { arrivals.forEach(unKick); arrivals.length = 0; }
      prog(c.at);
      if (c.t === 'intro') {
        showBout(c.b);
        warmBout(c.b, !ship);
        warmBout(fronts ? fronts[frontAt[c.b]][1] ?? logFrontTabs[frontAt[c.b] + 1] : c.b + 1);
        if (!quiet) {
          /* 양쪽 카드가 뒷면으로 깔렸다가 차례로 뒤집히고 가운데에 VS 가 찍힌다. 모든 배속에서 길이와 등장 지연만 나눈다 */
          ui.field.style.setProperty('--dp-ims', Math.max(200, Math.round(c.ms)) / speed + 'ms');
          const intro = c.b === firstBout ? opts.introText : '';
          banner(intro || boutLabel && !frontReplay ? '' : tr('소대전 시작'), intro || boutName(c.b), '', intro ? 'dp-transition' : '', c.ms * 0.6, 0);
          kick(sets[c.b][0], 'dp-deal'); kick(sets[c.b][1], 'dp-deal');
          kick(ui.vs, 'dp-go');
        }
      } else if (fronts && c.b != null && c.b !== curB) {
        showBout(c.b, false, true, quiet ? 0 : c.ms);
        warmBout(c.b);
      }
      if (c.t === 'frame') {
        ms = runFrame(c, quiet);
      } else if (c.t === 'trunc') {
        unAct(); settle(st, bouts[c.b]); paintAll(cards[c.b]);
        if (!quiet) banner(boutName(c.b), tr('기록은 여기까지다.'), '', 'dp-note', c.ms, 0);
      } else if (c.t === 'outro') {
        const bo = bouts[c.b], w = sideOf(bo.winner) === mine, h = bo.health || [], dr = bo.draw === true;
        unAct(); settle(st, bo); paintAll(cards[c.b]);
        if (fronts) pips(frontAt[c.b] + 1, -1); else pips(c.b + 1);
        if (!hullProgress && hulls[c.b]) paintHull(c.b, hulls[c.b].end);
        setScore(scores[c.b] && scores[c.b].after, !quiet);   /* 남은 소대 수는 소대전이 끝나는 장면에서 줄어든다 */
        if (!quiet) {
          /* 이긴 편의 남은 카드가 차례로 뛰어오르고 진 편은 가라앉은 뒤 알림 띠가 뜬다. 모든 배속에서 같고 둘 다 빠진 소대전(무승부)은 띠만 */
          const cheer = !dr && !bo.unscored;
          if (cheer) { kick(sets[c.b][w ? 1 : 0], 'dp-cheer'); kick(sets[c.b][w ? 0 : 1], 'dp-sink'); }
          banner(boutName(c.b), bo.unscored ? tr('{0}라운드', [bo.rounds]) : dr ? drawLabel() : bo.timeout ? (w ? tr('판정승') : tr('판정패')) : (w ? tr('승리') : tr('패배')),
            bo.unscored ? '' : bo.timeout ? tr('남은 체력 {0}% 대 {1}%', [Math.round((h[mine] || 0) * 100), Math.round((h[1 - mine] || 0) * 100)]) : tr('{0}라운드', [fronts ? bo.roundNo : bo.rounds]),
            bo.unscored ? 'dp-note' : dr ? 'dp-draw' : w ? 'dp-win' : 'dp-lose', c.ms, cheer ? 0.24 : 0);
        }
      } else if (c.t === 'final') {
        ui.field.classList.add('dp-end');
      }
      if (hullProgress && c.b != null && cues[pos]?.b !== c.b) paintHull(c.b, hullProgress[c.b].end);
      flush();
      return ms;
    }

    /* 재생 조작. 시간은 setTimeout 한 줄기(다음 장면 하나만 예약). */
    function sync() {
      const on = playing && !stepping;
      rootEl.classList.toggle('dp-playing', on);
      ui.playL.textContent = on ? tr('멈춤') : tr('재생');
      ui.speedL.textContent = tr('{0}배', [speed]);
    }
    function stopTimer() {
      if (timer) { clearTimeout(timer); timer = 0; }
    }
    function schedule(fn, ms) { timer = setTimeout(fn, ms); return timer; }
    let resultObserver;
    function watchResultHeight() {
      if (typeof root.ResizeObserver !== 'function') return;
      if (!resultObserver) resultObserver = new root.ResizeObserver(function () {
        const height = ui.resultBody.clientHeight;
        ui.resultContent.classList.toggle('dp-rover', height > 0 && ui.resultContent.offsetHeight > height);
      });
      resultObserver.observe(ui.resultBody);
      resultObserver.observe(ui.resultContent);
    }
    function finish() {
      stopTimer();
      api.closeLog(); view = 'result';
      done = true; playing = false; stepping = false;
      unAct(); unRaise(true);
      if (!openingLog) resultArts.forEach(function (link) { link(); });
      ui.res.classList.add('dp-on');
      ui.res.setAttribute('aria-hidden', 'false');
      ui.resultBody.scrollTop = 0;
      watchResultHeight();
      prog(P.total);
      sync();
      if (!doneSent && typeof rootEl.getAnimations === 'function') { kick(ui.res, 'dp-ranim'); flush(); }
      if (!doneSent) { doneSent = true; if (typeof opts.onDone === 'function') opts.onDone(report); }
    }
    function advance(resume) {
      if (!opts.onAdvance) return false;
      api.pause();
      opts.onAdvance(speed, resume);
      return true;
    }
    function boundary() {
      const n = cues[pos];
      return !n || n.t !== 'frame' || n.f === 0;
    }
    function tick() {
      timer = 0;
      if (dead || !playing) return;
      if (pos >= cues.length) { if (!advance(true)) finish(); return; }
      const ms = runCue(false);
      if (stepping && boundary()) { stepping = false; playing = false; sync(); return; }
      schedule(tick, Math.max(16, ms / speed));
    }
    const api = {
      play: function () {
        if (dead || view === 'log') return;
        if (done) { api.restart(); return; }
        stepping = false;
        if (playing && timer) return;
        playing = true; sync();
        stopTimer();
        if (pos === 0 && firstArt) {
          /* 첫 등장만 기다린다. 늦은 그림 요청은 이 시간이 지나도 이어 간다. */
          const pending = schedule(begin, 1200);
          function begin() {
            if (timer !== pending) return;
            stopTimer(); tick();
          }
          firstArt.then(begin);
          firstArt = null;
        } else tick();
      },
      pause: function () {
        if (dead) return;
        stopTimer(); playing = false; stepping = false; sync();
        if (pos === 0 && curB === firstBout && !sets[firstBout][0].classList.contains('dp-on')) showBout(firstBout);
      },
      toggle: function () {
        if (playing && !stepping) api.pause(); else api.play();
      },
      step: function () {
        if (dead || done || view === 'log') return;
        stopTimer(); stepping = true; playing = true; sync(); tick();
      },
      setSpeed: function (n) {
        if (dead) return;
        speed = n === 2 || n === 4 ? n : 1;
        /* 움직임 시간 배율. 박자가 촘촘한 판(배율이 낮은 판)에서도 예비 동작과 타격 정지가 읽히게 기본 속도의 바닥(TIME.pace)을 둔다 */
        pace = Math.max(0.3, Math.min(1.25, Math.max(P.scale, TIME.pace))) / speed;
        rootEl.style.setProperty('--dp-spd', String(Number((pace * speed).toFixed(3)) / speed));
        rootEl.style.setProperty('--dp-base', (pace * speed).toFixed(3));
        rootEl.style.setProperty('--dp-rate', String(1 / speed));
        sync();
      },
      skipBout: function () {
        if (dead || done || view === 'log') return;
        const c = cues[Math.min(pos, cues.length - 1)], b = series ? curB : c && c.b != null ? c.b : bouts.length;
        const next = fronts ? logFrontTabs[frontAt[curB] + 1] : b + 1;
        const was = playing && !stepping;
        stopTimer(); stepping = false;
        if (next == null || next >= bouts.length) { if (!advance(was)) api.toResult(); return; }
        clearKicks();
        pos = introAt[next];
        showBout(next);
        warmBout(next, !ship);
        prog(cues[pos].at);
        playing = was; sync();
        if (was) tick();
      },
      toResult: function () {
        if (dead) return;
        stopTimer(); playing = false; stepping = false;
        if (!done) clearKicks();
        const last = lastBout;
        if (last >= 0) {
          showBout(last, false, false, 0, hullProgress?.[last].end);
          st = endState(bouts[last], report);
          jump(function () { paintAll(cards[last]); if (!hullProgress && hulls[last]) paintHull(last, hulls[last].end); });
          setScore(scores[last] && scores[last].after, false);
        }
        ui.field.classList.add('dp-end');
        pips(fronts ? fronts.length : bouts.length);
        pos = cues.length;
        finish();
      },
      restart: function () {
        if (dead) return;
        api.closeLog(); view = 'play';
        stopTimer(); playing = false; stepping = false; done = false; doneSent = false; pos = 0;
        clearKicks();
        unKick(ui.res);
        ui.res.classList.remove('dp-on');
        ui.res.setAttribute('aria-hidden', 'true');
        if (resultObserver) resultObserver.disconnect();
        ui.field.classList.remove('dp-end');
        if (bouts.length) showBout(firstBout);
        pips(0); prog(0);
        api.play();
      },
      openLog: function () {
        if (dead || view === 'log') return;
        if (view === 'result' && opts.onResultLog) return opts.onResultLog();
        if (view === 'play' && opts.onPlayLog) return opts.onPlayLog();
        if (resultSummary && !bouts.length) return;
        logFrom = view; logFocus = document.activeElement; api.pause();
        if (!logData) logData = rounds(report, BE);
        view = 'log'; logVisible(true);
        ui.logBack.textContent = tr(logFrom === 'result' && !logGroups?.fromPlay ? '결과' : '재생');
        ui.logBack.parentNode.setAttribute('aria-label', ui.logBack.textContent);
        logArts.forEach(function (link) { link(); });
        const b = logFrom === 'result' ? logFrontTabs?.[0] ?? 0 : Math.max(0, curB);
        logSelect(b);
        ui.logBack.parentNode.focus({preventScroll: true});
      },
      closeLog: function () {
        if (dead || view !== 'log') return;
        view = logFrom; logVisible(false);
        if (view === 'result') resultArts.forEach(function (link) { link(); });
        if (logFocus && rootEl.contains(logFocus)) logFocus.focus(); else rootEl.focus();
      },
      destroy: function () {
        if (dead) return;
        dead = true; stopTimer(); kq.length = 0; activeKicks.clear();
        if (artStop) artStop.abort();
        artQueue.concat(artRefine).forEach(function (item) { item.resolve(''); });
        artQueue.length = artRefine.length = 0;
        probes.forEach(function (probe) { probe.removeAttribute('src'); });
        if (artTemplate) rootEl.querySelectorAll('img').forEach(function (img) {
          if (artSources.has(img)) img.removeAttribute('src');
        });
        rootEl.removeEventListener('click', onClick);
        rootEl.removeEventListener('keydown', onKey);
        if (noteObserver) noteObserver.disconnect();
        if (resultObserver) resultObserver.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        document.removeEventListener('pointerdown', onHelpOutside);
        ui.log.removeEventListener('pointerover', onHelpOver); ui.log.removeEventListener('pointerout', onHelpOut);
        ui.log.removeEventListener('focusin', onHelpFocus); ui.log.removeEventListener('focusout', onHelpBlur);
        document.removeEventListener('scroll', hideHelp, true);
        if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
        if (artUrls.size) queueMicrotask(function () {
          artUrls.forEach(function (url) { URL.revokeObjectURL(url); });
          artUrls.clear();
        });
      },
      state: function () {
        return {bout: curB, beat: curBeat, round: curRound, playing: playing && !stepping, speed: speed, done: done, view: view};
      }
    };
    function onClick(e) {
      const anchor = termAt(e);
      if (anchor && ui.log.contains(anchor)) {
        e.preventDefault(); e.stopPropagation();
        if (helpAnchor === anchor && helpPinned) hideHelp(); else showHelp(anchor, true);
        return;
      }
      hideHelp();
      const b = e.target && e.target.closest ? e.target.closest('[data-dp]') : null;
      if (!b || !rootEl.contains(b)) return;
      const k = b.getAttribute('data-dp');
      if (k === 'play') api.toggle();
      else if (k === 'step') api.step();
      else if (k === 'speed') api.setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1);
      else if (k === 'skip') api.skipBout();
      else if (k === 'result') api.toResult();
      else if (k === 'again') { if (opts.onAgain) opts.onAgain(speed); else api.restart(); }
      else if (k === 'log') api.openLog();
      else if (k === 'log-back') backFromLog();
      else if (k.indexOf('log-group-') === 0 && logGroups) logGroups.select(Number(k.slice(10)));
      else if (k.indexOf('log-bout-') === 0) logSelect(Number(k.slice(9)));
      else if (k.indexOf('log-round-') === 0) {
        const parts = k.split('-'), b2 = Number(parts[2]);
        logRound(b2, logPanels[b2].rounds[Number(parts[3])], b.getAttribute('aria-expanded') !== 'true');
      }
      else if (k === 'close') { if (typeof opts.onClose === 'function') opts.onClose(report); }
    }
    function backFromLog() {
      if (logGroups) logGroups.back();
      else api.closeLog();
    }
    function onKey(e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (view === 'log' && e.key === 'Escape' && helpAnchor) { e.preventDefault(); hideHelp(); return; }
      if (view === 'log' && (e.key === 'Enter' || e.key === ' ') && termAt(e)) { e.preventDefault(); if (helpAnchor === termAt(e) && helpPinned) hideHelp(); else showHelp(termAt(e), true); return; }
      if (view === 'log') { if (e.key === 'Escape') { e.preventDefault(); backFromLog(); } return; }
      const onBtn = e.target && e.target.closest ? e.target.closest('button') : null;
      if ((e.key === ' ' || e.code === 'Space') && !onBtn) { e.preventDefault(); api.toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); api.step(); }
    }
    function onVis() {
      if (document.hidden) api.pause();   /* 돌아와도 스스로 다시 재생하지 않는다 */
    }

    build();
    ui.log.inert = true;
    el.textContent = '';
    el.appendChild(rootEl);
    rootEl.addEventListener('click', onClick);
    rootEl.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('pointerdown', onHelpOutside);
    ui.log.addEventListener('pointerover', onHelpOver); ui.log.addEventListener('pointerout', onHelpOut);
    ui.log.addEventListener('focusin', onHelpFocus); ui.log.addEventListener('focusout', onHelpBlur);
    document.addEventListener('scroll', hideHelp, true);
    pips(0); prog(0);
    const initialArt = opts.startAt === 'result' || openingLog ? [] : warmBout(firstBout, !ship && opts.autoplay === false);
    if (initialArt.length) firstArt = Promise.all(initialArt);
    if (bouts.length) showBout(firstBout, firstArt && opts.autoplay !== false);
    api.setSpeed(Number(opts.speed) || 1);
    if (opts.startAt === 'result') api.toResult();
    else if (openingLog) { api.toResult(); openingLog = false; api.openLog(); }
    else if (opts.autoplay !== false) api.play();
    return api;
  }

  duelPlay.mvp = mvp;
  duelPlay.beats = beats;
  duelPlay.rounds = rounds;
  duelPlay.effectName = overlapEffectName;
  duelPlay.apply = apply;
  duelPlay.plan = plan;
  duelPlay.fresh = fresh;
  duelPlay.settle = settle;
  duelPlay.numbers = nums;
  duelPlay.TEXT = TEXT;
  duelPlay.particles = particles;
  duelPlay.narrate = narrate;
  duelPlay.overlap = overlap;
  duelPlay.overlapSentences = overlapSentences;
  duelPlay.source = source;
  duelPlay.activationSources = activationSources;
  duelPlay.sentenceText = sentenceText;
  duelPlay.roundNarrative = roundNarrative;
  duelPlay.TIME = TIME;
  duelPlay.OP = OP;
  duelPlay.FLAG = FLAG;
  duelPlay.EFFECT = EFFECT;
  duelPlay.FACILITY = FACILITY;

  /* 함대전 판 보고서에서 소대전 하나를 이 부품이 받는 꼴로 바꾼다. docs/art-duel/preview.html 의 fwBoutReport 와 같은 본문이다(설명은 그쪽 주석, tools/duel-play-check.js 가 두 본문이 같은지 본다).
     게임은 이 파일만 받으므로 여기에도 둔다: duelPlay(el, duelPlay.fwBout(report, i, viewSide), opts) */
  function fwBoutReport(report, i, viewSide) {
    var bout = report.bouts[i], result = bout.result, units = result.units || [], final = result.final || [];
    var start = [], sides = [], before = [], ships = [], squads = [], seat = [0, 0];
    var size = report.size > 0 ? report.size : 5, ids = Array.isArray(report.shipIds) ? report.shipIds.slice(0, 2) : null;
    [0, 1].forEach(function (side) {
      var team = report.teams[side][bout.pos[side]] || {}, state = null;
      for (var j = i - 1; j >= 0 && !state; j--) {
        var b = report.bouts[j];
        if (b.pos[side] === bout.pos[side]) state = (b.state || (b.result || {}).state || [])[side] || [];
      }
      before.push(state); ships.push(team.ship); squads.push(team.squad);
      sides.push({name: team.name || '', girls: team.units || [], tactics: [team.tactic]});
    });
    units.forEach(function (u, k) {
      var side = u.side ? 1 : 0, at = seat[side]++, max = Number(u.maxHp) || 0, state = before[side], old = null;
      var n = final.length === units.length && final[k] ? final[k][0] : side * size + at;
      if (state) old = state[at] && state[at].id === u.id ? state[at] : state.filter(function (v) { return v.id === u.id; })[0];
      if (!old || !(max > 0)) { start.push([n, 1000, 0]); return; }
      start.push([n, old.hp > 0 ? Math.max(1, Math.round(old.hp / max * 1000)) : 0, old.shield > 0 ? Math.round(old.shield / max * 1000) : 0]);
    });
    var support = (result.supportActors || []).map(function (a) {
      var side = a.side ? 1 : 0, used = {};
      Object.keys(a.skills || {}).forEach(function (key) { used[key] = a.skills[key] ? 1 : 0; });
      return {index: a.index, side: side, name: sides[side].name, facilities: used};
    });
    var play = {};
    Object.keys(result).forEach(function (key) { play[key] = result[key]; });
    play.start = start; play.support = support;
    if (report.size > 0) play.size = size;
    if (ids) play.shipIds = ids;
    var view = viewSide === 1 ? 1 : 0;
    var out = {a: sides[0], d: sides[1], attacking: view === 0, winner: result.winner, won: (result.winner === 'a' ? 0 : 1) === view, bouts: [play],
      ctx: {index: i, count: report.bouts.length, pos: bout.pos.slice(), ship: ships, squad: squads, carried: [!!before[0], !!before[1]],
        drop: bout.drop, timeout: !!bout.timeout, winner: bout.winner}};
    if (report.size > 0) out.size = size;
    if (ids) out.shipIds = ids.slice();
    return out;
  }
  duelPlay.fwBout = fwBoutReport;
  duelPlay.keeperOptions = keeperOptions;

  /* 함대전 판 전체를 이 부품이 이어 재생하는 꼴로 바꾼다. docs/art-duel/preview.html 의 fwMatchReport 와 같은 본문이다(설명은 그쪽 주석, tools/duel-play-check.js 가 두 본문이 같은지 본다).
     소대전 하나의 계산(start, support)은 위 fwBoutReport 를 그대로 쓴다: duelPlay(el, duelPlay.fwMatch(report, viewSide), {boutSide: (i, seat) => [{note}, {note}], ...}) */
  function fwMatchReport(report, viewSide) {
    var view = viewSide === 1 ? 1 : 0, teams = report.teams || [], list = report.bouts || [];
    var girls = [[], []], seats = [[], []], next = [0, 0], tactics = [[], []], wins = [0, 0], bouts = [];
    var left = [0, 1].map(function (side) { return (teams[side] || []).length; }), squads = left.slice();
    function clone(v) { var o = {}; Object.keys(v || {}).forEach(function (key) { o[key] = v[key]; }); return o; }
    [0, 1].forEach(function (side) {
      (teams[side] || []).forEach(function (team, pos) {
        seats[side][pos] = ((team || {}).units || []).map(function (u) {
          var girl = clone(u);
          girl.gid = u.id; girl.id = ++next[side];
          girls[side].push(girl);
          return girl;
        });
      });
    });
    function renumber(side, pos, at, id) {
      var seat = seats[side][pos] || (seats[side][pos] = []), girl = seat[at] && seat[at].gid === id ? seat[at] : seat.filter(function (g) { return g.gid === id; })[0];
      if (!girl) { girl = {gid: id, id: ++next[side]}; seat.push(girl); }
      return girl.id;
    }
    list.forEach(function (bout, i) {
      var one = fwBoutReport(report, i, view), play = one.bouts[0], c = one.ctx, at = [0, 0];
      var draw = bout.winner === 'draw' || (Array.isArray(bout.drop) && !!bout.drop[0] && !!bout.drop[1]);
      var win = bout.winner === 'a' || bout.winner === 'b' ? bout.winner : play.winner === 'a' ? 'a' : 'b';
      var out = Array.isArray(bout.drop) ? [!!bout.drop[0], !!bout.drop[1]] : draw ? [true, true] : [win === 'b', win === 'a'];
      var before = left.slice();
      play.units = (play.units || []).map(function (u) {
        var side = u.side ? 1 : 0, unit = clone(u);
        unit.id = renumber(side, bout.pos[side], at[side]++, u.id);
        return unit;
      });
      if (Array.isArray(play.state)) play.state = play.state.map(function (rows, side) {
        return (rows || []).map(function (row, k) { var copy = clone(row); copy.id = renumber(side, bout.pos[side], k, row.id); return copy; });
      });
      [0, 1].forEach(function (side) { if (out[side]) left[side]--; });
      if (draw) play.draw = true;
      else { play.winner = win === 'a' ? 'a' : 'd'; wins[win === 'a' ? 0 : 1]++; }
      play.seat = {pos: c.pos, ship: c.ship, squad: c.squad, carried: c.carried, ally: [0, 1].map(function (side) { return !!((teams[side] || [])[bout.pos[side]] || {}).ally; })};
      play.side = [{name: one.a.name}, {name: one.d.name}];
      play.score = {before: before, after: left.slice()};
      tactics[0].push(one.a.tactics[0]); tactics[1].push(one.d.tactics[0]);
      bouts.push(play);
    });
    var res = report.res === 'a' || report.res === 'b' || report.res === 'draw' ? report.res : left[0] === left[1] ? 'draw' : left[0] > left[1] ? 'a' : 'b';
    var out = {a: {name: '', girls: girls[0], tactics: tactics[0]}, d: {name: '', girls: girls[1], tactics: tactics[1]}, attacking: view === 0,
      winner: res === 'b' ? 'd' : res, won: res !== 'draw' && (res === 'a' ? 0 : 1) === view, draw: res === 'draw', chain: true, wins: {a: wins[0], d: wins[1]}, bouts: bouts,
      ctx: {count: list.length, squads: squads, left: left.slice(), res: res}};
    if (report.size > 0) out.size = report.size;
    if (Array.isArray(report.shipIds)) out.shipIds = report.shipIds.slice(0, 2);
    return out;
  }
  duelPlay.fwMatch = fwMatchReport;

  /* node 에서 이 파일을 바로 require 했을 때만 module.exports 로 내보낸다.
     index.html 에 넣은 뒤 다른 실행 환경(서버 계산용 vm 등)에서 남의 module.exports 를 덮지 않게 파일 이름을 본다. */
  if (typeof module === 'object' && module && typeof module.filename === 'string' && /duel-play\.js$/.test(module.filename)) module.exports = duelPlay;
  else root.duelPlay = duelPlay;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
