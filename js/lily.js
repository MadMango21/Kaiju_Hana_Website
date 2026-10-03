/* =====================================================================
   KYEJU HANA — interactive 3D stargazer lily (Three.js)
   - Petals are procedural: each is a bent ribbon whose spine curls from
     a closed bud (bloom = 0) to a recurved stargazer flower (bloom = 1).
   - Blooms when the loader finishes, follows the mouse, can be dragged
     to spin, and bursts pollen when clicked.
   - Optional kaiju .glb (window.KH_CONFIG.kaijuModel) loads behind it.
   ===================================================================== */
import * as THREE from 'three';

const canvas = document.getElementById('lily-canvas');
const hero   = canvas && canvas.closest('.hero');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function fail() { window.dispatchEvent(new Event('kh:lily-fallback')); window.dispatchEvent(new Event('kh:lily-ready')); }

if (canvas) {
  try { init(); } catch (err) { console.warn('Lily WebGL failed, using fallback', err); fail(); }
}

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.4, 10);

  // ── Lights ────────────────────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight(0xffe0ec, 0x1a0820, 1.4));
  const key = new THREE.DirectionalLight(0xfff2f6, 2.4);
  key.position.set(3, 6, 6);
  scene.add(key);
  const rim = new THREE.PointLight(0xe8407a, 40, 20, 1.6);
  rim.position.set(-3.5, 2, -2.5);
  scene.add(rim);
  const warm = new THREE.PointLight(0xf2b33d, 18, 14, 1.6);
  warm.position.set(2.5, -1.5, 3);
  scene.add(warm);

  // ── Petal texture (painted on a 2D canvas) ────────────────────────────────
  function petalTexture(sepal) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 512;
    const g = c.getContext('2d');
    // canvas bottom = petal base (uv.y 0), top = tip (uv.y 1)
    const v = g.createLinearGradient(0, 512, 0, 0);
    v.addColorStop(0,    '#e6f0b8');
    v.addColorStop(0.1,  '#ffd6e4');
    v.addColorStop(0.32, sepal ? '#ec5a8c' : '#e8407a');
    v.addColorStop(0.78, sepal ? '#e44d82' : '#d92d68');
    v.addColorStop(1,    '#ffb3cd');
    g.fillStyle = v; g.fillRect(0, 0, 256, 512);

    // pale stargazer margins
    const h = g.createLinearGradient(0, 0, 256, 0);
    h.addColorStop(0,    'rgba(255,242,247,.95)');
    h.addColorStop(0.2,  'rgba(255,242,247,0)');
    h.addColorStop(0.8,  'rgba(255,242,247,0)');
    h.addColorStop(1,    'rgba(255,242,247,.95)');
    g.fillStyle = h; g.fillRect(0, 0, 256, 512);

    // green nectar groove at the base
    const n = g.createLinearGradient(0, 512, 0, 300);
    n.addColorStop(0, 'rgba(150,200,90,.9)');
    n.addColorStop(1, 'rgba(150,200,90,0)');
    g.fillStyle = n; g.fillRect(118, 300, 20, 212);

    // darker central vein
    const cv = g.createLinearGradient(0, 0, 256, 0);
    cv.addColorStop(0.42, 'rgba(150,20,70,0)');
    cv.addColorStop(0.5,  'rgba(150,20,70,.35)');
    cv.addColorStop(0.58, 'rgba(150,20,70,0)');
    g.fillStyle = cv; g.fillRect(0, 0, 256, 470);

    // fine veins
    g.strokeStyle = 'rgba(120,10,50,.12)';
    g.lineWidth = 1.2;
    for (let i = -5; i <= 5; i++) {
      g.beginPath();
      g.moveTo(128, 512);
      g.quadraticCurveTo(128 + i * 18, 260, 128 + i * 10, 0);
      g.stroke();
    }

    // stargazer freckles
    const spots = sepal ? 40 : 80;
    for (let i = 0; i < spots; i++) {
      const vy = 0.1 + Math.pow(Math.random(), 1.3) * 0.5;
      const spread = 30 + vy * 120;
      const x = 128 + (Math.random() - 0.5) * spread;
      const y = 512 - vy * 512;
      const r = 1.6 + Math.random() * 4.2;
      g.fillStyle = 'rgba(110,8,40,.9)';
      g.beginPath(); g.ellipse(x, y, r * 0.8, r, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,180,210,.35)';
      g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2); g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return tex;
  }

  function petalMaterial(sepal) {
    return new THREE.MeshPhysicalMaterial({
      map: petalTexture(sepal),
      side: THREE.DoubleSide,
      roughness: 0.55,
      sheen: 1,
      sheenColor: new THREE.Color(0xffc2d8),
      sheenRoughness: 0.45,
      clearcoat: 0.15,
      emissive: new THREE.Color(0x3a0618),
      emissiveIntensity: 0.55
    });
  }

  // ── Petal geometry: a ribbon we reshape every frame ───────────────────────
  const U = 10, V = 36;
  function ribbon() {
    const geo = new THREE.BufferGeometry();
    const count = (U + 1) * (V + 1);
    const uv = new Float32Array(count * 2);
    const idx = [];
    for (let j = 0; j <= V; j++) {
      for (let i = 0; i <= U; i++) {
        const k = j * (U + 1) + i;
        uv[k * 2] = i / U; uv[k * 2 + 1] = j / V;
        if (i < U && j < V) {
          const a = k, b = k + 1, c = k + U + 1, d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    return geo;
  }

  function shapePetal(p, bloom, time) {
    const pos = p.geo.attributes.position.array;
    const { length: L, width: W, phi } = p;
    const dx = Math.cos(phi), dz = Math.sin(phi);     // radial direction
    const ex = -Math.sin(phi), ez = Math.cos(phi);    // across-petal direction
    const ds = L / V;
    let r = 0.07, y = 0;
    for (let j = 0; j <= V; j++) {
      const v = j / V;
      const closed = 0.22 - 0.55 * v;                         // bud: curls back to the axis
      const open   = p.open0 + 0.45 * v + p.recurve * v * v;  // stargazer: flat then recurved tips
      const theta  = closed + (open - closed) * bloom;
      if (j > 0) { r += Math.sin(theta) * ds; y += Math.cos(theta) * ds; }
      const w  = W * Math.sin(Math.PI * Math.pow(v, 0.75)) * (1 - 0.1 * v);
      const nx = -Math.cos(theta), ny = Math.sin(theta);      // inner normal of the spine
      for (let i = 0; i <= U; i++) {
        const u = (i / U) * 2 - 1;
        const x = u * w;
        const cup = p.cup * (1 - bloom * 0.45) * u * u * w;
        const ruffle = 0.05 * Math.sin(v * 17 + time * 1.4 + p.seed) * Math.pow(Math.abs(u), 3) * bloom;
        const off = cup + ruffle;
        const R = r + nx * off, Y = y + ny * off;
        const k = (j * (U + 1) + i) * 3;
        pos[k]     = dx * R + ex * x;
        pos[k + 1] = Y;
        pos[k + 2] = dz * R + ez * x;
      }
    }
    p.geo.attributes.position.needsUpdate = true;
    p.geo.computeVertexNormals();
  }

  // ── Build the flower ──────────────────────────────────────────────────────
  const lily   = new THREE.Group();     // receives scroll/position
  const spin   = new THREE.Group();     // receives mouse + drag rotation
  const flower = new THREE.Group();
  lily.add(spin);
  spin.add(flower);
  scene.add(lily);

  const matPetal = petalMaterial(false);
  const matSepal = petalMaterial(true);
  const petals = [];
  for (let i = 0; i < 6; i++) {
    const sepal = i % 2 === 1;
    const p = {
      geo: ribbon(), phi: (i / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.08,
      length: sepal ? 2.25 : 2.4, width: sepal ? 0.5 : 0.64,
      open0: sepal ? 0.95 : 0.8, recurve: sepal ? 1.0 : 0.85, cup: sepal ? 0.2 : 0.28,
      delay: sepal ? 0.0 : 0.12, seed: Math.random() * 10
    };
    const mesh = new THREE.Mesh(p.geo, sepal ? matSepal : matPetal);
    mesh.position.y = sepal ? -0.03 : 0;
    flower.add(mesh);
    petals.push(p);
  }

  // stamens + pistil
  const stamens = new THREE.Group();
  const filamentMat = new THREE.MeshStandardMaterial({ color: 0xdfe8c4, roughness: 0.6, emissive: 0x223311, emissiveIntensity: 0.3 });
  const antherMat   = new THREE.MeshStandardMaterial({ color: 0xc4622d, roughness: 0.8, emissive: 0x5a1e05, emissiveIntensity: 0.5 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.1, 0),
      new THREE.Vector3(Math.cos(a) * 0.18, 0.8, Math.sin(a) * 0.18),
      new THREE.Vector3(Math.cos(a) * 0.45, 1.45, Math.sin(a) * 0.45),
      new THREE.Vector3(Math.cos(a) * 0.62, 1.75, Math.sin(a) * 0.62)
    ]);
    stamens.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.018, 6), filamentMat));
    const anther = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.16, 4, 8), antherMat);
    anther.position.copy(curve.getPoint(1));
    anther.rotation.set(Math.PI / 2, 0, -a);
    stamens.add(anther);
  }
  const pistilCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(0.05, 1.0, 0.02), new THREE.Vector3(0.12, 1.9, 0.08)
  ]);
  stamens.add(new THREE.Mesh(new THREE.TubeGeometry(pistilCurve, 20, 0.028, 8), filamentMat));
  const stigma = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x9ccf6a, emissive: 0x2a4a10, emissiveIntensity: 0.6 }));
  stigma.position.copy(pistilCurve.getPoint(1));
  stamens.add(stigma);
  flower.add(stamens);

  // short stem below the bloom
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 3, 10),
    new THREE.MeshStandardMaterial({ color: 0x3f7a4a, roughness: 0.7 })
  );
  stem.position.y = -1.5;
  flower.add(stem);

  // pollen cloud
  const POLLEN = 260;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(POLLEN * 3);
  const pVel = new Float32Array(POLLEN * 3);
  const pHome = new Float32Array(POLLEN * 3);
  for (let i = 0; i < POLLEN; i++) {
    const rr = 1.2 + Math.random() * 2.6, a = Math.random() * Math.PI * 2, yy = (Math.random() - 0.3) * 4;
    pHome[i * 3] = pPos[i * 3] = Math.cos(a) * rr;
    pHome[i * 3 + 1] = pPos[i * 3 + 1] = yy;
    pHome[i * 3 + 2] = pPos[i * 3 + 2] = Math.sin(a) * rr;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const dotTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,220,150,.8)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const pollen = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.09, map: dotTex, color: 0xf2b33d, transparent: true, opacity: 0.85,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  lily.add(pollen);

  // ── Optional kaiju model ──────────────────────────────────────────────────
  const cfg = window.KH_CONFIG || {};
  if (cfg.kaijuModel) {
    import('three/addons/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
      new GLTFLoader().load(cfg.kaijuModel, gltf => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const s = 6 / Math.max(size.y, 0.001);
        model.scale.setScalar(s);
        box.setFromObject(model);
        model.position.set(-box.getCenter(new THREE.Vector3()).x, -box.min.y - 3.4, -3.2);
        lily.add(model);
      }, undefined, err => console.warn('Kaiju model failed to load', err));
    });
  }

  // ── Layout: lily sits right of the copy on desktop, top-right on mobile ───
  let isMobile = false;
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const halfW = halfH * camera.aspect;
    isMobile = w < 900;
    if (isMobile) {
      lily.position.set(0, halfH * 0.58, 0);
      lily.scale.setScalar(Math.min(0.62, halfW * 0.34));
    } else {
      lily.position.set(halfW * 0.42, -0.2, 0);
      lily.scale.setScalar(Math.min(1.15, 0.75 + camera.aspect * 0.18));
    }
    baseY = lily.position.y;
  }
  let baseY = 0;
  layout();
  new ResizeObserver(layout).observe(canvas);

  // ── Interaction ───────────────────────────────────────────────────────────
  let targetRX = 0, targetRY = 0, rotX = 0, rotY = 0;
  let dragVel = 0, dragSpin = 0, dragging = false, lastX = 0, downX = 0, downY = 0;
  let pulse = 0;

  addEventListener('pointermove', e => {
    const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
    targetRY = nx * 0.7;
    targetRX = ny * 0.35;
    if (dragging) {
      const dx = e.clientX - lastX;
      dragVel = dx * 0.006;
      dragSpin += dragVel;
      lastX = e.clientX;
    }
  }, { passive: true });

  canvas.addEventListener('pointerdown', e => {
    dragging = true; lastX = downX = e.clientX; downY = e.clientY;
  });
  addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging = false;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) burst();
  });

  function burst() {
    pulse = 1;
    for (let i = 0; i < POLLEN; i++) {
      const x = pPos[i * 3], y = pPos[i * 3 + 1], z = pPos[i * 3 + 2];
      const d = Math.hypot(x, y, z) || 1;
      pVel[i * 3] += (x / d) * 0.12; pVel[i * 3 + 1] += (y / d) * 0.12 + 0.03; pVel[i * 3 + 2] += (z / d) * 0.12;
    }
  }

  // ── Bloom timeline ────────────────────────────────────────────────────────
  let bloom = reducedMotion ? 1 : 0.02;
  let bloomStart = null;
  const startBloom = () => { if (bloomStart === null) bloomStart = performance.now(); };
  if (window.KH_LOADED) startBloom(); else addEventListener('kh:loaded', startBloom, { once: true });
  const easeOutBack = t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

  // pause when the hero is off-screen
  let onScreen = true;
  new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; if (onScreen) requestAnimationFrame(frame); }).observe(hero || canvas);

  const clock = new THREE.Clock();
  let readySent = false;

  function frame() {
    if (!onScreen) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (!reducedMotion && bloomStart !== null) {
      const k = Math.min(1, (performance.now() - bloomStart) / 2600);
      bloom = 0.02 + 0.98 * easeOutBack(k);
    }
    pulse *= 0.94;
    const breathe = reducedMotion ? 0 : Math.sin(t * 0.9) * 0.025;

    petals.forEach(p => {
      const b = Math.max(0, Math.min(1.08, bloom - p.delay * (1 - bloom))) + breathe + pulse * 0.12;
      shapePetal(p, b, t);
    });
    const sb = Math.max(0, Math.min(1, bloom));
    stamens.scale.setScalar(0.35 + 0.65 * sb);
    stamens.visible = sb > 0.15;

    // scroll: lily rises and turns as the hero leaves
    const heroH = hero ? hero.offsetHeight : innerHeight;
    const sp = Math.min(1, Math.max(0, scrollY / heroH));
    lily.position.y = baseY + sp * 2.2;

    rotX += (targetRX - rotX) * 0.05;
    rotY += (targetRY - rotY) * 0.05;
    if (!dragging) { dragVel *= 0.95; dragSpin += dragVel; }
    const idle = reducedMotion ? 0 : t * 0.12;
    spin.rotation.set(0.55 + rotX + sp * 0.4, rotY + idle + dragSpin + sp * 1.4, Math.sin(t * 0.5) * 0.04);

    // pollen drift + spring home
    for (let i = 0; i < POLLEN; i++) {
      const ix = i * 3;
      pVel[ix]     += (pHome[ix]     - pPos[ix])     * 0.002;
      pVel[ix + 1] += (pHome[ix + 1] - pPos[ix + 1]) * 0.002;
      pVel[ix + 2] += (pHome[ix + 2] - pPos[ix + 2]) * 0.002;
      pVel[ix] *= 0.96; pVel[ix + 1] *= 0.96; pVel[ix + 2] *= 0.96;
      pPos[ix]     += pVel[ix];
      pPos[ix + 1] += pVel[ix + 1] + (reducedMotion ? 0 : Math.sin(t + i) * 0.0015);
      pPos[ix + 2] += pVel[ix + 2];
    }
    pGeo.attributes.position.needsUpdate = true;
    pollen.rotation.y = t * 0.05;
    pollen.material.opacity = 0.35 + 0.5 * sb;

    rim.intensity = 40 + pulse * 80;
    renderer.render(scene, camera);

    if (!readySent) { readySent = true; window.dispatchEvent(new Event('kh:lily-ready')); }
    if (!reducedMotion || bloomStart === null || pulse > 0.01 || dragging) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
