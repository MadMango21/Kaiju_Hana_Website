/* =====================================================================
   KYEJU HANA — ambient background
   One fixed canvas, three moods that crossfade by section:
     data-ambient="petals" → drifting stargazer petals that dodge the mouse
     data-ambient="grid"   → Unreal-style viewport floor grid that glows near the mouse
     data-ambient="motes"  → rising pollen / firefly specks
   ===================================================================== */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('ambient');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const sections = Array.from(document.querySelectorAll('[data-ambient]'));
  if (!sections.length) return;

  const small = innerWidth < 700;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  let W = 0, H = 0;

  function resize() {
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize, { passive: true });

  let mx = -9999, my = -9999;
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  document.addEventListener('pointerleave', () => { mx = my = -9999; });

  const weight = { petals: 0, grid: 0, motes: 0 };
  let active = sections[0].dataset.ambient;

  function pickActive() {
    const mid = H * 0.5;
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) { active = s.dataset.ambient; return; }
    }
    active = null;
  }
  addEventListener('scroll', pickActive, { passive: true });
  pickActive();

  const rand = (a, b) => a + Math.random() * (b - a);

  // ── Petals ────────────────────────────────────────────────────────────────
  const PETAL_COLORS = ['232,64,122', '255,122,166', '251,233,240', '184,37,90'];
  const petals = Array.from({ length: small ? 16 : 32 }, () => ({
    x: rand(0, innerWidth), y: rand(-innerHeight, innerHeight),
    s: rand(5, 13), vy: rand(.25, .8), sway: rand(0, Math.PI * 2), swaySpd: rand(.006, .016),
    r: rand(0, Math.PI * 2), vr: rand(-.012, .012), flip: rand(0, Math.PI * 2),
    a: rand(.25, .6), c: PETAL_COLORS[(Math.random() * PETAL_COLORS.length) | 0], px: 0, py: 0
  }));

  function drawPetals(w) {
    for (const p of petals) {
      p.sway += p.swaySpd;
      p.flip += .02;
      p.y += p.vy;
      p.x += Math.sin(p.sway) * .6;
      p.r += p.vr;

      const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
      if (d < 140 && d > 0) { const f = (140 - d) / 140 * 2.2; p.px += dx / d * f; p.py += dy / d * f; }
      p.px *= .92; p.py *= .92;
      p.x += p.px; p.y += p.py;

      if (p.y > H + 30) { p.y = -30; p.x = rand(0, W); }
      if (p.x < -30) p.x = W + 30; else if (p.x > W + 30) p.x = -30;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.scale(Math.cos(p.flip) * .6 + .4, 1);   // fake 3D tumble
      ctx.globalAlpha = p.a * w;
      ctx.fillStyle = 'rgb(' + p.c + ')';
      const s = p.s;
      ctx.beginPath();
      ctx.moveTo(0, s);
      ctx.bezierCurveTo(-s * .75, s * .25, -s * .45, -s * .7, 0, -s);
      ctx.bezierCurveTo(s * .45, -s * .7, s * .75, s * .25, 0, s);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Motes ─────────────────────────────────────────────────────────────────
  const motes = Array.from({ length: small ? 30 : 60 }, () => ({
    x: rand(0, innerWidth), y: rand(0, innerHeight), r: rand(.6, 2.2),
    vy: rand(.15, .55), ph: rand(0, Math.PI * 2), gold: Math.random() < .65
  }));

  function drawMotes(w, t) {
    ctx.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      m.y -= m.vy;
      m.x += Math.sin(t * .0007 + m.ph) * .25;
      const dx = m.x - mx, dy = m.y - my, d = Math.hypot(dx, dy);
      if (d < 110 && d > 0) { m.x += dx / d * 1.2; m.y += dy / d * 1.2; }
      if (m.y < -10) { m.y = H + 10; m.x = rand(0, W); }
      const flick = .55 + .45 * Math.sin(t * .003 + m.ph * 3);
      const col = m.gold ? '242,179,61' : '232,64,122';
      ctx.globalAlpha = .12 * flick * w;
      ctx.fillStyle = 'rgb(' + col + ')';
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .8 * flick * w;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ── Grid (Unreal viewport floor) ──────────────────────────────────────────
  let gridScroll = 0;
  function drawGrid(w, t) {
    const horizon = H * .42;
    const vx = W / 2 + (mx > -999 ? (mx - W / 2) * .06 : 0);
    const rows = 22, cols = 28;
    gridScroll = (gridScroll + .004) % 1;

    ctx.lineWidth = 1;
    // receding horizontal lines
    for (let i = 0; i < rows; i++) {
      const z = (i + gridScroll) / rows;          // 0 = horizon, 1 = viewer
      const y = horizon + Math.pow(z, 2.2) * (H - horizon + 200);
      if (y > H + 5) continue;
      ctx.globalAlpha = Math.min(1, z * 1.6) * .13 * w;
      ctx.strokeStyle = '#e8407a';
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // converging verticals
    for (let j = -cols; j <= cols; j++) {
      const bx = W / 2 + j * (W / cols) * 1.6;
      const isAxis = j === 0;
      ctx.globalAlpha = (isAxis ? .3 : .1) * w;
      ctx.strokeStyle = isAxis ? '#5fd38a' : '#e8407a';   // UE green Y-axis down the middle
      ctx.beginPath(); ctx.moveTo(vx, horizon); ctx.lineTo(bx, H + 200); ctx.stroke();
    }
    // UE red X-axis
    const axisY = horizon + Math.pow(.62, 2.2) * (H - horizon + 200);
    ctx.globalAlpha = .28 * w;
    ctx.strokeStyle = '#ff5c5c';
    ctx.beginPath(); ctx.moveTo(0, axisY); ctx.lineTo(W, axisY); ctx.stroke();

    // horizon fade
    const fade = ctx.createLinearGradient(0, horizon - 10, 0, horizon + 120);
    fade.addColorStop(0, 'rgba(13,10,20,1)');
    fade.addColorStop(1, 'rgba(13,10,20,0)');
    ctx.globalAlpha = w;
    ctx.fillStyle = fade;
    ctx.fillRect(0, horizon - 10, W, 130);

    // mouse "flashlight" makes nearby grid glow
    if (mx > -999 && my > horizon) {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, 220);
      g.addColorStop(0, 'rgba(232,64,122,.16)');
      g.addColorStop(1, 'rgba(232,64,122,0)');
      ctx.globalAlpha = w;
      ctx.fillStyle = g;
      ctx.fillRect(mx - 220, my - 220, 440, 440);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(frame);
  });

  function frame(t) {
    if (!running) return;
    for (const k in weight) weight[k] += ((k === active ? 1 : 0) - weight[k]) * .04;
    ctx.clearRect(0, 0, W, H);
    if (weight.grid   > .01) drawGrid(weight.grid, t);
    if (weight.motes  > .01) drawMotes(weight.motes, t);
    if (weight.petals > .01) drawPetals(weight.petals);
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}());
