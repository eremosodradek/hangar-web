/* duel-form.js  정예 대전 편성 창을 카드 중심으로 그리는 독립 부품(2026-11-13 ART 세션).
   이유: 사용자 「대전 편성창도 ART에게 좀 더 카드 중심으로 만들어 달라고 해」. 재생이 카드 배틀 꼴이니 편성도 카드를 집어 소대에 놓는다.
   쓰는 법:
     const f = duelForm(el, data, {art:(girl, side) => 초상 HTML, t:번역, clsName, clsIcon, fill:true, onSubmit, onCancel, onChange});
     f.setData(data)  새 값으로 갱신(구조는 그대로, 값만)   f.destroy()  타이머와 듣는 것 정리, el 비움
     f.state()  지금 배치와 검사 결과   f.error(글)  서버가 거절한 이유를 합계 줄에 보인다
   data: {kind:'fight'|'def'|'next', mine:[소녀], plan:{squads, tactics}, rules, opp:{name, rating, girls, def}, mode, left, deadline, score, last, lastWon}
   순수 함수(화면 없이 돈다): duelForm.norm check move totals matchup nextCheck result remain
   원칙 2-9d: 규칙 숫자와 상성 표를 여기에 적지 않는다. 한도는 data.rules, 상성은 data.rules.vs 로만 읽고 없으면 미리 막지 않는다(상성 표시는 하지 않는다).
   게임 전역에 기대지 않는다. 게임 함수는 모두 opts 로 넘겨 받는다(배포본은 이름을 줄인다).
   구조는 build 에서 한 번만 만들고 값만 바꾼다. 소녀 카드 노드는 소녀마다 한 번 만들고 옮길 때는 그 노드를 옮긴다.
   이 파일에는 꼬리표를 닫는 글자(script, style)를 적지 않는다. 줄 설명은 이 꼴의 묶음 주석만 쓴다. */
