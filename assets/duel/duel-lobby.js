/* duel-lobby.js  정예 대전 탭(시즌 현황, 상대 후보, 내 방어 배치, 대전 기록)을 카드와 그림 중심으로 그리는 독립 부품(2026-11-13 ART 세션).
   이유: 사용자 「정예 대전탭 레이아웃을 좀 더 디자인적으로」「지금은 너무 글자만 잔뜩 있음」. 큰 숫자 하나, 초상이 보이는 카드, 승패 색으로 읽히게 하고 자세한 것은 펼칠 때만 보인다.
   쓰는 법:
     const lb = duelLobby(el, data, {art:(girl, side) => 초상 HTML, t:번역, clsName, clsIcon, jobName, num, time, whyText, onFight, onReroll, onDefense, onReport, onResume});
     lb.setData(data)  새 값으로 갱신(구조는 그대로, 값만. 후보가 바뀐 칸만 새로)   lb.setBusy(참 거짓)  서버를 기다리는 동안 누르는 것을 끈다
     lb.error(글)  서버 거절 글 한 줄(빈 글이면 지운다)   lb.state()  지금 펼친 후보와 꺼짐 상태   lb.destroy()
   data: GET /duel 응답 그대로 {season, eligible, why, me, today, cands, roster, def, recent, rules, live} 와 선택 칸 result(방금 끝난 대전의 응답).
   순수 함수(화면 없이 돈다): duelLobby.liveOn block seasonFrac dots lead lineup candKey delta pips matchup num
   원칙 2-9d: 규칙 숫자와 상성 표를 여기에 적지 않는다. 횟수는 data.today 와 후보의 left, 소대 수는 data.rules, 상성은 data.rules.vs 로만 읽는다.
   이 부품은 서버를 부르지 않는다. 동작은 모두 opts 콜백으로 넘긴다. 게임 전역에 기대지 않는다(배포본은 이름을 줄인다).
   구조는 build 에서 한 번만 만들고 값만 바꾼다. 후보 카드와 기록 줄은 열쇠가 같으면 노드를 그대로 쓴다. 타이머와 크기를 듣는 코드가 없다.
   이 파일에는 꼬리표를 닫는 글자(script, style)를 적지 않는다. 줄 설명은 이 꼴의 묶음 주석만 쓴다. */
