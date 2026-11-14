/* duel-skill.js  스킬과 숙련도를 격납고 소녀 카드에 그리는 독립 부품(2026-11-13 ART 세션).
   이유: 사용자 「스킬은 성장해야 하니까 격납고 소녀 카드에 표기해야 하는거 아닌가? 대전 모드에 굳이 설명을 넣을 필요는 없을것 같고」.
     같은 날 「스킬 이름과 설명으로만 하면 되지 않을까?」「그냥 스킬이라고 하자 다른 곳에도 쓰게될 가능성이 있으니」: 물음표 뒤에 숨긴 규칙 설명을 없애고
     스킬마다 이름 줄과 설명 한 줄(서버가 그 소녀의 지금 수치를 넣어 보낸 글)을 늘 보인다. 판 제목은 「스킬」.
     같은 날 「스킬 아이콘 1 옆으로 숙련도 바를 옮기는 건?」: 숙련도 막대를 머리줄의 단계 표시 옆으로 옮기고 단계 점 줄을 없앴다.
     같은 날 「다음 단계 73%는 게이지가 있어서 굳이 없어도 될 것 같고」: 강화 줄의 다음 단계 수치 칸을 없앴다(강화 줄은 비용과 「강화」만).
   쓰는 법(자료를 쥔 관리자 하나가 카드마다 작은 칸을 그린다. 관리자는 화면에 아무것도 그리지 않는다):
     const sk = duelSkill(data, {t:번역, num, onSkillUp:(gid, lv) => …, res:() => 지금 자원, resIcon:(key) => 아이콘 HTML});
     sk.chip(el, gid)   접힌 카드의 작은 표시(숙련 단계, 올릴 수 있으면 점)   sk.panel(el, {id, cls})   펼친 카드의 스킬 판
     sk.setData(data)  sk.update({gid, lv, xp, need, cost, up, txt})  sk.setBusy(gid 또는 null)  sk.error(gid, 글)  sk.drop(el)  sk.destroy()  sk.state()
   data: GET /duel/skills 응답 그대로 {rules:{skill:{lv, passive, enhance, prof:{max, need, cost}}}, names:{클래스:{a, p}}, desc(선택), girls:{번호:{sk, prof, txt(선택)}}}
     txt:{a, p} 는 액티브 설명, 패시브 설명. 서버가 판정과 같은 표로 그 소녀의 숙련 단계와 각성을 넣어 보낸다. next(다음 단계의 수치 글)는 와도 쓰지 않는다.
     부품은 이 글을 계산하지도 번역 함수에 넘기지도 않고 textContent 로 그대로 보인다. txt 가 없는 옛 응답이면 desc 가 있을 때만 그 글을 번역 함수에 넘겨 보인다.
   순수 함수(화면 없이 돈다): duelSkill.frac maxed costItems can locks chipView num
   원칙 2-9d: 규칙 숫자(최대 단계, 문턱, 비용, 효과 몫, 열림 조건)와 스킬 이름 표와 설명 표를 여기에 적지 않는다. 모두 data 에서 읽고 없으면 그 부분을 보이지 않는다.
   이 부품은 서버를 부르지 않는다. 동작은 opts 콜백으로 넘긴다. 게임 전역에 기대지 않는다(배포본은 이름을 줄인다). 타이머와 크기를 듣는 코드가 없다.
   구조는 칸마다 build 의 함수로 한 번만 만들고 값만 바꾼다. 같은 칸에 다시 불러도 자료가 그대로면 아무것도 건드리지 않는다(게임이 매 초 불러도 된다).
   게임이 본문을 통째로 다시 그려 칸(el)이 새 노드가 되면, 문서에서 떨어진 같은 소녀의 옛 칸 노드를 새 칸으로 옮겨 쓴다(다시 만들지 않는다).
   이 파일에는 꼬리표를 닫는 글자(script, style)를 적지 않는다. 줄 설명은 이 꼴의 묶음 주석만 쓴다. */
