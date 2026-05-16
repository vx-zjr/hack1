/* ============================================================
   HACK//OS — Morph entity (v3)
   · 15 modular forms (math + hacker culture)
   · 7,200 particles · ONE color per form (random shuffle)
   · 60fps target: fillRect + single fillStyle/globalAlpha per frame
   · Mouse-reactive · transformer-smooth morph · shockwaves
   ============================================================ */
(function () {
  const canvas = document.getElementById('stage-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  // -------- Config --------
  const N = 7200;
  const MORPH_INTERVAL = 4800;
  const MORPH_DUR      = 1700;
  const ROT_BASE_Y     = 0.0034;
  const REPULSE_R      = 130;
  const REPULSE_K      = 0.55;
  const SPRING_K       = 0.0018;
  const DAMPING        = 0.86;
  const TAU            = Math.PI * 2;

  // 4 colors — each form picks ONE
  // 0 phosphor green · 1 运动黄 sport yellow · 2 科技蓝 tech blue · 3 动力红 power red
  const COLORS = [
    [123, 255, 168],
    [255, 220,  90],
    [110, 200, 255],
    [255, 105, 130],
  ];
  const COLORS_GLOW = [
    [ 58, 255, 124],
    [255, 200,  60],
    [ 70, 170, 255],
    [255,  70,  95],
  ];

  // -------- Canvas sizing --------
  let W = 0, H = 0, CX = 0, CY = 0, R = 0;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.0);  // 1.0 cap for perf
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width  = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    CX = W / 2; CY = H / 2;
    R = Math.min(W, H) * 0.22;
  }
  window.addEventListener('resize', resize);

  // ============================================================
  //   FORM GENERATORS (15 total)
  // ============================================================
  function pad(out, n) { while (out.length < n) out.push(out[out.length - 1]); return out.slice(0, n); }

  // 1. SPHERE with great-circle latitudes (sci-fi grid feel)
  function genSphere(n) {
    const out = [];
    const surface = Math.floor(n * 0.55);
    for (let i = 0; i < surface; i++) {
      const y = 1 - (i / (surface - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = Math.PI * (3 - Math.sqrt(5)) * i;
      out.push([Math.cos(t) * r, y, Math.sin(t) * r]);
    }
    // Great-circle longitudes
    const circles = 12;
    const perC = Math.floor((n - surface) / circles);
    for (let c = 0; c < circles; c++) {
      const a = (c / circles) * Math.PI;
      const ca = Math.cos(a), sa = Math.sin(a);
      for (let i = 0; i < perC; i++) {
        const t = (i / perC) * TAU;
        out.push([Math.cos(t) * ca * 1.02, Math.sin(t) * 1.02, Math.cos(t) * sa * 1.02]);
      }
    }
    return pad(out, n);
  }

  // 2. CUBE — outer edges + 4×4×4 internal lattice + face diagonals
  function genCube(n) {
    const out = [];
    // Outer 12 edges
    const E = [
      [[-1,-1,-1],[ 1,-1,-1]], [[ 1,-1,-1],[ 1,-1, 1]], [[ 1,-1, 1],[-1,-1, 1]], [[-1,-1, 1],[-1,-1,-1]],
      [[-1, 1,-1],[ 1, 1,-1]], [[ 1, 1,-1],[ 1, 1, 1]], [[ 1, 1, 1],[-1, 1, 1]], [[-1, 1, 1],[-1, 1,-1]],
      [[-1,-1,-1],[-1, 1,-1]], [[ 1,-1,-1],[ 1, 1,-1]], [[ 1,-1, 1],[ 1, 1, 1]], [[-1,-1, 1],[-1, 1, 1]],
    ];
    // 12 face diagonals (2 per face × 6 faces, but 12 distinct)
    const FD = [];
    const faces = [
      [[-1,-1,-1],[ 1, 1,-1]], [[-1, 1,-1],[ 1,-1,-1]], // back face
      [[-1,-1, 1],[ 1, 1, 1]], [[-1, 1, 1],[ 1,-1, 1]], // front face
      [[-1,-1,-1],[-1, 1, 1]], [[-1, 1,-1],[-1,-1, 1]], // left face
      [[ 1,-1,-1],[ 1, 1, 1]], [[ 1, 1,-1],[ 1,-1, 1]], // right face
      [[-1,-1,-1],[ 1,-1, 1]], [[ 1,-1,-1],[-1,-1, 1]], // bottom face
      [[-1, 1,-1],[ 1, 1, 1]], [[ 1, 1,-1],[-1, 1, 1]], // top face
    ];
    const allEdges = [...E, ...faces];
    const edgePts = Math.floor(n * 0.55);
    const per = Math.floor(edgePts / allEdges.length);
    for (let e = 0; e < allEdges.length; e++) {
      const [a, b] = allEdges[e];
      for (let i = 0; i < per; i++) {
        const t = i / per;
        out.push([a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]);
      }
    }
    // Internal 5×5×5 lattice (sci-fi atomic feel)
    const L = 5;
    const want = n - out.length;
    const each = Math.max(1, Math.floor(want / (L * L * L)));
    for (let i = 0; i < L; i++) for (let j = 0; j < L; j++) for (let k = 0; k < L; k++) {
      const x = (i / (L - 1) - 0.5) * 2;
      const y = (j / (L - 1) - 0.5) * 2;
      const z = (k / (L - 1) - 0.5) * 2;
      for (let r = 0; r < each; r++) {
        const jx = (Math.random() - 0.5) * 0.02;
        const jy = (Math.random() - 0.5) * 0.02;
        const jz = (Math.random() - 0.5) * 0.02;
        out.push([x + jx, y + jy, z + jz]);
      }
    }
    const s = 0.92;
    return pad(out.map(p => [p[0]*s, p[1]*s, p[2]*s]), n);
  }

  // 3. TORUS — linked Hopf-style two tori
  function genTorus(n) {
    const out = [];
    const each = Math.floor(n / 2);
    function torus(n, R0, r0, axis) {
      const arr = [];
      for (let i = 0; i < n; i++) {
        const u = (i / n) * TAU;
        const v = ((i * 9) / n) * TAU;
        const x = (R0 + r0 * Math.cos(v)) * Math.cos(u);
        const y = r0 * Math.sin(v);
        const z = (R0 + r0 * Math.cos(v)) * Math.sin(u);
        // rotate based on axis
        if (axis === 'x') arr.push([x, z, y]);
        else if (axis === 'z') arr.push([z, y, x]);
        else arr.push([x, y, z]);
      }
      return arr;
    }
    out.push(...torus(each, 0.78, 0.22, 'y'));
    out.push(...torus(n - each, 0.78, 0.22, 'x'));
    return pad(out, n);
  }

  // 4. DNA — triple helix with rungs
  function genHelix(n) {
    const out = [];
    const turns = 4, height = 1.6, radius = 0.55;
    const strands = 3;
    const strand = Math.floor(n * 0.7 / strands);
    for (let s = 0; s < strands; s++) {
      const phase = (s * TAU) / strands;
      for (let i = 0; i < strand; i++) {
        const t = i / strand;
        const a = t * turns * TAU + phase;
        out.push([Math.cos(a) * radius, t * height - height/2, Math.sin(a) * radius]);
      }
    }
    // rungs connecting pairs
    const rungs = 40;
    const perRung = Math.floor((n - out.length) / rungs);
    for (let r = 0; r < rungs; r++) {
      const t = r / rungs;
      const a1 = t * turns * TAU;
      const a2 = a1 + TAU/3;
      const p1 = [Math.cos(a1)*radius, t*height-height/2, Math.sin(a1)*radius];
      const p2 = [Math.cos(a2)*radius, t*height-height/2, Math.sin(a2)*radius];
      for (let i = 0; i < perRung; i++) {
        const u = i / perRung;
        out.push([p1[0]+(p2[0]-p1[0])*u, p1[1]+(p2[1]-p1[1])*u, p1[2]+(p2[2]-p1[2])*u]);
      }
    }
    return pad(out, n);
  }

  // 5. OCTAHEDRON — edges + center bonds
  function genOctahedron(n) {
    const V = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    const E = [];
    for (let i = 0; i < 6; i++) for (let j = i+1; j < 6; j++) {
      if (V[i][0]+V[j][0] === 0 && V[i][1]+V[j][1] === 0 && V[i][2]+V[j][2] === 0) continue;
      E.push([V[i], V[j]]);
    }
    // Plus bonds to center
    for (let i = 0; i < 6; i++) E.push([[0,0,0], V[i]]);
    const out = [];
    const per = Math.floor(n / E.length);
    for (let e = 0; e < E.length; e++) {
      const [a, b] = E[e];
      for (let i = 0; i < per; i++) {
        const t = i / per;
        out.push([a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]);
      }
    }
    const s = 1.04;
    return pad(out.map(p => [p[0]*s, p[1]*s, p[2]*s]), n);
  }

  // 6. GALAXY — 5-arm logarithmic spiral with stellar density
  function genGalaxy(n) {
    const out = [];
    const arms = 5;
    for (let i = 0; i < n; i++) {
      const arm = i % arms;
      const t = (Math.floor(i / arms) / Math.floor(n / arms));
      const ang = t * 5.5 * TAU + arm * (TAU / arms);
      const r = 0.18 + Math.pow(t, 0.7) * 1.15;
      const jx = (Math.random() - 0.5) * 0.12 * r;
      const jz = (Math.random() - 0.5) * 0.12 * r;
      const y  = (Math.random() - 0.5) * 0.10;
      out.push([Math.cos(ang) * r + jx, y, Math.sin(ang) * r + jz]);
    }
    return out;
  }

  // 7. WAVE — 3D interference pattern
  function genWave(n) {
    const out = [];
    const grid = Math.ceil(Math.sqrt(n));
    for (let i = 0; i < n; i++) {
      const gx = i % grid;
      const gz = Math.floor(i / grid);
      const x = (gx / (grid - 1) - 0.5) * 2.4;
      const z = (gz / (grid - 1) - 0.5) * 2.4;
      // interference of two sinusoids
      const y = (Math.sin(x * 3.2) * Math.cos(z * 3.2) + Math.sin((x + z) * 2.4) * 0.4) * 0.32;
      out.push([x * 0.62, y, z * 0.62]);
    }
    return out;
  }

  // 8. VORTEX — multi-strand spiral cone
  function genVortex(n) {
    const out = [];
    const turns = 10, height = 1.8, strands = 4;
    const per = Math.floor(n / strands);
    for (let s = 0; s < strands; s++) {
      const phase = (s * TAU) / strands;
      for (let i = 0; i < per; i++) {
        const t = i / per;
        const a = t * turns * TAU + phase;
        const r = 0.18 + (1 - t) * 0.95;
        out.push([Math.cos(a) * r, t * height - height/2, Math.sin(a) * r]);
      }
    }
    return pad(out, n);
  }

  // 9. STAR — 12-spike fibonacci starburst with secondary rays
  function genStar(n) {
    const out = [];
    const spikes = 12;
    const per = Math.floor(n / spikes);
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let s = 0; s < spikes; s++) {
      const y = 1 - (s / (spikes - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = phi * s;
      const dx = Math.cos(t) * r, dy = y, dz = Math.sin(t) * r;
      for (let i = 0; i < per; i++) {
        const u = (i / per) * 1.28;
        const taper = 0.88 + 0.12 * Math.sin(u * Math.PI);
        out.push([dx * u * taper, dy * u * taper, dz * u * taper]);
      }
    }
    return pad(out, n);
  }

  // 10. LORENZ — chaotic strange attractor
  function genLorenz(n) {
    const out = [];
    let x = 0.1, y = 0, z = 0;
    const sigma = 10, rho = 28, beta = 8/3, dt = 0.008;
    // burn-in
    for (let i = 0; i < 500; i++) {
      const dx = sigma * (y - x);
      const dy = x * (rho - z) - y;
      const dz = x * y - beta * z;
      x += dx * dt; y += dy * dt; z += dz * dt;
    }
    for (let i = 0; i < n; i++) {
      const dx = sigma * (y - x);
      const dy = x * (rho - z) - y;
      const dz = x * y - beta * z;
      x += dx * dt; y += dy * dt; z += dz * dt;
      out.push([x, y - 25, z]);
    }
    // normalize
    let mx = 0;
    for (const p of out) for (const v of p) mx = Math.max(mx, Math.abs(v));
    return out.map(p => [p[0]/mx * 1.15, p[1]/mx * 1.15, p[2]/mx * 1.15]);
  }

  // 11. LISSAJOUS — 3D parametric knot (3,2,7)
  function genLissajous(n) {
    const out = [];
    // Multiple layered curves for density
    const curves = 6;
    const per = Math.floor(n / curves);
    for (let c = 0; c < curves; c++) {
      const ph = (c / curves) * 0.3;
      for (let i = 0; i < per; i++) {
        const t = (i / per) * TAU;
        out.push([
          Math.sin(3 * t + ph) * 0.95,
          Math.sin(2 * t + Math.PI/4 + ph) * 0.95,
          Math.sin(7 * t + ph) * 0.95,
        ]);
      }
    }
    return pad(out, n);
  }

  // 12. MÖBIUS strip
  function genMobius(n) {
    const out = [];
    const M = Math.ceil(Math.sqrt(n));
    for (let i = 0; i < n; i++) {
      const u = (i % M / M) * TAU;
      const v = ((Math.floor(i / M)) / M - 0.5);
      const R0 = 0.85, w = 0.45;
      const cu2 = Math.cos(u / 2), su2 = Math.sin(u / 2);
      const x = (R0 + w * v * cu2) * Math.cos(u);
      const y = w * v * su2;
      const z = (R0 + w * v * cu2) * Math.sin(u);
      out.push([x, y, z]);
    }
    return out;
  }

  // 13. TESSERACT — 4D hypercube wireframe projected to 3D
  function genTesseract(n) {
    // 16 vertices in 4D ±1 each axis
    const V = [];
    for (let i = 0; i < 16; i++) {
      V.push([
        (i & 1) ? 1 : -1,
        (i & 2) ? 1 : -1,
        (i & 4) ? 1 : -1,
        (i & 8) ? 1 : -1,
      ]);
    }
    // 32 edges (pairs differing in exactly one coordinate)
    const E = [];
    for (let i = 0; i < 16; i++) for (let j = i+1; j < 16; j++) {
      let diff = 0;
      for (let k = 0; k < 4; k++) if (V[i][k] !== V[j][k]) diff++;
      if (diff === 1) E.push([V[i], V[j]]);
    }
    // Project 4D → 3D via simple slice (w-perspective)
    function proj(v4) {
      const w = v4[3];
      const k = 1 / (2.4 - w * 0.6);   // 4D perspective
      return [v4[0] * k, v4[1] * k, v4[2] * k];
    }
    const out = [];
    const per = Math.floor(n / E.length);
    for (let e = 0; e < E.length; e++) {
      const [a, b] = E[e];
      for (let i = 0; i < per; i++) {
        const t = i / per;
        const lerp = [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t, a[3]+(b[3]-a[3])*t];
        out.push(proj(lerp));
      }
    }
    const s = 0.92;
    return pad(out.map(p => [p[0]*s, p[1]*s, p[2]*s]), n);
  }

  // 14. SKULL — parametric skull (hacker culture)
  function genSkull(n) {
    const out = [];
    // Cranium: oblate sphere (top heavy)
    const cran = Math.floor(n * 0.42);
    for (let i = 0; i < cran; i++) {
      const u = (i / cran) * TAU;
      const v = Math.acos(2 * Math.random() - 1);
      // upper hemisphere mostly
      const yRaw = -Math.cos(v);    // -1..1 (cos(0)=1 at top of unit sphere; v=0..π)
      const y = yRaw > -0.2 ? yRaw : -0.2;   // flatten bottom
      const r = Math.sqrt(1 - y * y);
      const x = Math.cos(u) * r;
      const z = Math.sin(u) * r;
      out.push([x * 0.78, y * 0.92, z * 0.78]);
    }
    // Jaw — narrower ellipse below
    const jaw = Math.floor(n * 0.16);
    for (let i = 0; i < jaw; i++) {
      const u = (i / jaw) * Math.PI;          // bottom semicircle
      const cu = -Math.sin(u);
      const x = Math.cos(u) * 0.55;
      const y = cu * 0.32 - 0.55;
      const z = (Math.random() - 0.5) * 0.45;
      out.push([x, y, z]);
    }
    // Eye sockets — two ring "holes"
    const eyePer = Math.floor(n * 0.11 / 2);
    const eyeR = 0.16;
    for (let e = 0; e < 2; e++) {
      const ex = e === 0 ? -0.28 : 0.28;
      const ey = 0.10;
      for (let i = 0; i < eyePer; i++) {
        // disc fill (denser at edge)
        const a = Math.random() * TAU;
        const rr = Math.sqrt(Math.random()) * eyeR;
        out.push([ex + Math.cos(a) * rr, ey + Math.sin(a) * rr, 0.52 + (Math.random() - 0.5) * 0.1]);
      }
    }
    // Nose triangle
    const nose = Math.floor(n * 0.07);
    for (let i = 0; i < nose; i++) {
      const t = Math.random();
      const w = 0.07 * (1 - t);
      const x = (Math.random() - 0.5) * w * 2;
      const y = -0.10 - t * 0.20;
      const z = 0.6 + (Math.random() - 0.5) * 0.1;
      out.push([x, y, z]);
    }
    // Teeth row (top + bottom)
    const teeth = Math.floor(n * 0.10);
    for (let i = 0; i < teeth; i++) {
      const t = (i / teeth);
      const x = (t - 0.5) * 0.65;
      const yTop = -0.42 + Math.sin(t * Math.PI * 12) * 0.025;
      const yBot = -0.55 + Math.sin(t * Math.PI * 12) * 0.025;
      const y = Math.random() < 0.5 ? yTop : yBot;
      const z = 0.55 + (Math.random() - 0.5) * 0.10;
      out.push([x, y, z]);
    }
    // Cheekbones & temple shading
    const extra = Math.floor(n * 0.14);
    for (let i = 0; i < extra; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = side * (0.55 + Math.random() * 0.25);
      const y = -0.08 + (Math.random() - 0.5) * 0.55;
      const z = (Math.random() - 0.5) * 0.85;
      out.push([x, y, z]);
    }
    return pad(out, n);
  }

  // 15. ROSE — 3D rose curve (rhodonea) twisted
  function genRose(n) {
    const out = [];
    const petals = 7;
    const layers = 8;
    const per = Math.floor(n / layers);
    for (let l = 0; l < layers; l++) {
      const tilt = (l / layers - 0.5) * 1.2;
      const ph   = l * 0.4;
      for (let i = 0; i < per; i++) {
        const t = (i / per) * TAU;
        const rr = Math.cos(petals * t + ph) * (0.85 + Math.sin(t * 3) * 0.06);
        out.push([
          Math.cos(t) * rr,
          Math.sin(tilt) * rr,
          Math.sin(t) * rr * Math.cos(tilt),
        ]);
      }
    }
    return pad(out, n);
  }

  const FORM_GENS = [
    { name: 'SPHERE',     gen: genSphere },
    { name: 'CUBE',       gen: genCube },
    { name: 'TORUS-LINK', gen: genTorus },
    { name: 'LORENZ',     gen: genLorenz },
    { name: 'HELIX',      gen: genHelix },
    { name: 'LISSAJOUS',  gen: genLissajous },
    { name: 'STAR',       gen: genStar },
    { name: 'MÖBIUS',     gen: genMobius },
    { name: 'GALAXY',     gen: genGalaxy },
    { name: 'TESSERACT',  gen: genTesseract },
    { name: 'WAVE',       gen: genWave },
    { name: 'SKULL',      gen: genSkull },
    { name: 'VORTEX',     gen: genVortex },
    { name: 'OCTA',       gen: genOctahedron },
    { name: 'ROSE',       gen: genRose },
  ];
  const FORM_COUNT = FORM_GENS.length;

  // Generate all forms once at init
  const FORMS = FORM_GENS.map(f => f.gen(N));

  // -------- Smooth-morph permutation: sort each form by spatial key --------
  function sortKey(p) { return p[1] * 1.6 + p[0] * 0.9 + p[2] * 0.4; }
  function permute(positions) {
    const idx = positions.map((_, i) => i);
    idx.sort((a, b) => sortKey(positions[a]) - sortKey(positions[b]));
    return idx.map(i => positions[i]);
  }
  const FORMS_PERM = FORMS.map(permute);

  // -------- Per-form color (one random color each, shuffled) --------
  // Distribute 4 colors evenly across 15 forms, then shuffle.
  const FORM_COLOR = [];
  for (let i = 0; i < FORM_COUNT; i++) FORM_COLOR.push(i % 4);
  // Fisher-Yates shuffle
  for (let i = FORM_COLOR.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [FORM_COLOR[i], FORM_COLOR[j]] = [FORM_COLOR[j], FORM_COLOR[i]];
  }

  // -------- Particles --------
  const pts = new Array(N);
  for (let i = 0; i < N; i++) {
    const p0 = FORMS_PERM[0][i];
    pts[i] = {
      x: p0[0], y: p0[1], z: p0[2],
      vx: 0, vy: 0, vz: 0,
      sx: p0[0], sy: p0[1], sz: p0[2],
      tx: p0[0], ty: p0[1], tz: p0[2],
      t0: 0, t1: 0,
      delay: Math.random() * 520,
      phase: Math.random() * TAU,
      px: 0, py: 0, depth: 0, persp: 1,
    };
  }

  // -------- Morph state --------
  let form = 0, nextForm = 0;
  let morphing = false;
  let morphStart = 0;
  let lastMorph = performance.now();
  let burst = 0;
  const shockwaves = [];

  function triggerMorph(now) {
    morphing = true;
    morphStart = now;
    nextForm = (form + 1) % FORM_COUNT;
    for (let i = 0; i < N; i++) {
      const b = FORMS_PERM[nextForm][i];
      pts[i].sx = pts[i].x; pts[i].sy = pts[i].y; pts[i].sz = pts[i].z;
      pts[i].tx = b[0];      pts[i].ty = b[1];      pts[i].tz = b[2];
      pts[i].t0 = morphStart + pts[i].delay;
      pts[i].t1 = pts[i].t0 + MORPH_DUR * (0.65 + Math.random() * 0.45);
    }
    burst = 1.0;
    shockwaves.push({ start: now, color: FORM_COLOR[nextForm] });
    updateTelemetry(nextForm);
  }

  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // -------- Mouse --------
  let mouseX = -9999, mouseY = -9999;
  let mouseInCanvas = false;
  let targetRX = 0, targetRY = 0;
  let rotX = 0, rotY = 0, rotZ = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    const rect = canvas.getBoundingClientRect();
    const inCanvas = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    mouseInCanvas = inCanvas;
    const nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const ny = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    targetRY = Math.max(-1, Math.min(1, nx)) * 0.75;
    targetRX = Math.max(-1, Math.min(1, ny)) * 0.55;
  });

  // -------- Telemetry UI sync --------
  const $nodes  = document.getElementById('tele-nodes');
  const $radius = document.getElementById('tele-radius');
  const $faces  = document.getElementById('tele-faces');
  const $colorHex = document.getElementById('tele-color');
  function colorHexStr(idx) {
    const c = COLORS[idx];
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  function updateTelemetry(idx) {
    if ($nodes)  $nodes.textContent  = String(N);
    if ($radius) $radius.textContent = (1 + Math.sin(idx * 0.7) * 0.15).toFixed(2);
    if ($faces)  $faces.textContent  = FORM_GENS[idx].name;
    if ($colorHex) $colorHex.textContent = colorHexStr(FORM_COLOR[idx]);
  }
  updateTelemetry(0);

  // -------- Render loop --------
  function frame(now) {
    if (!morphing && now - lastMorph > MORPH_INTERVAL) triggerMorph(now);
    if (morphing) {
      const allDone = pts.every(p => now > p.t1);
      if (allDone) { morphing = false; form = nextForm; lastMorph = now; }
    }
    burst *= 0.92;

    // Smooth rotation
    rotX += (targetRX - rotX) * 0.06;
    rotY += (targetRY - rotY) * 0.06;
    rotZ += ROT_BASE_Y;
    const pitch = rotX + 0.32;
    const yaw   = rotY + rotZ;
    const cyaw = Math.cos(yaw), syaw = Math.sin(yaw);
    const cpit = Math.cos(pitch), spit = Math.sin(pitch);

    // Clear canvas transparently
    ctx.clearRect(0, 0, W, H);

    // Update + project particles
    for (let i = 0; i < N; i++) {
      const p = pts[i];
      let tx, ty, tz;
      if (morphing) {
        const u = Math.max(0, Math.min(1, (now - p.t0) / (p.t1 - p.t0)));
        const e = easeInOutCubic(u);
        const ix = p.sx + (p.tx - p.sx) * e;
        const iy = p.sy + (p.ty - p.sy) * e;
        const iz = p.sz + (p.tz - p.sz) * e;
        const bulge = Math.sin(e * Math.PI) * 0.18;
        tx = ix * (1 + bulge);
        ty = iy * (1 + bulge);
        tz = iz * (1 + bulge);
      } else {
        const cur = FORMS_PERM[form][i];
        tx = cur[0]; ty = cur[1]; tz = cur[2];
      }
      tx += Math.sin(now * 0.0009 + p.phase) * 0.005;
      ty += Math.cos(now * 0.0011 + p.phase) * 0.005;

      p.vx = (p.vx + (tx - p.x) * SPRING_K * 22) * DAMPING;
      p.vy = (p.vy + (ty - p.y) * SPRING_K * 22) * DAMPING;
      p.vz = (p.vz + (tz - p.z) * SPRING_K * 22) * DAMPING;
      p.x += p.vx; p.y += p.vy; p.z += p.vz;

      // 3D rotate
      let X = p.x * cyaw + p.z * syaw;
      let Z = -p.x * syaw + p.z * cyaw;
      let Y = p.y;
      const Yp = Y * cpit - Z * spit;
      const Zp = Y * spit + Z * cpit;
      Y = Yp; Z = Zp;
      const persp = 1 / (1 + Z * 0.42);
      p.px = CX + X * R * persp;
      p.py = CY + Y * R * persp;
      p.depth = Z;
      p.persp = persp;
    }

    // Mouse repulsion
    if (mouseInCanvas) {
      const rect = canvas.getBoundingClientRect();
      const mx = mouseX - rect.left;
      const my = mouseY - rect.top;
      const R2 = REPULSE_R * REPULSE_R;
      for (let i = 0; i < N; i++) {
        const p = pts[i];
        const dx = p.px - mx;
        const dy = p.py - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = (1 - d / REPULSE_R) * REPULSE_K;
          p.px += (dx / d) * f * 22;
          p.py += (dy / d) * f * 22;
        }
      }
    }

    // === Draw — one color per frame (lerped during morph) ===
    let rgb;
    if (morphing) {
      const t = Math.min(1, (now - morphStart) / MORPH_DUR);
      const e = easeInOutCubic(t);
      const a = COLORS[FORM_COLOR[form]];
      const b = COLORS[FORM_COLOR[nextForm]];
      rgb = [a[0] + (b[0]-a[0]) * e | 0, a[1] + (b[1]-a[1]) * e | 0, a[2] + (b[2]-a[2]) * e | 0];
    } else {
      rgb = COLORS[FORM_COLOR[form]];
    }
    ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    ctx.globalAlpha = 0.85;

    // Draw all particles as fillRect — much faster than arc
    for (let i = 0; i < N; i++) {
      const p = pts[i];
      const back = (p.depth + 1) * 0.5;        // 0=front, 1=back
      const size = (0.9 + (1 - back) * 1.7) * p.persp * (1 + burst * 0.25);
      const half = size * 0.5;
      ctx.fillRect(p.px - half, p.py - half, size, size);
    }
    ctx.globalAlpha = 1;

    // === Shockwaves (still drawn with stroke; cheap) ===
    for (let s = shockwaves.length - 1; s >= 0; s--) {
      const sw = shockwaves[s];
      const t = (now - sw.start) / 900;
      if (t >= 1) { shockwaves.splice(s, 1); continue; }
      const r = R * (0.6 + t * 1.6);
      const a = (1 - t) * 0.5;
      const cg = COLORS_GLOW[sw.color];
      ctx.strokeStyle = `rgba(${cg[0]},${cg[1]},${cg[2]},${a.toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(CX, CY, r, 0, TAU);
      ctx.stroke();
      const r2 = R * (0.4 + t * 1.2);
      const a2 = (1 - t) * 0.28;
      ctx.strokeStyle = `rgba(${cg[0]},${cg[1]},${cg[2]},${a2.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(CX, CY, r2, 0, TAU);
      ctx.stroke();
    }

    // === Mouse reticle ===
    if (mouseInCanvas) {
      const rect = canvas.getBoundingClientRect();
      const mx = mouseX - rect.left;
      const my = mouseY - rect.top;
      const g = 18, b = 6;
      const cg = COLORS_GLOW[FORM_COLOR[form]];
      ctx.strokeStyle = `rgba(${cg[0]},${cg[1]},${cg[2]},0.6)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mx - g, my - g + b); ctx.lineTo(mx - g, my - g); ctx.lineTo(mx - g + b, my - g);
      ctx.moveTo(mx + g - b, my - g); ctx.lineTo(mx + g, my - g); ctx.lineTo(mx + g, my - g + b);
      ctx.moveTo(mx + g, my + g - b); ctx.lineTo(mx + g, my + g); ctx.lineTo(mx + g - b, my + g);
      ctx.moveTo(mx - g + b, my + g); ctx.lineTo(mx - g, my + g); ctx.lineTo(mx - g, my + g - b);
      ctx.stroke();
      ctx.fillStyle = `rgba(${cg[0]},${cg[1]},${cg[2]},0.85)`;
      ctx.fillRect(mx - 1, my - 1, 2, 2);
    }

    requestAnimationFrame(frame);
  }

  resize();
  requestAnimationFrame(frame);
})();
