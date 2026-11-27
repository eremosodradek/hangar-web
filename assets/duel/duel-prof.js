/* 숙련 강화 화면. 표시값과 동작은 게임에서 받고 DOM은 칸마다 한 번 만든다. */
(function () {
  'use strict';

  const tracks = [
    ['a', '액티브'],
    ['p', '패시브'],
    ['i', '본능']
  ];
  const resources = [['alloy', '합금'], ['parts', '부품'], ['cores', '코어']];
  const shortages = {xp: '숙련도가 모자랍니다.', res: '자원이 모자랍니다.', cores: '코어가 모자랍니다.'};
  const blocked = {
    sortie: '출격 중인 소녀는 재분배할 수 없습니다.',
    fw: '함대전 대진이 잡힌 소녀는 재분배할 수 없습니다.',
    duel: '정예 대전에 출전한 소녀는 재분배할 수 없습니다.',
    occ: '점령전에 출전한 소녀는 재분배할 수 없습니다.',
    raid: '약탈이나 요격에 출격한 소녀는 재분배할 수 없습니다.',
    boss: '거함 포격에 출전한 소녀는 재분배할 수 없습니다.',
    role: '연합장과 연합장이 맡긴 지휘관만 재분배할 수 있습니다.'   /* 연합 모함: 보기 세션과 권한 없는 연합원(서버 reset.blocked role) */
  };
  let guideSeen = false;

  window.duelProf = function ({t, num, resIcon, storageKey, hideTip, run, refresh}) {
    const cells = new WeakMap();
    let dialog = null, confirmation = null, busy = false;

    function make(tag, cls, parent, text) {
      const el = document.createElement(tag);
      if (cls) el.className = cls;
      if (text != null) el.textContent = text;
      if (parent) parent.append(el);
      return el;
    }

    function put(el, value) {
      const text = String(value ?? '');
      if (el.textContent !== text) el.textContent = text;
    }

    function flag(el, cls, on) {
      if (el.classList.contains(cls) !== !!on) el.classList.toggle(cls, !!on);
    }

    function bump(el) {
      el.classList.remove('dsk-pop');
      void el.offsetWidth;
      el.classList.add('dsk-pop');
    }

    function show(el, on) {
      const hidden = !on;
      if (el.hidden !== hidden) el.hidden = hidden;
    }

    function button(parent, cls, label, act) {
      const el = make('button', cls, parent, t(label));
      el.type = 'button';
      if (act) el.dataset.profAct = act;
      return el;
    }

    const number = n => n == null ? '—' : num(n);
    const ratio = (n, max) => t('{0} / {1}', [number(n), number(max)]);
    const canUp = view => !view.readOnly && !view.atCap && tracks.some(([key]) => view.tracks[key]?.up);
    const capReached = view => t('스킬 강화 한도({0}회)를 모두 썼습니다.', [view.cap]);
    const battleReason = why => t(Object.hasOwn(blocked, why) ? blocked[why] : '재분배할 수 없습니다.');

    function buildProgress(parent) {
      const el = make('span', 'dsk-pf', parent);
      const bar = make('span', 'dsk-bar', el);
      bar.title = t('숙련도');
      const fill = make('i', '', bar);
      return {el, fill, value: make('b', 'dsk-xp', el)};
    }

    function paintProgress(progress, view) {
      show(progress.el, view.progress);
      if (!view.progress) return;
      const fill = String(view.progress.fill);
      if (progress.fill.style.getPropertyValue('--dsk-f') !== fill)
        progress.fill.style.setProperty('--dsk-f', fill);
      put(progress.value, ratio(view.points, view.progress.need));
    }

    function paint(kind, root, gid, view, name, cardSkill, icon) {
      let cell = cells.get(root);
      if (!view) {
        if (cell?.el.parentNode) cell.el.remove();
        root.classList.remove('dpf-chip', 'dpf-ready');
        root.querySelector('.dsk-in')?.classList.remove('dsk-replace');
        if (cell) {
          cell.view = null;
          if (kind === 'chip') {
            if (!cardSkill.dot.parentNode) root.append(cardSkill.dot);
            if (cell.aria == null) root.removeAttribute('aria-label');
            else root.setAttribute('aria-label', cell.aria);
          }
        }
        if (dialog?.gid === gid) close();
        return;
      }

      if (!cell) {
        const el = kind === 'chip'
          ? make('b', 'dpf-count')
          : button(null, 'dsk-btn dpf-summary', '');
        cell = {el};
        cells.set(root, cell);
        if (kind === 'panel') {
          cell.total = make('b', 'dpf-total', el);
          cell.progress = buildProgress(el);
          cell.go = make('span', 'dpf-go', el);
          cell.stages = tracks.map(([key]) => make('span', 'dpf-card-stage', cardSkill.s[key].el));
          el.setAttribute('aria-haspopup', 'dialog');
          el.addEventListener('click', () => open(cell));
        }
      }

      const previous = cell.gid === gid ? cell.view : null;
      cell.gid = gid;
      cell.view = view;
      const total = ratio(view.used, view.cap), ready = canUp(view);
      if (kind === 'chip') {
        if (root.getAttribute('aria-label') !== cell.profAria) cell.aria = root.getAttribute('aria-label');
        cell.profAria = t('스킬 {0}', [total]) + (ready ? ' ' + t('강화 가능') : '');
        if (root.getAttribute('aria-label') !== cell.profAria) root.setAttribute('aria-label', cell.profAria);
        flag(root, 'dpf-chip', true);
        flag(root, 'dpf-ready', ready);
        if (cardSkill.dot.parentNode) cardSkill.dot.remove();
        if (!cell.el.parentNode) root.prepend(cell.el);
        put(cell.el, total);
        return;
      }
      const inner = root.querySelector('.dsk-in');
      cell.name = name;
      cell.skills = cardSkill.s;
      
      cell.icon = icon;
      
      if (!cell.el.parentNode) inner.prepend(cell.el);
      flag(inner, 'dsk-replace', true);
      const spoken = [];
      tracks.forEach(([key, label], i) => {
        const track = view.tracks[key];
        const stage = cell.stages[i], locked = cardSkill.s[key].el.classList.contains('dsk-lock');
        put(stage, track && !locked ? t('{0}단계', [number(track.level)]) : '');
        flag(stage, 'dpf-one', track?.level === 1);
        if (!track) return;
        spoken.push(t(label) + ' ' + number(track.used));
        if (!locked && previous?.tracks[key]?.level < track.level) bump(stage);
      });
      put(cell.total, t('스킬 {0}', [total]));
      paintProgress(cell.progress, view);
      put(cell.go, t('강화'));
      const aria = [...spoken, total, cell.go.textContent].join(' ');
      if (cell.el.getAttribute('aria-label') !== aria) cell.el.setAttribute('aria-label', aria);
      flag(cell.go, 'dpf-ready', ready);
      if (dialog?.gid === gid) {
        dialog.view = view;
        dialog.skills = cell.skills;
        
        dialog.icon = icon;
        
        put(dialog.name, name);
        paintDialog();
      }
    }

    function keeper(root, level, max) {
      const el = root.querySelector('.dsk-lvt');
      put(el, t('숙련 {0} / {1}', [number(level), number(max)]));
      if (el.getAttribute('aria-label') !== el.textContent) el.setAttribute('aria-label', el.textContent);
      flag(root, 'dpf-keeper', true);
    }

    function row(table, label, cls) {
      const name = make('span', '', table, t(label));
      const value = make('span', cls, table);
      return {name, value};
    }

    function putRow(row, value) {
      show(row.name, value != null);
      show(row.value, value != null);
      put(row.value, value);
    }

    function buildQuote(box) {
      const table = make('div', 'kv dpf-table', box);
      const current = row(table, '지금 효과', 'dpf-current');
      const next = row(table, '다음 단계');
      const need = row(table, '필요한 숙련도', 'dpf-num');
      const cost = row(table, '비용', 'dsk-cost');
      const items = resources.map(([key, label]) => {
        const el = make('span', 'dsk-ci', cost.value);
        el.setAttribute('aria-label', t(label));
        const icon = make('i', 'dsk-ic', el);
        icon.innerHTML = resIcon(key);
        return {el, n: make('b', '', el)};
      });
      const hours = make('span', 'dsk-hr', cost.value);
      return {current, next, need, cost, items, hours};
    }

    function paintQuote(quote, track) {
      show(quote.cost.name.parentNode, !!track && (track.current != null ||
        track.effect != null || track.points != null || track.cost != null));
      putRow(quote.current, track?.current);
      putRow(quote.next, track?.effect);
      putRow(quote.need, track?.points == null ? null : number(track.points));
      show(quote.cost.name, !!track?.cost);
      show(quote.cost.value, !!track?.cost);
      const hours = track?.cost?.hours;
      put(quote.hours, hours == null ? '' : t('광산 {0}시간어치', [hours]));
      show(quote.hours, hours != null);
      quote.items.forEach(({el, n}, i) => {
        const item = track?.cost?.[resources[i][0]];
        show(el, !!item);
        put(n, item ? number(item) : '');
      });
    }

    function overlay(label, layer) {
      const el = make('div', 'ov gd dpf-overlay ' + layer);
      const box = make('div', 'box dsk dpf-box', el);
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      const title = make('h3', '', box);
      title.id = 'dpf-' + layer;
      box.setAttribute('aria-labelledby', title.id);
      title.tabIndex = -1;
      put(title, t(label));
      return {el, box, title};
    }

    function watch(frame, click) {
      frame.listen = new AbortController();
      const options = {signal: frame.listen.signal};
      frame.el.addEventListener('click', click, options);
      frame.el.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          if (confirmation === frame) closeConfirm();
          else close();
        }
        if (event.key === 'Tab') {
          const buttons = [...frame.box.querySelectorAll('button:not(:disabled)')].filter(el => el.getClientRects().length);
          const edge = event.shiftKey ? buttons[0] : buttons.at(-1);
          if (!buttons.includes(document.activeElement) || document.activeElement === edge) {
            event.preventDefault();
            (event.shiftKey ? buttons.at(-1) : buttons[0])?.focus();
          }
        }
      }, options);
      document.body.append(frame.el);
      frame.title.focus({preventScroll: true});
    }

    function open(cell) {
      if (dialog || !cell.view) return;
      hideTip?.();
      const frame = overlay('스킬', 'window');
      frame.gid = cell.gid;
      frame.view = cell.view;
      frame.skills = cell.skills;
      
      frame.icon = cell.icon;
      
      frame.source = cell.el;
      const header = make('div', 'dpf-header', frame.box);
      frame.name = make('div', 'dpf-name', header, cell.name);
      header.append(frame.title);
      const points = make('div', 'dpf-points dpf-balance', header);
      frame.points = make('span', '', points);
      frame.progress = buildProgress(points);
      const body = make('div', 'dpf-scroll', frame.box);
      frame.guide = make('p', 'dpf-guide', body);
      if (!guideSeen) {
        try {
          guideSeen = !!localStorage.getItem(storageKey);
          localStorage.setItem(storageKey, '1');
        } catch {}
        frame.guideOn = !guideSeen;
        guideSeen = true;
      }
      frame.slots = tracks.map(([key]) => {
        const section = make('section', 'dpf-track', body);
        const head = make('div', 'dpf-track-head', section);
        const title = make('b', '', head);
        const skillName = make('span', 'dpf-skill-name', title);
        const lock = make('em', '', make('span', 'dsk-c', title));
        show(lock.parentNode, false);
        const level = make('small', 'dpf-level', head);
        const act = button(head, 'dsk-btn', '강화', key);
        const used = make('p', 'dpf-used', section);
        const quote = buildQuote(section);
        const milestones = make('div', 'dsk-ms', section);
        const why = make('p', 'dpf-why', section);
        return {section, title, skillName, lock, level, act, used, quote, milestones, chips: [], why, error: errorLine(section)};
      });
      const reset = make('div', 'dpf-track dpf-reset', body);
      frame.resetAct = button(reset, 'dsk-btn', '재분배', 'reset');
      frame.resetCost = make('span', '', reset);
      frame.resetWhy = make('p', 'dpf-why', reset);
      frame.resetError = errorLine(reset);
      button(make('div', 'btns', body), 'act ghost', '닫기', 'close');
      dialog = frame;
      paintDialog();
      watch(frame, event => {
        const source = event.target.closest('[data-prof-act]');
        const act = source?.dataset.profAct;
        if (event.target === frame.el || act === 'close') close();
        else if (act && !source.disabled && !busy && !confirmation) {
          if (act === 'reset') openConfirm(source);
          else submit(act);
        }
      });
      refreshDialog(frame.gid);
    }

    function refreshDialog(gid) {
      const frame = dialog;
      if (frame?.gid === gid) return refresh?.(gid, () => dialog === frame && frame.el.isConnected);
    }

    function errorLine(parent) {
      const el = make('p', 'dpf-why dpf-bad', parent);
      el.setAttribute('role', 'alert');
      show(el, false);
      return el;
    }

    function resetCost(reset) {
      if (reset?.cost == null) return '';
      return reset.when
        ? t('코어 {0}, {1}부터 {2}', [number(reset.cost), reset.when, number(reset.later)])
        : t('코어 {0}', [number(reset.cost)]);
    }

    function paintDialog() {
      const frame = dialog, view = frame.view, reset = view.reset;
      put(frame.title, t('스킬 {0}', [ratio(view.used, view.cap)]));
      put(frame.points, view.progress ? t('숙련도') : t('숙련도 {0}', [number(view.points)]));
      paintProgress(frame.progress, view);
      show(frame.guide, frame.guideOn);
      if (frame.guideOn) put(frame.guide, t('세 스킬을 합쳐 {0}번, 한 스킬은 {1}번까지 강화합니다.', [view.cap, view.each]));
      let roleSaid = false;   /* 권한 안내는 같은 문장이라 첫 칸에 한 번만 보인다 */
      frame.slots.forEach((slot, i) => {
        const [key, name] = tracks[i], track = view.tracks[key];
        show(slot.section, !!track);
        if (!track) return;
        const roleNote = track.reason === 'role' && !roleSaid;
        if (roleNote) roleSaid = true;
        const locked = track.lock != null;
        put(slot.skillName, frame.skills[key].name.dskT);
        put(slot.lock, track.lock);
        show(slot.lock.parentNode, locked);
        flag(slot.title, 'dsk-lock', locked);
        
        frame.icon?.(slot.title, key);
        
        put(slot.level, t('{0}단계', [number(track.level)]));
        put(slot.used, t(name) + ' ' + ratio(track.used, view.each));
        paintQuote(slot.quote, track);
        const reason = locked && !view.readOnly ? '' : track.reason === 'max' ? t('최대 단계')
          : track.reason === 'cap' ? capReached(view)
          : shortages[track.reason] ? t(shortages[track.reason])
          : track.reason === 'role' ? (roleNote ? t('연합장과 연합장이 맡긴 지휘관만 강화할 수 있습니다.') : '')   /* 연합 모함: 권한 없는 연합원(서버 why role) */
          : !track.up && !view.readOnly ? t('강화할 수 없습니다.') : '';
        put(slot.why, reason);
        show(slot.why, !!reason);
        flag(slot.why, 'dpf-bad', !!shortages[track.reason]);
        if (locked) {
          put(slot.error, '');
          show(slot.error, false);
        }
        paintAction(slot.act, !view.readOnly && track.up, '강화', key);
        paintMilestones(slot, track.milestones);
      });
      put(frame.resetCost, resetCost(reset));
      const why = reset?.blocked ? battleReason(reset.blocked) : '';
      put(frame.resetWhy, why);
      show(frame.resetWhy, !!why);
      flag(frame.resetWhy, 'dpf-bad', !!why && reset.blocked !== 'role');   /* 권한 안내는 오류 색이 아니다 */
      paintAction(frame.resetAct, !view.readOnly && reset?.allowed, '재분배', 'reset');
      if (confirmation) paintConfirm();
    }

    function paintAction(el, allowed, label, act) {
      const waiting = dialog.waiting === act;
      const disabled = busy || !allowed;
      if (el.disabled !== disabled) el.disabled = disabled;
      put(el, t(waiting ? '처리 중…' : label));
      flag(el, 'dsk-go', act !== 'reset' && allowed && !busy);
      flag(el, 'dsk-wait', act !== 'reset' && waiting);
    }

    function paintMilestones(slot, milestones) {
      show(slot.milestones, milestones.length);
      milestones.forEach((milestone, i) => {
        if (!slot.chips[i]) {
          const el = make('span', 'dsk-m', slot.milestones);
          slot.chips[i] = {el, number: make('b', '', el), name: make('span', '', el)};
        }
        const chip = slot.chips[i];
        show(chip.el, true);
        put(chip.number, number(milestone.level));
        put(chip.name, milestone.name ? t(milestone.name) : '');
        const tip = milestone.tip ? t(milestone.tip, milestone.vars) : '';
        if (chip.el.dataset.tip !== tip) chip.el.dataset.tip = tip;
        flag(chip.el, 'dsk-on', milestone.reached);
      });
      for (const chip of slot.chips.slice(milestones.length)) show(chip.el, false);
    }

    function openConfirm(source) {
      const frame = overlay('재분배', 'confirm');
      frame.source = source;
      frame.cost = row(make('div', 'kv dpf-table', frame.box), '비용');
      frame.refund = make('p', 'dpf-points', frame.box);
      make('p', 'dpf-why', frame.box, t('자원과 코어는 돌려받지 않습니다.'));
      const actions = make('div', 'btns', frame.box);
      button(actions, 'act ghost', '취소', 'cancel');
      frame.ok = button(actions, 'act dpf-ok', '확인', 'ok');
      dialog.el.inert = true;
      confirmation = frame;
      paintConfirm();
      watch(frame, event => {
        const action = event.target.closest('[data-prof-act]')?.dataset.profAct;
        if (event.target === frame.el || action === 'cancel') closeConfirm();
        else if (action === 'ok' && !frame.ok.disabled) submit('reset');
      });
    }

    function paintConfirm() {
      const frame = confirmation, view = dialog.view, reset = view.reset;
      putRow(frame.cost, resetCost(reset));
      put(frame.refund, reset?.refund == null ? '' : t('돌려받는 숙련도 {0}점', [number(reset.refund)]));
      frame.ok.disabled = !!(view.readOnly || !reset?.allowed || reset.refund == null);
    }

    function closeConfirm(restore = true) {
      if (!confirmation) return;
      const frame = confirmation;
      confirmation = null;
      frame.listen.abort();
      frame.el.remove();
      dialog.el.inert = false;
      if (restore) frame.source.focus({preventScroll: true});
    }

    function close() {
      if (!dialog) return;
      closeConfirm(false);
      const frame = dialog;
      dialog = null;
      frame.listen.abort();
      frame.el.remove();
      if (!frame.source.isConnected) return;
      frame.source.focus({preventScroll: true});
    }

    async function submit(act) {
      if (busy) return;
      const frame = dialog;
      const slot = frame.slots.find(slot => slot.act.dataset.profAct === act);
      closeConfirm();
      busy = true;
      frame.waiting = act;
      if (frame.error) {
        put(frame.error, '');
        show(frame.error, false);
      }
      frame.error = slot?.error || frame.resetError;
      paintDialog();
      frame.title.focus({preventScroll: true});
      let result;
      try {
        result = await run(frame.gid, act);
      } catch {
        result = {error: 'failed'};
      }
      const error = result?.error;
      const reason = !error || error === 'locked' ? ''
        : error === 'cap' ? capReached(frame.view)
        : error === 'battle' ? battleReason(result.why)
        : t(shortages[error] || (error === 'max' ? '최대 단계' : '숙련을 변경하지 못했습니다. 잠시 뒤 다시 시도하세요.'));
      put(frame.error, reason);
      show(frame.error, !!reason);
      if (dialog === frame && error === 'locked') await refreshDialog(frame.gid);
      busy = false;
      frame.waiting = null;
      if (dialog) paintDialog();
      if (dialog === frame && !error && slot) bump(slot.level);
      if (dialog === frame && error === 'level') await refreshDialog(frame.gid);
    }

    return {paint, keeper, close, refresh: refreshDialog};
  };
})();
