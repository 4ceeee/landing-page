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
  var STAGGER = 90, CAP = 6;
  document.querySelectorAll('main section:not(.hero)').forEach(function (sec) {
    var head = sec.querySelector('.section-head'); if (head) head.classList.add('draw');
    tag(sec.querySelector('.section-head .mono'), '', 0);
    tag(sec.querySelector('h2:not(.sr-only)'), 'blur', 120);
    sec.querySelectorAll(':scope > .wrap > .lede, :scope > .wrap > .source, :scope > .wrap > .chart-legend, .ba-hint, .callout, .mid-cta, .bigger, .clients').forEach(function (el) { tag(el, '', 220); });
  });
  ['.timeline', '.journey', '.path-chips', '.numbers', '.lessons', '.fixes', '.terms', '.fit', '.trust', '.faq', '.work', '.steps', '.ba', '.about'].forEach(function (sel) {
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
    if (heroTo) onReady(function () { setTimeout(function () { runCount(heroTo, 2200); }, 1500); });
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

  /* 6. Audience toggle: a thumb that slides between "I sell by DM" and "I have a store". */
  document.querySelectorAll('.path-toggle').forEach(function (t) {
    var thumb = document.createElement('span'); thumb.className = 'thumb'; thumb.setAttribute('aria-hidden', 'true');
    t.insertBefore(thumb, t.firstChild);
    function place(instant) {
      var on = t.querySelector('[aria-pressed="true"]'); if (!on) return;
      if (instant) thumb.style.transition = 'none';
      thumb.style.width = on.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + (on.offsetLeft - 3) + 'px)';
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
