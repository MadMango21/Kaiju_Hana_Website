/* =====================================================================
   KYEJU HANA — main interactions
   loader · cursor · nav · reveals · hero intro · manifesto · process ·
   compare sliders · tilt · magnetic · counters · form · transitions ·
   lightbox · parallax
   ===================================================================== */
(function () {
  'use strict';

  const root          = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer   = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP       = typeof window.gsap !== 'undefined';
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  // Tell the rest of the page (and lily.js) that the intro is over
  function announceLoaded() {
    window.KH_LOADED = true;
    document.body.classList.remove('is-loading');
    window.dispatchEvent(new Event('kh:loaded'));
  }

  // ── Loader: kaiju rises, lily blooms at 100% ──────────────────────────────
  (function loader() {
    const el = $('#loader');
    if (!el) { announceLoaded(); return; }

    const bar    = $('#loader-bar');
    const status = $('#loader-status');
    let seen = false;
    try { seen = sessionStorage.getItem('kh-seen') === '1'; } catch (e) { /* storage blocked */ }

    const MIN_MS = reducedMotion ? 300 : (seen ? 1100 : 2400);
    const MAX_MS = 7000;
    const start  = performance.now();

    const tasks = { fonts: false, window: false, lily: !$('#lily-canvas') };
    const done  = () => Object.values(tasks).filter(Boolean).length / Object.keys(tasks).length;

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { tasks.fonts = true; });
    else tasks.fonts = true;
    if (document.readyState === 'complete') tasks.window = true;
    else window.addEventListener('load', () => { tasks.window = true; });
    window.addEventListener('kh:lily-ready', () => { tasks.lily = true; });

    let shown = 0, finished = false;

    function tick(now) {
      if (finished) return;
      const elapsed  = now - start;
      const timeCap  = Math.min(1, elapsed / MIN_MS);           // never faster than MIN_MS
      const target   = elapsed > MAX_MS ? 1 : Math.min(done(), timeCap);
      shown += (target - shown) * 0.08;
      if (target === 1 && shown > 0.995) shown = 1;
      const pct = Math.round(shown * 100);
      bar.style.width = pct + '%';
      status.textContent = pct < 100 ? 'Loading assets ' + pct + '%' : 'Blooming…';
      if (shown >= 1) finish();
      else requestAnimationFrame(tick);
    }

    function finish() {
      if (finished) return;
      finished = true;
      bar.style.width = '100%';
      try { sessionStorage.setItem('kh-seen', '1'); } catch (e) { /* ignore */ }
      el.classList.add('is-blooming');
      setTimeout(() => {
        el.classList.add('is-done');
        announceLoaded();
        setTimeout(() => el.remove(), 1200);
      }, reducedMotion ? 50 : 950);
    }

    $('#loader-skip').addEventListener('click', () => { shown = 1; finish(); });
    requestAnimationFrame(tick);

    // If the 3D lily never reports in (old GPU, blocked CDN), show the SVG fallback
    setTimeout(() => {
      if (!tasks.lily) {
        tasks.lily = true;
        window.dispatchEvent(new Event('kh:lily-fallback'));
      }
    }, 5000);
  }());

  // SVG fallback for the hero lily
  window.addEventListener('kh:lily-fallback', () => {
    const hero = $('.hero');
    if (!hero || $('.lily-fallback', hero)) return;
    const canvas = $('#lily-canvas');
    if (canvas) canvas.style.display = 'none';
    hero.insertAdjacentHTML('afterbegin',
      '<svg class="lily-fallback" viewBox="0 0 40 40" aria-hidden="true"><use href="#lily-mark"/></svg>');
  });

  // ── Page transition curtain ───────────────────────────────────────────────
  (function transitions() {
    const curtain = $('.curtain');
    if (!curtain || reducedMotion) return;

    let entering = false;
    try { entering = sessionStorage.getItem('kh-transition') === '1'; sessionStorage.removeItem('kh-transition'); } catch (e) { /* ignore */ }
    if (entering) {
      curtain.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => curtain.classList.add('go')));
      setTimeout(() => curtain.classList.remove('is-entering', 'go'), 800);
    }

    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') ||
          a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('data-lightbox')) return;
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      try { sessionStorage.setItem('kh-transition', '1'); } catch (err) { /* ignore */ }
      curtain.classList.add('is-leaving');
      setTimeout(() => { location.href = url.href; }, 480);
    });

    // Restore state when returning via the back/forward cache
    window.addEventListener('pageshow', ev => { if (ev.persisted) curtain.classList.remove('is-leaving'); });
  }());

  // ── Petal cursor ─────────────────────────────────────────────────────────
  (function cursor() {
    if (!finePointer || reducedMotion) return;
    root.classList.add('has-cursor');

    const dot  = document.createElement('div');
    dot.id = 'cursor-dot';
    const ring = document.createElement('div');
    ring.id = 'cursor-ring';
    let petals = '';
    for (let i = 0; i < 6; i++) {
      petals += '<path d="M23 23 C19 17 20 9 23 4 C26 9 27 17 23 23Z" fill="' + (i % 2 ? '#fbe9f0' : '#e8407a') +
                '" transform="rotate(' + (i * 60) + ' 23 23)"/>';
    }
    ring.innerHTML = '<div class="ring"></div><svg viewBox="0 0 46 46"><g>' + petals +
                     '<circle cx="23" cy="23" r="2.6" fill="#f2b33d"/></g></svg>';
    const trail = document.createElement('canvas');
    trail.id = 'cursor-trail';
    document.body.append(trail, ring, dot);

    const ctx = trail.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    function size() {
      trail.width = innerWidth * dpr;
      trail.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    addEventListener('resize', size, { passive: true });

    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, lx = mx, ly = my;
    let visible = false;
    const bits = [];
    const COLORS = ['232,64,122', '251,233,240', '255,122,166', '242,179,61'];

    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      if (!visible) { visible = true; dot.style.opacity = ring.style.opacity = 1; rx = mx; ry = my; }
    }, { passive: true });
    document.addEventListener('pointerleave', () => { visible = false; dot.style.opacity = ring.style.opacity = 0; });
    addEventListener('pointerdown', () => ring.classList.add('is-down'));
    addEventListener('pointerup',   () => ring.classList.remove('is-down'));

    const HOVER = 'a, button, [data-tilt], [data-compare], .pick, select, input, textarea, .marquee-item, .gallery a, #lily-canvas';
    document.addEventListener('pointerover', e => {
      const t = e.target.closest(HOVER);
      ring.classList.toggle('is-hover', !!t);
    });

    function drawPetal(b) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.r);
      ctx.globalAlpha = b.life;
      ctx.fillStyle = 'rgba(' + b.c + ',1)';
      const s = b.s;
      ctx.beginPath();
      ctx.moveTo(0, s);
      ctx.bezierCurveTo(-s * .7, s * .3, -s * .45, -s * .6, 0, -s);
      ctx.bezierCurveTo(s * .45, -s * .6, s * .7, s * .3, 0, s);
      ctx.fill();
      ctx.restore();
    }

    (function loop() {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      dot.style.transform  = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
      ring.style.transform = 'translate(' + (rx - 23) + 'px,' + (ry - 23) + 'px)';

      const speed = Math.hypot(mx - lx, my - ly);
      if (visible && speed > 6 && bits.length < 70) {
        const n = Math.min(3, Math.floor(speed / 14) + 1);
        for (let i = 0; i < n; i++) {
          bits.push({
            x: mx + (Math.random() - .5) * 8, y: my + (Math.random() - .5) * 8,
            vx: (mx - lx) * -.04 + (Math.random() - .5) * .8, vy: (Math.random() - .5) * .8 - .2,
            r: Math.random() * Math.PI * 2, vr: (Math.random() - .5) * .12,
            s: 2.5 + Math.random() * 3.5, life: .9, c: COLORS[(Math.random() * COLORS.length) | 0]
          });
        }
      }
      lx = mx; ly = my;

      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.vy += .035;               // gentle gravity, petals fall
        b.vx *= .98;
        b.x += b.vx + Math.sin(b.life * 10) * .3;
        b.y += b.vy;
        b.r += b.vr;
        b.life -= .018;
        if (b.life <= 0) bits.splice(i, 1);
        else drawPetal(b);
      }
      requestAnimationFrame(loop);
    }());
  }());

  // ── Navigation: scrolled state, hide on scroll-down, mobile menu, scroll-spy ─
  (function nav() {
    const nav = $('#nav');
    if (!nav) return;
    const toggle = $('#nav-toggle');
    let lastY = scrollY;

    addEventListener('scroll', () => {
      const y = scrollY;
      nav.classList.toggle('is-scrolled', y > 30);
      if (!nav.classList.contains('is-open')) nav.classList.toggle('is-hidden', y > lastY && y > 300);
      lastY = y;
    }, { passive: true });

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    }
    if (toggle) {
      toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
      $$('.nav-links a', nav).forEach(a => a.addEventListener('click', () => setOpen(false)));
      addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    }

    const links = $$('.nav-links a[href^="#"]', nav);
    const targets = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
    if (!targets.length || !('IntersectionObserver' in window)) return;
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach(t => spy.observe(t));
  }());

  // ── Scroll progress + back to top ─────────────────────────────────────────
  (function progress() {
    const bar = $('#scroll-progress');
    const btt = $('#back-to-top');
    addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
      if (btt) btt.classList.toggle('is-visible', scrollY > 600);
    }, { passive: true });
    if (btt) btt.addEventListener('click', () => scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));
  }());

  // ── Reveal on scroll ──────────────────────────────────────────────────────
  (function reveals() {
    const els = $$('[data-reveal]');
    if (!('IntersectionObserver' in window) || reducedMotion) { els.forEach(e => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
        // drop stagger delay once revealed so hover transitions stay snappy
        const d = parseFloat(getComputedStyle(en.target).transitionDelay) || 0;
        setTimeout(() => en.target.style.setProperty('--delay', '0s'), (d + 1.1) * 1000);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(e => io.observe(e));
  }());

  // ── Hero intro (runs when the loader finishes) ────────────────────────────
  (function heroIntro() {
    const lines = $$('.hero-title .line > span, .p-title .line > span');
    const fades = $$('[data-hero-in]');
    if (!hasGSAP || reducedMotion || (!lines.length && !fades.length)) return;
    gsap.set(lines, { yPercent: 110 });
    gsap.set(fades, { autoAlpha: 0, y: 24 });
    const play = () => {
      gsap.to(lines, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09, delay: 0.1 });
      gsap.to(fades, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 0.45 });
    };
    if (window.KH_LOADED) play(); else addEventListener('kh:loaded', play, { once: true });
  }());

  // ── Manifesto: words light up as you scroll ───────────────────────────────
  (function manifesto() {
    const box = $('#manifesto-text');
    if (!box) return;
    const words = [];
    Array.from(box.childNodes).forEach(node => {
      const cls  = node.nodeType === 1 ? node.className : '';
      const text = node.textContent;
      const frag = document.createDocumentFragment();
      text.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const s = document.createElement('span');
        s.className = 'w' + (cls ? ' ' + cls : '');
        s.textContent = part;
        words.push(s);
        frag.appendChild(s);
      });
      box.replaceChild(frag, node);
    });

    if (reducedMotion || !hasGSAP || !window.ScrollTrigger) { words.forEach(w => { w.style.opacity = 1; }); return; }
    ScrollTrigger.create({
      trigger: box,
      start: 'top 80%',
      end: 'bottom 40%',
      scrub: true,
      onUpdate: self => {
        const lit = self.progress * words.length;
        words.forEach((w, i) => { w.style.opacity = Math.max(.14, Math.min(1, lit - i + 1)); });
      }
    });
  }());

  // ── Process: grow-a-lily stage icons + pinned horizontal scroll ───────────
  function stageLily(t) {
    const stemH = 8 + t * 34;
    const hx = 40, hy = 76 - stemH;
    let s = '<path d="M14 76 H66" stroke="rgba(251,233,240,.25)" stroke-width="1"/>';
    s += '<path d="M40 76 C40 ' + (76 - stemH * .5) + ' ' + (40 + 2 * t) + ' ' + (hy + 6) + ' 40 ' + hy +
         '" stroke="#5fae6a" stroke-width="2" fill="none" stroke-linecap="round"/>';
    if (t > .15) {
      const ly = 76 - stemH * .45, k = Math.min(1, t * 1.4);
      s += '<path d="M40 ' + ly + ' C' + (40 - 12 * k) + ' ' + (ly - 2) + ' ' + (40 - 16 * k) + ' ' + (ly - 10 * k) + ' ' + (40 - 18 * k) + ' ' + (ly - 14 * k) +
           ' C' + (40 - 8 * k) + ' ' + (ly - 12 * k) + ' 40 ' + (ly - 6) + ' 40 ' + ly + 'Z" fill="#4c9a5b"/>';
      s += '<path d="M40 ' + (ly + 6) + ' C' + (40 + 12 * k) + ' ' + (ly + 4) + ' ' + (40 + 16 * k) + ' ' + (ly - 4 * k) + ' ' + (40 + 18 * k) + ' ' + (ly - 8 * k) +
           ' C' + (40 + 8 * k) + ' ' + (ly - 6 * k) + ' 40 ' + ly + ' 40 ' + (ly + 6) + 'Z" fill="#5fae6a"/>';
    }
    if (t < .1) {
      s += '<ellipse cx="40" cy="72" rx="5" ry="3.5" fill="#f2b33d"/>';
    } else {
      const L = 7 + t * 17, w = L * .32, spread = 4 + t * 78;
      const fan = [-1, -.6, -.2, .2, .6, 1];
      fan.forEach((f, i) => {
        s += '<path transform="translate(' + hx + ' ' + hy + ') rotate(' + (f * spread) + ')" fill="' + (i % 2 ? '#ff7aa6' : '#e8407a') + '" ' +
             'd="M0 0 C' + (-w) + ' ' + (-L * .35) + ' ' + (-w * .6) + ' ' + (-L * .8) + ' 0 ' + (-L) +
             ' C' + (w * .6) + ' ' + (-L * .8) + ' ' + w + ' ' + (-L * .35) + ' 0 0Z"/>';
      });
      if (t > .7) {
        for (let i = 0; i < 5; i++) {
          const a = (-60 + i * 30) * Math.PI / 180;
          s += '<circle cx="' + (hx + Math.sin(a) * L * .55) + '" cy="' + (hy - Math.cos(a) * L * .55) + '" r="1.6" fill="#f2b33d"/>';
        }
      }
    }
    return s;
  }

  (function process() {
    const steps = $$('.process-step');
    if (!steps.length) return;
    const stages = [0, .25, .5, .78, 1];
    steps.forEach((st, i) => {
      const svg = $('.stage-lily', st);
      if (svg) svg.innerHTML = stageLily(stages[i] != null ? stages[i] : 1);
    });

    const setCurrent = idx => steps.forEach((s, i) => s.classList.toggle('is-current', i === idx));
    setCurrent(0);

    const pin = $('#process-pin'), track = $('#process-track'), rail = $('#process-rail');
    if (!hasGSAP || !window.ScrollTrigger || reducedMotion) {
      mobileCurrent();
      return;
    }

    ScrollTrigger.matchMedia({
      '(min-width: 901px)': function () {
        const dist = () => Math.max(0, track.scrollWidth - innerWidth);
        const tween = gsap.to(track, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: {
            trigger: pin,
            start: 'center center',
            end: () => '+=' + dist(),
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            onUpdate: self => {
              if (rail) rail.style.transform = 'scaleX(' + self.progress + ')';
              setCurrent(Math.min(steps.length - 1, Math.floor(self.progress * steps.length * 0.999)));
            }
          }
        });
        return () => tween.kill();
      },
      '(max-width: 900px)': mobileCurrent
    });

    function mobileCurrent() {
      if (!('IntersectionObserver' in window)) return;
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) setCurrent(steps.indexOf(en.target)); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach(s => io.observe(s));
    }
  }());

  // ── Before / after sliders ────────────────────────────────────────────────
  (function compare() {
    $$('[data-compare]').forEach(cmp => {
      const range = $('.compare-range', cmp);
      if (!range) return;
      const set = v => cmp.style.setProperty('--pos', v + '%');
      range.addEventListener('input', () => set(range.value));
      range.addEventListener('pointerdown', () => cmp.classList.add('is-dragging'));
      addEventListener('pointerup', () => cmp.classList.remove('is-dragging'));

      // Hover-scrub on desktop: the split follows the mouse until you click/drag
      if (finePointer) {
        cmp.addEventListener('pointermove', e => {
          if (e.buttons) return;
          const r = cmp.getBoundingClientRect();
          const v = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
          range.value = v;
          set(v);
        });
      }

      // A little nudge the first time it scrolls into view, to show it's interactive
      if (!reducedMotion && hasGSAP && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver(([en]) => {
          if (!en.isIntersecting) return;
          io.disconnect();
          const o = { v: 50 };
          gsap.timeline({ delay: .5 })
            .to(o, { v: 22, duration: .7, ease: 'power2.inOut', onUpdate: () => set(o.v) })
            .to(o, { v: 70, duration: .9, ease: 'power2.inOut', onUpdate: () => set(o.v) })
            .to(o, { v: 50, duration: .6, ease: 'power2.out', onUpdate: () => { set(o.v); range.value = o.v; } });
        }, { threshold: .5 });
        io.observe(cmp);
      }
    });
  }());

  // ── Tilt cards + spotlight ────────────────────────────────────────────────
  (function tilt() {
    if (!finePointer || reducedMotion) return;
    if (window.VanillaTilt) {
      VanillaTilt.init($$('[data-tilt]'),      { max: 6, speed: 600, glare: true, 'max-glare': .12, perspective: 1000, scale: 1.01 });
      VanillaTilt.init($$('[data-tilt-soft]'), { max: 3, speed: 800, glare: true, 'max-glare': .08, perspective: 1400 });
    }
    $$('.service-card').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }());

  // ── Magnetic buttons ──────────────────────────────────────────────────────
  (function magnetic() {
    if (!finePointer || reducedMotion) return;
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * .25;
        const y = (e.clientY - r.top - r.height / 2) * .35;
        el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }());

  // ── Count-up stats ────────────────────────────────────────────────────────
  (function counters() {
    const els = $$('[data-count]');
    if (!els.length || reducedMotion || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const end = +en.target.dataset.count, t0 = performance.now(), dur = 1400;
        (function step(now) {
          const p = Math.min(1, (now - t0) / dur);
          en.target.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        }(t0));
      });
    }, { threshold: .6 });
    els.forEach(e => { e.textContent = '0'; io.observe(e); });
  }());

  // ── Contact form (Formspree via fetch) ────────────────────────────────────
  (function form() {
    const f = $('#contact-form');
    if (!f) return;
    const status = $('#form-status');
    const btn = $('button[type="submit"]', f);

    function fieldError(input, msg) {
      const wrap = input.closest('.field');
      wrap.classList.toggle('has-error', !!msg);
      const out = $('.field-error', wrap);
      if (out) out.textContent = msg || '';
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }

    function validate() {
      let ok = true;
      const name = $('#f-name', f), email = $('#f-email', f), msg = $('#f-msg', f);
      if (!name.value.trim()) { fieldError(name, 'Please tell us your name.'); ok = false; } else fieldError(name);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { fieldError(email, 'Please enter a valid email.'); ok = false; } else fieldError(email);
      if (msg.value.trim().length < 10) { fieldError(msg, 'A few more words about your game, please.'); ok = false; } else fieldError(msg);
      return ok;
    }

    $$('input, textarea', f).forEach(i => i.addEventListener('blur', () => { if (f.dataset.tried) validate(); }));

    f.addEventListener('submit', async e => {
      e.preventDefault();
      f.dataset.tried = '1';
      if (!validate()) { const bad = $('.has-error input, .has-error textarea', f); if (bad) bad.focus(); return; }

      const data = new FormData(f);
      const picks = data.getAll('services');
      data.delete('services');
      data.append('services', picks.length ? picks.join(', ') : 'Not specified');

      btn.disabled = true;
      btn.firstChild.textContent = 'Sending… ';
      status.hidden = true;
      try {
        const res = await fetch(f.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('Bad response');
        f.reset();
        delete f.dataset.tried;
        status.className = 'form-status ok';
        status.textContent = 'Message received! We\'ll be in touch soon. ✿';
      } catch (err) {
        status.className = 'form-status err';
        status.textContent = 'Something went wrong sending that. Please email us directly at hello@kyejuhana.com.';
      }
      status.hidden = false;
      btn.disabled = false;
      btn.firstChild.textContent = 'Send it ';
    });
  }());

  // ── Lightbox (project galleries) ──────────────────────────────────────────
  (function lightbox() {
    const links = $$('[data-lightbox]');
    if (!links.length) return;
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Image viewer');
    box.innerHTML =
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lb-btn lb-close" type="button" aria-label="Close">✕</button>' +
      '<button class="lb-btn lb-prev" type="button" aria-label="Previous image">←</button>' +
      '<button class="lb-btn lb-next" type="button" aria-label="Next image">→</button>';
    document.body.appendChild(box);
    const img = $('img', box), cap = $('figcaption', box);
    let idx = 0, lastFocus = null;

    function show(i) {
      idx = (i + links.length) % links.length;
      const a = links[idx];
      img.src = a.getAttribute('href');
      img.alt = a.dataset.caption || '';
      cap.textContent = a.dataset.caption || '';
    }
    function open(i) { lastFocus = document.activeElement; show(i); box.classList.add('is-open'); document.body.style.overflow = 'hidden'; $('.lb-close', box).focus(); }
    function close() { box.classList.remove('is-open'); document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }

    links.forEach((a, i) => a.addEventListener('click', e => { e.preventDefault(); open(i); }));
    $('.lb-close', box).addEventListener('click', close);
    $('.lb-prev', box).addEventListener('click', () => show(idx - 1));
    $('.lb-next', box).addEventListener('click', () => show(idx + 1));
    box.addEventListener('click', e => { if (e.target === box) close(); });
    addEventListener('keydown', e => {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    let sx = null;
    box.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', e => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      sx = null;
    });
  }());

  // ── Parallax (project hero + gallery drift) ───────────────────────────────
  (function parallax() {
    if (!hasGSAP || !window.ScrollTrigger || reducedMotion) return;
    $$('.p-hero-media img').forEach(img => {
      gsap.to(img, { yPercent: 14, ease: 'none', scrollTrigger: { trigger: img.closest('.p-hero'), start: 'top top', end: 'bottom top', scrub: true } });
    });
    $$('.work-media img:not(.alt)').forEach(img => {
      gsap.fromTo(img, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // Recalculate pinned/scrubbed positions once fonts and images settle
    addEventListener('load', () => ScrollTrigger.refresh());
    addEventListener('kh:loaded', () => ScrollTrigger.refresh());
  }());

  // ── Footer year ───────────────────────────────────────────────────────────
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
}());
