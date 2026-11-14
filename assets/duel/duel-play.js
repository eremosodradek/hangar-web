/* duel-play.js  정예 대전 보고서를 카드 배틀처럼 재생하는 독립 부품(2026-11-12 ART 세션).
   이유: 사용자 「대전 과정이 카드 배틀 느낌이 나게」. 판정은 서버가 끝냈고 화면은 보고서(report)만 재생한다.
   쓰는 법:
     const p = duelPlay(el, report, {art:(girl, side) => 초상 HTML, t:번역, clsName:클래스 이름, clsIcon:클래스 아이콘 HTML, jobName:전직 이름, onClose, onText, onDone});
     p.play() p.pause() p.toggle() p.step() p.setSpeed(1|2|4) p.skipBout() p.toResult() p.restart() p.destroy() p.state()
   순수 함수(화면 없이 돈다):
     duelPlay.beats(report)  소대전마다 박자 배열. 모든 log 줄은 정확히 한 박자에 든다.
     duelPlay.apply(state, line)  log 한 줄을 상태에 반영. 화면도 이 함수로만 상태를 바꾼다.
     duelPlay.plan(report, opts)  박자마다 걸리는 시간과 전체 길이.
     duelPlay.fresh(bout) 처음 상태, duelPlay.settle(state, bout) 끝 상태(final)로 맞춤.
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

  /* 글 표. 한국어 원문이 열쇠이고 화면에 낼 때 opts.t 로 감싼다. 스킬과 패시브 이름은 설계서 3-1절의 임시 이름. */
  const TEXT = {
    op: {1: '공격', 2: '스킬', 3: '효과', 4: '회복', 5: '기절로 건너뜀', 6: '보급', 7: '효과 끝남', 8: '라운드 끝'},
    flag: {1: '치명', 2: '회피', 4: '반격', 8: '관통', 16: '추격'},
    effect: {1: '방어막', 2: '도발', 3: '기절', 4: '교란', 5: '표식', 6: '화상', 7: '재생', 8: '정화', 9: '반격 태세', 10: '관통', 11: '은신'},
    tactic: {weak: '가장 약한 적', strong: '가장 센 적', support: '지원형 먼저', advantage: '상성 유리한 적'},   /* 2026-11-13 게임 화면과 편성 부품(duelForm)의 작전 글로 통일 */
    cls: {carrier: '캐리어', striker: '스트라이커', bulwark: '불워크', hauler: '프레이터', medic: '메딕', jammer: '재머',
      flagship: '플래그십', breacher: '브리처', siege: '시즈', pathfinder: '패스파인더', phalanx: '팔랑크스'},
    skill: {striker: '연속 사격', pathfinder: '표적 지정', jammer: '교란파', carrier: '보급', medic: '긴급 수리', hauler: '긴급 자재',
      bulwark: '도발', siege: '포격', flagship: '일제 사격', breacher: '돌파', phalanx: '방진'},
    passive: {striker: '추격', pathfinder: '관측', jammer: '전파 방해', carrier: '회피 기동', medic: '회복 지속', hauler: '잔해 회수',
      bulwark: '반격', siege: '관통탄', flagship: '지휘', breacher: '선봉', phalanx: '철벽'},
    team: {flagship: '화력 치명 상승', phalanx: '받는 피해 감소'},
    ui: ['정예 대전 재생', '{0}소대전', '소대전 시작', '라운드 {0}/{1}', '라운드 {0}', '작전', '공격', '방어',
      '승리', '패배', '판정승', '판정패', '남은 체력 {0}% 대 {1}%', '{0}라운드', '시간 초과', '기록이 여기까지입니다',
      '점수', '다시 보기', '기록', '닫기', '재생', '멈춤', '다음 행동', '{0}배', '건너뛰기', '결과',
      '막음', '바로 행동', '다음 선두', '적 전체', '아군 전체', '라운드 정리', '효과 없음', '패시브', 'VS', '숙련 {0}단계', '최다 피해', '{0}소대', '승', '패', '상대 남은 {0}명',
      '점수 {0}', '{0}분', '{0}시간', '획득', '합금', '부품', '연료', '소대전', '피해', '쓰러짐', '스킬 {0}', '치명 {0}', '내 편', '상대', '기록이 잘려 마지막 상태로 건너뛰었다']
  };

  /* 박자 기본 시간(ms). plan 이 판마다 배율(TIME.min~TIME.max)을 곱해 전체를 TIME.target 가까이에 맞춘다. */
  /* 2026-11-13 사용자 「강도는 좋고 1배가 너무 빠르다」: 목표 62초(배율 0.5~1.6)에서 90초(배율 0.8~1.1)로.
     전에는 촘촘한 판을 절반까지 줄여 재생했다. 이제 1배는 박자 기본 시간에 가깝고, 빨리 보려면 2배 4배를 쓴다. */
  const TIME = {target: 90000, min: 0.8, max: 1.1,
    intro: 1700, outro: 1900, trunc: 1500, final: 900,
    cutin: 580, strike: 430, area: 600, pursuit: 360, counter: 300, fx: 460, aura: 400, finish: 1700,
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
  const HEAVY = 240, LIGHT = 90, FLIGHT = 90, STAGGER = 55;

  function fill(s, v) {
    s = String(s);
    return v ? s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? String(v[k]) : m; }) : s;
  }
  function sideOf(w) { return w === 'd' || w === 1 || w === '1' ? 1 : 0; }
  function first(s) { return Array.from(String(s == null ? '' : s))[0] || '?'; }

  /* units 의 배열 자리마다 log 번호. 판정 엔진은 번호를 편×5+자리로 매기고 final 을 units 와 같은 순서로 낸다.
     소대가 다섯보다 적으면 배열 자리와 번호가 달라지므로 final 의 번호를 믿고, 없으면 편×5+자리로 센다. */
  function nums(bout) {
    const units = bout.units || [], fin = bout.final || [], pos = [0, 0], out = [];
    const useFinal = fin.length === units.length;
    for (let k = 0; k < units.length; k++) {
      const side = units[k].side ? 1 : 0;
      out.push(useFinal && fin[k] && typeof fin[k][0] === 'number' ? fin[k][0] : side * SQUAD + pos[side]);
      pos[side]++;
    }
    return out;
  }

  /* 상태: {round, u:{번호:{n, k, side, hp, sh, fx:[{e, v, until, by}], down}}, order:[번호]} 체력과 방어막은 천분율. */
  function fresh(bout) {
    const order = nums(bout), units = bout.units || [], st = {round: 0, u: {}, order: order};
    for (let k = 0; k < order.length; k++) st.u[order[k]] = {n: order[k], k: k, side: units[k].side ? 1 : 0, hp: 1000, sh: 0, fx: [], down: false};
    return st;
  }
  function unit(st, n) {
    if (!st.u[n]) { st.u[n] = {n: n, k: -1, side: n >= SQUAD ? 1 : 0, hp: 1000, sh: 0, fx: [], down: false}; st.order.push(n); }
    return st.u[n];
  }
  function fxAt(u, e) {
    for (let i = 0; i < u.fx.length; i++) if (u.fx[i].e === e) return i;
    return -1;
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
        if (i >= 0) { t.fx[i].v = L[5]; t.fx[i].until = L[6]; }   /* 같은 효과는 겹치지 않고 길이만 새로 */
        else t.fx.push({e: L[4], v: L[5], until: L[6], by: L[1]});
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
     side 는 0(공격) 또는 1(방어), 생략하면 보고서를 보는 편. 동률은 소대전과 units 에 먼저 나온 소녀. */
  function mvp(report, side) {
    report = report || {};
    side = side == null ? (report.attacking ? 0 : 1) : sideOf(side);
    const girls = ((side ? report.d : report.a) || {}).girls || [], candidates = [];
    (report.bouts || []).forEach(function (bo, b) {
      const order = nums(bo), units = bo.units || [], by = {};
      units.forEach(function (u, k) {
        if ((u.side ? 1 : 0) !== side) return;
        const c = {girl: girls.find(function (g) { return g.id === u.id; }) || {id: u.id, name: '?', cls: u.cls}, bout: b, n: order[k], damage: 0};
        by[order[k]] = c; candidates.push(c);
      });
      (bo.log || []).forEach(function (L) {
        if (L[3] !== OP.hit || !(L[4] > 0) || !by[L[1]]) return;
        const target = units[order.indexOf(L[2])];
        if (!target) return;
        by[L[1]].damage += hpAmount(Number(target.maxHp) || 0, L[4]);
      });
    });
    let best = null;
    candidates.forEach(function (c) { if (c.damage > 0 && (!best || c.damage > best.damage)) best = c; });
    return best;
  }
  function hpAmount(max, v) {
    return max > 0 ? (v > 0 ? Math.max(1, Math.round(v * max / 1000)) : Math.round(v * max / 1000)) : v;
  }
  function comma(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function endState(bout) {
    const state = fresh(bout);
    (bout.log || []).forEach(function (L) { apply(state, L); });
    return settle(state, bout);
  }

  /* 한 소대전의 log 를 박자로 묶는다.
     박자 = {kind, actor, round, lines:[줄 번호], frames:[{type, lines:[줄 번호], hits, heavy}]}
     kind: skill(스킬 발동과 그 효과), supply(캐리어 보급 스킬), attack(스킬 없는 공격), skip(기절), cleanup(라운드 끝 정리), snapshot(라운드 끝 상태).
     frames 는 한 박자 안에서 차례로 터지는 장면. 같은 frame 의 줄은 같이 터진다(포격 같은 광역).
     type: cutin(스킬 줄), strike(공격), counter(반격), fx(효과 회복 보급), aura(줄 없는 스킬의 연출 자리), tick(정리), skip, snap.
     판정 엔진(api/duel.js)이 줄을 내는 순서를 그대로 따른다:
       방어막이 다 닳으면 expire 가 그 hit 줄 바로 앞에 나온다. 기절은 expire 뒤에 skip 이 나온다.
       화상 피해는 불을 붙인 소녀가 행동자인 hit 줄로 라운드 끝에 나온다. 패시브 회복도 라운드 끝.
       남의 차례 중간에 나오는 effect 줄은 패시브(프레이터 잔해 회수, 팔랑크스 철벽). */
  function boutBeats(bout) {
    const log = bout.log || [], st = fresh(bout), out = [];
    let cur = null, round = null, acted = {}, ending = false, carry = -1, L = null;
    const burnBy = {};
    function open(kind, actor) {
      cur = {kind: kind, actor: actor, round: L[0], lines: [], frames: [], hit: {}, area: null, last: null, fx: null, heal: false, clean: false, done: false};
      out.push(cur);
      return cur;
    }
    function frame(type) {
      const f = {type: type, lines: [], hits: 0, heavy: false, tg: {}, pursuit: false};
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
      } else if (op === OP.skill) {
        ending = false; open('skill', a); acted[a] = 1; place(frame('cutin'), i);
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
        if (ending || !turn()) place(tidy(), i);
        else {
          if (a === cur.actor && cur.area && cur.area.tg[tg]) f = cur.area;
          else if (cur.last) f = cur.last;
          else f = fxFrame();
          place(f, i);
          if (L[4] === EFFECT.cleanse && a === cur.actor) cur.clean = true;
        }
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
          const su = st.u[a], mine = !ending && turn() && cur.actor === a;
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
      if (op === OP.effect && L[4] === EFFECT.burn && burnBy[tg] == null) burnBy[tg] = a;
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
        return o;
      });
      if (b.kind === 'skill' && frames.length === 1) frames.push({type: 'aura', lines: [], hits: 0, heavy: false, pursuit: false});
      return {kind: b.kind, actor: b.actor, round: b.round, lines: b.lines, frames: frames};
    });
  }
  function beats(report) {
    return ((report && report.bouts) || []).map(boutBeats);
  }

  /* 라운드 요약도 재생 박자와 apply 만 읽는다. 줄의 쓰러짐 전환과 남은 체력을 한 번 보관한다.
     소대전마다 {rounds:[{round, beats:[박자 자리], fallen:[번호], skills, crit}], rows, final, truncated}.
     잘린 기록은 부분 행동을 보이지 않고 끝 상태만 쓴다. 원본 보고서와 박자는 바꾸지 않는다. */
  function rounds(report, all) {
    all = all || beats(report);
    return ((report && report.bouts) || []).map(function (bo, b) {
      const st = fresh(bo), list = [], rows = {};
      if (!bo.truncated) (all[b] || []).forEach(function (bt, k) {
        let r = list[list.length - 1];
        if (!r || r.round !== bt.round) { r = {round: bt.round, beats: [], fallen: [], skills: 0, crit: 0}; list.push(r); }
        if (bt.kind !== 'snapshot') r.beats.push(k);
        bt.lines.forEach(function (i) {
          const L = bo.log[i], n = L[3] === OP.expire || L[3] === OP.skip ? L[1] : L[2];
          const before = st.u[n], down = before ? before.down : false;
          apply(st, L);
          const u = st.u[n], fallen = !!u && !down && u.down;
          rows[i] = {fallen: fallen, hp: u ? u.hp : null};
          if (fallen) r.fallen.push(n);
          if (L[3] === OP.skill) r.skills++;
          if (L[3] === OP.hit && (L[7] & FLAG.crit)) r.crit++;
        });
      });
      if (bo.truncated) (bo.log || []).forEach(function (L) { apply(st, L); });
      settle(st, bo);
      return {rounds: list, rows: rows, final: st, truncated: !!bo.truncated};
    });
  }
  let logSerial = 0;

  /* 재생 계획. cues 는 차례로 실행할 장면 목록이고 ms 는 기본 속도의 시간.
     {total, scale, cues:[{t:intro|frame|trunc|outro|final, b, k, f, ms, at}], bouts:[{at, ms, beats:[{at, ms}]}], beats} */
  function plan(report, opts) {
    opts = opts || {};
    const all = opts.beats || beats(report), bouts = (report && report.bouts) || [];
    const target = opts.target > 0 ? opts.target : TIME.target;
    function base(fr, last) {
      if (fr.fin) return TIME.finish;
      if (fr.type === 'cutin') return TIME.cutin;
      if (fr.type === 'strike') return fr.pursuit ? TIME.pursuit : fr.hits > 1 ? TIME.area : TIME.strike;
      if (fr.type === 'counter') return TIME.counter;
      if (fr.type === 'fx') return TIME.fx;
      if (fr.type === 'aura') return TIME.aura;
      if (fr.type === 'tick') return fr.heavy ? TIME.tick : TIME.tidy;
      if (fr.type === 'skip') return TIME.skip;
      return TIME.snap + (last ? 0 : TIME.round);
    }
    function build(scale) {
      const cues = [], info = [];
      let at = 0;
      function cue(c, ms, floor) { c.ms = Math.max(floor, Math.round(ms * scale)); c.at = at; at += c.ms; cues.push(c); return c; }
      for (let b = 0; b < bouts.length; b++) {
        const bi = {at: at, ms: 0, beats: []}, list = all[b] || [];
        cue({t: 'intro', b: b}, TIME.intro, TIME.floorIntro);
        for (let k = 0; k < list.length; k++) {
          const bt = {at: at, ms: 0}, last = k === list.length - 1;
          for (let f = 0; f < list[k].frames.length; f++) {
            const fr = list[k].frames[f], c = cue({t: 'frame', b: b, k: k, f: f}, base(fr, last), fr.fin ? TIME.floorFinish : TIME.floorFrame);
            if (fr.type === 'snap' && !last) c.rd = true;
            if (fr.fin) c.fin = true;
            bt.ms += c.ms;
          }
          bi.beats.push(bt);
        }
        if (bouts[b].truncated) cue({t: 'trunc', b: b}, TIME.trunc, TIME.floorOutro);
        cue({t: 'outro', b: b}, TIME.outro, TIME.floorOutro);
        bi.ms = at - bi.at; info.push(bi);
      }
      cue({t: 'final'}, TIME.final, TIME.floorFinal);
      return {total: at, scale: scale, cues: cues, bouts: info, beats: all};
    }
    if (opts.scale > 0) return build(opts.scale);
    let lo = TIME.min, hi = TIME.max;
    if (build(lo).total >= target) return build(lo);
    if (build(hi).total <= target) return build(hi);
    for (let n = 0; n < 24; n++) {
      const mid = (lo + hi) / 2;
      if (build(mid).total > target) hi = mid; else lo = mid;
    }
    return build(Math.round(lo * 1000) / 1000);
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
    const tr = typeof opts.t === 'function' ? function (s, v) { return String(opts.t(s, v)); } : fill;
    const bouts = report.bouts || [], sides = [report.a || {}, report.d || {}];
    /* 맥락은 이미 번역된 글이다. 빈 글만 거르고 원문 그대로 보이며 보고서는 바꾸지 않는다. */
    function ctxObject(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
    function ctxText(v) { return typeof v === 'string' && v.trim() ? v : ''; }
    const inputCtx = ctxObject(opts.ctx), inputSides = ctxObject(inputCtx.sides);
    const context = {title: ctxText(inputCtx.title), tags: [], sides: []};
    if (Array.isArray(inputCtx.tags)) for (let i = 0; i < inputCtx.tags.length && context.tags.length < 4; i++) {
      const tag = ctxObject(inputCtx.tags[i]), text = ctxText(tag.text);
      if (text) context.tags.push({text: text, tone: ['me', 'op', 'am', 'red'].indexOf(tag.tone) >= 0 ? tag.tone : 'dim'});
    }
    ['a', 'd'].forEach(function (key, side) {
      const v = ctxObject(inputSides[key]);
      context.sides[side] = {name: ctxText(v.name), tag: ctxText(v.tag), note: ctxText(v.note)};
      if (context.sides[side].name) sides[side] = Object.assign({}, sides[side], {name: context.sides[side].name});
    });
    const ctxHeading = !!(context.title || context.tags.length);
    const hasCtx = ctxHeading || context.sides.some(function (s) { return s.name || s.tag || s.note; });
    const mine = report.attacking ? 0 : 1;   /* 보는 사람 편이 아래 */
    const P = plan(report, {target: opts.target}), BE = P.beats, cues = P.cues;
    const girlBy = sides.map(function (s) {
      const m = {};
      (s.girls || []).forEach(function (g) { if (g && g.id != null) m[g.id] = g; });
      return m;
    });
    const won = typeof report.won === 'boolean' ? report.won : sideOf(report.winner) === mine;
    const introAt = [];
    cues.forEach(function (c, i) { if (c.t === 'intro') introAt[c.b] = i; });

    const ui = {}, logArts = [], logPanels = [], resultArts = [], cards = [], sets = [], kq = [], pops = [], raised = [];
    let rootEl = null, st = null, pos = 0, timer = 0, speed = 1;
    let view = 'play', logFrom = 'play', logData = null, logFocus = null;
    const logId = 'dp-log-' + (++logSerial);
    let playing = false, stepping = false, done = false, doneSent = false, dead = false;
    let curB = -1, curBeat = -1, curRound = 0, frameNo = 0, cueNo = 0, actCard = null, ctx = null;

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
    function tacText(side, b) {
      const k = (sides[side].tactics || [])[b];
      return k ? tr('작전') + ' ' + tr(TEXT.tactic[k] || String(k)) : '';
    }

    /* 구조는 여기서 한 번만 만든다. 그림과 아이콘 글(innerHTML)도 여기서만 넣는다. */
    function build() {
      function raw(node, s) { node.innerHTML = s; return node; }
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
        if (typeof out === 'string' && out) { raw(holder, out); return; }
        if (out && out.nodeType === 1) { holder.appendChild(out); return; }
        const dir = String(opts.artBase == null ? 'assets' : opts.artBase).replace(/[/]+$/, ''), nm = encodeURIComponent(String(g.name));
        const srcs = [dir + '/girls/' + nm + '.m.webp', dir + '/girls/' + nm + '.webp'], im = mk('img', 'dp-im', holder);
        let at = 0;
        im.alt = ''; im.decoding = 'async'; im.draggable = false;
        im.addEventListener('error', function () { at++; if (at < srcs.length) im.src = srcs[at]; else holder.classList.add('dp-noart'); });
        im.src = srcs[0];
      }
      function card(set, b, k, n, slot) {
        const u = bouts[b].units[k], side = u.side ? 1 : 0;
        const g = girlBy[side][u.id] || {id: u.id, name: '?', cls: u.cls, rar: '', hidden: false};
        const cls = String(u.cls || g.cls || ''), rar = /^[A-Z]{1,3}$/.test(String(g.rar)) ? String(g.rar) : '';
        const el2 = mk('div', 'dp-card dp-q-' + (g.hidden ? 'H' : rar || 'X'), set), mv = mk('div', 'dp-cm', el2), frm = mk('div', 'dp-fr', mv), pt = mk('div', 'dp-pt', frm);
        const c = {n: n, side: side, slot: slot, cls: cls, name: String(g.name == null ? '?' : g.name), clsName: clsLabel(cls), el: el2, mv: mv, frm: frm, pt: pt, fx: {}, nums: [], ni: 0, nf: 0, nfNo: -1, passNo: -1, vHp: -1, vSh: -1, slo: 1, lNo: -9, lx: 0, ly: 0};
        c.max = Number(u.maxHp) > 0 ? Number(u.maxHp) : 0;
        const job = jobLabel(g);
        c.role = job || c.clsName;   /* 카드와 컷인에 적는 이름: 전직 이름, 없으면 클래스 이름 */
        el2.style.setProperty('--dp-k', String(slot));
        mk('span', 'dp-ph', pt, first(c.name));
        const art = mk('div', 'dp-art', pt);
        portrait(art, g, side);
        c.img = art.querySelector('img');
        c.logLinks = [];
        if (c.img) c.img.addEventListener('load', function () { c.logLinks.forEach(function (link) { link(); }); });
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
        if (typeof icon === 'string' && icon) raw(chip, icon); else chip.textContent = first(c.clsName);
        chip.setAttribute('aria-label', c.clsName);
        c.shn = mk('span', 'dp-shn', pt);
        const nb = mk('span', 'dp-nb', pt);
        mk('b', 'dp-nm', nb, c.name);
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
      if (hasCtx) rootEl.classList.add('dp-hasctx');
      const playContext = contextLine(inn, '');

      /* 머리줄: 왼쪽 나, 가운데 승수 점과 소대전 라운드, 오른쪽 상대 */
      const head = mk('div', 'dp-head', inn);
      function who(cls, side) {
        const w = mk('div', 'dp-who ' + cls, head), top = mk('div', 'dp-wl', w);
        mk('small', 'dp-wr', top, side === 0 ? tr('공격') : tr('방어'));
        mk('b', 'dp-wn', top, sides[side].name == null ? '' : sides[side].name);
        if (context.sides[side].tag) {
          top.classList.add('dp-withtag');
          sideTag(top, side);
        }
        if (context.sides[side].note) mk('small', 'dp-wnote', w, context.sides[side].note).title = context.sides[side].note;
        return mk('span', 'dp-wt', w);
      }
      ui.tacMe = who('dp-me', mine);
      const ctr = mk('div', 'dp-ctr', head), pp = mk('div', 'dp-pips', ctr);
      ui.pips = [];
      for (let i = 0; i < Math.max(PIPS, bouts.length); i++) ui.pips.push(mk('i', 'dp-pip', pp));
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
        const order = nums(bouts[b]), pair = [mk('div', 'dp-set', rowF), mk('div', 'dp-set', rowO)], slot = [0, 0], map = {};
        for (let k = 0; k < order.length; k++) {
          const own = (bouts[b].units[k].side ? 1 : 0) === mine ? 1 : 0;
          map[order[k]] = card(pair[own], b, k, order[k], slot[own]++);
          map[order[k]].row = own;
        }
        /* 줄 안쪽이 어느 쪽인지(왼쪽 절반이면 +1) 와 줄 끝 카드인지. 쓰러질 때 튕기는 방향을 정하는 데 쓴다 */
        for (const n in map) {
          const cc = map[n], mid = (slot[cc.row] - 1) / 2;
          cc.inw = cc.slot < mid ? 1 : cc.slot > mid ? -1 : 0;
          cc.edge = cc.slot === 0 || cc.slot === slot[cc.row] - 1;
        }
        sets.push(pair); cards.push(map);
      }
      ui.beams = [];
      for (let i = 0; i < 8; i++) { const bm = mk('i', 'dp-beam', ui.field); mk('i', '', bm); mk('b', '', bm); ui.beams.push(bm); }
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
      if (!isFinite(myW) || !isFinite(opW)) {
        myW = 0; opW = 0;
        bouts.forEach(function (bo) { if (sideOf(bo.winner) === mine) myW++; else opW++; });
      }
      ui.res = mk('div', 'dp-res ' + (won ? 'dp-win' : 'dp-lose'), inn);
      ui.res.setAttribute('aria-hidden', 'true');
      /* 결과 화면의 그림 노드도 여기서 한 번 만든다. 전장 카드의 그림 주소만 결과가 열릴 때 연결한다. */
      function resultPortrait(parent, c, small) {
        const q = c.el.className.split(' ').find(function (v) { return v.indexOf('dp-q-') === 0; }) || 'dp-q-X';
        const p = mk('div', 'dp-rportrait ' + q + (small ? ' dp-mini' : ''), parent);
        p.setAttribute('role', 'img'); p.setAttribute('aria-label', c.name);
        mk('span', 'dp-ph', p, first(c.name));
        const art = mk('i', 'dp-rart', p);
        const link = function () {
          const src = c.img && c.img.naturalWidth ? c.img.currentSrc || c.img.src || '' : '';
          art.style.backgroundImage = src ? 'url(' + JSON.stringify(src) + ')' : '';
        };
        resultArts.push(link);
        if (c.img) c.img.addEventListener('load', function () { if (done) link(); });
        return p;
      }
      const body = mk('div', 'dp-rbody', ui.res), content = mk('div', 'dp-rcontent', body);
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
      mk('b', 'dp-rw', seal, won ? tr('승리') : tr('패배'));
      const best = mvp(report, mine);
      if (best) {
        const star = mk('div', 'dp-mvp', hero);
        resultPortrait(star, cards[best.bout][best.n], false);
        const info = mk('div', 'dp-mvpinfo', star);
        mk('small', 'dp-mvptag', info, tr('최다 피해'));
        mk('b', 'dp-mvpname', info, best.girl.name);
        mk('b', 'dp-mvpdamage', info, comma(best.damage));
      }
      const detail = mk('div', 'dp-rdetail', content), stats = mk('div', 'dp-rstats', detail);
      const sc = mk('div', 'dp-rs', stats);
      mk('b', 'dp-rsa', sc, myW); mk('i', '', sc, ':'); mk('b', 'dp-rsb', sc, opW);
      if (typeof report.delta === 'number' && isFinite(report.delta)) {
        const d = Math.round(report.delta), dl = mk('div', 'dp-rdl ' + (d > 0 ? 'dp-up' : d < 0 ? 'dp-dn' : ''), stats);
        dl.setAttribute('aria-label', tr('점수'));
        mk('b', '', dl, (d > 0 ? '+' : '') + String(d === 0 ? 0 : d));
      }
      if (typeof opts.rating === 'number' && isFinite(opts.rating)) mk('small', 'dp-rating', stats, tr('점수 {0}', [comma(opts.rating)]));
      const list = mk('div', 'dp-rl', detail);
      bouts.forEach(function (bo, i) {
        const w = sideOf(bo.winner) === mine, final = endState(bo), order = nums(bo);
        const tile = mk('div', 'dp-rr ' + (w ? 'dp-w' : 'dp-l'), list);
        tile.style.setProperty('--dp-i', String(i));
        const top = mk('div', 'dp-rrtop', tile);
        mk('b', 'dp-rr2', top, w ? tr('승') : tr('패'));
        mk('small', 'dp-rr1', top, tr('{0}소대', [i + 1]));
        const own = mk('div', 'dp-rteam', tile), foe = mk('div', 'dp-rfoe', tile);
        let alive = 0;
        order.forEach(function (n, k) {
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
        mk('small', 'dp-rr3', meta, tr('{0}라운드', [bo.rounds]));
        if (bo.timeout) mk('em', 'dp-rr5', meta, tr('시간 초과'));
      });
      /* got 은 판이 끝날 때 실제로 계정에 더한 자원 수(즉시 지급, 사용자 2026-11-13 「결과화면에서 보상이 표기되고 즉시지급」).
         있으면 「획득」과 자원 수를, 없으면 reward 의 시간을 보인다. 수는 받은 값을 보일 뿐 셈하지 않는다 */
      const reward = opts.reward || report.reward, rewards = [], got = opts.got && typeof opts.got === 'object' ? opts.got : null;
      const count = function (n) {
        let s = null;
        if (typeof opts.num === 'function') { try { s = opts.num(n); } catch (e) { s = null; } }
        return typeof s === 'string' && s ? s : comma(Math.round(n));
      };
      [['alloy', '합금'], ['parts', '부품'], ['fuel', '연료']].forEach(function (entry) {
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
          const text = count(hours), val = mk('b', 'dp-cnt', cell);
          val.setAttribute('aria-label', text); val.setAttribute('data-v', text);
          for (let i = 0; i < text.length; i++) {
            const ch = text.charAt(i);
            if (ch >= '0' && ch <= '9') mk('i', 'dp-roll dp-d' + ch, mk('span', 'dp-od', val), '0\n1\n2\n3\n4\n5\n6\n7\n8\n9\n0\n1\n2\n3\n4\n5\n6\n7\n8\n9').setAttribute('aria-hidden', 'true');
            else mk('span', 'dp-oc', val, ch).setAttribute('aria-hidden', 'true');
          }
        });
      }
      const rb = mk('div', 'dp-rb', ui.res);
      btn(rb, 'dp-main', 'again', tr('다시 보기'));
      btn(rb, '', 'log', tr('기록'));
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
      ui.logTabs = [];
      const tabs = mk('div', 'dp-ltabs', lh);
      tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', tr('소대전'));
      bouts.forEach(function (bo, b) {
        const w = sideOf(bo.winner) === mine, label = tr('{0}소대', [b + 1]);
        const t = btn(tabs, '', 'log-bout-' + b, label).parentNode;
        t.setAttribute('aria-label', label + ' ' + tr(w ? '승리' : '패배'));
        t.setAttribute('aria-pressed', 'false');
        mk('i', 'dp-ldot ' + (w ? 'dp-w' : 'dp-l'), t);
        ui.logTabs.push(t);
      });
      ui.logScroll = mk('div', 'dp-lscroll', ui.log);
    }

    /* 기록 초상은 새 img 없이 카드가 이미 받은 주소만 배경으로 연결한다. */
    function logPortrait(parent, c, down) {
      if (!c) return;
      const p = mk('span', 'dp-lportrait ' + (c.side === mine ? 'dp-own' : 'dp-foe') + (down ? ' dp-fallen' : ''), parent);
      p.setAttribute('role', 'img'); p.setAttribute('aria-label', c.name);
      mk('span', '', p, first(c.name));
      const art = mk('i', 'dp-lart', p);
      const link = function () {
        const src = c.img && c.img.naturalWidth ? c.img.currentSrc || c.img.src || '' : '';
        art.style.backgroundImage = src ? 'url(' + JSON.stringify(src) + ')' : '';
      };
      c.logLinks.push(link); logArts.push(link); link();
      return p;
    }
    function logIcon(parent, key) {
      parent.appendChild(ui.logIcons[key].cloneNode(true));
    }
    function logTag(parent, text, tone) { return mk('span', 'dp-ltag' + (tone ? ' dp-l-' + tone : ''), parent, text); }
    function logEffect(parent, e) {
      const tag = logTag(parent, '', HARM[e] ? 'hex' : e === EFFECT.shield ? 'shield' : 'skill');
      if (ICON[e]) logIcon(tag, e);
      mk('span', '', tag, tr(TEXT.effect[e] || TEXT.op[3]));
    }
    function logLine(parent, b, bt, i) {
      const L = bouts[b].log[i], op = L[3];
      if (op === OP.skill || op === OP.snapshot || op === OP.skip) return;
      const n = op === OP.expire ? (L[1] >= 0 ? L[1] : L[2]) : L[2], c = cards[b][n];
      const meta = logData[b].rows[i] || {}, row = mk('div', 'dp-lline' + (meta.fallen ? ' dp-lko' : ''), parent);
      mk('span', 'dp-larrow', row, '→');
      const who = mk('div', 'dp-lwho', row);
      logPortrait(who, c, meta.fallen);
      mk('span', 'dp-lname', who, c ? c.name : '?');
      const values = mk('div', 'dp-lvalues', row);
      /* icon 이 있으면 그림과 숫자를 한 묶음으로 둔다(색만으로 뜻을 가르지 않는다). */
      function value(v, tone, plus, label, icon) {
        const box = icon ? mk('span', 'dp-labs dp-l-' + tone, values) : values;
        if (icon) logIcon(box, icon);
        const num = mk('b', 'dp-lnum dp-l-' + tone, box, (plus ? '+' : '') + amt(c || {max: 0}, v));
        num.setAttribute('aria-label', label + ' ' + num.textContent);
      }
      if (op === OP.hit) {
        /* 재생 화면과 같은 규칙. 방어막이 다 막았으면 체력 피해 0 은 띄우지 않는다. */
        const hp = L[4] || 0, abs = L[8] > 0 ? L[8] : 0;
        if (!(L[7] & FLAG.evade) && (hp > 0 || !abs)) value(hp, 'damage', false, tr('피해'));
        if (abs) value(abs, 'shield', false, tr('막음'), EFFECT.shield);
        [1, 2, 4, 8, 16].forEach(function (bit) { if (L[7] & bit) logTag(values, tr(TEXT.flag[bit]), bit === FLAG.crit ? 'skill' : ''); });
        if (bt.kind === 'cleanup') logEffect(values, EFFECT.burn);
      } else if (op === OP.heal) {
        value(L[4] || 0, 'heal', true, tr(TEXT.op[4]));
      } else if (op === OP.effect || op === OP.expire) {
        logEffect(values, L[4]);
        if (op === OP.expire) logTag(values, tr(TEXT.op[7]));
        else if (L[4] === EFFECT.shield) value(L[5] || 0, 'shield', true, tr(TEXT.effect[1]));
      } else if (op === OP.supply) logTag(values, tr(L[5] ? '다음 선두' : '바로 행동'));
      else logTag(values, tr(TEXT.op[op] || TEXT.op[3]));
      const src = cards[b][L[1]];
      if (src && (bt.kind === 'cleanup' || L[1] !== bt.actor)) {
        /* 원인이 대상 자신이면 이름을 되풀이하지 않는다. */
        const same = L[1] === n, what = op === OP.heal || op === OP.effect ? tr(TEXT.passive[src.cls] || '패시브') : '';
        const by = (same ? '' : src.name) + (!same && what ? ' ' : '') + what;
        if (by) mk('small', 'dp-lsource', values).textContent = by;
      }
      if (meta.fallen) logTag(values, tr('쓰러짐'), 'damage');
    }
    function logBody(b, r, body) {
      r.beats.forEach(function (k) {
        const bt = BE[b][k], small = bt.kind === 'cleanup', c = cards[b][bt.actor];
        const card = mk('div', small ? 'dp-lcleanup' : 'dp-laction', body), head = mk('div', 'dp-lahead', card);
        if (small) mk('small', '', head, tr('라운드 정리'));
        else {
          logPortrait(head, c, false);
          mk('b', 'dp-lname', head, c ? c.name : '?');
          if (bt.kind === 'skill' || bt.kind === 'supply') logTag(head, tr(TEXT.skill[c && c.cls] || TEXT.op[2]), 'skill');
          else if (bt.kind === 'attack') {
            const tag = logTag(head, tr(TEXT.op[1])); logIcon(tag, 'attack');
          } else logTag(head, tr(bt.kind === 'skip' ? TEXT.op[5] : TEXT.op[6]));
          if ((bt.kind === 'skill' || bt.kind === 'supply') && bt.lines.length === 1 && TEXT.team[c && c.cls]) logTag(head, tr(TEXT.team[c.cls]), 'skill');
        }
        bt.lines.forEach(function (i) { logLine(card, b, bt, i); });
      });
    }
    function logRound(b, r, open) {
      const entry = logPanels[b].rounds.find(function (x) { return x.data === r; });
      if (!entry) return;
      if (open && !entry.made) { logBody(b, r, entry.body); entry.made = true; }
      entry.body.hidden = !open;
      entry.btn.setAttribute('aria-expanded', String(open));
      entry.el.classList.toggle('dp-open', open);
      return entry;
    }
    function logSummary(parent, b) {
      const bo = bouts[b], fin = logData[b].final, w = sideOf(bo.winner) === mine;
      const end = mk('div', 'dp-lsummary', parent), h = mk('div', 'dp-lendhead', end);
      mk('b', w ? 'dp-l-heal' : 'dp-l-damage', h, tr(w ? '승리' : '패배'));
      mk('small', '', h, tr('{0}라운드', [bo.rounds]));
      if (bo.timeout) logTag(h, tr('시간 초과'), 'skill');
      [mine, 1 - mine].forEach(function (side) {
        const line = mk('div', 'dp-lteam', end);
        mk('small', '', line, context.sides[side].name || (side === mine ? tr('내 편') : tr('상대')));
        fin.order.forEach(function (n) {
          const c = cards[b][n], u = fin.u[n];
          if (!c || c.side !== side) return;
          const cell = mk('div', 'dp-lsurvivor', line);
          logPortrait(cell, c, u.down);
          const bar = mk('span', 'dp-lhp', cell);
          bar.setAttribute('aria-label', c.name + ' ' + amt(c, u.hp));
          mk('i', c.side === mine ? 'dp-own' : 'dp-foe', bar).style.transform = 'scaleX(' + Math.max(0, Math.min(1, u.hp / 1000)) + ')';
        });
      });
    }
    function logSelect(b) {
      if (!(b >= 0 && b < bouts.length)) return;
      if (!logPanels[b]) {
        const el2 = mk('div', 'dp-lpanel', ui.logScroll), entries = [];
        logPanels[b] = {el: el2, rounds: entries};
        if (logData[b].truncated) mk('p', 'dp-ltruncated', el2, tr('기록이 잘려 마지막 상태로 건너뛰었다'));
        logData[b].rounds.forEach(function (r, j) {
          const el3 = mk('section', 'dp-lround', el2), btn = mk('button', 'dp-btn dp-lroundhead', el3);
          btn.type = 'button'; btn.setAttribute('data-dp', 'log-round-' + b + '-' + j);
          btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', logId + '-' + b + '-' + j);
          mk('b', 'dp-lroundno', btn, tr('{0}라운드', [r.round]));
          const tags = mk('span', 'dp-ltags', btn);
          if (r.fallen.length) {
            logTag(tags, tr('쓰러짐'), 'damage');
            r.fallen.forEach(function (n) { logPortrait(tags, cards[b][n], true); });
          }
          if (r.skills) logTag(tags, tr('스킬 {0}', [r.skills]), 'skill');
          if (r.crit) logTag(tags, tr('치명 {0}', [r.crit]), 'skill');
          mk('i', 'dp-lchevron', btn, '⌄');
          const body = mk('div', 'dp-lroundbody', el3);
          body.id = logId + '-' + b + '-' + j; body.hidden = true;
          entries.push({el: el3, btn: btn, body: body, data: r, made: false});
        });
        logSummary(el2, b);
      }
      logPanels.forEach(function (p, i) { p.el.hidden = i !== b; });
      ui.logTabs.forEach(function (t, i) { t.setAttribute('aria-pressed', String(i === b)); });
      ui.logScroll.scrollTop = 0;
    }
    function logVisible(on) {
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
      kq.length = 0;
    }
    function jump(fn) {
      rootEl.classList.add('dp-jump');
      fn();
      void rootEl.offsetWidth;
      rootEl.classList.remove('dp-jump');
    }

    function paint(c, u) {
      const hp = Math.max(0, Math.min(1000, u.hp || 0)), sh = Math.max(0, Math.min(1000, u.sh || 0));
      if (c.vHp !== hp) {
        c.hpf.style.setProperty('--dp-v', String(hp / 1000)); c.hpg.style.setProperty('--dp-v', String(hp / 1000));
        c.hpn.textContent = amt(c, hp);
        c.el.classList.toggle('dp-low', hp > 0 && hp <= 300);
        c.vHp = hp;
      }
      if (c.vSh !== sh) {
        c.sh.style.setProperty('--dp-v', String(sh / 1000));
        c.shn.textContent = sh ? amt(c, sh) : '';
        c.el.classList.toggle('dp-shd', sh > 0);
        c.vSh = sh;
      }
      c.el.classList.toggle('dp-down', !!u.down);
      let shown = 0, extra = 0;
      for (let e = 1; e <= 11; e++) {
        let on = !u.down && fxAt(u, e) >= 0;
        if (on) { if (shown < FX_SHOW) shown++; else { on = false; extra++; } }
        c.fx[e].classList.toggle('dp-on', on);
      }
      const more = extra ? '+' + extra : '';
      if (c.more.textContent !== more) c.more.textContent = more;
    }
    function paintAll(C) {
      for (const n in C) if (st.u[n]) paint(C[n], st.u[n]);
    }
    function setRound() {
      ui.rn.textContent = tr('라운드 {0}/{1}', [Math.max(1, Math.min(ROUNDS, curRound)), ROUNDS]);
    }
    function pips(n) {
      for (let i = 0; i < ui.pips.length; i++) {
        const bo = bouts[i], p = ui.pips[i];
        p.classList.toggle('dp-x', !bo);
        p.classList.toggle('dp-w', !!bo && i < n && sideOf(bo.winner) === mine);
        p.classList.toggle('dp-l', !!bo && i < n && sideOf(bo.winner) !== mine);
        p.classList.toggle('dp-now', !!bo && i === n);
      }
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
      if (node.dpk) { node.classList.remove(node.dpk); node.dpk = ''; }
    }
    function showBout(b) {
      for (let i = 0; i < sets.length; i++) for (let j = 0; j < 2; j++) { sets[i][j].classList.toggle('dp-on', i === b); unKick(sets[i][j]); }
      curB = b; curBeat = -1; curRound = 1; st = fresh(bouts[b]);
      unAct(); unRaise(true);
      const C = cards[b];
      for (const n in C) { unKick(C[n].mv); unKick(C[n].frm); }
      jump(function () { paintAll(C); });
      ui.bn.textContent = tr('{0}소대전', [b + 1]);
      setRound();
      ui.tacMe.textContent = tacText(mine, b);
      ui.tacOp.textContent = tacText(1 - mine, b);
      ui.ma.textContent = ''; ui.ms.textContent = ''; ui.mt.textContent = '';
      ui.mid.classList.remove('dp-foe'); ui.mid.classList.remove('dp-own');
      pips(b);
    }
    /* lead 는 띠가 뜨기 전에 비워 두는 몫(0~1). 소대전 끝의 승리 동작이 먼저 보이게 한다. */
    function banner(small, big, sub, tone, ms, lead) {
      ui.bs.textContent = small; ui.bt.textContent = big; ui.bu.textContent = sub;
      ui.ban.className = 'dp-ban' + (tone ? ' ' + tone : '');
      ui.ban.style.setProperty('--dp-banms', Math.max(200, Math.round(ms * (1 - (lead || 0)) / speed)) + 'ms');
      ui.ban.style.setProperty('--dp-band', Math.round(ms * (lead || 0) / speed) + 'ms');
      kick(ui.ban, 'dp-go');
    }

    /* 여기부터 장면 연출. 값(글자, 너비, 클래스, transform)만 바꾼다. */
    /* 보고서의 피해 회복 방어막은 그 소녀 최대 체력의 천분율이다. 화면에는 실제 체력 숫자로 보인다
       (사용자 11/12 결정: 천분율 × units[].maxHp ÷ 1000, 반올림, 천 단위 쉼표). 0 보다 큰 값은 적어도 1 로 보인다.
       maxHp 가 없는 보고서는 천분율 그대로. 체력 막대 길이는 비율 그대로다. */
    function amt(c, v) {
      v = Number(v) || 0;
      if (!(c.max > 0)) return String(v);
      return comma(hpAmount(c.max, v));
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
      return {x: r.left + r.width / 2, y: r.top + r.width * 0.667, w: r.width};
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
      const turn = (c.edge ? c.inw : Math.abs(ux) < 0.15 ? (c.slot % 2 ? 1 : -1) : ux > 0 ? 1 : -1) || 1;
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
    /* 치명: 전장 줄이 맞는 카드를 중심으로 살짝 커졌다 돌아온다. 2배에서는 작게, 4배에서는 흔들림만. */
    function punch(c, d) {
      if (speed >= 4) { kick(ui.rows, 'dp-quake', d); return; }
      const R = ui.rows.getBoundingClientRect(), p = center(c);
      ui.rows.style.transformOrigin = (p.x - R.left).toFixed(0) + 'px ' + (p.y - R.top).toFixed(0) + 'px';
      kick(ui.rows, speed === 2 ? 'dp-zoom2' : 'dp-zoom', d);
    }
    function dimFor(ms) {
      ui.dim.style.setProperty('--dp-dimms', Math.max(160, Math.round(ms / speed)) + 'ms');
      kick(ui.dim, 'dp-go');
    }
    function cutIn(a, ms) {
      ui.cut.classList.toggle('dp-foe', a.side !== mine);
      ui.cs.textContent = tr(TEXT.skill[a.cls] || TEXT.op[2]);
      ui.cc.textContent = a.role;
      ui.cn.textContent = a.name;
      ui.cph.textContent = first(a.name);
      let url = '';
      if (a.img && a.img.naturalWidth) url = a.img.currentSrc || a.img.src || '';
      ui.ca.style.backgroundImage = url ? 'url("' + url.replace(/["\\\n\r]/g, '') + '")' : 'none';
      ui.cut.style.setProperty('--dp-cutms', Math.max(160, Math.round(ms / speed)) + 'ms');
      kick(ui.cut, 'dp-go');
      kick(a.mv, 'dp-cast');
      dimFor(ms);
    }
    function targetText(beat, C) {
      const log = bouts[curB].log, seen = [];
      let foe = false;
      for (let i = 0; i < beat.lines.length; i++) {
        const L = log[beat.lines[i]], op = L[3];
        if (L[1] !== beat.actor || L[2] === beat.actor || L[2] < 0) continue;
        if (op === OP.hit ? (L[7] & FLAG.counter) : (op !== OP.effect && op !== OP.heal && op !== OP.supply)) continue;
        if (seen.indexOf(L[2]) < 0 && C[L[2]]) { seen.push(L[2]); foe = C[L[2]].side !== C[beat.actor].side; }
      }
      if (!seen.length) return '';
      if (seen.length > 2) return foe ? tr('적 전체') : tr('아군 전체');
      return seen.map(function (n) { return C[n].name; }).join(', ');
    }
    function beginBeat(c, beat, C, show) {
      curBeat = c.k; curRound = beat.round; setRound();
      unAct();
      if (beat.kind === 'snapshot') return;
      const a = C[beat.actor];
      if (a && beat.kind !== 'cleanup') {
        a.el.classList.add('dp-act'); actCard = a;
        if (show && speed < 4) fxOn(a.sw, 'dp-sw', 'dp-w-turn', 0, 0);   /* 차례가 온 카드에 빛이 한 번 훑고 지나간다 */
      }
      ui.mid.classList.toggle('dp-foe', !!a && a.side !== mine);
      ui.mid.classList.toggle('dp-own', !!a && a.side === mine);
      ui.ma.textContent = a ? a.name : '';
      let act = tr('라운드 정리'), tgt = '';
      if (beat.kind === 'skill' || beat.kind === 'supply') act = tr(TEXT.skill[a ? a.cls : ''] || TEXT.op[2]);
      else if (beat.kind === 'attack') act = tr(TEXT.op[1]);
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
      const a = C[actor];
      if (!a || !tg.length) return;
      const cs = tg.map(function (n) { return C[n]; }), big = speed < 4, wide = cs.length > 1;
      const kind = fr.type === 'counter' ? 'counter' : fr.pursuit ? 'chase' : RANGED[a.cls] ? 'ranged' : a.lNo === frameNo - 1 ? 'combo' : crit && !wide ? 'meleeCrit' : 'melee';
      const mv = MOVE[kind], slo = c.fin && big ? (speed === 2 ? 1.5 : 2) : 1, col = a.side === mine ? 'me' : 'op';
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
      const dir = a.inw < 0 ? -1 : 1, rank = cs.slice().sort(function (p, q) { return (p.slot - q.slot) * dir; });
      cs.forEach(function (t, i) {
        const p = pts[i], vx = p.x - A.x, vy = p.y - A.y, vl = Math.sqrt(vx * vx + vy * vy) || 1;
        const d = (mv[1] + (wide ? rank.indexOf(t) * STAGGER : 0)) * slo;
        ctx.d[t.n] = d; ctx.dir[t.n] = [vx / vl, vy / vl, p.w];
        if (kind === 'ranged') beam(F, A, p, 'dp-b-bolt dp-b-' + col + (ctx.power || crit ? ' dp-b-big' : ''), d - FLIGHT * slo, 0, slo);
      });
      if (mv[2]) beam(F, A, {x: A.x + dx * mv[2], y: A.y + dy * mv[2]}, 'dp-b-trail dp-b-' + col, (mv[1] - 110) * slo, A.w * 0.5, slo);
      if (wide) {
        if (big) {
          const sh = ui.shock[cs[0].side === mine ? 1 : 0];
          sh.style.setProperty('--dp-sd', String(dir));
          sh.className = 'dp-shock dp-b-' + col;
          kick(sh, 'dp-go', mv[1] * slo - 40);
        }
        kick(ui.rows, 'dp-quake', mv[1] * slo);
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
        const d = 50 + Math.abs(C[n].slot - a.slot) * 45;
        fxOn(C[n].fl, 'dp-fl', 'dp-f-buff', 1, d);
        fxOn(C[n].sw, 'dp-sw', 'dp-w-buff', 1, d);
      }
      num(a, '', tr(team), 'dp-n-buff', 0);
      ui.mt.textContent = tr(team);
    }
    function react(L, pre, beat, fr, C) {
      const op = L[3], big = speed < 4;
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
            const k = KNOCK[ko ? 'ko' : crit ? 'crit' : dmg >= HEAVY || (ctx && ctx.power) ? 'heavy' : dmg < LIGHT ? 'light' : 'mid'];
            const tone = crit ? 'dp-r-crit' : 'dp-r-' + col;
            knock(c, dir, k[1], k[2], ko);
            if (ko) {
              slow(c, ctx ? ctx.slo : 1);
              kick(c.mv, k[0], d);
              if (big) kick(c.ck, 'dp-go', d);
              if (ctx && ctx.fin) raise(c, 'dp-hot');
            } else kick(c.frm, k[0], d);
            fxOn(c.rg, 'dp-rg', tone + (k[1] >= 0.16 ? ' dp-r-big' : ''), 5, d);
            if (big && k[1] >= 0.1) { c.sp.className = 'dp-sp ' + tone; kick(c.sp, 'dp-go', d); }
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
      const beat = BE[c.b][c.k], fr = beat.frames[c.f], log = bouts[c.b].log, C = cards[c.b], show = !quiet;
      let ms = c.ms;
      frameNo++; ctx = null;
      if (c.f === 0) beginBeat(c, beat, C, show);
      /* 소대전을 끝내는 마지막 쓰러짐은 느리게 보여 준다. 2배에서는 줄이고 4배에서는 여느 공격처럼 */
      if (c.fin && speed > 1) ms = speed >= 4 ? Math.max(TIME.floorFrame, Math.round(TIME.strike * P.scale)) : Math.round(ms * 0.65);
      if (show && c.fin && speed < 4) dimFor(ms);
      if (show && fr.type === 'cutin') {
        const a = C[beat.actor];
        if (a && speed >= 4) { ms = Math.max(TIME.floorFrame, Math.round(ms * 0.4)); kick(a.mv, 'dp-cast'); }   /* 4배에서는 컷인을 줄인다 */
        else if (a) cutIn(a, ms);
      } else if (show && fr.type === 'aura') aura(beat, C);
      else if (show && (fr.type === 'strike' || fr.type === 'counter')) strikeFx(c, beat, fr, log, C);
      else if (show && fr.type === 'fx') castFx(beat, fr, log, C);
      pops.length = 0;
      for (let i = 0; i < fr.lines.length; i++) {
        const L = log[fr.lines[i]], u = st.u[L[3] === OP.expire ? L[1] : L[2]], pre = u ? {hp: u.hp, sh: u.sh, down: u.down} : null;
        apply(st, L);
        if (show) react(L, pre, beat, fr, C);
      }
      paintAll(C);
      if (show) for (let i = 0; i < pops.length; i++) kick(pops[i], 'dp-pop');
      if (fr.type === 'snap' && c.rd) {
        curRound = beat.round + 1; setRound();
        if (show) { ui.rd.textContent = tr('라운드 {0}', [curRound]); kick(ui.rd, 'dp-go'); }
      }
      return ms;
    }
    function runCue(quiet) {
      const c = cues[pos++];
      let ms = c.ms;
      cueNo++; unRaise(false);
      prog(c.at);
      if (c.t === 'intro') {
        showBout(c.b);
        if (!quiet) {
          /* 양쪽 카드가 뒷면으로 깔렸다가 차례로 뒤집히고 가운데에 VS 가 찍힌다. 4배에서는 뒤집기 없이 바로 깐다 */
          const flip = speed < 4;
          ui.field.style.setProperty('--dp-ims', Math.max(200, Math.round(c.ms / speed)) + 'ms');
          banner(tr('소대전 시작'), tr('{0}소대전', [c.b + 1]), '', '', flip ? c.ms * 0.6 : c.ms, 0);
          kick(sets[c.b][0], flip ? 'dp-deal' : 'dp-deal4'); kick(sets[c.b][1], flip ? 'dp-deal' : 'dp-deal4');
          if (flip) kick(ui.vs, 'dp-go');
        }
      } else if (c.t === 'frame') {
        ms = runFrame(c, quiet);
      } else if (c.t === 'trunc') {
        unAct(); settle(st, bouts[c.b]); paintAll(cards[c.b]);
        if (!quiet) banner(tr('{0}소대전', [c.b + 1]), tr('기록이 여기까지입니다'), '', 'dp-note', c.ms, 0);
      } else if (c.t === 'outro') {
        const bo = bouts[c.b], w = sideOf(bo.winner) === mine, h = bo.health || [];
        unAct(); settle(st, bo); paintAll(cards[c.b]); pips(c.b + 1);
        if (!quiet) {
          /* 이긴 편의 남은 카드가 차례로 뛰어오르고 진 편은 가라앉은 뒤 알림 띠가 뜬다. 4배에서는 띠만 */
          const cheer = speed < 4;
          if (cheer) { kick(sets[c.b][w ? 1 : 0], 'dp-cheer'); kick(sets[c.b][w ? 0 : 1], 'dp-sink'); }
          banner(tr('{0}소대전', [c.b + 1]), bo.timeout ? (w ? tr('판정승') : tr('판정패')) : (w ? tr('승리') : tr('패배')),
            bo.timeout ? tr('남은 체력 {0}% 대 {1}%', [Math.round((h[mine] || 0) * 100), Math.round((h[1 - mine] || 0) * 100)]) : tr('{0}라운드', [bo.rounds]),
            w ? 'dp-win' : 'dp-lose', c.ms, cheer ? 0.24 : 0);
        }
      } else if (c.t === 'final') {
        ui.field.classList.add('dp-end');
      }
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
    function finish() {
      stopTimer();
      api.closeLog(); view = 'result';
      done = true; playing = false; stepping = false;
      unAct(); unRaise(true);
      resultArts.forEach(function (link) { link(); });
      ui.res.classList.add('dp-on');
      ui.res.setAttribute('aria-hidden', 'false');
      prog(P.total);
      sync();
      if (!doneSent) { doneSent = true; if (typeof opts.onDone === 'function') opts.onDone(report); }
    }
    function boundary() {
      const n = cues[pos];
      return !n || n.t !== 'frame' || n.f === 0;
    }
    function tick() {
      timer = 0;
      if (dead || !playing) return;
      if (pos >= cues.length) { finish(); return; }
      const ms = runCue(false);
      if (stepping && boundary()) { stepping = false; playing = false; sync(); return; }
      timer = setTimeout(tick, Math.max(16, ms / speed));
    }
    const api = {
      play: function () {
        if (dead || view === 'log') return;
        if (done) { api.restart(); return; }
        stepping = false;
        if (playing && timer) return;
        playing = true; sync();
        stopTimer(); tick();
      },
      pause: function () {
        if (dead) return;
        stopTimer(); playing = false; stepping = false; sync();
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
        rootEl.style.setProperty('--dp-spd', Math.max(0.3, Math.min(1.25, Math.max(P.scale, TIME.pace) / speed)).toFixed(3));
        sync();
      },
      skipBout: function () {
        if (dead || done || view === 'log') return;
        const c = cues[Math.min(pos, cues.length - 1)], b = c && c.b != null ? c.b : bouts.length;
        const was = playing && !stepping;
        stopTimer(); stepping = false;
        if (b + 1 >= bouts.length) { api.toResult(); return; }   /* 마지막 소대전이면 결과로 */
        pos = introAt[b + 1];
        showBout(b + 1);
        prog(cues[pos].at);
        playing = was; sync();
        if (was) tick();
      },
      toResult: function () {
        if (dead) return;
        stopTimer(); playing = false; stepping = false;
        const last = bouts.length - 1;
        if (last >= 0) { showBout(last); st = endState(bouts[last]); jump(function () { paintAll(cards[last]); }); }
        ui.field.classList.add('dp-end');
        pips(bouts.length);
        pos = cues.length;
        finish();
      },
      restart: function () {
        if (dead) return;
        api.closeLog(); view = 'play';
        stopTimer(); playing = false; stepping = false; done = false; doneSent = false; pos = 0;
        ui.res.classList.remove('dp-on');
        ui.res.setAttribute('aria-hidden', 'true');
        ui.field.classList.remove('dp-end');
        if (bouts.length) showBout(0);
        pips(0); prog(0);
        api.play();
      },
      openLog: function () {
        if (dead || view === 'log') return;
        logFrom = view; logFocus = document.activeElement; api.pause();
        if (!logData) logData = rounds(report, BE);
        view = 'log'; logVisible(true);
        ui.logBack.textContent = tr(logFrom === 'result' ? '결과' : '재생');
        ui.logBack.parentNode.setAttribute('aria-label', ui.logBack.textContent);
        logArts.forEach(function (link) { link(); });
        const b = logFrom === 'result' ? 0 : Math.max(0, curB);
        logSelect(b);
        if (logPanels[b]) {
          logPanels[b].rounds.forEach(function (e) { logRound(b, e.data, logFrom !== 'result' && e.data.round === Math.max(1, curRound)); });
          const entry = logPanels[b].rounds.find(function (e) { return e.data.round === Math.max(1, curRound); });
          if (logFrom !== 'result' && entry) ui.logScroll.scrollTop = Math.max(0, entry.el.offsetTop - 8);
        }
        ui.logBack.parentNode.focus();
      },
      closeLog: function () {
        if (dead || view !== 'log') return;
        view = logFrom; logVisible(false);
        if (logFocus && rootEl.contains(logFocus)) logFocus.focus(); else rootEl.focus();
      },
      destroy: function () {
        if (dead) return;
        dead = true; stopTimer(); kq.length = 0;
        rootEl.removeEventListener('click', onClick);
        rootEl.removeEventListener('keydown', onKey);
        document.removeEventListener('visibilitychange', onVis);
        if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      },
      state: function () {
        return {bout: curB, beat: curBeat, round: curRound, playing: playing && !stepping, speed: speed, done: done, view: view};
      }
    };
    function onClick(e) {
      const b = e.target && e.target.closest ? e.target.closest('[data-dp]') : null;
      if (!b || !rootEl.contains(b)) return;
      const k = b.getAttribute('data-dp');
      if (k === 'play') api.toggle();
      else if (k === 'step') api.step();
      else if (k === 'speed') api.setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1);
      else if (k === 'skip') api.skipBout();
      else if (k === 'result') api.toResult();
      else if (k === 'again') api.restart();
      else if (k === 'log') api.openLog();
      else if (k === 'log-back') api.closeLog();
      else if (k.indexOf('log-bout-') === 0) logSelect(Number(k.slice(9)));
      else if (k.indexOf('log-round-') === 0) {
        const parts = k.split('-'), b2 = Number(parts[2]), r = logData[b2].rounds[Number(parts[3])];
        logRound(b2, r, b.getAttribute('aria-expanded') !== 'true');
      }
      else if (k === 'close') { if (typeof opts.onClose === 'function') opts.onClose(report); }
    }
    function onKey(e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (view === 'log') { if (e.key === 'Escape') { e.preventDefault(); api.closeLog(); } return; }
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
    pips(0); prog(0);
    if (bouts.length) showBout(0);
    api.setSpeed(Number(opts.speed) || 1);
    if (opts.startAt === 'result') api.toResult();
    else if (opts.startAt === 'log') { api.toResult(); api.openLog(); }
    else if (opts.autoplay !== false) api.play();
    return api;
  }

  duelPlay.mvp = mvp;
  duelPlay.beats = beats;
  duelPlay.rounds = rounds;
  duelPlay.apply = apply;
  duelPlay.plan = plan;
  duelPlay.fresh = fresh;
  duelPlay.settle = settle;
  duelPlay.numbers = nums;
  duelPlay.TEXT = TEXT;
  duelPlay.TIME = TIME;
  duelPlay.OP = OP;
  duelPlay.FLAG = FLAG;
  duelPlay.EFFECT = EFFECT;

  /* node 에서 이 파일을 바로 require 했을 때만 module.exports 로 내보낸다.
     index.html 에 넣은 뒤 다른 실행 환경(서버 계산용 vm 등)에서 남의 module.exports 를 덮지 않게 파일 이름을 본다. */
  if (typeof module === 'object' && module && typeof module.filename === 'string' && /duel-play\.js$/.test(module.filename)) module.exports = duelPlay;
  else root.duelPlay = duelPlay;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
