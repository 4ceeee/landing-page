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
  /* 0a. v4.23: on laptops the loading screen shows the 3D lineup small in the middle; at the hand-over the same
         element grows into its place in the hero, so nothing swaps. Phones and reduced motion keep the plain splash. */
  var lu = document.getElementById('lineup');
  var luOn = !!lu && !isReady() && !reduce && matchMedia('(min-width:900px) and (min-height:640px) and (hover:hover) and (pointer:fine)').matches;
  var luSettled = function () { return lu.classList.contains('ok') || lu.classList.contains('fail'); };
  /* Hand over once the models are drawn, but never wait more than 1 s for them. */
  function whenLineup(cb) {
    if (!luOn || luSettled()) { cb(); return; }
    var done = false;
    var go = function () { if (!done) { done = true; mo.disconnect(); cb(); } };
    var mo = new MutationObserver(function () { if (luSettled()) go(); });
    mo.observe(lu, { attributes: true, attributeFilter: ['class'] });
    setTimeout(go, 1000);
  }
  if (luOn) {
    root.setAttribute('data-lu', 'splash');
    var place = function () {
      if (root.getAttribute('data-lu') !== 'splash') return;
      lu.style.transform = 'none';
      var r = lu.getBoundingClientRect();
      if (!r.width) return;
      var s = Math.min(560, innerWidth * 0.42) / r.width;
      var dx = innerWidth / 2 - (r.left + r.width / 2);
      var dy = innerHeight / 2 - 64 - (r.top + r.height / 2);
      lu.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
    };
    place();
    addEventListener('resize', place);
    addEventListener('load', place, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place, function () {});
    onReady(function () {
      removeEventListener('resize', place);
      root.setAttribute('data-lu', 'grow');
      lu.getBoundingClientRect(); // commit the start so the transition runs
      lu.style.transform = '';
      setTimeout(function () { root.setAttribute('data-lu', 'done'); }, 1300); // the grow takes 1200 ms
    });
  }

  if (!isReady()) {
    var MIN_MS = 3300;
    var hide = function () {
      var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      fonts.catch(function () {}).then(function () {
        var fp = performance.getEntriesByName('first-paint')[0];
        var painted = fp ? fp.startTime : 0;
        setTimeout(function () { whenLineup(setReady); }, Math.max(0, painted + MIN_MS - performance.now()));
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
  /* v4.25 case-study number: only $22K shows and holds half a second, counts up to $121K in place, then $121K
     slides right with the arrow while $22K stays behind. Ends exactly as the static markup. */
  /* later: set the opening state now and return a function that starts the count (used by the spotlight) */
  var HERO_MORPH = 450, HERO_COUNT = 1600, HERO_SETTLE = 250;
  var HERO_SLIDE = 500 + HERO_MORPH + HERO_COUNT + HERO_SETTLE + HERO_MORPH + 250; // hold, unfold, count, settle, fold to "K", pause; then the 900ms slide
  function heroCount(to, later, centre) {
    if (to.dataset.done) return function () {};
    var big = to.parentNode, arrow = big.querySelector('.arrow'), first = big.firstChild;
    if (!arrow || !first || first.nodeType !== 3) {
      if (later) return function () { runCount(to, 1800); };
      runCount(to, 1800); return;
    }
    var from = document.createElement('span');
    from.className = 'from';
    from.textContent = first.textContent;
    big.replaceChild(from, first);
    /* layout px (offsetLeft), so a scaled parent doesn't throw the shift off. Centred (spotlight): the number counts in
       the middle of the line inside a slot as wide as "$121K", so it stays centred as it grows. */
    var w = to.offsetWidth;
    var shift = centre ? big.offsetLeft + big.offsetWidth / 2 - (to.offsetLeft + w / 2) : from.offsetLeft - to.offsetLeft;
    if (centre) { to.style.minWidth = w + 'px'; to.style.textAlign = 'center'; }
    to.textContent = to.dataset.pre + to.dataset.from + to.dataset.suf;
    to.style.transform = 'translateX(' + shift + 'px)';
    arrow.style.transform = 'translateX(-0.6em)';
    from.style.opacity = arrow.style.opacity = '0';
    /* The count runs in full dollars. "$22K" unfolds into "$22,000" (the K rolls up and out as ",000" rolls in and the
       number widens smoothly), counts with an ease-in-out to "$121,000", then folds back to "$121K" the same way. */
    function morphTail(head, a, b, done) {
      var e = 'cubic-bezier(.77,0,.175,1)', tail = document.createElement('span'), ta = document.createElement('span'), tb = document.createElement('span');
      to.textContent = head;
      tail.style.cssText = 'display:inline-block;position:relative;white-space:pre;clip-path:inset(-4% 0 -14% 0)';
      ta.textContent = a; tb.textContent = b;
      tb.style.cssText = 'position:absolute;left:0;top:0;opacity:0;transform:translateY(.45em)';
      tail.appendChild(ta); tail.appendChild(tb); to.appendChild(tail);
      tail.style.width = ta.offsetWidth + 'px';
      void tail.offsetWidth;
      tail.style.transition = 'width ' + HERO_MORPH + 'ms ' + e;
      ta.style.transition = tb.style.transition = 'opacity ' + (HERO_MORPH * 0.7) + 'ms ease-out,transform ' + HERO_MORPH + 'ms ' + e;
      tail.style.width = tb.offsetWidth + 'px';
      ta.style.opacity = '0'; ta.style.transform = 'translateY(-.45em)';
      tb.style.opacity = '1'; tb.style.transform = 'none';
      setTimeout(function () { to.textContent = head + b; if (done) done(); }, HERO_MORPH + 20);
    }
    function count() {
      to.dataset.done = '1';
      var a = 1000 * parseFloat(to.dataset.from), z = 1000 * parseFloat(to.dataset.num), pre = to.dataset.pre;
      var fmt = function (v) { return pre + Math.round(v).toLocaleString('en-US'); };
      var inOut = function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
      morphTail(pre + to.dataset.from, 'K', ',000', function () {
        var t0 = null;
        requestAnimationFrame(function frame(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min(1, (ts - t0) / HERO_COUNT);
          to.textContent = fmt(a + (z - a) * inOut(p));
          if (p < 1) requestAnimationFrame(frame);
          else setTimeout(function () { morphTail(pre + to.dataset.num, ',000', 'K'); }, HERO_SETTLE);
        });
      });
    }
    function go() {
    setTimeout(count, 500);
    setTimeout(function () {
      var ease = 'cubic-bezier(.77,0,.175,1)';
      to.style.transition = 'transform 900ms ' + ease;
      arrow.style.transition = 'transform 900ms ' + ease + ',opacity 450ms ease-out 420ms';
      from.style.transition = 'opacity 400ms ease-out 480ms'; // appears once $121K has mostly moved clear
      to.style.transform = arrow.style.transform = from.style.opacity = arrow.style.opacity = '';
    }, HERO_SLIDE);
    }
    if (later) return go;
    go();
  }
  document.querySelectorAll('.numbers .v, .hero-stat .to').forEach(prepCount);
  var heroTo = document.querySelector('.hero-stat .to'); if (heroTo) heroTo.dataset.from = '22';

  /* 3. Chart bars: index for the stagger. */
  document.querySelectorAll('.chart .bar').forEach(function (b, i) { b.style.setProperty('--i', i); });

  /* 4. Reveal on scroll, once. Attributes are removed afterwards so hover transitions go back to normal. */
  /* v4.26 spotlight: when part 2 arrives, the case-study number sits centred and enlarged over a dimmed, blurred
     section. The count runs once the section has settled, then the number glides back to its place.
     Only where part 2 fits one screen (laptops and up); phones keep the plain count. */
  var heroStat = heroTo && heroTo.closest('.hero-stat'), heroSec = heroStat && heroStat.closest('.hero-2');
  function spotFits() { return !!heroSec && innerWidth > 860 && heroSec.offsetHeight <= innerHeight * 1.05; }
  function spotlight() {
    var big = heroTo.parentNode, label = heroStat.querySelector('.stat-label'), scale = 1.3;
    heroStat.classList.add('spot-c'); // label and number centred while in the spotlight
    var s = heroStat.getBoundingClientRect(), r = heroSec.getBoundingClientRect();
    var dx = r.left + r.width / 2 - (s.left + s.right) / 2, dy = r.top + r.height / 2 - (s.top + s.bottom) / 2;
    heroStat.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')';
    heroSec.classList.add('spot');
    var count = heroCount(heroTo, true, true);
    var done = false, timer;
    var textBox = function () { var rg = document.createRange(); rg.selectNodeContents(label); return rg.getBoundingClientRect(); };
    function back() {
      if (done) return; done = true; clearTimeout(timer); removeEventListener('resize', back);
      /* FLIP: the label and the number each glide from their centred, enlarged spot to their left-aligned place */
      var l0 = textBox(), b0 = big.getBoundingClientRect();
      heroStat.style.transform = ''; heroStat.classList.remove('spot-c');
      heroTo.style.minWidth = heroTo.style.textAlign = '';
      var l1 = textBox(), b1 = big.getBoundingClientRect();
      [[label, l0, l1], [big, b0, b1]].forEach(function (x) {
        x[0].style.transformOrigin = (x[2].left - x[0].getBoundingClientRect().left) + 'px 0';
        x[0].style.transform = 'translate(' + (x[1].left - x[2].left) + 'px,' + (x[1].top - x[2].top) + 'px) scale(' + scale + ')';
      });
      void heroStat.offsetWidth;
      [label, big].forEach(function (e) { e.style.transition = 'transform 1100ms var(--ease-io)'; e.style.transform = ''; });
      heroSec.classList.remove('spot');
      setTimeout(function () { [label, big].forEach(function (e) { e.style.transition = e.style.transformOrigin = ''; }); }, 1150);
    }
    addEventListener('resize', back);
    /* wait for the glide into part 2 to land before counting */
    var settle = new IntersectionObserver(function (es) {
      if (es[0].intersectionRatio < 0.9) return;
      settle.disconnect();
      setTimeout(function () { count(); timer = setTimeout(back, HERO_SLIDE + 900 + 600); }, 350);
    }, { threshold: [0.9] });
    settle.observe(heroSec);
  }
  function reveal(el) {
    if (el.classList.contains('in')) return;
    if (el === heroStat && spotFits()) {
      el.classList.add('in', 'lit'); spotlight(); return;
    }
    el.classList.add('in', 'lit');
    if (el.matches('.chart')) return;
    if (el.hasAttribute('data-r')) {
      var d = parseFloat(el.style.getPropertyValue('--d')) || 0;
      setTimeout(function () { el.removeAttribute('data-r'); el.classList.remove('in'); el.style.removeProperty('--d'); }, d + 1600);
    }
    /* clipped items can't be observed directly (a fully clipped box never intersects), so they ride on their parent */
    el.querySelectorAll('[data-r="clip"]').forEach(function (c) { setTimeout(function () { reveal(c); }, 60); });
    el.querySelectorAll('[data-num]').forEach(function (n) { setTimeout(function () { if (n === heroTo) heroCount(n); else runCount(n, 1800); }, 250); });
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
    /* the spotlight starts as soon as part 2 peeks in, so the number is never seen in its resting place first */
    if (heroSec) {
      var secIO = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        secIO.disconnect();
        if (spotFits()) { reveal(heroStat); io.unobserve(heroStat); }
      });
      secIO.observe(heroSec);
    }
    /* the hero number counts once the headline has landed (after the loading screen hands over) */
    /* the headline number counts when its section scrolls into view (see reveal) */
  }

  /* 5. Header: hairline appears once the page has moved. */
  var header = document.querySelector('header.top');
  function onScroll() { if (header) header.classList.toggle('scrolled', scrollY > 8); }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();


  /* Glide. On laptops and desktops the page moves between resting points (the top, every section,
     each June 2024 step, and screen-sized stops through anything taller than the screen) with one
     slow eased scroll per wheel gesture or key press, instead of the browser's quick jump. The rest
     of a trackpad swipe (momentum) is absorbed, so one gesture is one move. Touch keeps native
     scrolling and snapping; reduced motion keeps the browser's own behaviour. */
  var bezier = function (x1, y1, x2, y2) {
    var A = function (a1, a2) { return 1 - 3 * a2 + 3 * a1; }, B = function (a1, a2) { return 3 * a2 - 6 * a1; }, C = function (a1) { return 3 * a1; };
    var at = function (t, a1, a2) { return ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t; };
    var sl = function (t, a1, a2) { return 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1); };
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x;
      for (var k = 0; k < 8; k++) { var d = sl(t, x1, x2); if (Math.abs(d) < 1e-6) break; t -= (at(t, x1, x2) - x) / d; t = Math.min(1, Math.max(0, t)); }
      return at(t, y1, y2);
    };
  };
  var glideEase = bezier(0.65, 0, 0.35, 1); /* easeInOutCubic: settles in, settles out */
  var glideMQ = matchMedia('(min-width:900px) and (min-height:640px) and (hover:hover) and (pointer:fine)');
  var glideOn = function () { return !reduce && glideMQ.matches; };
  var syncGlide = function () { root.classList.toggle('glide', glideOn()); };
  syncGlide(); if (glideMQ.addEventListener) glideMQ.addEventListener('change', syncGlide);
  var glide = null, glideRaf = 0;
  var glideTick = function (now) {
    var g = glide, p = Math.min(1, (now - g.t0) / g.dur);
    scrollTo({ top: g.from + (g.to - g.from) * glideEase(p), behavior: 'instant' });
    if (p < 1) glideRaf = requestAnimationFrame(glideTick); else { glideRaf = 0; glide = null; }
  };
  var glideTo = function (y) {
    var max = root.scrollHeight - innerHeight;
    y = Math.max(0, Math.min(max, Math.round(y)));
    var from = scrollY, dist = Math.abs(y - from);
    if (dist < 1) return;
    /* one step ≈ 0.8s, one screen ≈ 1.15s, long jumps cap at 1.4s */
    glide = { from: from, to: y, t0: performance.now(), dur: 700 + Math.min(700, dist * 0.5) };
    if (!glideRaf) glideRaf = requestAnimationFrame(glideTick);
  };
  var topOf = function (el) {
    if (!el) return 0;
    var sec = el.closest('main > section');
    if (sec && sec.classList.contains('hero')) return 0;
    return el.getBoundingClientRect().top + scrollY;
  };
  /* where the page can come to rest, top to bottom */
  var glidePoints = function () {
    var vh = innerHeight, pts = [0], sy = scrollY;
    var wideJourney = matchMedia('(min-width:1000px)').matches;
    document.querySelectorAll('main > section').forEach(function (s) {
      if (s.hidden || !s.getClientRects().length || s.classList.contains('hero')) return;
      var top = s.getBoundingClientRect().top + sy, h = s.offsetHeight;
      if (wideJourney && s.classList.contains('journey-sec')) {
        /* each step's title a quarter of the way down the screen */
        s.querySelectorAll('.journey .step h3').forEach(function (t) {
          var r = t.getBoundingClientRect(); pts.push(r.top + sy + r.height / 2 - vh * 0.25);
        });
        return;
      }
      pts.push(top);
      for (var y = top + vh * 0.8; y < top + h - vh; y += vh * 0.8) pts.push(y);
      if (h > vh + 4) pts.push(top + h - vh);
    });
    pts.push(root.scrollHeight - vh);
    pts = pts.map(Math.round).sort(function (a, b) { return a - b; });
    return pts.filter(function (p, k) { return k === 0 || p - pts[k - 1] > 8; });
  };
  var glideStep = function (dir) {
    var base = glide ? glide.to : scrollY, pts = glidePoints(), k, to = null;
    if (dir > 0) { for (k = 0; k < pts.length; k++) if (pts[k] > base + 4) { to = pts[k]; break; } }
    else { for (k = pts.length - 1; k >= 0; k--) if (pts[k] < base - 4) { to = pts[k]; break; } }
    if (to !== null) glideTo(to);
  };
  /* everything that moves the page on purpose goes through here */
  var goTo = function (target) {
    if (glideOn()) { glideTo(typeof target === 'number' ? target : topOf(target)); return; }
    if (typeof target === 'number') scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  var lastWheel = 0, wheelUsed = false;
  addEventListener('wheel', function (e) {
    if (!glideOn() || e.ctrlKey || e.defaultPrevented || root.classList.contains('gated')) return;
    if (e.target.closest && e.target.closest('.b-view, textarea, select')) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    var now = performance.now(), fresh = now - lastWheel > 180;
    lastWheel = now;
    if (fresh) wheelUsed = false;
    if (wheelUsed || Math.abs(e.deltaY) < 1.5) return;
    wheelUsed = true;
    glideStep(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });
  addEventListener('keydown', function (e) {
    if (!glideOn() || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || root.classList.contains('gated')) return;
    if (e.target.closest && e.target.closest('input, textarea, select, button, summary, [contenteditable], .hx-track')) return;
    var k = e.key;
    if (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) { e.preventDefault(); glideStep(1); }
    else if (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) { e.preventDefault(); glideStep(-1); }
    else if (k === 'Home') { e.preventDefault(); glideTo(0); }
    else if (k === 'End') { e.preventDefault(); glideTo(root.scrollHeight - innerHeight); }
  });
  /* in-page links (#case-study, #fixes, ...) glide too */
  document.addEventListener('click', function (e) {
    if (!glideOn() || e.defaultPrevented) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    var el = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    if (!el) return;
    e.preventDefault();
    try { history.replaceState(null, '', a.getAttribute('href')); } catch (err) {}
    glideTo(topOf(el));
  });

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
      goTo(0);
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
      b.addEventListener('click', function () { goTo(sec); });
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
        setTimeout(function () { goTo(part2); }, reduce ? 0 : 180);
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