(function (root) {
  'use strict';

  const RES = ['alloy', 'parts', 'fuel'], KEYS = RES.concat(['cores']);

  /* 글 표. 한국어 원문이 열쇠이고 화면에 낼 때 opts.t 로 감싼다. 스킬 이름과 설명은 여기에 없다(이름은 서버가 준 글을 opts.t 에 넘기고, 수치가 든 설명 txt 는 그대로 보인다). */
  const TEXT = {
    res: {alloy: '합금', parts: '부품', fuel: '연료', cores: '코어'},
    why: {res: '자원이 모자랍니다.'},   /* 숙련도가 모자랄 때는 글 없이 꺼진 단추만(사용자 2026-11-13 「숙련도가 모자라다 글을 없애면?」). 막대가 찼는데 안 되는 자원 모자람만 이유를 적는다 */
    ui: ['스킬', '액티브', '패시브', '각성', '각성 전직 {0}', 'Lv {0}', '전직 {0}', '잠김', '숙련 {0}단계', '강화 가능', '숙련도', '{0} / {1}', '최대 단계', '강화',
      '광산 {0}시간어치', '광산 {0}분어치']
  };

  function fill(s, v) {
    s = String(s);
    return v ? s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? String(v[k]) : m; }) : s;
  }
  /* 숫자 글: 천 단위 쉼표, 소수는 한 자리까지 */
  function num(n) {
    const x = Number(n) || 0, r = Math.round(Math.abs(x) * 10) / 10, i = Math.floor(r), f = Math.round((r - i) * 10);
    return (x < 0 && r ? '-' : '') + String(i).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f ? '.' + f : '');
  }
  function say(text, v) { return {text: text, v: v || null}; }
  /* 서버가 준 글(스킬 설명). 글자나 숫자만 받아 그대로 돌려주고, 없거나 빈 글이거나 다른 꼴이면 빈 글 */
  function lit(x) {
    const s = typeof x === 'string' ? x : typeof x === 'number' && isFinite(x) ? String(x) : '';
    return s.trim() ? s : '';
  }
  /* 마지막 단계인가. 서버는 마지막 단계에서 need 를 null 로 준다. rules 의 max 로도 본다 */
  function maxed(prof, P) { return !!prof && (prof.need == null || (!!P && P.max != null && Number(prof.lv) >= Number(P.max))); }
  /* 숙련도 막대 0~1: 지금 단계 문턱(rules 의 need[단계-1])부터 다음 문턱(prof.need)까지. 마지막 단계면 가득 */
  function frac(prof, P) {
    if (!prof) return 0;
    if (maxed(prof, P)) return 1;
    const lo = P && Array.isArray(P.need) ? Number(P.need[prof.lv - 1]) || 0 : 0, hi = Number(prof.need), xp = Number(prof.xp) || 0;
    if (!(hi > lo)) return xp >= hi ? 1 : 0;
    return Math.max(0, Math.min(1, (xp - lo) / (hi - lo)));
  }
  /* 다음 단계 비용을 보일 항목으로. 0 인 것은 뺀다. 자원 수를 모르면(null) 광산 시간어치 글 하나로 보인다.
     비용에 칸이 있는 자원만 본다(2026-11-13 서버가 연료를 비용에서 뺐다. 없는 칸은 그리지도 견주지도 않는다. 「없는 칸」과 「수를 모르는 칸 null」은 다르다).
     have(지금 자원)가 있으면 모자란 항목에 lack. 자원 수를 모르는 항목은 견주지 않는다(서버가 올릴 때 확인한다) */
  function costItems(cost, have) {
    const out = [];
    if (!cost || typeof cost !== 'object') return out;
    const short = function (k, n) { return !!have && have[k] != null && Number(have[k]) < n; };
    const keys = RES.filter(function (k) { return cost[k] !== undefined; });
    if (!keys.length || keys.some(function (k) { return cost[k] === null; })) {
      const h = Number(cost.h) || 0;
      if (h > 0) out.push(h < 1 ? {k: 'h', text: '광산 {0}분어치', v: [Math.round(h * 60)]} : {k: 'h', text: '광산 {0}시간어치', v: [num(h)]});
    } else keys.forEach(function (k) { const n = Number(cost[k]) || 0; if (n > 0) out.push({k: k, n: n, lack: short(k, n)}); });
    const c = Number(cost.cores) || 0;
    if (c > 0) out.push({k: 'cores', n: c, lack: short('cores', c)});
    return out;
  }
  /* 올릴 수 있는지와 막힌 이유. why: 'max' 마지막 단계, 'xp' 숙련도 모자람, 'res' 자원 모자람, null 숙련도를 보이지 않는 소녀.
     have 가 없으면 자원으로는 미리 막지 않는다(서버 거절에 맡긴다) */
  function can(g, P, have) {
    const pf = g && g.prof;
    if (!g || !g.sk || !g.sk.a || !P || !pf) return {ok: false, why: null};
    if (maxed(pf, P)) return {ok: false, why: 'max'};
    if (!pf.up) return {ok: false, why: 'xp'};
    if (costItems(pf.cost, have).some(function (x) { return x.lack; })) return {ok: false, why: 'res'};
    return {ok: true, why: null};
  }
  /* 열림 상태 꼬리표. a p: 열렸으면 null, 잠겼으면 조건 글(조건 숫자는 rules.skill, 없으면 「잠김」). e: 액티브가 열렸을 때만 {on, text, v} */
  function locks(sk, S) {
    S = S || {};
    const cond = function (text, n) { return n != null ? say(text, [n]) : say('잠김'); };
    const a = sk && sk.a ? null : cond('Lv {0}', S.lv), p = sk && sk.p ? null : cond('전직 {0}', S.passive);
    let e = null;
    if (sk && sk.a) e = sk.e ? {on: true, text: '각성', v: null} : S.enhance != null ? {on: false, text: '각성 전직 {0}', v: [S.enhance]} : null;
    return {a: a, p: p, e: e};
  }
  /* 접힌 카드의 작은 표시에 보일 것 {lv, up}. 액티브가 잠긴 소녀와, 첫 단계이면서 올릴 것도 없는 소녀는 null(보이지 않는다) */
  function chipView(g) {
    if (!g || !g.sk || !g.sk.a) return null;
    const lv = Math.max(1, Math.floor(Number(g.prof && g.prof.lv != null ? g.prof.lv : g.sk.lv) || 1)), up = !!(g.prof && g.prof.up);
    return lv > 1 || up ? {lv: lv, up: up} : null;
  }

  function duelSkill(data, opts) {
    opts = opts || {};
    if (typeof document === 'undefined') throw new Error('duelSkill 은 화면이 필요하다');
    const tr = typeof opts.t === 'function' ? function (s, v) { return String(opts.t(s, v)); } : fill;
    const cells = new Map();   /* 칸(el) 마다 그린 기록. 소녀 수십 명이어도 관리자는 하나다 */
    let S = null, P = null, girls = {}, names = {}, desc = {}, ver = 0, busy = null, errs = {}, have = null, dead = false, make = null;

    function obj(x) { return x && typeof x === 'object' ? x : null; }
    /* 받은 자료는 고치지 않는다. 소녀 지도만 얕게 베껴 두고 update 는 그 지도의 한 소녀를 새 값으로 바꾼다 */
    function read(d) {
      d = obj(d) || {};
      S = obj(d.rules) && obj(d.rules.skill);
      P = S && obj(S.prof);
      girls = Object.assign({}, obj(d.girls));
      names = obj(d.names) || {};
      desc = obj(d.desc) || {};
      ver++;
    }
    function ask(name, a) {
      if (typeof opts[name] !== 'function') return null;
      let s = null;
      try { s = opts[name](a); } catch (e) { s = null; }
      return s == null || s === '' ? null : s;
    }
    function N(n) { const s = ask('num', n); return s == null ? num(n) : String(s); }
    function stock() { have = obj(ask('res')); }
    function same(a, b) { return String(a) === String(b); }

    function mk(tag, cls, parent, text) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = String(text);
      if (parent) parent.appendChild(n);
      return n;
    }
    function txt(node, s) { s = String(s == null ? '' : s); if (node.dskT !== s) { node.dskT = s; node.textContent = s; } }
    function flag(node, cls, on) { on = !!on; if (node['dskF' + cls] !== on) { node['dskF' + cls] = on; node.classList.toggle(cls, on); } }
    function off(node, on) { flag(node, 'dsk-off', on); }
    function attr(node, k, v) { if (node['dskA' + k] !== v) { node['dskA' + k] = v; node.setAttribute(k, v); } }
    function prop(node, k, v) { if (node['dskP' + k] !== v) { node['dskP' + k] = v; node.style.setProperty(k, v); } }
    function kick(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }

    /* 구조는 여기서만 만든다. 아이콘 글(innerHTML)도 여기서만 넣는다. 칸 하나를 만드는 함수 둘을 make 로 내놓는다. */
    function build() {
      function raw(node, s) { node.innerHTML = s; return node; }
      function chip() {
        const e = mk('span', 'dsk dsk-chip dsk-off');
        e.setAttribute('role', 'img');
        return {kind: 'chip', root: e, n: mk('b', 'dsk-cn', e), dot: mk('i', 'dsk-cd', e)};
      }
      /* 스킬 칸 하나. 첫 줄: 종류 꼬리표, 이름, (액티브만) 각성 꼬리표, 잠김 조건(자물쇠와 글). 둘째 줄: 설명(글이 비면 숨긴다).
         각성은 전직이 깊어져 열리는 층 sk.e 의 화면 이름이고, 숙련 단계를 올리는 단추가 「강화」다 */
      function skill(parent, k) {
        const e = mk('div', 'dsk-s dsk-s' + k, parent), u = {el: e, kind: mk('span', 'dsk-k', e)};
        u.name = mk('b', 'dsk-n', e);
        if (k === 'a') u.enh = mk('span', 'dsk-e dsk-off', e);
        u.cond = mk('span', 'dsk-c dsk-off', e);   /* 못 채운 선행 조건은 게임 본래 표기(.req.no 붉은 칩과 가위표)를 따른다(사용자 2026-11-13 「선행조건 표기 방식은 보통 붉은색 처리했던것 같아서」). 각성 전 꼬리표도 같은 꼴. 가위표는 CSS 가 붙인다 */
        u.ct = mk('em', '', u.cond);
        u.desc = mk('p', 'dsk-d dsk-off', e);
        return u;
      }
      function panel() {
        const e = mk('div', 'dsk dsk-panel dsk-off'), inn = mk('div', 'dsk-in', e), r = {kind: 'panel', root: e, s: {}, ci: {}};
        e.setAttribute('role', 'group');
        e.setAttribute('aria-label', tr('스킬'));
        const head = mk('div', 'dsk-head', inn);
        mk('b', 'dsk-title', head, tr('스킬'));
        r.lvt = mk('span', 'dsk-lvt dsk-off', head);
        const sk = mk('div', 'dsk-sk', inn);
        r.s.a = skill(sk, 'a'); r.s.p = skill(sk, 'p');
        /* 숙련: 숙련도 막대, 막대의 이름, 숫자 */
        r.pf = mk('div', 'dsk-pf dsk-off', head);   /* 숙련도 막대는 머리줄의 단계 표시 옆(사용자 2026-11-13 「스킬 아이콘 1 옆으로 숙련도 바를 옮기는 건?」). 단계 점 줄은 단계 표시와 같은 정보라 없앴다 */
        r.fill = mk('i', '', mk('span', 'dsk-bar', r.pf));
        mk('small', 'dsk-xl', r.pf, tr('숙련도'));   /* 막대의 이름(사용자 2026-11-13 「숙련도라고 위의 그래프에 써주고」) */
        r.xp = mk('b', 'dsk-xp', r.pf);
        /* 다음 단계 비용과 「강화」. 다음 단계의 수치 글은 두지 않는다(사용자 2026-11-13 「게이지가 있어서 굳이 없어도 될 것 같고」) */
        r.row = mk('div', 'dsk-row dsk-off', inn);
        const left = mk('div', 'dsk-cw', r.row), cost = mk('div', 'dsk-cost', left);
        KEYS.forEach(function (k) {
          if (k === 'cores') r.hours = mk('span', 'dsk-hr dsk-off', cost);   /* 광산 시간어치 글은 자원 셋 자리, 코어 앞 */
          const c = mk('span', 'dsk-ci dsk-off', cost), ic = mk('i', 'dsk-ic', c), icon = ask('resIcon', k);
          if (typeof icon === 'string') raw(ic, icon); else { ic.textContent = tr(TEXT.res[k]); ic.classList.add('dsk-tx'); }
          c.setAttribute('aria-label', tr(TEXT.res[k]));
          r.ci[k] = {el: c, n: mk('b', '', c)};
        });
        r.why = mk('span', 'dsk-why', left);
        r.btn = mk('button', 'dsk-btn', r.row, tr('강화'));
        r.btn.type = 'button'; r.btn.setAttribute('data-dsk-act', 'up');
        r.err = mk('p', 'dsk-err dsk-off', inn);
        r.err.setAttribute('role', 'alert');
        return r;
      }
      make = {chip: chip, panel: panel};
    }

    function paintChip(r) {
      const v = chipView(girls[r.gid]);
      off(r.root, !v);
      if (!v) return;
      txt(r.n, v.lv);
      flag(r.root, 'dsk-up', v.up);
      flag(r.root, 'dsk-one', v.lv <= 1);
      attr(r.root, 'aria-label', tr('숙련 {0}단계', [v.lv]) + (v.up ? ' ' + tr('강화 가능') : ''));
    }
    function paintPanel(r) {
      const g = girls[r.gid], sk = g && obj(g.sk);
      off(r.root, !sk);
      if (!sk) return;
      const nm = obj(names[r.cls]) || {}, ds = obj(desc[r.cls]) || {}, tx = obj(g.txt) || {}, L = locks(sk, S), pf = obj(g.prof), on = !!(sk.a && P && pf), mx = on && maxed(pf, P);
      /* 1. 스킬 둘. 이름이 없는 클래스는 이름 자리에 종류 글만. 설명은 서버 글 txt 를 그대로(잠긴 스킬도 흐리게 보인다), 없으면 옛 응답의 desc 를 번역 함수에 넘겨, 그것도 없으면 숨긴다 */
      [['a', '액티브'], ['p', '패시브']].forEach(function (p) {
        const u = r.s[p[0]], name = nm[p[0]], lk = L[p[0]], d = lit(tx[p[0]]) || (lit(ds[p[0]]) ? tr(ds[p[0]]) : '');
        txt(u.kind, name ? tr(p[1]) : ''); off(u.kind, !name);
        txt(u.name, name ? tr(name) : tr(p[1]));
        flag(u.el, 'dsk-nn', !name); flag(u.el, 'dsk-lock', !!lk);
        txt(u.ct, lk ? tr(lk.text, lk.v) : ''); off(u.cond, !lk);
        txt(u.desc, d); off(u.desc, !d);
      });
      txt(r.s.a.enh, L.e ? tr(L.e.text, L.e.v) : ''); off(r.s.a.enh, !L.e);
      flag(r.s.a.enh, 'dsk-on', L.e && L.e.on);
      /* 2. 숙련(액티브가 열렸고 rules.skill.prof 가 있을 때만) */
      off(r.pf, !on); off(r.lvt, !on); off(r.row, !on || mx);
      flag(r.root, 'dsk-solo', !on);
      if (on) {
        const lv = Math.max(1, Math.floor(Number(pf.lv) || 1));
        txt(r.lvt, lv);
        attr(r.lvt, 'aria-label', tr('숙련 {0}단계', [lv]));
        prop(r.fill, '--dsk-f', frac(pf, P).toFixed(3));
        txt(r.xp, mx ? tr('최대 단계') : tr('{0} / {1}', [N(pf.xp), N(pf.need)]));
        flag(r.pf, 'dsk-max', mx);
      }
      /* 3. 다음 단계 비용과 「강화」. 자원이 모자라 보이는 단추는 꺼진 꼴이지만 눌리고, 누르면 자원을 다시 읽어 확인한다 */
      if (on && !mx) {
        const c = can(g, P, have), wait = busy != null && same(busy, r.gid), by = {};
        costItems(pf.cost, have).forEach(function (x) { by[x.k] = x; });
        KEYS.forEach(function (k) {
          const x = by[k];
          off(r.ci[k].el, !x);
          if (x) { txt(r.ci[k].n, N(x.n)); flag(r.ci[k].el, 'dsk-lack', x.lack); }
        });
        txt(r.hours, by.h ? tr(by.h.text, by.h.v) : ''); off(r.hours, !by.h);
        txt(r.why, c.why === 'res' ? tr(TEXT.why.res) : '');
        flag(r.why, 'dsk-bad', c.why === 'res');
        const dis = wait || c.why === 'xp';
        if (r.btn.disabled !== dis) r.btn.disabled = dis;
        flag(r.btn, 'dsk-dim', c.why === 'res');
        flag(r.btn, 'dsk-go', c.ok && !wait);
        flag(r.btn, 'dsk-wait', wait);
        attr(r.btn, 'aria-disabled', c.why === 'res' ? 'true' : 'false');
      }
      const err = errs[r.gid] || '';
      txt(r.err, err); off(r.err, !err);
    }
    function paint(r) { r.ver = ver; (r.kind === 'chip' ? paintChip : paintPanel)(r); }
    function each(gid, fn) { cells.forEach(function (r) { if (gid == null || same(r.gid, gid)) fn(r); }); }

    function onClick(e) {
      const r = e.currentTarget && e.currentTarget.dskR, b = e.target && e.target.closest ? e.target.closest('[data-dsk-act]') : null;
      if (dead || !r || !b || b.disabled) return;
      if (busy != null && same(busy, r.gid)) return;
      stock();   /* 누르기 직전의 자원으로 다시 본다 */
      const g = girls[r.gid], c = can(g, P, have);
      paintPanel(r);
      if (!c.ok) { if (c.why === 'res') kick(r.why, 'dsk-nudge'); return; }
      if (errs[r.gid]) { delete errs[r.gid]; paintPanel(r); }
      if (typeof opts.onSkillUp === 'function') opts.onSkillUp(r.gid, Math.floor(Number(g.prof.lv) || 1) + 1);
    }
    function onAnim(e) {
      /* 한 번 돈 움직임 클래스는 걷는다(노드를 새 칸으로 옮길 때 또 돌지 않게) */
      if (e.target && e.target.classList) e.target.classList.remove('dsk-pop', 'dsk-nudge');
    }
    function drop(el) {
      const r = cells.get(el);
      if (!r) return;
      cells.delete(el);
      r.root.removeEventListener('click', onClick);
      r.root.removeEventListener('animationend', onAnim);
      r.root.dskR = null;
      if (r.root.parentNode) r.root.parentNode.removeChild(r.root);
    }
    /* 문서에서 떨어진 같은 소녀의 옛 칸. 게임이 본문을 통째로 다시 그린 뒤 그 노드를 새 칸으로 옮겨 쓴다 */
    function adopt(kind, gid) {
      let hit = null;
      cells.forEach(function (r) { if (!hit && r.kind === kind && same(r.gid, gid) && r.el.isConnected === false) hit = r; });
      return hit;
    }
    function cell(kind, el, gid, cls) {
      if (dead || !el || gid == null) return;
      let r = cells.get(el);
      if (r && r.kind !== kind) { drop(el); r = null; }
      if (!r) {
        r = adopt(kind, gid);
        if (r) cells.delete(r.el);
        else {
          r = make[kind]();
          r.root.dskR = r;
          if (kind === 'panel') r.root.addEventListener('click', onClick);
          r.root.addEventListener('animationend', onAnim);
        }
        r.el = el; r.ver = -1;
        el.textContent = '';
        el.appendChild(r.root);
        cells.set(el, r);
        if (kind === 'panel') stock();   /* 판을 새 칸에 놓을 때의 자원 */
      }
      if (r.ver === ver && r.gid === gid && r.cls === cls) return;   /* 자료가 그대로면 아무것도 건드리지 않는다 */
      r.gid = gid; r.cls = cls;
      paint(r);
    }

    const api = {
      chip: function (el, gid) { cell('chip', el, gid, null); },
      panel: function (el, girl) { if (girl) cell('panel', el, girl.id, girl.cls == null ? null : String(girl.cls)); },
      /* 새 자료. 이미 그린 칸은 값만 바꾼다. 자료에서 사라진 소녀의 떨어진 칸은 버린다 */
      setData: function (d) {
        if (dead) return;
        read(d); stock();
        cells.forEach(function (r, el) { if (!girls[r.gid] && el.isConnected === false) drop(el); else paint(r); });
      },
      /* 올린 뒤 그 소녀만. 단계가 올랐으면 그 소녀 판의 머리줄 단계 표시(작은 표시는 표시째)가 한 번 튄다.
         txt 칸(객체)이 오면 그 소녀의 설명 글을 통째로 바꾸고, 안 오면 그대로 둔다 */
      update: function (u) {
        if (dead || !obj(u) || u.gid == null || !girls[u.gid]) return;
        const g = girls[u.gid], was = Number(g.prof && g.prof.lv != null ? g.prof.lv : g.sk && g.sk.lv) || 1, lv = Number(u.lv) || was;
        const now = {sk: g.sk ? Object.assign({}, g.sk, {lv: lv}) : g.sk, prof: {lv: lv, xp: u.xp, need: u.need, cost: u.cost, up: !!u.up}};
        if (obj(u.txt)) now.txt = Object.assign({}, u.txt);
        girls[u.gid] = Object.assign({}, g, now);
        delete errs[u.gid];
        ver++; stock();
        each(u.gid, function (r) {
          paint(r);
          if (!(lv > was)) return;
          if (r.kind === 'chip') kick(r.root, 'dsk-pop');
          else kick(r.lvt, 'dsk-pop');
        });
      },
      setBusy: function (gid) {
        if (dead) return;
        const was = busy;
        busy = gid == null ? null : gid;
        ver++;
        each(null, function (r) { if (r.kind === 'panel' && ((was != null && same(r.gid, was)) || (busy != null && same(r.gid, busy)))) paint(r); });
      },
      /* 서버 거절 글(이미 번역된 글)을 그 소녀의 판에 한 줄로. 빈 글이면 지운다. 올리면(update) 사라진다 */
      error: function (gid, s) {
        if (dead || gid == null) return;
        if (s == null || s === '') delete errs[gid]; else errs[gid] = String(s);
        ver++;
        each(gid, function (r) { if (r.kind === 'panel') paint(r); });
      },
      drop: function (el) { if (!dead) drop(el); },
      destroy: function () {
        if (dead) return;
        cells.forEach(function (r, el) { drop(el); });
        dead = true;
      },
      state: function () { return {cells: cells.size, busy: busy}; }
    };

    read(data);
    build();
    return api;
  }

  duelSkill.frac = frac; duelSkill.maxed = maxed; duelSkill.costItems = costItems; duelSkill.can = can;
  duelSkill.locks = locks; duelSkill.chipView = chipView; duelSkill.num = num;
  duelSkill.TEXT = TEXT;

  /* node 에서 이 파일을 바로 require 했을 때만 module.exports 로 내보낸다.
     index.html 에 넣은 뒤 다른 실행 환경(서버 계산용 vm 등)에서 남의 module.exports 를 덮지 않게 파일 이름을 본다. */
  if (typeof module === 'object' && module && typeof module.filename === 'string' && /duel-skill\.js$/.test(module.filename)) module.exports = duelSkill;
  else root.duelSkill = duelSkill;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
