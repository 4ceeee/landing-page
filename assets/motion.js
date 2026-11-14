/* Alas Digitals · motion (v4, Nov 2026)
   Patient reveals for reading; instant response for anything the visitor presses.
   - Content arrives slowly (1.0–1.4s, long ease-out, 90ms stagger) and only once.
   - Controls (buttons, toggle, FAQ) stay fast: 160–450ms.
   - prefers-reduced-motion: everything is shown at once, no movement, no count-up. */
(function () {
  var root = document.documentElement;
  window.__alasMotion = true;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 0. Loading screen hand-over: wait for the page and fonts, and never cut the lockup short
        (3.3 s from first paint, as in Alas OS). Tap or any key skips it. */
  function isReady() { return root.hasAttribute('data-ready'); }
  function setReady() { if (!isReady()) root.setAttribute('data-ready', ''); }
  function onReady(cb) {
    if (isReady()) { cb(); return; }
    var mo = new MutationObserver(function () { if (isReady()) { mo.disconnect(); cb(); } });
    mo.observe(root, { attributes: true, attributeFilter: ['data-ready'] });
  }
  if (!isReady()) {
    var MIN_MS = 3300;
    var hide = function () {
      var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      fonts.catch(function () {}).then(function () {
        var fp = performance.getEntriesByName('first-paint')[0];
        var painted = fp ? fp.startTime : 0;
        setTimeout(setReady, Math.max(0, painted + MIN_MS - performance.now()));
      });
    };
    if (document.readyState === 'complete') hide(); else addEventListener('load', hide, { once: true });
    var splash = document.querySelector('.splash');
    if (splash) splash.addEventListener('click', setReady);
    addEventListener('keydown', function skip() { setReady(); removeEventListener('keydown', skip); });
  }

  /* 1. Tag what should reveal on scroll. Markup stays clean; this file decides. */
  function tag(el, kind, delay) {
    if (!el || el.hasAttribute('data-r')) return;
    el.setAttribute('data-r', kind || '');
    if (delay) el.style.setProperty('--d', delay + 'ms');
  }
  var STAGGER = 60, CAP = 6;
  document.querySelectorAll('main section:not(.hero)').forEach(function (sec) {
    var head = sec.querySelector('.section-head'); if (head) head.classList.add('draw');
    tag(sec.querySelector('.section-head .mono'), '', 0);
    tag(sec.querySelector('h2:not(.sr-only)'), 'blur', 120);
    sec.querySelectorAll(':scope > .wrap > .lede, :scope > .wrap > .source, :scope > .wrap > .chart-legend, .callout, .mid-cta, .bigger, .clients, .hx').forEach(function (el) { tag(el, '', 220); });
  });
  ['.timeline', '.path-chips', '.numbers', '.lessons', '.terms', '.fit', '.trust', '.faq', '.work', '.steps', '.about'].forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        if (child.tagName === 'SPAN' && !child.className) return;
        tag(child, '', Math.min(i, CAP) * STAGGER + 120);
      });
    });
  });
  document.querySelectorAll('.ba-grid figure, .shot').forEach(function (el, i) { tag(el, 'clip', (i % 2) * 160); });
  document.querySelectorAll('.contact h2, .contact .offer, .contact .form-col').forEach(function (el, i) { tag(el, i ? '' : 'blur', i * 140); });

  /* 2. Count-ups: parse "$1.99M", "6,312", "11.6%", "15×" into prefix / number / suffix. */
  function prepCount(el) {
    var txt = el.textContent.trim(), m = txt.match(/^([^0-9]*)([0-9][0-9,]*\.?[0-9]*)(.*)$/);
    if (!m) return;
    el.setAttribute('aria-label', txt);
    el.dataset.count = txt;
    el.dataset.pre = m[1]; el.dataset.suf = m[3];
    el.dataset.num = m[2].replace(/,/g, '');
    el.dataset.dec = (m[2].split('.')[1] || '').length;
    el.dataset.comma = m[2].indexOf(',') > -1 ? '1' : '';
  }
  function runCount(el, dur) {
    if (!el.dataset.num || el.dataset.done) return;
    el.dataset.done = '1';
    var end = parseFloat(el.dataset.num), from = parseFloat(el.dataset.from || 0), dec = +el.dataset.dec, t0 = null;
    function fmt(v) {
      var s = v.toFixed(dec);
      if (el.dataset.comma) s = Number(s).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      return el.dataset.pre + s + el.dataset.suf;
    }
    function ease(t) { return 1 - Math.pow(1 - t, 4); } /* ease-out quart: quick start, long settle */
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      el.textContent = fmt(from + (end - from) * ease(p));
      if (p < 1) requestAnimationFrame(frame); else el.textContent = el.dataset.count;
    }
    el.textContent = fmt(from);
    requestAnimationFrame(frame);
  }
  document.querySelectorAll('.numbers .v, .hero-stat .to').forEach(prepCount);
  var heroTo = document.querySelector('.hero-stat .to'); if (heroTo) heroTo.dataset.from = '22';

  /* 3. Chart bars: index for the stagger. */
  document.querySelectorAll('.chart .bar').forEach(function (b, i) { b.style.setProperty('--i', i); });

  /* 4. Reveal on scroll, once. Attributes are removed afterwards so hover transitions go back to normal. */
  function reveal(el) {
    if (el.classList.contains('in')) return;
    el.classList.add('in', 'lit');
    if (el.matches('.chart')) return;
    if (el.hasAttribute('data-r')) {
      var d = parseFloat(el.style.getPropertyValue('--d')) || 0;
      setTimeout(function () { el.removeAttribute('data-r'); el.classList.remove('in'); el.style.removeProperty('--d'); }, d + 1600);
    }
    /* clipped items can't be observed directly (a fully clipped box never intersects), so they ride on their parent */
    el.querySelectorAll('[data-r="clip"]').forEach(function (c) { setTimeout(function () { reveal(c); }, 60); });
    el.querySelectorAll('[data-num]').forEach(function (n) { setTimeout(function () { runCount(n, 1800); }, 250); });
  }
  var targets = document.querySelectorAll('[data-r]:not([data-r="clip"]), .section-head.draw, .chart, .hero-stat');
  if (reduce) document.querySelectorAll('[data-r="clip"]').forEach(function (el) { el.removeAttribute('data-r'); });
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('in'); el.removeAttribute('data-r'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
    /* the hero number counts once the headline has landed (after the loading screen hands over) */
    /* the headline number counts when its section scrolls into view (see reveal) */
  }

  /* 5. Header: hairline appears once the page has moved. */
  var header = document.querySelector('header.top');
  function onScroll() { if (header) header.classList.toggle('scrolled', scrollY > 8); }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* 5b. Back to top: shows after 1.5 screens, hides again near the top; returns focus to the start of the page. */
  var toTop = document.querySelector('.to-top');
  if (toTop) {
    var topShown = false;
    var checkTop = function () {
      var on = scrollY > innerHeight * 1.5;
      if (on !== topShown) { topShown = on; toTop.classList.toggle('show', on); }
    };
    addEventListener('scroll', checkTop, { passive: true }); checkTop();
    toTop.addEventListener('click', function (e) {
      e.preventDefault();
      scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var brand = document.querySelector('.brand'); if (brand) brand.focus({ preventScroll: true });
    });
  }

  /* 5c. Section rail: one mark per section, the current one stretched in champagne. Click to jump. */
  var secs = Array.prototype.slice.call(document.querySelectorAll('main > section')).filter(function (x) { return x.offsetParent !== null || x.getClientRects().length; });
  if (secs.length > 2 && 'IntersectionObserver' in window) {
    var rail = document.createElement('nav'); rail.className = 'rail'; rail.setAttribute('aria-label', 'Sections');
    var btns = secs.map(function (sec, i) {
      var lab = sec.dataset.rail ? sec.dataset.rail : sec.classList.contains('hero') ? 'Intro' : sec.classList.contains('contact') ? 'Contact' : ((sec.querySelector('.section-head .mono') || {}).textContent || 'Section ' + (i + 1));
      var b = document.createElement('button'); b.type = 'button';
      b.innerHTML = '<span></span><i aria-hidden="true"></i>'; b.firstChild.textContent = lab.trim();
      b.setAttribute('aria-label', 'Go to ' + lab.trim());
      b.addEventListener('click', function () { sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); });
      rail.appendChild(b); return b;
    });
    document.body.appendChild(rail);
    var railIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = secs.indexOf(e.target);
        btns.forEach(function (b, j) { b.setAttribute('aria-current', j === i ? 'true' : 'false'); });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    secs.forEach(function (x) { railIO.observe(x); });
  }

  /* 5c2. Gold words: a copy of the word for the white glow behind it (see .gold::before) */
  document.querySelectorAll('.gold').forEach(function (g) { g.setAttribute('data-text', g.textContent); });

  /* 5d. Scroll gate (main page only). The first screen holds still until the visitor answers
        "Which sounds like you?". Picking either option unlocks the page and glides to part 2.
        Skipped when: the page is locked to one audience (/store, /dm), the visitor already chose
        on an earlier visit, the link has a #section or ?query, or JS is off.
        Any in-page link (top menu, section rail) also unlocks, so nothing is ever trapped. */
  var chooser = document.querySelector('.chooser');
  var part2 = document.querySelector('.hero-2');
  var savedPath = null; try { savedPath = localStorage.getItem('alas-path'); } catch (e) {}
  var gated = !!(chooser && part2 && !document.body.hasAttribute('data-locked') && !savedPath && !location.hash && !location.search);
  if (gated) {
    root.classList.add('gated');
    var nudge = function () {
      chooser.classList.remove('nudge'); void chooser.offsetWidth; chooser.classList.add('nudge');
    };
    var onWheel = function (e) { if (root.classList.contains('gated')) { e.preventDefault(); nudge(); } };
    var onTouch = function (e) { if (root.classList.contains('gated') && !e.target.closest('.chooser')) { e.preventDefault(); nudge(); } };
    var onKey = function (e) {
      if (!root.classList.contains('gated')) return;
      if ([' ', 'PageDown', 'ArrowDown', 'End', 'Spacebar'].indexOf(e.key) > -1 && !e.target.closest('button, input, textarea, select')) { e.preventDefault(); nudge(); }
    };
    addEventListener('wheel', onWheel, { passive: false });
    addEventListener('touchmove', onTouch, { passive: false });
    addEventListener('keydown', onKey);
    var unlock = function () {
      if (!root.classList.contains('gated')) return;
      root.classList.remove('gated');
      removeEventListener('wheel', onWheel); removeEventListener('touchmove', onTouch); removeEventListener('keydown', onKey);
    };
    chooser.querySelectorAll('[data-set-path]').forEach(function (b) { b.addEventListener('click', unlock); });
    document.addEventListener('click', function (e) {
      if (e.target.closest('a[href^="#"], .rail button, [data-need]')) unlock();
    }, true);
    addEventListener('hashchange', unlock);
  }
  /* Every pick on the first screen (not just the first one) glides down to part 2,
     after the audience switch has started. */
  if (chooser && part2 && !document.body.hasAttribute('data-locked')) {
    chooser.querySelectorAll('[data-set-path]').forEach(function (b) {
      b.addEventListener('click', function () {
        setTimeout(function () { part2.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }, reduce ? 0 : 180);
      });
    });
  }

  /* 5e. Recommendations: same-height cards. Any text longer than seven lines gets a fade and "Read more". */
  var recs = Array.prototype.slice.call(document.querySelectorAll('.rec'));
  function measureRecs() {
    recs.forEach(function (rec) {
      var text = rec.querySelector('.rec-text'), btn = rec.querySelector('.rec-toggle');
      if (!text || !btn) return;
      text.style.setProperty('--full', text.scrollHeight + 'px');
      if (rec.classList.contains('open')) return;
      var over = text.scrollHeight > text.clientHeight + 4;
      rec.classList.toggle('clamped', over); btn.hidden = !over;
    });
  }
  recs.forEach(function (rec) {
    var btn = rec.querySelector('.rec-toggle'); if (!btn) return;
    btn.addEventListener('click', function () {
      var open = !rec.classList.contains('open');
      rec.querySelector('.rec-text').style.setProperty('--full', rec.querySelector('.rec-text').scrollHeight + 'px');
      rec.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Show less' : 'Read more';
    });
  });
  if (recs.length) {
    measureRecs();
    addEventListener('resize', measureRecs);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureRecs);
  }

  /* 5f. Sideways rows: arrows scroll by one item; they dim at the ends and hide when everything fits. */
  document.querySelectorAll('.hx').forEach(function (hx) {
    var track = hx.querySelector('.hx-track'), btns = hx.querySelectorAll('.hx-btn');
    if (!track) return;
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      hx.classList.toggle('no-overflow', max <= 2);
      hx.classList.toggle('at-end', track.scrollLeft >= max - 2);
      btns.forEach(function (b) {
        b.disabled = b.dataset.dir === '-1' ? track.scrollLeft <= 2 : track.scrollLeft >= max - 2;
      });
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var item = track.firstElementChild, step = item ? item.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 16) : track.clientWidth;
        track.scrollBy({ left: step * Number(b.dataset.dir), behavior: reduce ? 'auto' : 'smooth' });
      });
    });
    track.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);

    /* Mouse wheel: an up/down scroll over the row moves it sideways until it reaches an end,
       then the page takes over again. Trackpads already scroll sideways natively. Inside the
       homepage windows the wheel keeps scrolling the window. */
    track.addEventListener('wheel', function (e) {
      if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      if (e.target.closest('.b-view')) return;
      var max = track.scrollWidth - track.clientWidth;
      if (max <= 2) return;
      var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if ((dy > 0 && track.scrollLeft >= max - 2) || (dy < 0 && track.scrollLeft <= 2)) return;
      e.preventDefault();
      track.scrollBy({ left: dy, behavior: reduce || Math.abs(dy) < 40 ? 'auto' : 'smooth' });
    }, { passive: false });

    /* Mouse drag: grab the row and throw it. Touch already swipes natively. On release it settles
       on the nearest card, carrying a little of the throw. A drag never counts as a click. */
    var drag = null, moved = false;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if (track.scrollWidth - track.clientWidth <= 2) return;
      if (e.target.closest('input, textarea, select, .b-view')) return;
      drag = { x: e.clientX, left: track.scrollLeft, t: e.timeStamp, v: 0, lastX: e.clientX, lastT: e.timeStamp, id: e.pointerId };
      moved = false;
    });
    track.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!moved) {
        if (Math.abs(dx) < 6) return;
        moved = true;
        track.setPointerCapture(e.pointerId);
        hx.classList.add('dragging');
      }
      var dt = Math.max(1, e.timeStamp - drag.lastT);
      drag.v = (e.clientX - drag.lastX) / dt; /* px per ms */
      drag.lastX = e.clientX; drag.lastT = e.timeStamp;
      track.scrollLeft = drag.left - dx;
    });
    function release(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var wasMoved = moved, v = drag.v; drag = null;
      if (!wasMoved) return;
      /* settle on the nearest card, nudged by the throw */
      var target = track.scrollLeft - v * 220, best = 0, bestD = Infinity, origin = track.firstElementChild ? track.firstElementChild.offsetLeft : 0;
      Array.prototype.forEach.call(track.children, function (c) {
        var d = Math.abs(c.offsetLeft - origin - target); if (d < bestD) { bestD = d; best = c.offsetLeft - origin; }
      });
      best = Math.min(best, track.scrollWidth - track.clientWidth);
      track.scrollTo({ left: best, behavior: reduce ? 'auto' : 'smooth' });
      setTimeout(function () { hx.classList.remove('dragging'); }, reduce ? 0 : 450);
    }
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    track.addEventListener('dragstart', function (e) { e.preventDefault(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
    setTimeout(update, 400); update();
  });

  /* 5g. June 2024 → now, one scroll per step (laptops). A wheel gesture or arrow/page key moves exactly one
        step, bringing its bullet a quarter of the way down the screen. Trackpad momentum is absorbed until the
        gesture ends, so a long swipe still moves one step. Touch keeps the native snapping. */
  (function () {
    var sec = document.querySelector('.journey-sec'); if (!sec || reduce) return;
    var steps = Array.prototype.slice.call(sec.querySelectorAll('.journey .step'));
    var mq = matchMedia('(min-width:1000px) and (min-height:640px)');
    if (!steps.length) return;
    function targets() {
      return steps.map(function (st) {
        var h = st.querySelector('h3').getBoundingClientRect();
        return Math.round(h.top + scrollY + h.height / 2 - innerHeight * 0.25);
      });
    }
    function sectionTop(el) { return el ? Math.round(el.getBoundingClientRect().top + scrollY) : null; }
    function nextSection(el, dir) {
      var n = el; do { n = dir > 0 ? n.nextElementSibling : n.previousElementSibling; } while (n && (n.tagName !== 'SECTION' || n.hidden));
      return n;
    }
    var busyUntil = 0, lastEvt = 0, gesture = false;
    function go(dir) {
      var t = targets(), y = scrollY, i = -1, k;
      for (k = 0; k < t.length; k++) if (Math.abs(t[k] - y) < 48) { i = k; break; }
      if (i < 0 && dir < 0 && Math.abs(sectionTop(nextSection(sec, 1)) - y) < 48) { scrollTo({ top: t[t.length - 1], behavior: 'smooth' }); busyUntil = performance.now() + 650; return true; }
      if (i < 0) return false; /* not resting on a step: let the page scroll normally */
      var to;
      if (dir > 0) to = i < t.length - 1 ? t[i + 1] : sectionTop(nextSection(sec, 1));
      else to = i > 0 ? t[i - 1] : sectionTop(nextSection(sec, -1));
      if (to == null) return false;
      scrollTo({ top: to, behavior: 'smooth' });
      busyUntil = performance.now() + 650;
      return true;
    }
    addEventListener('wheel', function (e) {
      if (!mq.matches || e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      var now = performance.now(), quiet = now - lastEvt > 160;
      lastEvt = now;
      if (gesture || now < busyUntil) {
        /* swallow the rest of this gesture (and momentum) while a step move is underway */
        if (!quiet || now < busyUntil) { e.preventDefault(); return; }
        gesture = false;
      }
      if (Math.abs(e.deltaY) < 2) return;
      if (go(e.deltaY > 0 ? 1 : -1)) { e.preventDefault(); gesture = true; }
    }, { passive: false });
    addEventListener('keydown', function (e) {
      if (!mq.matches || e.target.closest('input, textarea, select, [contenteditable]')) return;
      var dir = ({ ArrowDown: 1, PageDown: 1, ' ': e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1 })[e.key];
      if (!dir || performance.now() < busyUntil) return;
      if (go(dir)) e.preventDefault();
    });
  })();

  /* 6. Audience toggle: a thumb that slides between "I sell by DM" and "I have a store". */
  document.querySelectorAll('.path-toggle').forEach(function (t) {
    var thumb = document.createElement('span'); thumb.className = 'thumb'; thumb.setAttribute('aria-hidden', 'true');
    t.insertBefore(thumb, t.firstChild);
    function place(instant) {
      var on = t.querySelector('[aria-pressed="true"]'); if (!on) return;
      if (instant) thumb.style.transition = 'none';
      thumb.style.width = on.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + (on.offsetLeft - (parseFloat(getComputedStyle(t).paddingLeft) || 3)) + 'px)';
      if (instant) { thumb.offsetWidth; thumb.style.transition = ''; }
    }
    place(true);
    new MutationObserver(function () { place(false); }).observe(t, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });
    addEventListener('resize', function () { place(true); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(true); });
  });

  /* 7. Switching audience cross-fades the page instead of snapping (View Transitions where supported). */
  window.alasSwap = function (fn) {
    if (reduce || !document.startViewTransition) { fn(); return; }
    document.startViewTransition(fn);
  };
})();