(function (root) {
  'use strict';

  const PER_ROW = 5;   /* 한 줄에 놓는 카드 칸 수(보이는 꼴). 규칙 숫자가 아니다. 소대 인원 한도는 rules.max 로만 본다 */
  const SLOP = 8, HOLD = 300, NUDGE = 36;   /* 끌기 시작 거리(px), 터치에서 길게 누르는 시간(ms), 자리로 들어갈 때 미끄러지는 거리(px) */
  const LOCK = 'M4.8 7.2V5.2a3.2 3.2 0 0 1 6.4 0v2M3.6 7.2h8.8v6.6H3.6z';

  /* 글 표. 한국어 원문이 열쇠이고 화면에 낼 때 opts.t 로 감싼다. */
  const TEXT = {
    title: {fight: '공격 편성', def: '방어 편성', next: '다음 소대를 고른다'},
    main: {fight: '대전 시작', def: '저장', next: '출전'},
    tactic: {weak: '가장 약한 적', strong: '가장 센 적', support: '지원형 먼저', advantage: '상성 유리한 적'},
    cls: {carrier: '캐리어', striker: '스트라이커', bulwark: '불워크', hauler: '프레이터', medic: '메딕', jammer: '재머',
      flagship: '플래그십', breacher: '브리처', siege: '시즈', pathfinder: '패스파인더', phalanx: '팔랑크스'},
    why: ['정예가 아닌 소녀가 있다', '같은 소녀를 두 번 넣었다', '소대 {0}개를 채운다', '{0}소대 작전을 고른다', '{0}소대에 {1}명 이상 넣는다',
      '소대는 {0}명까지', '정예는 {0}명까지', '칸은 {0}칸까지', '내보낼 소대를 고른다', '이미 나간 소대다'],
    ui: ['수동 대전', '수동 대전 시작', '첫 소대전 뒤부터 판마다 다음 소대를 고른다', '출전', '승', '패', '자동', '수동', '모드', '상대', '점수 {0}', '{0}소대', '상대 {0}소대', '작전', '{0}명', '{0}칸', '{0}명 / {1}', '{0}칸 / {1}', 'VS', '빈 자리',
      '배치 밖 {0}명', '추천 배치', '닫기', '화력', '장갑', '전직 {0}', '스킬 잠김 Lv {0}', '패시브 잠김 전직 {0}', '스킬 잠김', '패시브 잠김', '각성',
      '유리 {0}', '불리 {0}', '남은 시간 {0}초', '시간 초과', '소녀를 누르고 다른 소녀를 선택하면 위치가 변경된다', '남은 소대 가운데 하나를 누른다', '숙련 {0}단계']
  };

  function fill(s, v) {
    s = String(s);
    return v ? s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? String(v[k]) : m; }) : s;
  }
  function first(s) { return Array.from(String(s == null ? '' : s))[0] || '?'; }
  function num(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function say(text, v) { return {text: text, v: v || null}; }
  function index(list) {
    const m = {};
    (Array.isArray(list) ? list : []).forEach(function (g) { if (g && g.id != null) m[g.id] = g; });
    return m;
  }
  function copy(st) { return {squads: st.squads.map(function (q) { return q.slice(); }), tactics: st.tactics.slice()}; }
  function find(st, id) {
    for (let s = 0; s < st.squads.length; s++) { const i = st.squads[s].indexOf(id); if (i >= 0) return {s: s, i: i}; }
    return null;
  }
  function has(vs, a, b) { return !!vs && Array.isArray(vs[a]) && vs[a].indexOf(b) >= 0; }

  /* 서버 배치(plan)를 부품 상태 {squads, tactics} 로 옮긴다. 소대 수는 rules.squads, 없으면 plan 의 것.
     mine 을 주면 명단에 없는 번호와 두 번 나온 번호를 뺀다(화면에 카드가 없는 번호가 상태에 남지 않게). */
  function norm(plan, rules, mine) {
    const p = plan || {}, src = Array.isArray(p.squads) ? p.squads : [], tac = Array.isArray(p.tactics) ? p.tactics : [];
    const n = rules && rules.squads > 0 ? rules.squads : src.length, by = mine ? index(mine) : null, seen = {}, out = {squads: [], tactics: []};
    const t0 = rules && Array.isArray(rules.tactics) && rules.tactics.length ? rules.tactics[0] : null;
    for (let i = 0; i < n; i++) {
      out.squads.push((Array.isArray(src[i]) ? src[i] : []).filter(function (id) {
        if ((by && !by[id]) || seen[id]) return false;
        seen[id] = 1;
        return true;
      }));
      out.tactics.push(tac[i] != null ? tac[i] : t0);
    }
    return out;
  }
  /* 전체와 소대마다 인원과 칸 */
  function totals(st, mine) {
    const by = index(mine), out = {girls: 0, slots: 0, per: []};
    st.squads.forEach(function (q) {
      const p = {n: q.length, slots: 0};
      q.forEach(function (id) { p.slots += by[id] ? Number(by[id].slots) || 0 : 0; });
      out.girls += p.n; out.slots += p.slots; out.per.push(p);
    });
    return out;
  }
  /* 보내기 전 검사. 걸리면 {text, v}(원문과 채울 값), 없으면 null.
     구조상 당연한 것(명단 밖, 같은 소녀 두 번)은 늘 보고, 한도는 rules 에 있는 칸만 본다. rules 가 없으면 미리 막지 않는다(서버 거절에 맡긴다). */
  function check(st, mine, rules) {
    const by = index(mine), seen = {};
    for (let s = 0; s < st.squads.length; s++) for (let i = 0; i < st.squads[s].length; i++) {
      const id = st.squads[s][i];
      if (!by[id]) return say('정예가 아닌 소녀가 있다');
      if (seen[id]) return say('같은 소녀를 두 번 넣었다');
      seen[id] = 1;
    }
    if (!rules) return null;
    if (rules.squads != null && st.squads.length !== rules.squads) return say('소대 {0}개를 채운다', [rules.squads]);
    for (let s = 0; s < st.squads.length; s++) {
      const n = st.squads[s].length;
      if (rules.min != null && n < rules.min) return say('{0}소대에 {1}명 이상 넣는다', [s + 1, rules.min]);
      if (rules.max != null && n > rules.max) return say('소대는 {0}명까지', [rules.max]);
      if (Array.isArray(rules.tactics) && rules.tactics.indexOf(st.tactics[s]) < 0) return say('{0}소대 작전을 고른다', [s + 1]);
    }
    const t = totals(st, mine);
    if (rules.girls != null && t.girls > rules.girls) return say('정예는 {0}명까지', [rules.girls]);
    if (rules.slots != null && t.slots > rules.slots) return say('칸은 {0}칸까지', [rules.slots]);
    return null;
  }
  /* 카드 하나를 옮긴다. to: {s} 빈 자리에 넣기, {id} 그 카드와 자리 바꾸기.
     {ok, state, why}. 넣을 수 없으면 ok 가 거짓이고 state 는 그대로다. 받은 상태는 고치지 않는다. */
  function move(st, mine, rules, id, to) {
    const by = index(mine), r = rules || {}, a = find(st, id), out = copy(st);
    const no = function (text, v) { return {ok: false, state: st, why: say(text, v)}; };
    if (!by[id]) return no('정예가 아닌 소녀가 있다');
    to = to || {};
    if (to.id != null) {
      const b = find(st, to.id);
      if (to.id === id || !by[to.id] || (!a && !b)) return {ok: true, state: out};
      if (a && b) { out.squads[a.s][a.i] = to.id; out.squads[b.s][b.i] = id; }
      else if (a) out.squads[a.s][a.i] = to.id;
      else out.squads[b.s][b.i] = id;
      const t0 = totals(st, mine).slots, t1 = totals(out, mine).slots;
      if (r.slots != null && t1 > r.slots && t1 > t0) return no('칸은 {0}칸까지', [r.slots]);
      return {ok: true, state: out};
    }
    const s = Number(to.s);
    if (!(s >= 0 && s < out.squads.length) || (a && a.s === s)) return {ok: true, state: out};
    if (r.max != null && st.squads[s].length >= r.max) return no('소대는 {0}명까지', [r.max]);
    if (!a) {
      const t = totals(st, mine);
      if (r.girls != null && t.girls + 1 > r.girls) return no('정예는 {0}명까지', [r.girls]);
      if (r.slots != null && t.slots + (Number(by[id].slots) || 0) > r.slots) return no('칸은 {0}칸까지', [r.slots]);
    } else {
      if (r.min != null && st.squads[a.s].length <= r.min) return no('{0}소대에 {1}명 이상 넣는다', [a.s + 1, r.min]);
      out.squads[a.s].splice(a.i, 1);
    }
    out.squads[s].push(id);
    return {ok: true, state: out};
  }
  /* 빠진 정예를 규칙 한도 안에서 채운다. 최소 인원을 먼저 맞춘 뒤 소대 순서로 넣는다.
     이미 들어간 정예가 한 소대에 몰렸으면 최소 인원이 모자란 소대로 옮긴다. 넣지 못한 정예는 배치 밖 줄에 남는다.
     rules 가 없으면 한도를 지어내지 않고 비어 있는 소대부터 채운다. next 에서는 부르지 않는다. */
  function complete(plan, rules, mine) {
    let out = norm(plan, rules, mine);
    const r = rules || {}, rest = (mine || []).filter(function (g) { return !find(out, g.id); });
    function add(s) {
      for (let i = 0; i < rest.length; i++) {
        const m = move(out, mine, rules, rest[i].id, {s: s});
        if (m.ok) { out = m.state; rest.splice(i, 1); return true; }
      }
      return false;
    }
    if (r.min != null) out.squads.forEach(function (q, s) {
      while (out.squads[s].length < r.min) {
        if (r.max != null && out.squads[s].length >= r.max) break;
        if (add(s)) continue;
        const from = out.squads.findIndex(function (a) { return a.length > r.min; });
        if (from < 0) break;
        const m = move(out, mine, rules, out.squads[from][out.squads[from].length - 1], {s: s});
        if (!m.ok) break;
        out = m.state;
      }
    });
    if (r.min == null) out.squads.forEach(function (q, s) { if (!q.length) add(s); });
    out.squads.forEach(function (q, s) { while (rest.length && add(s)) { /* 넣을 수 있는 정예만 순서대로 */ } });
    return out;
  }
  /* 상성. vs 는 서버가 준 rules.vs {클래스: [그 클래스가 유리한 상대 클래스]}. 없으면 null(표시하지 않는다).
     {up, down}: foes 가운데 cls 가 유리한 상대 수와 cls 가 불리한 상대 수. 불리는 따로 오지 않아 vs[상대 클래스] 에 cls 가 있는지로 읽는다. */
  function matchup(vs, cls, foes) {
    if (!vs || typeof vs !== 'object') return null;
    const out = {up: 0, down: 0};
    (foes || []).forEach(function (g) {
      if (!g) return;
      if (has(vs, cls, g.cls)) out.up++;
      if (has(vs, g.cls, cls)) out.down++;
    });
    return out;
  }
  /* 다음 소대 고르기(next) 검사 */
  function nextCheck(st, rules, left, sel) {
    if (!(sel >= 0 && sel < st.squads.length) || (Array.isArray(left) && left.indexOf(sel) < 0)) return say('내보낼 소대를 고른다');
    if (rules && Array.isArray(rules.tactics) && rules.tactics.indexOf(st.tactics[sel]) < 0) return say('{0}소대 작전을 고른다', [sel + 1]);
    return null;
  }
  /* 보내는 값. fight 와 def 는 {squads, tactics, mode}, next 는 {squad, tactic} */
  function result(kind, st, mode, sel) {
    if (kind === 'next') return {squad: sel, tactic: st.tactics[sel]};
    const c = copy(st);
    return {squads: c.squads, tactics: c.tactics, mode: mode === 'manual' ? 'manual' : 'auto'};
  }
  function remain(deadline, now) { return Math.max(0, Math.ceil((Number(deadline) - Number(now)) / 1000)); }
  function glyph(d, box) {
    return '<svg viewBox="0 0 ' + box + ' ' + box + '" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
  }

  function duelForm(el, data, opts) {
    opts = opts || {};
    if (!el || typeof document === 'undefined') throw new Error('duelForm 은 화면 요소가 필요하다');
    const tr = typeof opts.t === 'function' ? function (s, v) { return String(opts.t(s, v)); } : fill;
    let D = {}, kind = 'fight', rules = null, vs = null, mine = [], by = {}, opp = null, oppBy = {}, skew = 0;
    let ui = {}, cards = {}, rows = [], foeRow = null, rootEl = null, shape = '';
    let st = null, mode = 'auto', pick = null, info = null, openTac = -1, sel = -1, focusKey = null;
    let timer = 0, dead = false, drag = null, ateAt = -1, ext = '';   /* ext: 게임이 넘긴 글(서버 거절 이유). 배치가 바뀌면 지운다 */

    function read(d) {
      D = d && typeof d === 'object' ? d : {};
      kind = D.kind === 'def' || D.kind === 'next' ? D.kind : 'fight';
      rules = D.rules && typeof D.rules === 'object' ? D.rules : null;
      vs = rules && rules.vs && typeof rules.vs === 'object' ? rules.vs : null;
      mine = Array.isArray(D.mine) ? D.mine.filter(function (g) { return g && g.id != null; }) : [];
      by = index(mine);
      opp = kind !== 'def' && D.opp && typeof D.opp === 'object' ? D.opp : null;
      oppBy = index(opp && opp.girls);
      skew = typeof D.now === 'number' ? D.now - Date.now() : 0;   /* 서버 시각을 주면 기기 시계 차이를 맞춘다 */
    }
    /* 상대의 어느 소대와 맞붙나. fight 는 같은 번호, next 는 data.oppNext, 없으면 지금까지 치른 소대전 수(승수 합) */
    function foeAt(i) {
      if (!opp || !opp.def || !Array.isArray(opp.def.squads)) return -1;
      if (kind === 'fight') return i;
      const n = typeof D.oppNext === 'number' ? D.oppNext : D.score ? (Number(D.score.a) || 0) + (Number(D.score.d) || 0) : -1;
      return n >= 0 && n < opp.def.squads.length ? n : -1;
    }
    function face(i) {
      const k = foeAt(i), q = k >= 0 ? opp.def.squads[k] : null;
      return Array.isArray(q) ? q.map(function (id) { return oppBy[id]; }).filter(Boolean) : [];
    }
    function sig() {
      return JSON.stringify([kind, mine.map(function (g) { return g.id; }), opp ? [(opp.girls || []).map(function (g) { return g && g.id; }), opp.def && opp.def.squads, foeAt(0)] : 0,
        rules ? [rules.squads, rules.max, rules.tactics] : 0, D.plan && D.plan.squads ? D.plan.squads.length : 0]);
    }
    function left() { return Array.isArray(D.left) ? D.left : st.squads.map(function (q, i) { return i; }); }
    function tacKeys() { return rules && Array.isArray(rules.tactics) ? rules.tactics : kind === 'next' ? [] : Object.keys(TEXT.tactic); }
    function tacName(k) { return k == null ? '' : tr(TEXT.tactic[k] || String(k)); }
    function clsLabel(cls) {
      let s = null;
      if (typeof opts.clsName === 'function') { try { s = opts.clsName(cls); } catch (e) { s = null; } }
      return s == null || s === '' ? tr(TEXT.cls[cls] || String(cls)) : String(s);
    }
    /* 전직한 소녀(job.branch 가 있고 stage 1 이상)는 클래스 이름 자리에 전직 이름(사용자 2026-11-13 「클래스명도 전직하면 전직 명으로」).
       게임이 opts.jobName(branch) 으로 번역된 이름을 넘긴다. 없거나 빈 글이면 클래스 이름. 클래스 아이콘과 상성은 클래스 그대로 */
    function roleLabel(g) {
      const j = g && g.job;
      let s = null;
      if (j && j.branch && Number(j.stage) >= 1 && typeof opts.jobName === 'function') { try { s = opts.jobName(j.branch); } catch (e) { s = null; } }
      return typeof s === 'string' && s ? s : clsLabel(g.cls);
    }
    function planState() { return kind === 'next' ? norm(D.plan, rules, mine) : complete(D.plan, rules, mine); }
    function supplemented() { return kind !== 'next' && JSON.stringify(st) !== JSON.stringify(norm(D.plan, rules, mine)); }
    function verdict() { return kind === 'next' ? nextCheck(st, rules, left(), sel) : check(st, mine, rules); }

    function mk(tag, cls, parent, text) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = String(text);
      if (parent) parent.appendChild(n);
      return n;
    }
    function txt(node, s) { s = String(s == null ? '' : s); if (node && node.dfT !== s) { node.dfT = s; node.textContent = s; } }
    function flag(node, cls, on) { if (node) node.classList.toggle(cls, !!on); }
    function kick(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }

    /* 구조는 여기서 한 번만 만든다. 그림과 아이콘 글(innerHTML)도 여기서만 넣는다. */
    function build() {
      function raw(node, s) { node.innerHTML = s; return node; }
      function btn(parent, cls, act, label) {
        const b = mk('button', 'df-btn' + (cls ? ' ' + cls : ''), parent, label);
        b.type = 'button'; b.setAttribute('data-df-act', act);
        return b;
      }
      function portrait(holder, g, side) {
        let out = null;
        if (typeof opts.art === 'function') { try { out = opts.art(g, side); } catch (e) { out = null; } }
        if (typeof out === 'string' && out) { raw(holder, out); return; }
        if (out && out.nodeType === 1) { holder.appendChild(out); return; }
        const dir = String(opts.artBase == null ? 'assets' : opts.artBase).replace(/[/]+$/, ''), nm = encodeURIComponent(String(g.name));
        const srcs = [dir + '/girls/' + nm + '.m.webp', dir + '/girls/' + nm + '.webp'], im = mk('img', 'df-im', holder);
        let at = 0;
        im.alt = ''; im.decoding = 'async'; im.draggable = false;
        im.addEventListener('error', function () { at++; if (at < srcs.length) im.src = srcs[at]; else holder.classList.add('df-noart'); });
        im.src = srcs[0];
      }
      /* 소녀 카드. 소녀마다 한 번만 만들고 옮길 때는 이 노드를 옮긴다 */
      function card(g, side, k) {
        const e = mk('div', 'df-card df-new ' + (side ? 'df-foe' : 'df-own')), fr = mk('div', 'df-fr', e), pt = mk('div', 'df-pt', fr);
        const c = {id: g.id, key: (side ? 'o' : 'm') + g.id, g: g, side: side, el: e, fr: fr, name: String(g.name == null ? '?' : g.name), q: '', m: null};
        e.setAttribute('data-df-g', c.key); e.setAttribute('role', 'button');
        e.tabIndex = kind === 'next' && side ? 0 : side || kind === 'next' ? -1 : 0;
        e.style.setProperty('--df-k', String(k));
        mk('span', 'df-ph', pt, first(c.name));
        portrait(mk('div', 'df-art', pt), g, side);
        c.rar = mk('span', 'df-rar', pt);
        c.pf = mk('span', 'df-prof', pt);   /* 숙련 단계 작은 표시. 등급 표시 아래. 첫 단계는 비워 둔다(CSS 가 빈 표시를 숨긴다) */
        const chip = mk('span', 'df-cls', pt), label = clsLabel(g.cls);
        let icon = null;
        if (typeof opts.clsIcon === 'function') { try { icon = opts.clsIcon(g.cls); } catch (err) { icon = null; } }
        if (typeof icon === 'string' && icon) raw(chip, icon); else chip.textContent = first(label);
        chip.setAttribute('aria-label', label);
        raw(mk('span', 'df-lock', pt), glyph(LOCK, 16));
        const mark = mk('span', 'df-mk', pt);
        c.up = mk('i', 'df-up', mark); c.dn = mk('i', 'df-dn', mark);   /* 상성 표시. rules.vs 가 있을 때만 켠다 */
        c.pp = mk('span', 'df-pips', pt);
        mk('span', 'df-nm', pt, c.name);
        cards[c.key] = c;
        return c;
      }
      /* 상대 소대 칸: VS, 작전 글, 카드 줄 */
      function foeBox(parent, list, k0) {
        const o = {foes: []};
        mk('b', 'df-vs', parent, tr('VS'));
        o.ot = mk('span', 'df-ot', parent);
        if (kind === 'next') {
          o.name = mk('b', 'df-foe-name', o.ot); mk('span', 'df-foe-sep', o.ot, '\n');
          o.tactic = mk('span', 'df-foe-tactic', o.ot);
        }
        const oc = mk('div', 'df-oc', parent);
        list.forEach(function (g, j) { const c = card(g, 1, k0 + j); oc.appendChild(c.el); o.foes.push(c); });
        return o;
      }
      function row(i) {
        const e = mk('section', 'df-sq', ui.body), h = mk('div', 'df-sqh', e), r = {i: i, el: e, slots: [], foes: [], opts: [], ot: null};
        e.setAttribute('data-df-sq', String(i));
        if (kind === 'next') e.setAttribute('role', 'button');
        mk('b', 'df-sqn', h, tr('{0}소대', [i + 1]));
        r.cnt = mk('span', 'df-sqc', h);
        if (kind === 'next') r.badge = mk('b', 'df-deploy', h, tr('출전'));
        if (kind !== 'next') {
          r.tb = btn(h, 'df-tac', 'tac', null);
          r.tb.setAttribute('data-df-i', String(i));
          mk('small', '', r.tb, tr('작전'));
          r.tl = mk('b', '', r.tb);
          if (kind === 'fight' && face(i).length) { const o = foeBox(e, face(i), i * PER_ROW); r.foes = o.foes; r.ot = o.ot; }
          const tc = mk('div', 'df-tacs', e);
          tacKeys().forEach(function (k) {
            const b = btn(tc, 'df-to', 'tacset', tacName(k));
            b.setAttribute('data-df-i', String(i)); b.setAttribute('data-df-v', String(k));
            r.opts.push({k: k, el: b});
          });
        }
        const mn = mk('div', 'df-mine', e);
        for (let j = 0; j < slotN; j++) {
          const s = mk('div', 'df-slot', mn);
          s.setAttribute('role', 'button'); s.setAttribute('aria-label', tr('빈 자리'));
          r.slots.push(s);
        }
        return r;
      }

      ui = {}; cards = {}; rows = []; foeRow = null;
      /* 자리 수는 rules.max. 한도를 모르면 명단 수만큼 만들어 두고 빈 자리 하나만 보인다 */
      const longest = st.squads.reduce(function (m, q) { return Math.max(m, q.length); }, 0);
      const slotN = rules && rules.max > 0 ? Math.max(rules.max, longest) : Math.max(mine.length, longest, 1);
      /* opts.fill: 받은 칸(el)의 높이까지 채운다. el 에 높이가 있어야 한다. 크기 맞춤은 CSS 만으로 한다(크기를 듣는 코드 없음) */
      rootEl = mk('div', 'df df-k-' + kind + (opts.fill ? ' df-fill' : ''));
      rootEl.setAttribute('role', 'group');
      rootEl.setAttribute('aria-label', tr(TEXT.title[kind]));
      const inn = mk('div', 'df-in', rootEl);
      /* 한 줄 칸 수와 소대 수. CSS 가 카드 크기를 셈하는 데 쓴다(변수는 뿌리가 아니라 안쪽에 둔다) */
      inn.style.setProperty('--df-n', String(Math.min(slotN, PER_ROW)));
      inn.style.setProperty('--df-sq', String(Math.max(1, st.squads.length)));

      /* next 는 결과 띠가 맨 위. 노드는 중립, 승, 패 사이에서도 그대로 쓴다 */
      if (kind === 'next') {
        ui.band = mk('div', 'df-next', inn);
        ui.won = mk('b', 'df-result df-off', ui.band);
        const sc = mk('div', 'df-sc', ui.band);
        ui.sa = mk('b', 'df-sa', sc); mk('i', '', sc, ':'); ui.sd = mk('b', 'df-sd', sc);
        ui.last = mk('span', 'df-last', ui.band);
        ui.dl = mk('b', 'df-dl', ui.band);
      }
      const head = mk('div', 'df-head', inn), tt = mk('div', 'df-tt', head), title = mk('div', 'df-titles', tt);
      mk('b', 'df-title', title, tr(TEXT.title[kind]));
      if (opp && kind !== 'next') {
        const who = mk('div', 'df-who', tt);
        mk('small', 'df-wl', who, tr('상대'));
        ui.on = mk('b', 'df-wn', who);
        ui.or = mk('span', 'df-wr', who);
      }
      if (kind === 'fight') {
        ui.manual = mk('b', 'df-manual df-off', title, tr('수동 대전'));
        const seg = mk('div', 'df-seg', head);
        seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', tr('모드'));
        ui.modes = [['auto', tr('자동')], ['manual', tr('수동')]].map(function (m) {
          const b = btn(seg, 'df-mode-' + m[0], 'mode', m[1]);
          b.setAttribute('data-df-v', m[0]);
          return {k: m[0], el: b};
        });
        ui.manualHint = mk('small', 'df-manual-hint df-off', inn, tr('첫 소대전 뒤부터 판마다 다음 소대를 고른다'));
      }
      if (kind === 'next' && typeof opts.onCancel === 'function') btn(head, '', 'close', tr('닫기'));
      if (kind === 'next' && face(0).length) {
        const fq = mk('section', 'df-sq df-fq', inn);
        foeRow = foeBox(fq, face(0), 0);
      }

      /* 소대 줄. 길면 이 영역만 세로로 밀린다 */
      ui.body = mk('div', 'df-body', inn);
      for (let i = 0; i < st.squads.length; i++) rows.push(row(i));
      /* 내 카드. 깔리는 차례는 소대 순서 다음 배치 밖 정예. next 는 소대에 든 카드만 */
      const order = [].concat.apply([], st.squads);
      mine.forEach(function (g) { if (order.indexOf(g.id) < 0 && kind !== 'next') order.push(g.id); });
      order.forEach(function (id, k) { card(by[id], 0, k); });

      if (kind === 'next') {
        ui.nextTac = mk('div', 'df-next-tacs', inn);
        mk('b', 'df-tac-label', ui.nextTac, tr('작전'));
        const tc = mk('div', 'df-tac-line', ui.nextTac);
        ui.nextOpts = tacKeys().map(function (k) {
          const b = btn(tc, 'df-to', 'tacset', tacName(k));
          b.setAttribute('data-df-v', String(k));
          return {k: k, el: b};
        });
      }

      /* 정보 줄: 고른 카드의 화력, 장갑, 전직, 스킬 상태 */
      ui.info = mk('div', 'df-info', inn);
      ui.info.setAttribute('aria-live', 'polite');
      ui.hint = mk('span', 'df-hint', ui.info);
      ui.iname = mk('b', 'df-iname', ui.info);
      ui.ic = {};
      ['cls', 'up', 'dn', 'atk', 'arm', 'slots', 'job', 'ska', 'skp', 'ske'].forEach(function (k) { ui.ic[k] = mk('span', 'df-chip df-off df-c-' + k, ui.info); });

      /* 남은 정예만 소대 영역 맨 아래 한 줄로. 줄 바탕은 옮기기 목적지가 아니다 */
      if (kind !== 'next') {
        ui.rest = mk('div', 'df-rest df-off', ui.body);
        ui.hn = mk('b', 'df-rn', ui.rest);
        ui.hs = mk('div', 'df-rs', ui.rest);
      }

      /* 합계 줄과 단추 줄 */
      const sm = mk('div', 'df-sum', inn);
      if (kind !== 'next') { ui.sg = mk('b', 'df-sg', sm); ui.ss = mk('b', 'df-ss', sm); }
      const wy = mk('div', 'df-why', sm);
      ui.err = mk('span', 'df-err', wy);
      ui.tip = mk('span', 'df-tip', wy);
      ui.tip.setAttribute('role', 'status');
      const ft = mk('div', 'df-foot', inn);
      if (kind !== 'next') btn(ft, '', 'reco', tr('추천 배치'));
      if (kind !== 'next' && typeof opts.onCancel === 'function') btn(ft, '', 'close', tr('닫기'));
      ui.main = btn(ft, 'df-main', 'submit', tr(TEXT.main[kind]));
      ui.lift = mk('div', 'df-lift', rootEl);   /* 끄는 동안 카드가 올라와 있는 층(밀리는 영역 밖이라 잘리지 않는다) */
    }

    /* 카드 값(등급, 칸 막대, 자물쇠). setData 로 소녀 값이 바뀌어도 노드는 그대로 */
    function paintCard(c) {
      const g = c.g, rar = /^[A-Z]{1,3}$/.test(String(g.rar)) ? String(g.rar) : '', q = 'df-q-' + (g.hidden ? 'H' : rar || 'X');
      const sk = g.sk, n = Math.max(0, Math.round(Number(g.slots) || 0));
      if (c.q !== q) { if (c.q) c.el.classList.remove(c.q); c.el.classList.add(q); c.q = q; }
      txt(c.rar, (g.hidden ? '★' : '') + rar);
      flag(c.el, 'df-locked', !!sk && (!sk.a || !sk.p));
      while (c.pp.children.length < n) mk('i', '', c.pp);
      while (c.pp.children.length > n) c.pp.removeChild(c.pp.children[c.pp.children.length - 1]);
      /* 숙련 단계는 첫 단계를 넘었을 때만 보인다(내 카드와 상대 카드 모두). 스킬 이름과 숙련도 막대는 격납고 소녀 카드에 있다 */
      const lv = sk ? Math.floor(Number(sk.lv) || 0) : 0;
      txt(c.pf, lv > 1 ? lv : '');
      c.el.setAttribute('aria-label', c.name + ' ' + roleLabel(g) + (lv > 1 ? ' ' + tr('숙련 {0}단계', [lv]) : ''));
    }
    function dragging(c) { return !!drag && drag.on && drag.c === c; }
    function seat(c, parent, before) {
      c.el.classList.remove('df-new', 'df-slide');   /* 다시 꽂힐 때 깔리는 움직임이 또 돌지 않게 */
      parent.insertBefore(c.el, before || null);
    }
    /* 상태대로 카드 노드를 자리에 둔다. 이미 제자리인 카드는 건드리지 않는다 */
    function layout() {
      const open = !(rules && rules.max > 0);
      rows.forEach(function (r, i) {
        const q = st.squads[i];
        r.slots.forEach(function (s, j) {
          const c = j < q.length ? cards['m' + q[j]] : null;
          if (c && c.el.parentNode !== s && !dragging(c)) seat(c, s);
          flag(s, 'df-full', !!c && !dragging(c));
          flag(s, 'df-off', open && j > q.length);
          s.tabIndex = c || kind === 'next' ? -1 : 0;
        });
      });
      if (!ui.hs) return;
      let k = 0;
      mine.forEach(function (g) {
        const c = cards['m' + g.id];
        if (!c || find(st, g.id) || dragging(c)) return;
        if (ui.hs.children[k] !== c.el) seat(c, ui.hs, ui.hs.children[k]);
        k++;
      });
    }
    /* 자리로 들어갈 때 온 쪽에서 짧게 미끄러져 들어온다(transform 과 opacity 만). r0 는 옮기기 전 자리 */
    function slide(c, r0) {
      const r1 = c.el.getBoundingClientRect();
      let dx = r0.left - r1.left, dy = r0.top - r1.top;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (!(len >= 1)) return;
      if (len > NUDGE) { dx = dx * NUDGE / len; dy = dy * NUDGE / len; }
      c.el.style.setProperty('--df-fx', dx.toFixed(1) + 'px');
      c.el.style.setProperty('--df-fy', dy.toFixed(1) + 'px');
      kick(c.el, 'df-slide');
    }
    function marks(c, m, good, bad) {
      c.m = m;
      /* 화살표와 색은 모두 「나」 기준(사용자 2026-11-13 「화살표가 유리한데 아래를 가리키고 불리한데 위를 가리키니까 좀 어색하다」).
         위 세모 초록 = 나에게 유리한 수, 아래 세모 빨강 = 나에게 불리한 수. 상대 카드에서는 matchup 의 up(상대가 유리)과 down 을 바꿔 읽는다 */
      const fav = m ? (c.side ? m.down : m.up) : 0, unf = m ? (c.side ? m.up : m.down) : 0;
      txt(c.up, fav ? fav : ''); txt(c.dn, unf ? unf : '');
      flag(c.el, 'df-hasup', fav); flag(c.el, 'df-hasdn', unf);
      flag(c.el, 'df-good', good); flag(c.el, 'df-bad', bad);
    }
    function chip(k, s) { txt(ui.ic[k], s); flag(ui.ic[k], 'df-off', !s); }
    function paintInfo() {
      const c = info != null ? cards[info] : null;
      flag(ui.info, 'df-has', !!c);
      if (!c) { txt(ui.hint, kind === 'next' ? tr('남은 소대 가운데 하나를 누른다') : tr('소녀를 누르고 다른 소녀를 선택하면 위치가 변경된다')); return; }
      const g = c.g, sk = g.sk, S = (rules && rules.skill) || {}, m = c.m;
      txt(ui.iname, c.name);
      chip('cls', roleLabel(g));
      /* 유리는 나에게 좋은 것. 상대 카드에서는 내 소대가 그 카드에 유리한 수 */
      chip('up', m && (c.side ? m.down : m.up) ? tr('유리 {0}', [c.side ? m.down : m.up]) : '');
      chip('dn', m && (c.side ? m.up : m.down) ? tr('불리 {0}', [c.side ? m.up : m.down]) : '');
      chip('atk', g.atk != null ? tr('화력') + ' ' + num(g.atk) : '');
      chip('arm', g.arm != null ? tr('장갑') + ' ' + num(g.arm) : '');
      chip('slots', g.slots != null ? tr('{0}칸', [g.slots]) : '');
      chip('job', g.job && g.job.stage != null ? tr('전직 {0}', [g.job.stage]) : '');
      chip('ska', sk && !sk.a ? (S.lv != null ? tr('스킬 잠김 Lv {0}', [S.lv]) : tr('스킬 잠김')) : '');
      chip('skp', sk && !sk.p ? (S.passive != null ? tr('패시브 잠김 전직 {0}', [S.passive]) : tr('패시브 잠김')) : '');
      chip('ske', sk && sk.e ? tr('각성') : '');
    }
    /* 값만 다시 쓴다(글자, 클래스, 꺼짐). 노드를 만들거나 옮기지 않는다 */
    function refresh() {
      const t = totals(st, mine), why = verdict(), R = rules || {}, lf = kind === 'next' ? left() : null;
      const pg = pick != null ? by[pick] : null, pa = pick != null ? find(st, pick) : null;
      let rest = 0;
      rows.forEach(function (r, i) {
        const q = st.squads[i], out = !!lf && lf.indexOf(i) < 0, foes = face(i);
        txt(r.cnt, tr('{0}명', [t.per[i].n]) + ' ' + tr('{0}칸', [t.per[i].slots]));
        if (r.tb) {
          txt(r.tl, tacName(st.tactics[i]));
          flag(r.el, 'df-open', openTac === i);
          r.tb.setAttribute('aria-expanded', openTac === i ? 'true' : 'false');
          r.tb.disabled = out;
        }
        r.opts.forEach(function (o) { flag(o.el, 'df-on', o.k === st.tactics[i]); o.el.setAttribute('aria-pressed', o.k === st.tactics[i] ? 'true' : 'false'); });
        flag(r.el, 'df-can', kind !== 'next' && pg && !(pa && pa.s === i) && move(st, mine, rules, pick, {s: i}).ok);
        if (kind === 'next') {
          flag(r.el, 'df-out', out); flag(r.el, 'df-sel', sel === i);
          r.el.tabIndex = out ? -1 : 0;
          r.el.setAttribute('aria-pressed', sel === i ? 'true' : 'false');
          r.el.setAttribute('aria-disabled', out ? 'true' : 'false');
          r.el.setAttribute('role', out ? 'group' : 'button');
          flag(r.badge, 'df-off', sel !== i);
        }
        if (r.ot) txt(r.ot, tacName(opp.def.tactics && opp.def.tactics[i]));
        q.forEach(function (id) { const c = cards['m' + id]; if (c) marks(c, vs && foes.length && !out ? matchup(vs, c.g.cls, foes) : null); });
        const own = q.map(function (id) { return by[id]; });
        r.foes.forEach(function (c) { marks(c, vs ? matchup(vs, c.g.cls, own) : null, pg && has(vs, pg.cls, c.g.cls), pg && has(vs, c.g.cls, pg.cls)); });
      });
      if (ui.nextOpts) {
        flag(ui.nextTac, 'df-muted', sel < 0);
        ui.nextOpts.forEach(function (o) {
          o.el.disabled = sel < 0;
          o.el.setAttribute('data-df-i', String(sel));
          const on = sel >= 0 && o.k === st.tactics[sel];
          flag(o.el, 'df-on', on); o.el.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }
      if (foeRow) {
        const k = foeAt(0), own = sel >= 0 ? st.squads[sel].map(function (id) { return by[id]; }) : [];
        txt(foeRow.name, tr('상대 {0}소대', [k + 1]));
        txt(foeRow.tactic, tacName(opp.def.tactics && opp.def.tactics[k]));
        foeRow.foes.forEach(function (c) { marks(c, vs && own.length ? matchup(vs, c.g.cls, own) : null); });
      }
      mine.forEach(function (g) {
        const c = cards['m' + g.id];
        if (!c) return;
        flag(c.el, 'df-pick', pick === g.id);
        c.el.setAttribute('aria-pressed', pick === g.id ? 'true' : 'false');
        if (!find(st, g.id)) { rest++; marks(c, null); }
      });
      if (ui.rest) {
        txt(ui.hn, tr('배치 밖 {0}명', [rest]));
        flag(ui.rest, 'df-off', !rest);
      }
      if (ui.sg) {
        txt(ui.sg, R.girls != null ? tr('{0}명 / {1}', [t.girls, R.girls]) : tr('{0}명', [t.girls]));
        txt(ui.ss, R.slots != null ? tr('{0}칸 / {1}', [t.slots, R.slots]) : tr('{0}칸', [t.slots]));
        flag(ui.sg, 'df-bad', R.girls != null && t.girls > R.girls);
        flag(ui.ss, 'df-bad', R.slots != null && t.slots > R.slots);
      }
      txt(ui.err, why ? tr(why.text, why.v) : ext);
      ui.main.disabled = !!why;
      if (ui.modes) ui.modes.forEach(function (m) { flag(m.el, 'df-on', m.k === mode); m.el.setAttribute('aria-pressed', m.k === mode ? 'true' : 'false'); });
      if (ui.manual) { flag(ui.manual, 'df-off', mode !== 'manual'); flag(ui.manualHint, 'df-off', mode !== 'manual'); }
      txt(ui.main, tr(kind === 'fight' && mode === 'manual' ? '수동 대전 시작' : TEXT.main[kind]));
      if (ui.on) { txt(ui.on, opp.name == null ? '' : opp.name); txt(ui.or, opp.rating != null ? tr('점수 {0}', [num(opp.rating)]) : ''); }
      if (ui.sa) {
        txt(ui.sa, D.score ? Number(D.score.a) || 0 : 0); txt(ui.sd, D.score ? Number(D.score.d) || 0 : 0);
        txt(ui.last, D.last == null ? '' : D.last);
        const known = typeof D.lastWon === 'boolean';
        flag(ui.band, 'df-won', known && D.lastWon); flag(ui.band, 'df-lost', known && !D.lastWon);
        flag(ui.won, 'df-off', !known); txt(ui.won, known ? tr(D.lastWon ? '승' : '패') : '');
      }
      paintInfo();
    }

    function changed() {
      if (ext) { ext = ''; txt(ui.err, ''); const w = verdict(); if (w) txt(ui.err, tr(w.text, w.v)); }
      if (typeof opts.onChange !== 'function') return;
      const o = result('fight', st, mode);
      if (kind === 'next') o.squad = sel;
      opts.onChange(o);
    }
    /* 넣을 수 없다: 카드가 한 번 흔들리고 이유가 합계 줄에 잠깐 보인다(사라지는 것은 CSS 가 한다) */
    function deny(c, why) {
      if (c) kick(c.fr, 'df-shake');
      txt(ui.tip, tr(why.text, why.v));
      kick(ui.tip, 'df-on');
    }
    /* 집은 카드를 옮긴다. from 은 옮기기 전 자리(끌어 놓을 때는 손가락 아래 자리) */
    function go(to, from) {
      const c = cards['m' + pick], res = move(st, mine, rules, pick, to);
      if (!res.ok) { deny(c, res.why); return false; }
      const keys = [c.key], was = JSON.stringify(st);
      if (to.id != null && cards['m' + to.id]) keys.push('m' + to.id);
      from = from || {};
      keys.forEach(function (k) { if (!from[k]) from[k] = cards[k].el.getBoundingClientRect(); });
      st = res.state; pick = null; focusKey = c.key;
      layout();
      keys.forEach(function (k) { slide(cards[k], from[k]); });
      refresh();
      if (JSON.stringify(st) !== was) changed();
      return true;
    }
    function choose(i, keep) {
      if (left().indexOf(i) < 0) { deny(null, say('이미 나간 소대다')); refresh(); return false; }
      if (sel !== i) { sel = i; if (!keep) openTac = -1; }
      refresh();
      return true;
    }
    function act(a, n) {
      const i = Number(n.getAttribute('data-df-i')), v = n.getAttribute('data-df-v');
      if (a === 'tac') {
        if (kind === 'next' && !choose(i, true)) return;
        openTac = openTac === i ? -1 : i;
        refresh();
        /* 펼친 작전 단추가 소대 줄 영역 아래로 잘리면 그만큼 민다 */
        if (openTac === i && rows[i]) {
          const over = rows[i].el.getBoundingClientRect().bottom - ui.body.getBoundingClientRect().bottom;
          if (over > 0) ui.body.scrollTop += over + 8;
        }
      } else if (a === 'tacset') {
        if (kind === 'next' && (sel < 0 || i !== sel || left().indexOf(i) < 0)) return;
        if (tacKeys().indexOf(v) < 0) return;
        const same = st.tactics[i] === v;
        openTac = -1; st.tactics[i] = v;
        refresh();
        if (!same) changed();
      } else if (a === 'mode') {
        if (mode === v) return;
        mode = v === 'manual' ? 'manual' : 'auto';
        refresh(); changed();
      } else if (a === 'reco') {
        /* 서버가 준 추천 배치로 되돌린다 */
        const was = JSON.stringify(st), from = {};
        Object.keys(cards).forEach(function (k) { if (!cards[k].side) from[k] = cards[k].el.getBoundingClientRect(); });
        st = planState(); pick = null; openTac = -1;
        layout();
        Object.keys(from).forEach(function (k) { slide(cards[k], from[k]); });
        refresh();
        if (JSON.stringify(st) !== was) changed();
      } else if (a === 'close') {
        if (typeof opts.onCancel === 'function') opts.onCancel();
      } else if (a === 'submit') {
        const why = verdict();
        if (why) { deny(null, why); return; }
        if (typeof opts.onSubmit === 'function') opts.onSubmit(result(kind, st, mode, sel));
      }
    }

    /* 누른 곳이 무엇인지: 단추, 카드, 소대 줄 */
    function hit(t) {
      if (!t || !t.closest || !rootEl.contains(t)) return null;
      const a = t.closest('[data-df-act]'), c = t.closest('[data-df-g]'), r = t.closest('[data-df-sq]');
      return {act: a ? a.getAttribute('data-df-act') : null, n: a, card: c ? cards[c.getAttribute('data-df-g')] || null : null,
        row: r ? Number(r.getAttribute('data-df-sq')) : -1};
    }
    /* 눌러 고르고 눌러 넣기(휴대폰과 PC 공통) */
    function tap(h) {
      if (!h || dead) return;
      if (h.act) { if (!h.n.disabled) act(h.act, h.n); return; }
      const c = h.card;
      if (kind === 'next') {
        if (c) info = c.key;
        if (h.row >= 0) choose(h.row); else refresh();
        return;
      }
      if (c && c.side) { info = c.key; refresh(); return; }
      if (c) {
        if (pick == null) { pick = c.id; info = c.key; }
        else if (pick === c.id) pick = null;
        else if (!find(st, pick) && !find(st, c.id)) { pick = c.id; info = c.key; }   /* 배치 밖 카드끼리는 집은 카드만 바꾼다 */
        else { go({id: c.id}); return; }
        refresh();
        return;
      }
      if (pick == null) return;
      if (h.row >= 0) go({s: h.row});
    }
    function onClick(e) {
      /* 끌어 놓은 바로 뒤(0.4초 안)의 click 은 버린다. 시각은 이벤트의 것으로만 잰다 */
      const late = ateAt >= 0 && e.timeStamp - ateAt < 400;
      ateAt = -1;
      if (late) return;
      tap(hit(e.target));
    }
    function onKey(e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'Escape') { if (pick != null || openTac >= 0) { pick = null; openTac = -1; refresh(); } return; }
      if (e.key !== 'Enter' && e.key !== ' ' && e.code !== 'Space') return;
      if (e.target && e.target.closest && e.target.closest('button')) return;   /* 단추는 브라우저가 click 을 낸다 */
      e.preventDefault();
      focusKey = null;
      tap(hit(e.target));
      const c = focusKey ? cards[focusKey] : null;   /* 옮겨진 카드는 초점을 잃으니 다시 준다 */
      if (c && typeof c.el.focus === 'function') c.el.focus();
    }

    /* 끌어 놓기(포인터 이벤트). 마우스는 조금 움직이면, 터치는 길게 누른 뒤 움직이면 시작한다.
       터치에서 길게 누르기 전에 움직이면 배치 밖 줄 가로 밀기나 소대 줄 세로 밀기로 넘긴다. 시간은 이벤트 시각으로만 잰다(타이머 없음). */
    function onDown(e) {
      ateAt = -1;
      if (dead || drag || kind === 'next' || e.button > 0) return;
      const h = hit(e.target);
      if (!h || h.act || !h.card || h.card.side) return;
      drag = {c: h.card, id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, touch: e.pointerType === 'touch', on: false, over: null, box: null, inBody: false};
      if (drag.touch) h.card.el.classList.add('df-press');
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag, dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.on) {
        if (dx * dx + dy * dy < SLOP * SLOP) return;
        if (d.touch && e.timeStamp - d.t < HOLD) { d.c.el.classList.remove('df-press'); drag = null; return; }
        const r = d.c.el.getBoundingClientRect(), R = rootEl.getBoundingClientRect(), L = ui.lift.style;
        d.on = true; d.box = ui.body.getBoundingClientRect(); d.inBody = !!find(st, d.c.id);
        d.c.el.classList.remove('df-press', 'df-new', 'df-slide');
        if (d.c.el.parentNode) d.c.el.parentNode.classList.remove('df-full');
        L.setProperty('--df-gx', (r.left - R.left) + 'px'); L.setProperty('--df-gy', (r.top - R.top) + 'px'); L.setProperty('--df-gw', r.width + 'px');
        ui.lift.appendChild(d.c.el);
        try { rootEl.setPointerCapture(e.pointerId); } catch (err) { /* 못 잡아도 끌기는 된다 */ }
        pick = d.c.id; info = d.c.key; openTac = -1;
        refresh();
      }
      ui.lift.style.setProperty('--df-tx', dx + 'px');
      ui.lift.style.setProperty('--df-ty', dy + 'px');
      const h = hit(document.elementFromPoint(e.clientX, e.clientY)), ov = !h ? null : h.row >= 0 ? rows[h.row].el : null;
      if (ov !== d.over) { if (d.over) d.over.classList.remove('df-over'); if (ov) ov.classList.add('df-over'); d.over = ov; }
      /* 소대 줄이 밀려 있으면 가장자리에서 조금씩 민다 */
      if (e.clientY < d.box.top + 28 && e.clientY > d.box.top - 28) ui.body.scrollTop -= 12;
      else if (d.inBody && e.clientY > d.box.bottom - 28 && e.clientY < d.box.bottom) ui.body.scrollTop += 12;
    }
    function drop(e, cancel) {
      const d = drag;
      if (!d) return;
      drag = null;
      d.c.el.classList.remove('df-press');
      if (!d.on) return;   /* 끌지 않았으면 click 이 처리한다 */
      if (e && !cancel) ateAt = e.timeStamp;
      if (d.over) d.over.classList.remove('df-over');
      try { rootEl.releasePointerCapture(d.id); } catch (err) { /* 이미 풀렸다 */ }
      const from = {}, h = cancel || !e ? null : hit(document.elementFromPoint(e.clientX, e.clientY));
      from[d.c.key] = d.c.el.getBoundingClientRect();
      let to = null;
      if (h && h.card && !h.card.side && h.card.id !== d.c.id) to = {id: h.card.id};   /* 카드 위에 놓으면 소대 안팎 어느 쪽이든 자리를 바꾼다 */
      else if (h && h.row >= 0) to = {s: h.row};
      pick = d.c.id;
      if (!to || !go(to, from)) { pick = null; layout(); slide(d.c, from[d.c.key]); refresh(); }
    }
    function onUp(e) { if (drag && e.pointerId === drag.id) drop(e, false); }
    function onCancel(e) { if (drag && e.pointerId === drag.id) drop(e, true); }
    function onTouch(e) {
      /* 길게 누른 뒤의 움직임은 끌기다. 브라우저가 밀기(스크롤)로 가져가지 않게 막는다 */
      if (drag && drag.touch && (drag.on || e.timeStamp - drag.t >= HOLD) && e.cancelable) e.preventDefault();
    }
    function onMenu(e) { if (drag && drag.touch) e.preventDefault(); }
    function onAnim(e) {
      /* 한 번 돈 움직임 클래스는 걷는다(노드가 다시 꽂힐 때 또 돌지 않게) */
      const t = e.target;
      if (!t || !t.classList) return;
      if (t === ui.tip) t.classList.remove('df-on');
      else t.classList.remove('df-new', 'df-slide', 'df-shake');
    }

    /* 타이머는 이 한 줄기뿐: next 의 마감까지 남은 시간 글자. 탭이 가려지면 멈춘다 */
    function stop() { if (timer) { clearTimeout(timer); timer = 0; } }
    function tick() {
      timer = 0;
      if (dead || !ui.dl) return;
      if (typeof D.deadline !== 'number') { txt(ui.dl, ''); return; }
      const ms = D.deadline - (Date.now() + skew), s = remain(D.deadline, Date.now() + skew);
      txt(ui.dl, s > 0 ? tr('남은 시간 {0}초', [s]) : tr('시간 초과'));
      flag(ui.dl, 'df-late', s <= 0);
      if (s > 0 && !document.hidden) timer = setTimeout(tick, Math.max(50, ms - (s - 1) * 1000 + 20));
    }
    function onVis() { stop(); if (!document.hidden) tick(); }

    const EV = [['click', onClick], ['keydown', onKey], ['pointerdown', onDown], ['pointermove', onMove], ['pointerup', onUp], ['pointercancel', onCancel],
      ['contextmenu', onMenu], ['animationend', onAnim]];
    function unmount() {
      stop();
      if (drag) { if (drag.c) drag.c.el.classList.remove('df-press'); drag = null; }
      if (!rootEl) return;
      EV.forEach(function (p) { rootEl.removeEventListener(p[0], p[1]); });
      rootEl.removeEventListener('touchmove', onTouch);
      if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      rootEl = null;
    }
    function mount() {
      unmount();
      st = planState();
      mode = D.mode === 'manual' ? 'manual' : 'auto';
      pick = null; info = null; openTac = -1; focusKey = null; ext = '';
      sel = kind === 'next' && left().length === 1 ? left()[0] : -1;
      shape = sig();
      build();
      Object.keys(cards).forEach(function (k) { paintCard(cards[k]); });
      layout();
      el.textContent = '';
      el.appendChild(rootEl);
      EV.forEach(function (p) { rootEl.addEventListener(p[0], p[1]); });
      rootEl.addEventListener('touchmove', onTouch, {passive: false});
      refresh();
      tick();
      if (supplemented()) changed();
    }

    const api = {
      /* 새 값으로 갱신. 명단과 꼴이 같으면 구조와 지금 배치를 그대로 두고 값만 바꾼다(추천 배치가 바뀌었으면 그 배치로).
         kind 나 명단, 상대, 소대 수가 달라졌으면 구조를 새로 만든다. */
      setData: function (d) {
        if (dead) return;
        if (drag) drop(null, true);
        const oldPlan = JSON.stringify(D.plan || null);
        read(d);
        if (sig() !== shape) { mount(); return; }
        const newPlan = JSON.stringify(D.plan || null) !== oldPlan;
        if (newPlan) { st = planState(); pick = null; openTac = -1; }
        Object.keys(cards).forEach(function (k) {
          const c = cards[k], g = c.side ? oppBy[c.id] : by[c.id];
          if (g) { c.g = g; paintCard(c); }
        });
        if (kind === 'next' && left().indexOf(sel) < 0) sel = left().length === 1 ? left()[0] : -1;
        layout(); refresh();
        stop(); tick();
        if (newPlan && supplemented()) changed();
      },
      destroy: function () {
        if (dead) return;
        dead = true;
        unmount();
        document.removeEventListener('visibilitychange', onVis);
        el.textContent = '';
      },
      /* 서버가 거절한 이유처럼 게임이 보여 줄 글(이미 번역된 글)을 합계 줄에 둔다. 배치나 작전이 바뀌면 사라진다 */
      error: function (s) {
        if (dead) return;
        ext = s == null ? '' : String(s);
        refresh();
      },
      state: function () {
        const why = dead ? null : verdict(), c = copy(st);
        return {kind: kind, squads: c.squads, tactics: c.tactics, mode: mode, pick: pick, squad: sel, valid: !why, why: why ? tr(why.text, why.v) : ''};
      }
    };

    read(data);
    mount();
    document.addEventListener('visibilitychange', onVis);
    return api;
  }

  duelForm.norm = norm; duelForm.complete = complete; duelForm.check = check; duelForm.move = move; duelForm.totals = totals;
  duelForm.matchup = matchup; duelForm.nextCheck = nextCheck; duelForm.result = result; duelForm.remain = remain;
  duelForm.TEXT = TEXT;

  /* node 에서 이 파일을 바로 require 했을 때만 module.exports 로 내보낸다.
     index.html 에 넣은 뒤 다른 실행 환경(서버 계산용 vm 등)에서 남의 module.exports 를 덮지 않게 파일 이름을 본다. */
  if (typeof module === 'object' && module && typeof module.filename === 'string' && /duel-form\.js$/.test(module.filename)) module.exports = duelForm;
  else root.duelForm = duelForm;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