(function (root) {
  'use strict';

  const STRIP = 6, SHOW = 5, CAP = 12;   /* 보이는 꼴: 후보 카드의 작은 초상 수, 처음 보이는 기록 줄 수, 점과 띠의 최대 개수. 규칙 숫자가 아니다 */
  const DASH = '—';
  const LOCK = 'M4.8 7.2V5.2a3.2 3.2 0 0 1 6.4 0v2M3.6 7.2h8.8v6.6H3.6z';

  /* 글 표. 한국어 원문이 열쇠이고 화면에 낼 때 opts.t 로 감싼다. */
  const TEXT = {
    tactic: {weak: '가장 약한 적', strong: '가장 센 적', support: '지원형 먼저', advantage: '상성 유리한 적'},
    cls: {carrier: '캐리어', striker: '스트라이커', bulwark: '불워크', hauler: '프레이터', medic: '메딕', jammer: '재머',
      flagship: '플래그십', breacher: '브리처', siege: '시즈', pathfinder: '패스파인더', phalanx: '팔랑크스'},
    not: {roster: '정예가 모자라 참가할 수 없다', cond: '참가 조건을 채우지 못했다', other: '지금은 참가할 수 없다'},
    block: {left: '같은 상대 횟수를 다 썼다', live: '진행 중인 대전이 있다'},   /* 대전 기회 0 은 카드에 글을 붙이지 않는다. 남은 시간은 내 현황 판의 대전 기회 줄 한 곳에만(사용자 2026-11-13) */
    ui: ['대전', '시즌 {0}', '남은 기간 {0}일', '점수', '{0}위', '공격', '방어', '승', '패', '대전 기회', '진행 중인 수동 대전', '이어서 고르기',
      '승리', '패배', '보고서', '보상 획득', '상대', '다시 뽑기', '상대 전력', '내 전력', '자동 대전', '수동 대전', '자세히', '접기', '같은 상대 남은 횟수 {0}', '+{0}', '대전할 상대가 없다',
      '상대 방어 배치', '공개 정예', '공개 정예 {0}명', '{0}소대', '대기', '방어 배치', '저장한 배치', '추천 배치', '방어 편성', '방어 배치가 없다',
      '대전 기록', '더 보기', '아직 대전 기록이 없다', '이름 없음', '화력', '장갑', '{0}칸', '전직 {0}', '스킬 잠김 Lv {0}', '패시브 잠김 전직 {0}', '스킬 잠김', '패시브 잠김', '각성',
      '유리 {0}', '불리 {0}', '카드를 눌러 상세 정보 보기', '숙련 {0}단계', '다음 기회까지 {0}시간 {1}분', '다음 기회까지 {0}분', '다시 뽑기 기회가 없다']
  };

  function fill(s, v) {
    s = String(s);
    return v ? s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? String(v[k]) : m; }) : s;
  }
  function first(s) { return Array.from(String(s == null ? '' : s))[0] || '?'; }
  function list(a) { return Array.isArray(a) ? a : []; }
  /* 숫자 글: 천 단위 쉼표, 소수는 한 자리까지 */
  function num(n) {
    const x = Number(n) || 0, r = Math.round(Math.abs(x) * 10) / 10, i = Math.floor(r), f = Math.round((r - i) * 10);
    return (x < 0 && r ? '-' : '') + String(i).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f ? '.' + f : '');
  }
  function index(a) {
    const m = {};
    list(a).forEach(function (g) { if (g && g.id != null) m[g.id] = g; });
    return m;
  }
  function has(vs, a, b) { return !!vs && Array.isArray(vs[a]) && vs[a].indexOf(b) >= 0; }
  /* 상성. vs 는 서버가 준 rules.vs {클래스: [그 클래스가 유리한 상대 클래스]}. 없으면 null(표시하지 않는다). 편성 부품과 같은 읽는 법 */
  function matchup(vs, cls, foes) {
    if (!vs || typeof vs !== 'object') return null;
    const out = {up: 0, down: 0};
    list(foes).forEach(function (g) {
      if (!g) return;
      if (has(vs, cls, g.cls)) out.up++;
      if (has(vs, g.cls, cls)) out.down++;
    });
    return out;
  }
  /* 진행 중인 수동 경기가 있나(게임의 같은 판단: 끝나지 않았고 남은 소대가 있다) */
  function liveOn(l) { return !!(l && !l.done && Array.isArray(l.left) && l.left.length); }
  /* 대전할 수 없는 이유의 열쇠 'not' 'live' 'day' 'left', 없으면 null. 값이 없는 칸으로는 미리 막지 않는다(서버 거절에 맡긴다) */
  function block(d, c) {
    d = d || {};
    if (d.eligible === false) return 'not';
    if (liveOn(d.live)) return 'live';
    if (d.today && d.today.fightsLeft != null && !(d.today.fightsLeft > 0)) return 'day';
    if (c && c.left != null && !(c.left > 0)) return 'left';
    return null;
  }
  /* 시즌이 얼마나 지났나 0~1. 시작과 끝이 제대로 없으면 null(막대를 그리지 않는다) */
  function seasonFrac(s, now) {
    const a = s ? Number(s.start) : NaN, b = s ? Number(s.end) : NaN;
    if (!(a > 0) || !(b > a) || !(Number(now) >= 0)) return null;
    return Math.max(0, Math.min(1, (now - a) / (b - a)));
  }
  /* 점 줄: 전체 칸 = max, 없으면 쓴 것 + 남은 것. 켜진 점 = 남은 것. 남은 값이 없으면 null */
  function dots(used, left, max) {
    const u = Number(used), l = Number(left);
    if (left == null || !(l >= 0)) return null;
    const n = Math.max(0, Math.round(max != null && Number(max) >= 0 ? Number(max) : l + (u > 0 ? u : 0)));
    return {n: n, on: Math.min(n, Math.round(l))};
  }
  /* 남은 시간 글. 분은 올림하고 지난 시각은 0분. 시각이 없으면 빈 글. t 를 주면 같은 번역층을 거친다.
     시간 단위 환산 숫자는 충전 규칙이 아니다. 기회 수와 충전 간격은 서버 값으로만 읽는다. */
  function remain(next, now, t) {
    if (next == null || !Number.isFinite(Number(next)) || !Number.isFinite(Number(now))) return '';
    const tr = typeof t === 'function' ? t : fill, ms = Math.max(0, Number(next) - Number(now)), m = Math.ceil(ms / 60000);
    return ms >= 3600000 ? tr('다음 기회까지 {0}시간 {1}분', [Math.floor(m / 60), m % 60]) : tr('다음 기회까지 {0}분', [m]);
  }
  /* 소녀를 배치 순서로 나눈다 {squads:[[소녀]], rest:[배치 밖 소녀]}. 명단에 없는 번호와 두 번 나온 번호는 뺀다 */
  function lineup(girls, plan) {
    const by = index(girls), seen = {}, out = {squads: [], rest: []};
    list(plan && plan.squads).forEach(function (q) {
      out.squads.push(list(q).filter(function (id) {
        if (!by[id] || seen[id]) return false;
        seen[id] = 1;
        return true;
      }).map(function (id) { return by[id]; }));
    });
    list(girls).forEach(function (g) { if (g && g.id != null && !seen[g.id]) { seen[g.id] = 1; out.rest.push(g); } });
    return out;
  }
  /* 대표 소녀: 배치 1소대 첫 소녀, 배치가 없으면 명단 첫 소녀 */
  function lead(girls, plan) {
    const L = lineup(girls, plan);
    for (let i = 0; i < L.squads.length; i++) if (L.squads[i].length) return L.squads[i][0];
    return L.rest[0] || null;
  }
  function shape(girls, plan) {
    return JSON.stringify([list(girls).map(function (g) { return g ? g.id : null; }), plan && Array.isArray(plan.squads) ? plan.squads : null]);
  }
  /* 후보 열쇠. 번호와 명단과 방어 배치가 같으면 같은 카드(노드를 그대로 쓴다) */
  function candKey(c) { return c ? String(c.id) + '|' + shape(c.girls, c.def) : ''; }
  /* 점수 변화 글과 방향(1 오름, -1 내림, 0) */
  function delta(n, fmt) {
    const x = Number(n) || 0;
    return {text: (x > 0 ? '+' : '') + (typeof fmt === 'function' ? fmt : num)(x), dir: x > 0 ? 1 : x < 0 ? -1 : 0};
  }
  /* 소대 승수 띠. played 가 있으면 치른 차례대로, 없으면 승수만큼. total 을 주면 남은 판은 빈 칸. 'w' 내 승, 'l' 내 패, '' 아직 */
  function pips(wins, played, total) {
    const out = [];
    if (Array.isArray(played) && played.length) played.forEach(function (x) { out.push(x && x.winner === 'a' ? 'w' : 'l'); });
    else if (wins) {
      for (let i = 0; i < (Number(wins.a) || 0); i++) out.push('w');
      for (let i = 0; i < (Number(wins.d) || 0); i++) out.push('l');
    }
    while (out.length < (Number(total) || 0)) out.push('');
    return out.slice(0, CAP);
  }
  function glyph(d, box) {
    return '<svg viewBox="0 0 ' + box + ' ' + box + '" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
  }

  function duelLobby(el, data, opts) {
    opts = opts || {};
    if (!el || typeof document === 'undefined') throw new Error('duelLobby 는 화면 요소가 필요하다');
    const tr = typeof opts.t === 'function' ? function (s, v) { return String(opts.t(s, v)); } : fill;
    let D = {}, R = null, vs = null, ui = {}, make = null, rootEl = null, dead = false, busy = false;
    let clockNow = 0, fightWait = '', rerollWait = '';
    let cands = [], open = null, info = null, defSig = null, defSq = null, bgKey = null, recs = {}, recAll = false;

    /* opts 의 함수를 부른다. 없거나 실패하거나 빈 값이면 null */
    function ask(name, a, b) {
      if (typeof opts[name] !== 'function') return null;
      let s = null;
      try { s = opts[name](a, b); } catch (e) { s = null; }
      return s == null || s === '' ? null : s;
    }
    function N(n) { const s = ask('num', n); return s == null ? num(n) : String(s); }
    function when(ms) { const s = ask('time', ms); return s != null ? String(s) : new Date(ms).toLocaleString(); }
    function nm(s) { return s == null || s === '' ? tr('이름 없음') : String(s); }
    function clsLabel(cls) { const s = ask('clsName', cls); return s == null ? tr(TEXT.cls[cls] || String(cls)) : String(s); }
    /* 전직한 소녀(job.branch 가 있고 stage 1 이상)는 클래스 이름 자리에 전직 이름(사용자 2026-11-13 「클래스명도 전직하면 전직 명으로」). 편성 부품의 roleLabel 과 같은 읽는 법.
       게임이 opts.jobName(branch) 으로 번역된 이름을 넘긴다. 없거나 빈 글이면 클래스 이름. 클래스 아이콘과 상성은 클래스 그대로 */
    function roleLabel(g) {
      const j = g && g.job, s = j && j.branch && Number(j.stage) >= 1 ? ask('jobName', j.branch) : null;
      return typeof s === 'string' ? s : clsLabel(g.cls);
    }
    function tacName(k) { return k == null ? '' : tr(TEXT.tactic[k] || String(k)); }
    function score(w) { return (w ? Number(w.a) || 0 : 0) + ' : ' + (w ? Number(w.d) || 0 : 0); }

    function mk(tag, cls, parent, text) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = String(text);
      if (parent) parent.appendChild(n);
      return n;
    }
    function txt(node, s) { s = String(s == null ? '' : s); if (node && node.dlbT !== s) { node.dlbT = s; node.textContent = s; } }
    function flag(node, cls, on) { if (node) node.classList.toggle(cls, !!on); }
    function off(node, on) { flag(node, 'dlb-off', on); }
    function prop(node, k, v) { if (node && node['dlbP' + k] !== v) { node['dlbP' + k] = v; node.style.setProperty(k, v); } }
    function kick(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }
    /* 점이나 띠의 칸 수를 맞추고 칸마다 클래스를 준다. 칸 노드는 모자랄 때만 만든다 */
    function cells(node, n, cls) {
      while (node.children.length < n) mk('i', '', node);
      while (node.children.length > n) node.removeChild(node.children[node.children.length - 1]);
      for (let i = 0; i < n; i++) { const c = cls(i); if (node.children[i].dlbC !== c) { node.children[i].dlbC = c; node.children[i].className = c; } }
    }
    function setDots(node, d) { cells(node, d ? d.n : 0, function (i) { return i < d.on ? 'dlb-on' : ''; }); }
    function setPips(node, a) { cells(node, a.length, function (i) { return a[i] ? 'dlb-' + a[i] : ''; }); }

    /* 구조는 여기서 한 번만 만든다. 그림과 아이콘 글(innerHTML)도 여기서만 넣는다.
       후보 카드, 펼친 칸, 소대 줄, 기록 줄을 만드는 함수는 make 로 내놓아 값이 바뀔 때 그 칸만 다시 만든다. */
    function build() {
      function raw(node, s) { node.innerHTML = s; return node; }
      function btn(parent, cls, act, label) {
        const b = mk('button', 'dlb-btn' + (cls ? ' ' + cls : ''), parent, label);
        b.type = 'button'; b.setAttribute('data-dlb-act', act);
        return b;
      }
      function head(parent, title) {
        const h = mk('div', 'dlb-h', parent);
        mk('h3', '', h, title);
        return h;
      }
      function portrait(holder, g, side) {
        const out = ask('art', g, side);
        if (typeof out === 'string') { raw(holder, out); return; }
        if (out && out.nodeType === 1) { holder.appendChild(out); return; }
        const dir = String(opts.artBase == null ? 'assets' : opts.artBase).replace(/[/]+$/, ''), name = encodeURIComponent(String(g.name));
        const srcs = [dir + '/girls/' + name + '.m.webp', dir + '/girls/' + name + '.webp'], im = mk('img', 'dlb-im', holder);
        let at = 0;
        im.alt = ''; im.decoding = 'async'; im.draggable = false;
        im.addEventListener('error', function () { at++; if (at < srcs.length) im.src = srcs[at]; else holder.classList.add('dlb-noart'); });
        im.src = srcs[0];
      }
      /* 소녀 카드. kind: 'mini' 얼굴만, 'tap' 누르면 정보 줄에 보인다, 그 밖에는 보기만 */
      function card(g, side, kind, k) {
        const e = mk('div', 'dlb-card ' + (side ? 'dlb-foe' : 'dlb-own') + (kind === 'mini' ? ' dlb-mini' : '')), fr = mk('div', 'dlb-fr', e);
        const c = {id: g.id, g: g, side: side, el: e, name: String(g.name == null ? '?' : g.name), q: '', m: null, mini: kind === 'mini'};
        mk('span', 'dlb-ph', fr, first(c.name));
        portrait(mk('div', 'dlb-art', fr), g, side);
        if (c.mini) return c;
        if (kind === 'tap') { e.setAttribute('data-dlb-g', String(k)); e.setAttribute('role', 'button'); e.tabIndex = 0; e.dlbV = c; }
        c.rar = mk('span', 'dlb-rar', fr);
        c.pf = mk('span', 'dlb-prof', fr);   /* 숙련 단계 작은 표시. 등급 표시 아래. 첫 단계는 비워 둔다(CSS 가 빈 표시를 숨긴다) */
        const chip = mk('span', 'dlb-cls', fr), label = clsLabel(g.cls), icon = ask('clsIcon', g.cls);
        if (typeof icon === 'string') raw(chip, icon); else chip.textContent = first(label);
        chip.setAttribute('aria-label', label);
        raw(mk('span', 'dlb-lock', fr), glyph(LOCK, 16));
        const mark = mk('span', 'dlb-mk', fr);
        c.up = mk('i', 'dlb-up', mark); c.dn = mk('i', 'dlb-dn', mark);   /* 상성 표시. rules.vs 가 있을 때만 켠다 */
        c.sl = mk('span', 'dlb-sl', fr);
        mk('span', 'dlb-nm', fr, c.name);
        return c;
      }
      /* 소대 줄들: 소대마다 이름, 작전 꼬리표, 카드 줄. rest 가 참이면 배치 밖 소녀도 한 줄로 */
      function squads(parent, girls, plan, side, kind, rest) {
        const L = lineup(girls, plan), o = {rows: [], cards: []};
        function row(label, a, cls) {
          const e = mk('div', 'dlb-sq' + (cls ? ' ' + cls : ''), parent), h = mk('div', 'dlb-sqh', e), r = {tac: null};
          mk('b', '', h, label);
          if (!cls) r.tac = mk('span', 'dlb-tag dlb-tac', h);
          const line = mk('div', 'dlb-line', e);
          a.forEach(function (g) { const c = card(g, side, kind, o.cards.length); c.row = o.rows.length; line.appendChild(c.el); o.cards.push(c); });
          o.rows.push(r);
        }
        L.squads.forEach(function (q, i) { row(tr('{0}소대', [i + 1]), q, ''); });
        o.n = L.squads.length;
        if (rest && L.rest.length) row(tr(o.n ? '대기' : '공개 정예'), L.rest, 'dlb-rest');
        return o;
      }
      /* 후보 카드: 대표 초상, 이름, 점수, 전력 막대 둘, 작은 초상 줄, 남은 횟수 점, 단추 */
      function cand(c, k) {
        const e = mk('article', 'dlb-cand dlb-new'), r = {key: candKey(c), c: c, el: e, det: null, cards: []};
        const L = lineup(c.girls, c.def), all = [].concat.apply([], L.squads).concat(L.rest);
        e.setAttribute('data-dlb-c', '1'); e.dlbV = r;
        e.style.setProperty('--dlb-k', String(k));
        const face = mk('div', 'dlb-face', e);
        if (all[0]) { const f = card(all[0], 1, '', 0); f.face = true; face.appendChild(f.el); r.cards.push(f); } else mk('div', 'dlb-fr', face);
        const body = mk('div', 'dlb-cb', e), top = mk('div', 'dlb-ct', body);
        r.name = mk('b', 'dlb-cn', top);
        r.left = mk('span', 'dlb-dots', top);
        r.left.setAttribute('role', 'img');
        const sc = mk('div', 'dlb-cr', body);
        mk('small', '', sc, tr('점수'));
        r.rating = mk('b', '', sc);
        const pw = mk('div', 'dlb-pw', body);
        function bar(label, cls) {
          const line = mk('div', 'dlb-pr ' + cls, pw);
          mk('small', '', line, label);
          return {el: line, fill: mk('i', '', mk('span', 'dlb-pb', line)), n: mk('b', '', line)};
        }
        r.pw = bar(tr('상대 전력'), 'dlb-theirs');
        r.mp = bar(tr('내 전력'), 'dlb-mine');
        const st = mk('div', 'dlb-st', body);
        all.slice(1, 1 + STRIP).forEach(function (g) { st.appendChild(card(g, 1, 'mini', 0).el); });
        if (all.length > 1 + STRIP) mk('span', 'dlb-plus', st, tr('+{0}', [all.length - 1 - STRIP]));
        r.why = mk('span', 'dlb-cw', body);
        const ft = mk('div', 'dlb-cf', body);
        r.mb = btn(st, 'dlb-mo', 'more', null);
        r.mb.dlbV = r;
        r.ml = mk('span', '', r.mb);
        /* 단추는 한 줄 글만(사용자 2026-11-13 「세 판 한 번에 , 판마다 소대를 고른다 없애자」) */
        r.fights = [['auto', '자동 대전'], ['manual', '수동 대전']].map(function (m) {
          const b = btn(ft, 'dlb-main dlb-fight dlb-' + m[0], 'fight', null);
          b.dlbV = r; b.setAttribute('data-dlb-mode', m[0]);
          mk('b', '', b, tr(m[1]));
          return b;
        });
        r.slot = mk('div', 'dlb-det dlb-off');   /* 펼친 칸. 처음 펼칠 때 채운다(그림을 미리 받지 않는다) */
        return r;
      }
      /* 펼친 칸: 상대 방어 배치 소대 줄(배치 밖 정예는 대기 줄), 누른 카드의 정보 줄 */
      function detail(r) {
        const h = mk('div', 'dlb-dh', r.slot);
        mk('b', '', h, tr('상대 방어 배치'));
        mk('span', 'dlb-tag', h, tr('공개 정예 {0}명', [list(r.c.girls).filter(Boolean).length]));
        r.det = squads(mk('div', 'dlb-sqs', r.slot), r.c.girls, r.c.def, 1, 'tap', true);
        const inf = mk('div', 'dlb-info', r.slot);
        inf.setAttribute('aria-live', 'polite');
        mk('span', 'dlb-hint', inf, tr('카드를 눌러 상세 정보 보기'));
        r.inf = {el: inf, name: mk('b', 'dlb-iname', inf), ic: {}};
        ['cls', 'up', 'dn', 'atk', 'arm', 'slots', 'job', 'ska', 'skp', 'ske'].forEach(function (k) { r.inf.ic[k] = mk('span', 'dlb-chip dlb-off dlb-c-' + k, inf); });
      }
      /* 기록 줄: 왼쪽 승패 띠, 공격 방어 꼬리표, 상대 이름, 시각, 점수 변화. 줄 전체가 보고서 단추다 */
      function rec() {
        const b = mk('button', 'dlb-row'), o = {el: b};
        b.type = 'button'; b.setAttribute('data-dlb-act', 'report'); b.dlbV = o;
        o.wl = mk('b', 'dlb-rw', b); o.side = mk('span', 'dlb-tag', b); o.name = mk('span', 'dlb-rn', b);
        o.at = mk('small', 'dlb-ra', b); o.delta = mk('b', 'dlb-rd', b);
        mk('span', 'dlb-go', b, tr('보고서'));
        return o;
      }
      function bg(g) {
        ui.bg.textContent = '';
        if (g) portrait(ui.bg, g, 'bg');   /* 판 배경은 크게 보이니 본체에 'bg' 로 알려 중간 판 그림을 받게 한다(작은 판은 흐렸다) */
      }
      make = {cand: cand, detail: detail, squads: squads, rec: rec, bg: bg};

      ui = {};
      rootEl = mk('div', 'dlb');
      rootEl.setAttribute('role', 'group');
      rootEl.setAttribute('aria-label', tr('대전'));
      const inn = mk('div', 'dlb-in', rootEl);

      /* 1. 내 현황 판: 시즌과 진행 막대, 큰 점수 하나와 순위, 공격 방어 전적, 오늘 남은 대전 점 */
      const me = mk('section', 'dlb-me dlb-p', inn);
      ui.bg = mk('div', 'dlb-bg', me);
      ui.bg.setAttribute('aria-hidden', 'true');
      const sn = mk('div', 'dlb-sn', me);
      ui.sid = mk('b', 'dlb-tag dlb-t-me', sn);
      ui.sleft = mk('span', 'dlb-dim', sn);
      ui.sbar = mk('span', 'dlb-bar', sn);
      ui.sfill = mk('i', '', ui.sbar);
      const sc = mk('div', 'dlb-sc', me);
      mk('small', '', sc, tr('점수'));
      ui.big = mk('div', 'dlb-big', sc);
      ui.ri = mk('b', '', ui.big); ui.rf = mk('i', '', ui.big);
      ui.rank = mk('span', 'dlb-rank', sc);
      const wl = mk('div', 'dlb-wl', me);
      ui.wl = [['공격', 'w', 'l', 'dlb-t-me'], ['방어', 'dw', 'dl', 'dlb-t-op']].map(function (p) {
        const t = mk('div', 'dlb-wt', wl), o = {kw: p[1], kl: p[2]};
        mk('span', 'dlb-tag ' + p[3], t, tr(p[0]));
        o.w = mk('b', 'dlb-w', t); mk('small', '', t, tr('승'));
        o.l = mk('b', 'dlb-l', t); mk('small', '', t, tr('패'));
        return o;
      });
      ui.day = mk('div', 'dlb-day', me);
      mk('small', '', ui.day, tr('대전 기회'));
      ui.fd = mk('span', 'dlb-dots', ui.day);
      ui.fn = mk('b', '', ui.day);
      ui.fw = mk('small', 'dlb-fwait dlb-off', ui.day);   /* 기회가 0 일 때만 「다음 기회까지 …」 */
      /* 참가할 수 없는 이유와 게임이 넘긴 글(서버 거절) */
      ui.not = mk('p', 'dlb-note dlb-off', inn);
      ui.err = mk('p', 'dlb-note dlb-bad dlb-off', inn);
      ui.err.setAttribute('role', 'alert');

      /* 2. 진행 중인 수동 대전 */
      ui.live = mk('section', 'dlb-band dlb-live dlb-off', inn);
      mk('small', 'dlb-bl', ui.live, tr('진행 중인 수동 대전'));
      ui.ln = mk('b', 'dlb-bn', ui.live);
      ui.lp = mk('span', 'dlb-pips', ui.live);
      ui.ls = mk('b', 'dlb-bs', ui.live);
      ui.lb = btn(ui.live, 'dlb-main', 'resume', tr('이어서 고르기'));
      /* 3. 방금 결과 */
      ui.res = mk('section', 'dlb-band dlb-res dlb-off', inn);
      ui.rw = mk('b', 'dlb-bw', ui.res);
      ui.rp = mk('span', 'dlb-pips', ui.res);
      ui.rs = mk('b', 'dlb-bs', ui.res);
      ui.rd = mk('b', 'dlb-bd', ui.res);
      ui.rr = mk('span', 'dlb-dim', ui.res);
      ui.rm = mk('span', 'dlb-tag dlb-t-am', ui.res, tr('보상 획득'));   /* 보상은 판이 끝날 때 바로 지급된다(2026-11-13). 우편 글을 쓰지 않는다 */
      ui.rb = btn(ui.res, '', 'report', tr('보고서'));

      /* 4. 상대 후보 */
      ui.cs = mk('section', 'dlb-cs', inn);
      const ch = head(ui.cs, tr('상대'));
      ui.re = btn(ch, 'dlb-re', 'reroll', null);
      mk('span', '', ui.re, tr('다시 뽑기'));
      ui.rn = mk('b', '', ui.re);
      ui.rwait = mk('small', 'dlb-wait dlb-off', ui.cs);
      ui.rwait.setAttribute('role', 'status');
      ui.cl = mk('div', 'dlb-cl', ui.cs);
      ui.ce = mk('p', 'dlb-empty', ui.cs, tr('대전할 상대가 없다'));

      /* 5. 내 방어 배치 */
      const df = mk('section', 'dlb-def dlb-p', inn), dh = head(df, tr('방어 배치'));
      ui.dt = mk('span', 'dlb-tag', dh);
      ui.db = btn(dh, '', 'def', tr('방어 편성'));
      ui.dl = mk('div', 'dlb-sqs', df);
      ui.de = mk('p', 'dlb-empty', df, tr('방어 배치가 없다'));

      /* 6. 대전 기록 */
      const rc = mk('section', 'dlb-rec dlb-p', inn), rh = head(rc, tr('대전 기록'));
      ui.strip = mk('span', 'dlb-strip', rh);
      ui.strip.setAttribute('aria-hidden', 'true');
      ui.rl = mk('div', 'dlb-rl', rc);
      ui.ree = mk('p', 'dlb-empty', rc, tr('아직 대전 기록이 없다'));
      ui.rmore = btn(rc, 'dlb-mo dlb-rmore', 'recmore', null);
      ui.rml = mk('span', '', ui.rmore);
    }

    /* 카드 값(등급, 칸 막대, 자물쇠). 값이 바뀌어도 노드는 그대로 */
    function paintCard(c) {
      if (c.mini) return;
      const g = c.g, rar = /^[A-Z]{1,3}$/.test(String(g.rar)) ? String(g.rar) : '', q = 'dlb-q-' + (g.hidden ? 'H' : rar || 'X');
      const n = Math.min(CAP, Math.max(0, Math.round(Number(g.slots) || 0)));
      if (c.q !== q) { if (c.q) c.el.classList.remove(c.q); c.el.classList.add(q); c.q = q; }
      txt(c.rar, (g.hidden ? '★' : '') + rar);
      flag(c.el, 'dlb-locked', !!g.sk && (!g.sk.a || !g.sk.p));
      cells(c.sl, n, function () { return ''; });
      /* 숙련 단계는 첫 단계를 넘었을 때만 보인다. 후보 카드의 대표 초상(face)에는 두지 않는다(펼친 정예 카드와 내 방어 배치 카드에만) */
      const lv = !c.face && g.sk ? Math.floor(Number(g.sk.lv) || 0) : 0, role = roleLabel(g);
      txt(c.pf, lv > 1 ? lv : '');
      c.el.setAttribute('aria-label', c.name + ' ' + role + (lv > 1 ? ' ' + tr('숙련 {0}단계', [lv]) : ''));
    }
    function fresh(a, girls) {
      const by = index(girls);
      a.forEach(function (c) { if (by[c.id]) c.g = by[c.id]; paintCard(c); });
    }
    function marks(c, m) {
      c.m = m;
      /* 화살표와 색은 모두 「나」 기준. 위 세모 초록 = 나에게 유리한 수, 아래 세모 빨강 = 나에게 불리한 수.
         여기 표시가 붙는 카드는 상대 카드라 matchup 의 up(상대가 유리)과 down 을 바꿔 읽는다 */
      const fav = m ? m.down : 0, unf = m ? m.up : 0;
      txt(c.up, fav ? fav : ''); txt(c.dn, unf ? unf : '');
      flag(c.el, 'dlb-hasup', fav); flag(c.el, 'dlb-hasdn', unf);
    }

    function paintMe() {
      const m = D.me || {}, s = D.season || {}, t = D.today || {}, f = seasonFrac(s, clockNow);
      txt(ui.sid, s.id != null ? tr('시즌 {0}', [s.id]) : ''); off(ui.sid, s.id == null);
      txt(ui.sleft, s.daysLeft != null ? tr('남은 기간 {0}일', [s.daysLeft]) : '');
      off(ui.sbar, f == null);
      if (f != null) prop(ui.sfill, '--dlb-f', f.toFixed(3));
      /* 큰 점수 하나. 소수는 작게 붙인다 */
      const rs = m.rating != null ? N(m.rating) : DASH, dot = rs.lastIndexOf('.');
      txt(ui.ri, dot > 0 ? rs.slice(0, dot) : rs); txt(ui.rf, dot > 0 ? rs.slice(dot) : '');
      flag(ui.big, 'dlb-none', m.rating == null);
      txt(ui.rank, m.rank != null ? tr('{0}위', [N(m.rank)]) : DASH);
      flag(ui.rank, 'dlb-none', m.rank == null);
      ui.wl.forEach(function (o) { txt(o.w, m[o.kw] != null ? N(m[o.kw]) : DASH); txt(o.l, m[o.kl] != null ? N(m[o.kl]) : DASH); });
      const d = dots(t.fights, t.fightsLeft, t.fightsMax);
      setDots(ui.fd, d);
      txt(ui.fn, d ? N(t.fightsLeft) : DASH);
      flag(ui.day, 'dlb-zero', !!d && !d.on);
      txt(ui.fw, fightWait); off(ui.fw, !fightWait);
      /* 배경에 옅게 까는 내 대표 소녀. 꾸밈이라 없으면 비운다. 대표가 바뀔 때만 다시 만든다 */
      const g = D.roster ? lead(D.roster.girls, D.roster.plan) : null, key = g ? g.id + '|' + g.name : '';
      if (key !== bgKey) { bgKey = key; make.bg(g); }
      const why = D.eligible === false ? ask('whyText', D.why) || tr(TEXT.not[D.why] || TEXT.not.other) : '';
      txt(ui.not, why); off(ui.not, !why);
    }
    function paintBands() {
      const lv = liveOn(D.live) ? D.live : null, n = R && R.squads > 0 ? R.squads : 0, r = D.result && typeof D.result === 'object' ? D.result : null;
      off(ui.live, !lv);
      if (lv) {
        txt(ui.ln, nm(lv.d && lv.d.name));
        setPips(ui.lp, pips(lv.wins, lv.played, lv.a && Array.isArray(lv.a.squads) ? lv.a.squads.length : n || list(lv.played).length + lv.left.length));
        txt(ui.ls, score(lv.wins));
      }
      ui.lb.disabled = busy;
      off(ui.res, !r);
      if (!r) return;
      const dl = delta(r.delta, N);
      flag(ui.res, 'dlb-won', !!r.won); flag(ui.res, 'dlb-lost', !r.won);
      txt(ui.rw, tr(r.won ? '승리' : '패배'));
      setPips(ui.rp, pips(r.wins, null, n));
      txt(ui.rs, r.wins ? score(r.wins) : '');
      txt(ui.rd, r.delta != null ? dl.text : '');
      flag(ui.rd, 'dlb-pos', dl.dir > 0); flag(ui.rd, 'dlb-neg', dl.dir < 0);
      txt(ui.rr, r.rating != null ? tr('점수') + ' ' + N(r.rating) : '');
      off(ui.rm, !r.reward && !r.got);   /* 보상은 받은 값이 있다는 표시만. 양을 셈하지 않는다 */
      off(ui.rb, r.id == null);
    }

    /* 후보 칸을 열쇠로 맞춘다. 같은 후보는 노드를 그대로 쓰고(자리만 옮긴다) 바뀐 칸만 새로 만든다 */
    function syncCands() {
      const src = D.eligible === false ? [] : list(D.cands).filter(function (c) { return c && c.id != null; }), old = {};
      cands.forEach(function (r) { old[r.key] = r; });
      const next = src.map(function (c, k) {
        const key = candKey(c);
        let r = old[key];
        if (r) { delete old[key]; r.c = c; } else r = make.cand(c, k);
        return r;
      });
      Object.keys(old).forEach(function (k) {
        [old[k].el, old[k].slot].forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
      });
      next.forEach(function (r, i) {
        if (ui.cl.children[i * 2] !== r.el) ui.cl.insertBefore(r.el, ui.cl.children[i * 2] || null);
        if (ui.cl.children[i * 2 + 1] !== r.slot) ui.cl.insertBefore(r.slot, ui.cl.children[i * 2 + 1] || null);
      });
      cands = next;
      if (open && cands.indexOf(open) < 0) { open = null; info = null; }
    }
    function chip(r, k, s) { txt(r.inf.ic[k], s); off(r.inf.ic[k], !s); }
    /* 펼친 칸의 값: 소대 작전, 상성 표시(내 추천 배치의 같은 번호 소대를 상대로), 누른 카드의 정보 */
    function paintDetail(r) {
      const c = r.c, tac = list(c.def && c.def.tactics), mine = vs && D.roster ? lineup(D.roster.girls, D.roster.plan).squads : [];
      fresh(r.det.cards, c.girls);
      r.det.rows.forEach(function (row, i) { if (row.tac) { txt(row.tac, tacName(tac[i])); off(row.tac, tac[i] == null); } });
      r.det.cards.forEach(function (cd) {
        const foes = cd.row < r.det.n ? mine[cd.row] : null;
        marks(cd, foes && foes.length ? matchup(vs, cd.g.cls, foes) : null);
        flag(cd.el, 'dlb-pick', info === cd);
        cd.el.setAttribute('aria-pressed', info === cd ? 'true' : 'false');
      });
      const cd = info && r.det.cards.indexOf(info) >= 0 ? info : null;
      flag(r.inf.el, 'dlb-has', !!cd);
      if (!cd) return;
      const g = cd.g, sk = g.sk, S = (R && R.skill) || {}, m = cd.m;
      txt(r.inf.name, cd.name);
      chip(r, 'cls', roleLabel(g));
      /* 유리는 나에게 좋은 것: 내 소대가 그 상대 카드에 유리한 수 */
      chip(r, 'up', m && m.down ? tr('유리 {0}', [m.down]) : '');
      chip(r, 'dn', m && m.up ? tr('불리 {0}', [m.up]) : '');
      chip(r, 'atk', g.atk != null ? tr('화력') + ' ' + N(g.atk) : '');
      chip(r, 'arm', g.arm != null ? tr('장갑') + ' ' + N(g.arm) : '');
      chip(r, 'slots', g.slots != null ? tr('{0}칸', [g.slots]) : '');
      chip(r, 'job', g.job && g.job.stage != null ? tr('전직 {0}', [g.job.stage]) : '');
      chip(r, 'ska', sk && !sk.a ? (S.lv != null ? tr('스킬 잠김 Lv {0}', [S.lv]) : tr('스킬 잠김')) : '');
      chip(r, 'skp', sk && !sk.p ? (S.passive != null ? tr('패시브 잠김 전직 {0}', [S.passive]) : tr('패시브 잠김')) : '');
      chip(r, 'ske', sk && sk.e ? tr('각성') : '');
    }
    function paintCands() {
      const t = D.today || {}, mp = D.roster && D.roster.power != null ? Number(D.roster.power) || 0 : null, rd = dots(t.rerolls, t.rerollsLeft, t.rerollsMax);
      off(ui.cs, D.eligible === false);
      off(ui.ce, cands.length > 0);
      /* 다시 뽑기 남은 수는 점이 아니라 「남은/최대」 글로(사용자 2026-11-13 「다시 뽑기는 N/N 형식으로」). 최대가 없는 옛 응답이면 남은 수만 */
      txt(ui.rn, t.rerollsLeft != null ? N(t.rerollsLeft) + (t.rerollsMax != null ? '/' + N(t.rerollsMax) : '') : '');
      ui.re.disabled = busy || (!!rd && !rd.on);
      txt(ui.rwait, rerollWait); off(ui.rwait, !rerollWait);
      cands.forEach(function (r) {
        const c = r.c, why = block(D, c), cp = Number(c.power) || 0, top = Math.max(cp, mp || 0) || 1, on = open === r;
        txt(r.name, nm(c.name));
        txt(r.rating, c.rating != null ? N(c.rating) : DASH);
        /* 전력은 받은 숫자 둘을 나란히 보일 뿐이다. 막대 길이는 둘 가운데 큰 쪽에 맞춘 그림 */
        txt(r.pw.n, c.power != null ? N(c.power) : DASH);
        prop(r.pw.fill, '--dlb-f', (cp / top).toFixed(3));
        off(r.mp.el, mp == null);
        if (mp != null) { txt(r.mp.n, N(mp)); prop(r.mp.fill, '--dlb-f', (mp / top).toFixed(3)); }
        const left = c.left != null ? Math.max(0, Math.round(Number(c.left) || 0)) : null;
        setDots(r.left, left == null ? null : {n: Math.min(CAP, left), on: CAP});
        r.left.setAttribute('aria-label', left == null ? '' : tr('같은 상대 남은 횟수 {0}', [left]));
        txt(r.why, blockText(why));
        r.fights.forEach(function (b) { b.disabled = busy || !!why; });
        flag(r.el, 'dlb-open', on);
        off(r.slot, !on);
        r.mb.setAttribute('aria-expanded', on ? 'true' : 'false');
        txt(r.ml, tr(on ? '접기' : '자세히'));
        r.mb.setAttribute('aria-label', tr(on ? '접기' : '자세히'));
        fresh(r.cards, c.girls);
        if (r.det) paintDetail(r);
      });
    }
    /* 내 방어 배치: 배치나 명단이 바뀔 때만 카드 줄을 다시 만든다 */
    function paintDef() {
      const ro = D.roster, df = D.def, ok = !!(ro && df && Array.isArray(df.squads) && df.squads.length), sig = ok ? shape(ro.girls, df) : '';
      if (sig !== defSig) { defSig = sig; ui.dl.textContent = ''; defSq = ok ? make.squads(ui.dl, ro.girls, df, 0, '', false) : null; }
      off(ui.dl, !ok); off(ui.de, ok); off(ui.dt, !ok);
      ui.db.disabled = busy || D.eligible === false || !ro;
      if (!ok) return;
      txt(ui.dt, tr(df.saved ? '저장한 배치' : '추천 배치'));
      flag(ui.dt, 'dlb-t-me', !!df.saved);
      fresh(defSq.cards, ro.girls);
      defSq.rows.forEach(function (row, i) { const k = list(df.tactics)[i]; txt(row.tac, tacName(k)); off(row.tac, k == null); });
    }
    /* 대전 기록: 줄마다 왼쪽 승패 띠. 같은 기록은 줄 노드를 그대로 쓴다 */
    function paintRecent() {
      const src = list(D.recent).filter(Boolean), old = recs, next = {};
      const rows = src.map(function (x, i) {
        let k = x.id != null ? 'r' + x.id : 'i' + i;
        if (next[k]) k = 'i' + i;
        const o = old[k] || make.rec();
        next[k] = o; o.x = x;
        return o;
      });
      Object.keys(old).forEach(function (k) { if (!next[k] && old[k].el.parentNode) old[k].el.parentNode.removeChild(old[k].el); });
      rows.forEach(function (o, i) {
        const x = o.x, d = delta(x.delta, N);
        if (ui.rl.children[i] !== o.el) ui.rl.insertBefore(o.el, ui.rl.children[i] || null);
        flag(o.el, 'dlb-won', !!x.won); flag(o.el, 'dlb-lost', !x.won); flag(o.el, 'dlb-more', i >= SHOW);
        txt(o.wl, tr(x.won ? '승' : '패'));
        txt(o.side, tr(x.attacking ? '공격' : '방어'));
        flag(o.side, 'dlb-t-me', !!x.attacking); flag(o.side, 'dlb-t-op', !x.attacking);
        txt(o.name, nm(x.opp));
        txt(o.at, x.at != null ? when(x.at) : '');
        txt(o.delta, x.delta != null ? d.text : '');
        flag(o.delta, 'dlb-pos', d.dir > 0); flag(o.delta, 'dlb-neg', d.dir < 0);
        o.el.disabled = x.id == null;
        o.el.setAttribute('aria-label', nm(x.opp) + ' ' + tr(x.won ? '승리' : '패배') + ' ' + tr('보고서'));
      });
      recs = next;
      setPips(ui.strip, src.slice(0, CAP).map(function (x) { return x.won ? 'w' : 'l'; }));
      off(ui.ree, rows.length > 0);
      off(ui.rmore, rows.length <= SHOW);
      flag(ui.rl, 'dlb-all', recAll);
      ui.rmore.setAttribute('aria-expanded', recAll ? 'true' : 'false');
      txt(ui.rml, tr(recAll ? '접기' : '더 보기'));
    }
    /* 시각과 남은 시간은 setData 와 refresh 에서만 다시 셈한다. 펼치기와 기다림 전환에서는 그대로다 */
    function timeValues() {
      clockNow = typeof D.now === 'number' ? D.now : Date.now();
      const t = D.today || {};
      fightWait = t.fightsLeft != null && !(t.fightsLeft > 0) ? remain(t.fightsNext, clockNow, tr) : '';
      rerollWait = t.rerollsLeft != null && !(t.rerollsLeft > 0) ? remain(t.rerollsNext, clockNow, tr) || tr('다시 뽑기 기회가 없다') : '';
    }
    function blockText(why) { return why && TEXT.block[why] ? tr(TEXT.block[why]) : ''; }
    /* refresh 는 이미 있는 글만 갱신한다. 점과 그림과 펼침 구조는 건드리지 않는다 */
    function refreshTime() {
      if (dead) return;
      timeValues();
      const f = seasonFrac(D.season, clockNow);
      if (f != null) prop(ui.sfill, '--dlb-f', f.toFixed(3));
      txt(ui.rwait, rerollWait); off(ui.rwait, !rerollWait);
      txt(ui.fw, fightWait); off(ui.fw, !fightWait);
      cands.forEach(function (r) { txt(r.why, blockText(block(D, r.c))); });
    }
    function paint() {
      paintMe(); paintBands(); syncCands(); paintCands(); paintDef(); paintRecent();
      flag(rootEl, 'dlb-busy', busy);
      rootEl.setAttribute('aria-busy', busy ? 'true' : 'false');
    }

    function fire(name, v, mode) { if (typeof opts[name] === 'function') opts[name](v, mode); }
    function toggle(r) {
      open = open === r ? null : r;
      info = null;
      if (open && !r.det) make.detail(r);
      paintCands();
      if (open) kick(r.slot, 'dlb-pop');
    }
    function act(a, n) {
      const v = n.dlbV;
      if (a === 'more') toggle(v);
      else if (a === 'recmore') { recAll = !recAll; paintRecent(); }
      else if (a === 'report') { const id = n === ui.rb ? (D.result || {}).id : v && v.x ? v.x.id : null; if (id != null) fire('onReport', id); }
      else if (busy) return;
      else if (a === 'fight') { if (v && !block(D, v.c)) fire('onFight', v.c.id, n.getAttribute('data-dlb-mode')); }
      else if (a === 'reroll') fire('onReroll');
      else if (a === 'def') fire('onDefense');
      else if (a === 'resume') fire('onResume');
    }
    /* 누른 곳: 단추, 펼친 칸의 소녀 카드(정보), 후보 카드 얼굴(펼치기) */
    function tap(t) {
      if (dead || !t || !t.closest || !rootEl.contains(t)) return;
      const a = t.closest('[data-dlb-act]'), g = t.closest('[data-dlb-g]'), c = t.closest('[data-dlb-c]');
      if (a) { if (!a.disabled) act(a.getAttribute('data-dlb-act'), a); }
      else if (g) { info = info === g.dlbV ? null : g.dlbV; paintCands(); }
      else if (c) toggle(c.dlbV);
    }
    function onClick(e) { tap(e.target); }
    function onKey(e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'Escape') { if (open) toggle(open); return; }
      if (e.key !== 'Enter' && e.key !== ' ' && e.code !== 'Space') return;
      if (!e.target || !e.target.closest || e.target.closest('button') || !e.target.closest('[data-dlb-g]')) return;   /* 단추는 브라우저가 click 을 낸다 */
      e.preventDefault();
      tap(e.target);
    }
    function onAnim(e) {
      /* 한 번 돈 움직임 클래스는 걷는다(노드가 다시 꽂힐 때 또 돌지 않게) */
      if (e.target && e.target.classList) e.target.classList.remove('dlb-new', 'dlb-pop');
    }
    const EV = [['click', onClick], ['keydown', onKey], ['animationend', onAnim]];

    function read(d) {
      D = d && typeof d === 'object' ? d : {};
      R = D.rules && typeof D.rules === 'object' ? D.rules : null;
      vs = R && R.vs && typeof R.vs === 'object' ? R.vs : null;
    }

    const api = {
      /* 새 값으로 갱신. 구조는 그대로 두고 값만 바꾼다. 후보는 열쇠(번호, 명단, 방어 배치)가 같으면 카드와 그림 노드를 그대로 둔다 */
      setData: function (d) {
        if (dead) return;
        read(d);
        timeValues();
        paint();
      },
      refresh: refreshTime,
      /* 서버를 기다리는 동안 대전, 다시 뽑기, 방어 편성, 이어서 고르기를 끈다. 펼치기와 보고서는 그대로 된다 */
      setBusy: function (on) {
        if (dead) return;
        busy = !!on;
        paint();
      },
      /* 서버 거절이나 받기 실패 글(이미 번역된 글)을 한 줄로 보인다. 빈 글이면 지운다 */
      error: function (s) {
        if (dead) return;
        s = s == null ? '' : String(s);
        txt(ui.err, s); off(ui.err, !s);
      },
      state: function () {
        return {open: open ? open.c.id : null, info: info ? info.id : null, busy: busy, all: recAll, cands: cands.map(function (r) { return r.c.id; })};
      },
      destroy: function () {
        if (dead) return;
        dead = true;
        EV.forEach(function (p) { rootEl.removeEventListener(p[0], p[1]); });
        if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
        cands = []; recs = {}; open = null; info = null;
        el.textContent = '';
      }
    };

    read(data);
    timeValues();
    build();
    el.textContent = '';
    el.appendChild(rootEl);
    EV.forEach(function (p) { rootEl.addEventListener(p[0], p[1]); });
    paint();
    return api;
  }

  duelLobby.liveOn = liveOn; duelLobby.block = block; duelLobby.seasonFrac = seasonFrac; duelLobby.dots = dots; duelLobby.remain = remain;
  duelLobby.lead = lead; duelLobby.lineup = lineup; duelLobby.candKey = candKey; duelLobby.delta = delta;
  duelLobby.pips = pips; duelLobby.matchup = matchup; duelLobby.num = num;
  duelLobby.TEXT = TEXT;

  /* node 에서 이 파일을 바로 require 했을 때만 module.exports 로 내보낸다.
     index.html 에 넣은 뒤 다른 실행 환경(서버 계산용 vm 등)에서 남의 module.exports 를 덮지 않게 파일 이름을 본다. */
  if (typeof module === 'object' && module && typeof module.filename === 'string' && /duel-lobby\.js$/.test(module.filename)) module.exports = duelLobby;
  else root.duelLobby = duelLobby;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
