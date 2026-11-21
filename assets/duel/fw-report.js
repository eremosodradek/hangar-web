/* fw-report.js  함대전(3대3 이어 싸우기) 판 전체 결과 화면 부품(2026-11-15 ART 세션).
   이유: 사용자 「기본적인 대전 연출과 보고서는 정예 대전을 기반으로 만든다.」 소대전 하나하나의 재생은 정예 대전 재생 부품이 맡고,
     이 부품은 그 위에 얹는 판 전체 화면이다: 머리(결과), 팀 점수판, 장면 꼬리표, 최다 격파 소대, 소대전 목록.
     소대전 줄을 누르면 opts.onBout(i) 만 부른다(그 소대전을 재생 부품으로 여는 것은 게임 몫).
   쓰는 법:
     const fr = fwReport(el, report, {t:번역, num, art:(unit, side) => 초상 HTML, clsName:(cls) => 클래스 이름, viewSide:0|1, upto, onBout:(i) => …, onClose:() => …, result:{delta, rating, got:{cores, alloy, …}}, resIcon:(열쇠) => 자원 아이콘 HTML});
     fr.setUpto(n)  공개 수만 바꾼다(이미 그린 줄의 노드는 그대로, 새 줄만 붙인다)   fr.setData(report)   fr.state()   fr.destroy()
     같은 el 에 다시 불러도 노드를 그대로 두고 값만 바꾼다(게임이 매 초 불러도 된다). opts 는 다시 부를 때 통째로 바뀐다(upto 를 빼면 전부 공개).
   report: fw_matches.report 그대로 {res:'a'|'b'|'draw', tags, topSquad, teams[편][출전 순서], bouts}. 설계서 docs/design-fw-duel.md 8-5절.
     art 와 clsName 에 넘기는 side 는 자료의 원래 편(0 또는 1)이다. art 가 글을 돌려주지 않으면 클래스 이름 첫 글자 칸을 그린다.
     초상은 소대 명단(편, 소녀 번호, 클래스, 이름)이 그대로면 다시 만들지 않는다(그림 노드가 깜박이지 않게). art 함수만 바꿔 넘겨도 다시 만들지 않는다.
   순수 함수(화면 없이 돈다): fwReport.view(report, viewSide, upto)
     보는 편(viewSide)이 늘 왼쪽이다: teams[0] 과 bouts[i].sides[0] 이 보는 편.
     글은 {text, v} 꼴로 돌려주고 번역은 화면에 그릴 때만 한다. 지휘관 이름과 소녀 이름은 자료의 글 그대로이고 번역 함수에 넘기지 않는다.
   원칙 2-9d: 규칙을 새로 셈하지 않는다. 승패와 빠짐은 bouts 의 winner 와 drop 을, 지금 싸우는 소대는 다음 소대전의 pos 를 그대로 읽는다(결과 칸은 읽지 않는다).
     연승은 같은 소대가 이어서 이긴 줄 수를 세는 표시일 뿐이다. 재생 기록(result, state)과 지원(supports)은 읽지 않는다.
   공개되지 않은 소대전 줄은 문서에 붙이지 않는다(생중계에서 결과가 먼저 보이지 않게). 꼬리표와 최다 격파와 결과 글과 등급 변동은 전부 공개된 뒤에만 보인다.
   이 부품은 서버를 부르지 않는다. 게임 전역에 기대지 않는다(배포본은 이름을 줄인다). 타이머와 크기를 듣는 코드가 없다.
   구조는 build 의 공장 함수로 한 번만 만들고 값만 바꾼다. innerHTML 대입(초상 HTML)은 build 안에만 있다.
   이 파일에는 꼬리표를 닫는 글자(script, style)를 적지 않는다. 줄 설명은 이 꼴의 묶음 주석만 쓴다. */
(function (root) {
  'use strict';

  /* 글 표. 한국어 원문이고 화면에 낼 때 opts.t 로 감싼다 */
  const TEXT = {
    title: '함대전', win: '승리', lose: '패배', draw: '무승부', live: '소대전 {0}',
    ours: '우리 편', theirs: '상대 편', ship: '모함 {0}', captain: '대장', squad: '{0}소대', remain: '남은 소대 {0}', remainLabel: '남은 소대',
    ready: '남음', dropped: '빠짐', fighting: '지금 싸우는 중',
    streak: '{0}연속 격파', captains: '대장전', comeback: '역전승', upset: '이변',
    top: '최다 격파', kills: '격파 {0}',
    bouts: '소대전', count: '{0} / {1}', won: '승', both: '둘 다 빠짐', rounds: '{0}라운드', limit: '한도', chain: '{0}연승',
    percent: '{0}%', wait: '다음 소대전을 기다리는 중',
    delta: '등급 변동 {0}', rating: '등급 {0}',
    got: '획득', gotCores: '코어', gotAlloy: '합금', gotParts: '부품', gotFuel: '연료', gotPrism: '프리즘'
  };
  /* 즉시 받은 보상(opts.result.got)에서 보이는 자원과 그 이름 글. 여기 없는 열쇠는 그리지 않는다 */
  const GOT = ['cores', 'alloy', 'parts', 'fuel', 'prism'];
  const TAGS = ['streak', 'captains', 'comeback', 'upset'];
  const instances = new WeakMap();

  function fill(s, v) {
    s = String(s);
    return v ? s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? String(v[k]) : m; }) : s;
  }
  function list(x) { return Array.isArray(x) ? x : []; }
  function lit(x) { return x == null ? '' : String(x); }
  function say(text, v) { return {text: text, v: v || null}; }
  function unit01(x) { return Math.max(0, Math.min(1, Number(x) || 0)); }
  /* 공개 수: 없으면 전부, 있으면 0 부터 전체 사이의 정수 */
  function shown(upto, total) { return upto == null ? total : Math.max(0, Math.min(total, Math.floor(Number(upto) || 0))); }

  /* 그릴 값. 돌려주는 꼴은 머리 주석과 README 대신 tools/fw-report-check.js 의 기대값이 기준이다:
     {viewSide, order:[왼쪽 편, 오른쪽 편], upto, total, complete, result:'win'|'lose'|'draw'|null, title:{text, v},
      teams:[왼쪽, 오른쪽] 각 {side, total, remaining, dots:[{pos, ship, squad, status:'ready'|'dropped'|'fighting'}], commanders:[{ship, aid, name, fallback, captain, dots}]},
      bouts:[{index, sides:[왼쪽, 오른쪽] 각 {side, pos, ship, aid, name, fallback, squad, units, health, drop, won, streak}, winner:'left'|'right'|'draw', outcome:'win'|'lose'|'draw', streak, rounds, timeout, both}],
      tags:[{kind, text, v, at:'left'|'right'|null}], topSquad:{…소대 칸, kills, at:'left'|'right'} 또는 null} */
  function view(report, viewSide, upto) {
    const d = report || {}, all = list(d.bouts), src = list(d.teams);
    const order = viewSide === 1 ? [1, 0] : [0, 1];
    const n = shown(upto, all.length), complete = n >= all.length;
    const at = function (side) { return side === order[0] ? 'left' : 'right'; };

    /* 편마다 소대 점. 같은 ship 이 이어지는 소대를 지휘관 하나로 묶고, 마지막 지휘관이 대장 */
    const teams = order.map(function (side) {
      const commanders = [];
      const dots = list(src[side]).map(function (s, pos) {
        s = s || {};
        let c = commanders[commanders.length - 1];
        if (!c || c.ship !== s.ship) { c = {ship: s.ship, aid: s.aid, name: lit(s.name), fallback: commanders.length + 1, captain: false, dots: []}; commanders.push(c); }
        const dot = {pos: pos, ship: s.ship, squad: s.squad, status: 'ready'};
        c.dots.push(dot);
        return dot;
      });
      if (commanders.length) commanders[commanders.length - 1].captain = true;
      return {side: side, total: dots.length, remaining: dots.length, dots: dots, commanders: commanders};
    });
    /* k 는 화면 자리(0 왼쪽, 1 오른쪽) */
    function squadAt(k, pos) {
      const side = order[k], s = list(src[side])[pos] || {};
      const c = teams[k].commanders.find(function (x) { return x.dots.some(function (p) { return p.pos === pos; }); });
      return {side: side, pos: pos, ship: s.ship, aid: s.aid, name: lit(s.name), fallback: c ? c.fallback : 0, squad: s.squad, units: list(s.units)};
    }

    let before = null, run = 0;
    const bouts = all.slice(0, n).map(function (b, index) {
      b = b || {};
      const pos = list(b.pos), drop = list(b.drop), health = list(b.health);
      const win = b.winner === 'a' ? 0 : b.winner === 'b' ? 1 : null;
      const key = win == null ? null : win + '/' + pos[win];
      run = key == null ? 0 : key === before ? run + 1 : 1;
      before = key;
      const sides = order.map(function (side, k) {
        const s = squadAt(k, pos[side]);
        s.health = unit01(health[side]); s.drop = !!drop[side]; s.won = win === side; s.streak = s.won ? run : 0;
        if (s.drop && teams[k].dots[s.pos]) teams[k].dots[s.pos].status = 'dropped';
        return s;
      });
      const winner = win == null ? 'draw' : at(win);
      return {index: index, sides: sides, winner: winner, outcome: winner === 'left' ? 'win' : winner === 'right' ? 'lose' : 'draw',
        streak: run, rounds: b.rounds, timeout: !!b.timeout, both: !!drop[0] && !!drop[1]};
    });
    /* 지금 싸우는 소대: 다음 소대전의 pos(결과가 아니라 대진)를 읽고, 없으면 남은 맨 앞 소대 */
    if (!complete) {
      const next = list((all[n] || {}).pos);
      teams.forEach(function (t) {
        let p = t.dots[next[t.side]];
        if (!p || p.status !== 'ready') p = t.dots.find(function (x) { return x.status === 'ready'; });
        if (p) p.status = 'fighting';
      });
    }
    teams.forEach(function (t) { t.remaining = t.dots.filter(function (p) { return p.status !== 'dropped'; }).length; });

    const tags = !complete ? [] : list(d.tags).filter(function (x) { return x && TAGS.indexOf(x.kind) >= 0; }).map(function (x) {
      return {kind: x.kind, text: TEXT[x.kind], v: x.kind === 'streak' ? [x.count] : null, at: x.side === 0 || x.side === 1 ? at(x.side) : null};
    });
    let top = null;
    if (complete && d.topSquad) {
      const a = d.topSquad, side = a.side === 1 ? 1 : 0, k = order.indexOf(side);
      const pos = list(src[side]).findIndex(function (s) { return s && s.ship === a.ship && s.squad === a.squad; });
      if (pos >= 0) top = Object.assign(squadAt(k, pos), {kills: a.kills, at: at(side)});
    }
    const result = !complete ? null : d.res === 'draw' ? 'draw' : d.res === 'a' || d.res === 'b' ? ((d.res === 'a' ? 0 : 1) === order[0] ? 'win' : 'lose') : null;
    return {viewSide: order[0], order: order, upto: n, total: all.length, complete: complete, result: result,
      title: result ? say(TEXT[result]) : say(TEXT.live, [Math.min(n + 1, Math.max(1, all.length))]),
      teams: teams, bouts: bouts, tags: tags, topSquad: top};
  }

  function fwReport(el, report, opts) {
    if (!el || !el.ownerDocument) return null;
    if (instances.has(el)) { const old = instances.get(el); old.options(opts || {}); old.api.setData(report); return old.api; }
    opts = opts || {};
    const doc = el.ownerDocument;
    let data = report, upto = opts.upto, dead = false, painted = false, current = null, make = null, ui = null;

    function tr(s, v) { return typeof opts.t === 'function' ? String(opts.t(s, v)) : fill(s, v); }
    function N(n) { return typeof opts.num === 'function' ? String(opts.num(n)) : lit(n); }
    function txt(node, s) { s = lit(s); if (node.textContent !== s) node.textContent = s; }
    function attr(node, k, v) { v = String(v); if (node.getAttribute(k) !== v) node.setAttribute(k, v); }
    function flag(node, c, on) { on = !!on; if (node.classList.contains(c) !== on) node.classList.toggle(c, on); }
    function off(node, yes) { flag(node, 'fwr-off', yes); }
    function detach(node) { if (node.parentNode) node.parentNode.removeChild(node); }
    function nameOf(s) { return s.name || tr(TEXT.ship, [N(s.fallback)]); }
    function squadOf(s) { return tr(TEXT.squad, [N((Number(s.squad) || 0) + 1)]); }

    /* 구조 만들기. 노드를 만드는 것과 초상 HTML 대입은 이 함수 안의 공장에만 있다 */
    function build() {
      function mk(tag, cls, parent) { const node = doc.createElement(tag); if (cls) node.className = cls; if (parent) parent.appendChild(node); return node; }
      /* 초상 다섯. art 가 글을 주면 그 HTML, 아니면 클래스 이름 첫 글자 */
      function faces(s) {
        const wrap = mk('span', 'fwr-faces');
        wrap.setAttribute('aria-hidden', 'true');
        s.units.forEach(function (unit) {
          unit = unit || {};
          const e = mk('span', 'fwr-face', wrap);
          const html = typeof opts.art === 'function' ? opts.art(unit, s.side) : null;
          if (typeof html === 'string' && html) { e.innerHTML = html; return; }
          const cls = typeof opts.clsName === 'function' ? opts.clsName(unit.cls, s.side) : unit.cls;
          e.textContent = Array.from(lit(cls))[0] || '';
        });
        return wrap;
      }
      /* 이름 줄은 글 흐름이다: 이름, 빈칸, 소대 글, 빈칸, (연승 꼬리표). 빈칸은 글자라 줄이 꺾이면 줄 끝에서 사라진다(꺾인 줄이 들여쓰이지 않는다) */
      function who(parent) {
        const e = mk('span', 'fwr-who', parent), u = {el: e, name: mk('b', 'fwr-name', e)};
        e.appendChild(doc.createTextNode(' ')); u.sq = mk('span', 'fwr-sq', e); e.appendChild(doc.createTextNode(' '));
        return u;
      }
      /* 소대전 줄의 소대 칸: 이름 줄, 초상(portrait 이 끼운다), 체력 막대 */
      function cell(parent, where) {
        const e = mk('span', 'fwr-squad fwr-' + where, parent), w = who(e);
        const u = {el: e, who: w.el, name: w.name, sq: w.sq, chain: mk('span', 'fwr-chip fwr-amber fwr-chain fwr-off', w.el), faces: null, signature: null};
        u.hp = mk('span', 'fwr-hp', e); u.bar = mk('i', 'fwr-bar', u.hp); u.fill = mk('i', 'fwr-fill', u.bar); u.pct = mk('span', 'fwr-pct', u.hp);
        return u;
      }
      function row(index) {
        const e = mk('button', 'fwr-row');
        e.type = 'button'; e.setAttribute('data-fwr-bout', String(index));
        const u = {el: e, index: mk('span', 'fwr-index', e), left: cell(e, 'left')};
        u.mid = mk('span', 'fwr-mid', e); u.mark = mk('b', 'fwr-mark', u.mid); mk('i', 'fwr-arrow', u.mark); u.marktext = mk('span', 'fwr-marktext', u.mark);
        u.rounds = mk('span', 'fwr-rounds', u.mid); u.limit = mk('span', 'fwr-chip fwr-limit fwr-off', u.mid);
        u.right = cell(e, 'right');
        mk('i', 'fwr-go', e).setAttribute('aria-hidden', 'true');
        return u;
      }
      function commander() {
        const e = mk('div', 'fwr-cmd');
        return {el: e, dots: mk('div', 'fwr-dots', e), points: [], name: mk('span', 'fwr-cname', e), captain: mk('span', 'fwr-chip fwr-team-chip fwr-off', e)};
      }
      function shell() {
        const e = mk('section', 'fwr', el), inner = mk('div', 'fwr-in', e), u = {el: e, rows: [], chips: [], teams: []};
        e.tabIndex = -1;
        const head = mk('div', 'fwr-head', inner);
        u.kind = mk('span', 'fwr-kind', head); u.title = mk('h2', 'fwr-title', head);
        u.rating = mk('div', 'fwr-rating fwr-off', head); u.delta = mk('span', 'fwr-chip fwr-delta', u.rating); u.rank = mk('span', 'fwr-rank', u.rating);
        /* 보상 줄(즉시 지급, 사용자 2026-11-15 「정예 대전처럼 결과화면에서 보상을 주는 형식」): 칸은 여기서 한 번 만들고 값과 보임만 바꾼다. 자원 아이콘은 opts.resIcon(열쇠) 가 준 HTML, 없으면 자원 이름 글 */
        u.got = mk('div', 'fwr-got fwr-off', head); u.gotk = mk('span', 'fwr-gotk', u.got); u.gots = {};
        GOT.forEach(function (g) {
          const cell = mk('span', 'fwr-gotc fwr-off', u.got), ic = mk('i', 'fwr-goti', cell);
          ic.setAttribute('aria-hidden', 'true');
          const html = typeof opts.resIcon === 'function' ? opts.resIcon(g) : null;
          if (typeof html === 'string' && html) ic.innerHTML = html; else cell.classList.add('fwr-gotx');
          u.gots[g] = {el: cell, name: mk('small', 'fwr-gotn', cell), val: mk('b', 'fwr-gotv', cell)};
        });
        const board = mk('div', 'fwr-board', inner), line = mk('div', 'fwr-scoreline', board);
        u.sides = [mk('b', 'fwr-side fwr-left', line)];
        const mid = mk('div', 'fwr-scorebox', line);   /* 큰 숫자가 무엇의 수인지 바로 아래에 적는다(남은 소대) */
        u.score = mk('div', 'fwr-score', mid); u.a = mk('b', 'fwr-a', u.score); mk('i', 'fwr-colon', u.score).textContent = ':'; u.b = mk('b', 'fwr-b', u.score);
        u.scorelb = mk('span', 'fwr-scorelb', mid);
        u.sides.push(mk('b', 'fwr-side fwr-right', line));
        const lines = mk('div', 'fwr-lines', board);
        ['left', 'right'].forEach(function (where) { u.teams.push({el: mk('div', 'fwr-team fwr-' + where, lines), commanders: []}); });
        u.tags = mk('div', 'fwr-tags fwr-off', inner);
        u.top = mk('div', 'fwr-top fwr-off', inner); u.toptag = mk('span', 'fwr-chip fwr-amber fwr-toptag', u.top);
        const w = who(u.top);
        u.topcell = {el: u.top, who: w.el, name: w.name, sq: w.sq, faces: null, signature: null};
        u.kills = mk('b', 'fwr-kills', u.top);
        u.list = mk('div', 'fwr-list', inner);
        const h = mk('div', 'fwr-listhead', u.list);
        u.listtitle = mk('h3', 'fwr-listtitle', h); u.count = mk('span', 'fwr-count', h);
        u.body = mk('div', 'fwr-rows', u.list); u.wait = mk('p', 'fwr-wait fwr-off', u.list);
        return u;
      }
      make = {shell: shell, row: row, commander: commander, faces: faces,
        dot: function (parent) { const e = mk('i', 'fwr-dot', parent); e.setAttribute('role', 'img'); return e; },
        tag: function () { return mk('span', 'fwr-tag'); }};
    }

    /* 초상 묶음: 명단이 그대로면 손대지 않는다. 바뀌면 그 칸의 묶음만 새로 만들어 이름 줄 바로 뒤에 끼운다 */
    function portrait(u, s) {
      const signature = s ? JSON.stringify([s.side, s.units.map(function (x) { x = x || {}; return [x.id, x.cls, x.name, x.code]; })]) : null;
      if (u.signature === signature) return;
      if (u.faces) detach(u.faces);
      u.faces = s ? make.faces(s) : null;
      if (u.faces) u.el.insertBefore(u.faces, u.who.nextSibling || null);
      u.signature = signature;
    }
    function paintCell(u, s) {
      txt(u.name, nameOf(s)); txt(u.sq, squadOf(s)); portrait(u, s);
      flag(u.el, 'fwr-won', s.won); flag(u.el, 'fwr-lost', !s.won);
      txt(u.chain, s.streak > 1 ? tr(TEXT.chain, [N(s.streak)]) : ''); off(u.chain, !(s.streak > 1));
      txt(u.pct, tr(TEXT.percent, [N(Math.round(s.health * 100))]));
      const scale = 'scaleX(' + s.health + ')';
      if (u.fill.style.transform !== scale) u.fill.style.transform = scale;
    }
    function paintTeam(k, t) {
      const u = ui.teams[k];
      txt(ui.sides[k], tr(k ? TEXT.theirs : TEXT.ours));
      attr(u.el, 'aria-label', tr(k ? TEXT.theirs : TEXT.ours) + ' ' + tr(TEXT.remain, [N(t.remaining)]));
      while (u.commanders.length > t.commanders.length) detach(u.commanders.pop().el);
      t.commanders.forEach(function (c, i) {
        const r = u.commanders[i] || (u.commanders[i] = make.commander());
        if (r.el.parentNode !== u.el) u.el.appendChild(r.el);
        txt(r.name, nameOf(c)); txt(r.captain, c.captain ? tr(TEXT.captain) : ''); off(r.captain, !c.captain);
        while (r.points.length > c.dots.length) detach(r.points.pop());
        c.dots.forEach(function (p, j) {
          const dot = r.points[j] || (r.points[j] = make.dot(r.dots)), cls = 'fwr-dot fwr-' + p.status;
          if (dot.className !== cls) dot.className = cls;
          attr(dot, 'aria-label', squadOf(p) + ' ' + tr(TEXT[p.status]));
        });
      });
    }
    function paintRow(r, b) {
      txt(r.index, N(b.index + 1));
      ['win', 'lose', 'draw'].forEach(function (o) { flag(r.el, 'fwr-' + o, b.outcome === o); });
      paintCell(r.left, b.sides[0]); paintCell(r.right, b.sides[1]);
      txt(r.marktext, tr(b.winner !== 'draw' ? TEXT.won : b.both ? TEXT.both : TEXT.draw));
      ['left', 'right', 'draw'].forEach(function (w) { flag(r.mark, 'fwr-to-' + w, b.winner === w); });
      txt(r.rounds, b.rounds == null ? '' : tr(TEXT.rounds, [N(b.rounds)]));
      txt(r.limit, b.timeout ? tr(TEXT.limit) : ''); off(r.limit, !b.timeout);
    }
    function paint() {
      if (dead) return;
      const v = current = view(data, opts.viewSide, upto);
      txt(ui.kind, tr(TEXT.title)); txt(ui.title, tr(v.title.text, v.title.v && v.title.v.map(N)));
      ['win', 'lose', 'draw'].forEach(function (o) { flag(ui.title, 'fwr-' + o, v.result === o); });
      flag(ui.title, 'fwr-live', !v.result);
      /* 등급 변동은 결과가 드러난 뒤에만 */
      const rated = v.complete && opts.result ? opts.result : null, delta = rated && rated.delta != null ? Number(rated.delta) || 0 : null;
      txt(ui.delta, delta == null ? '' : tr(TEXT.delta, [(delta > 0 ? '+' : '') + N(delta)])); off(ui.delta, delta == null);
      flag(ui.delta, 'fwr-up', delta > 0); flag(ui.delta, 'fwr-down', delta < 0);
      txt(ui.rank, rated && rated.rating != null ? tr(TEXT.rating, [N(rated.rating)]) : ''); off(ui.rank, !(rated && rated.rating != null));
      off(ui.rating, !(rated && (delta != null || rated.rating != null)));
      /* 보상도 결과가 드러난 뒤에만 */
      const got = rated && rated.got && typeof rated.got === 'object' ? rated.got : null;
      const gotName = {cores: tr(TEXT.gotCores), alloy: tr(TEXT.gotAlloy), parts: tr(TEXT.gotParts), fuel: tr(TEXT.gotFuel), prism: tr(TEXT.gotPrism)};
      let anyGot = false;
      GOT.forEach(function (g) {
        const cell = ui.gots[g], n = got ? Number(got[g]) || 0 : 0;
        off(cell.el, !(n > 0));
        if (!(n > 0)) return;
        anyGot = true; txt(cell.name, gotName[g]); txt(cell.val, N(n)); attr(cell.el, 'aria-label', gotName[g] + ' ' + N(n));
      });
      txt(ui.gotk, anyGot ? tr(TEXT.got) : ''); off(ui.got, !anyGot);
      paintTeam(0, v.teams[0]); paintTeam(1, v.teams[1]);
      txt(ui.a, N(v.teams[0].remaining)); txt(ui.b, N(v.teams[1].remaining)); txt(ui.scorelb, tr(TEXT.remainLabel));
      attr(ui.score, 'aria-label', tr(TEXT.remain, [N(v.teams[0].remaining) + ' : ' + N(v.teams[1].remaining)]));
      /* 장면 꼬리표 */
      while (ui.chips.length > v.tags.length) detach(ui.chips.pop());
      v.tags.forEach(function (tag, i) {
        const chip = ui.chips[i] || (ui.chips[i] = make.tag());
        txt(chip, tr(tag.text, tag.v && tag.v.map(N)));
        flag(chip, 'fwr-left', tag.at === 'left'); flag(chip, 'fwr-right', tag.at === 'right');
        if (chip.parentNode !== ui.tags) ui.tags.appendChild(chip);
      });
      off(ui.tags, !v.tags.length);
      /* 최다 격파 */
      const s = v.topSquad;
      off(ui.top, !s);
      txt(ui.toptag, s ? tr(TEXT.top) : ''); txt(ui.topcell.name, s ? nameOf(s) : ''); txt(ui.topcell.sq, s ? squadOf(s) : '');
      portrait(ui.topcell, s); txt(ui.kills, s ? tr(TEXT.kills, [N(s.kills)]) : '');
      flag(ui.top, 'fwr-left', !!s && s.at === 'left'); flag(ui.top, 'fwr-right', !!s && s.at === 'right');
      /* 소대전 목록. 공개 수를 넘는 줄은 문서에서 뗀다. 처음 그린 뒤에 새로 붙는 줄만 한 번 떠오른다 */
      txt(ui.listtitle, tr(TEXT.bouts)); txt(ui.count, tr(TEXT.count, [N(v.upto), N(v.total)]));
      txt(ui.wait, v.complete ? '' : tr(TEXT.wait)); off(ui.wait, v.complete);
      ui.rows.forEach(function (r, i) { if (i >= v.upto) detach(r.el); });
      v.bouts.forEach(function (b, i) {
        const r = ui.rows[i] || (ui.rows[i] = make.row(i));
        paintRow(r, b);
        if (r.el.parentNode !== ui.body) { flag(r.el, 'fwr-new', painted); ui.body.appendChild(r.el); }
      });
      painted = true;
    }
    function click(event) {
      let n = event.target;
      while (n && n !== ui.el) {
        const value = n.getAttribute ? n.getAttribute('data-fwr-bout') : null;
        if (value != null) {
          const i = Number(value);
          if (!dead && current && i < current.upto && typeof opts.onBout === 'function') opts.onBout(i);
          return;
        }
        n = n.parentNode;
      }
    }
    function key(event) {
      if (dead || event.key !== 'Escape' || typeof opts.onClose !== 'function') return;
      if (event.preventDefault) event.preventDefault();
      opts.onClose();
    }
    /* 떠오르는 움직임이 끝나면 표시를 지운다(타이머 없이) */
    function settled(event) { const n = event.target; if (n && n.classList && n.classList.contains('fwr-new')) n.classList.remove('fwr-new'); }

    build();
    ui = make.shell();
    ui.el.addEventListener('click', click); ui.el.addEventListener('keydown', key); ui.el.addEventListener('animationend', settled);
    const api = {
      setUpto: function (n) { if (!dead) { upto = n; paint(); } return api; },
      setData: function (d) { if (!dead) { data = d; paint(); } return api; },
      state: function () { return dead ? null : view(data, opts.viewSide, upto); },
      destroy: function () {
        if (dead) return;
        dead = true;
        ui.el.removeEventListener('click', click); ui.el.removeEventListener('keydown', key); ui.el.removeEventListener('animationend', settled);
        detach(ui.el); instances.delete(el); data = null; current = null;
      }
    };
    instances.set(el, {api: api, options: function (next) { opts = next; upto = next.upto; }});
    paint();
    return api;
  }
  fwReport.view = view;
  fwReport.TEXT = TEXT;
  if (typeof module !== 'undefined' && module.exports) module.exports = fwReport;
  else root.fwReport = fwReport;
})(typeof globalThis !== 'undefined' ? globalThis : this);
