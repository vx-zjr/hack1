export type ModelForm = {
  name: string;
  positions: Float32Array;
  color: string;
};

export const MODEL_PALETTE = ['#3AFF7C', '#FFDC5A', '#6EC8FF', '#FF697E'] as const;

type Point = [number, number, number];

const TAU = Math.PI * 2;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pack(points: Point[], count: number, scale = 1.45) {
  while (points.length < count) points.push(points[points.length % Math.max(1, points.length)] ?? [0, 0, 0]);
  const sliced = points.slice(0, count);
  let max = 0.001;
  for (const p of sliced) max = Math.max(max, Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]));
  const out = new Float32Array(count * 3);
  sliced.forEach((p, index) => {
    out[index * 3] = (p[0] / max) * scale;
    out[index * 3 + 1] = (p[1] / max) * scale;
    out[index * 3 + 2] = (p[2] / max) * scale;
  });
  return out;
}

function line(a: Point, b: Point, steps: number, out: Point[]) {
  for (let i = 0; i < steps; i += 1) {
    const t = i / Math.max(1, steps - 1);
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
  }
}

function klein(count: number): Float32Array {
  const points: Point[] = [];
  const rows = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < rows; i += 1) {
    const u = (i / rows) * TAU;
    for (let j = 0; j < rows && points.length < count; j += 1) {
      const v = (j / rows) * TAU;
      const r = 2.4 + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v);
      const x = Math.cos(u) * r;
      const y = Math.sin(u) * r;
      const z = Math.sin(u / 2) * Math.sin(v) + Math.cos(u / 2) * Math.sin(2 * v);
      points.push([x, y, z]);
    }
  }
  return pack(points, count, 1.32);
}

function mobius(count: number): Float32Array {
  const points: Point[] = [];
  const rows = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < rows; i += 1) {
    const u = (i / rows) * TAU;
    for (let j = 0; j < rows && points.length < count; j += 1) {
      const v = j / rows - 0.5;
      const x = (1 + v * 0.55 * Math.cos(u / 2)) * Math.cos(u);
      const y = v * 0.55 * Math.sin(u / 2);
      const z = (1 + v * 0.55 * Math.cos(u / 2)) * Math.sin(u);
      points.push([x, y, z]);
    }
  }
  return pack(points, count, 1.55);
}

function lorenz(count: number): Float32Array {
  const points: Point[] = [];
  let x = 0.1;
  let y = 0;
  let z = 0;
  const dt = 0.007;
  for (let i = 0; i < count + 700; i += 1) {
    const dx = 10 * (y - x);
    const dy = x * (28 - z) - y;
    const dz = x * y - (8 / 3) * z;
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
    if (i > 700) points.push([x, y - 24, z]);
  }
  return pack(points, count, 1.5);
}

function tesseract(count: number): Float32Array {
  const vertices: number[][] = [];
  for (let i = 0; i < 16; i += 1) {
    vertices.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1, (i & 8) ? 1 : -1]);
  }
  const edges: Array<[number[], number[]]> = [];
  for (let i = 0; i < vertices.length; i += 1) {
    for (let j = i + 1; j < vertices.length; j += 1) {
      const diff = vertices[i].filter((v, k) => v !== vertices[j][k]).length;
      if (diff === 1) edges.push([vertices[i], vertices[j]]);
    }
  }
  const points: Point[] = [];
  const per = Math.ceil(count / edges.length);
  const project = (v: number[]): Point => {
    const k = 1 / (2.35 - v[3] * 0.55);
    return [v[0] * k, v[1] * k, v[2] * k];
  };
  for (const [a, b] of edges) {
    for (let i = 0; i < per; i += 1) {
      const t = i / Math.max(1, per - 1);
      points.push(project(a.map((value, k) => value + (b[k] - value) * t)));
    }
  }
  return pack(points, count, 1.6);
}

function paramSurface(count: number): Float32Array {
  const points: Point[] = [];
  const rows = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < rows; i += 1) {
    const u = (i / rows - 0.5) * 4.8;
    for (let j = 0; j < rows && points.length < count; j += 1) {
      const v = (j / rows - 0.5) * 4.8;
      const y = Math.sin(u * 1.7) * Math.cos(v * 1.7) * 0.5 + Math.sin((u + v) * 1.1) * 0.22;
      points.push([u, y, v]);
    }
  }
  return pack(points, count, 1.38);
}

function mandelbulb(count: number): Float32Array {
  const points: Point[] = [];
  const rand = mulberry32(1309);
  for (let i = 0; i < count * 1.5 && points.length < count; i += 1) {
    const theta = rand() * TAU;
    const phi = Math.acos(rand() * 2 - 1);
    const shell = Math.pow(Math.abs(Math.sin(theta * 4) * Math.cos(phi * 5)), 0.18);
    const r = 0.28 + shell * (0.85 + rand() * 0.25);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.sin(theta);
    if (Math.sin(8 * theta) + Math.cos(6 * phi) > -0.85) points.push([x, y, z]);
  }
  return pack(points, count, 1.55);
}

function lSystem(count: number): Float32Array {
  const points: Point[] = [];
  const rand = mulberry32(771);
  function branch(origin: Point, angle: number, tilt: number, length: number, depth: number) {
    if (depth <= 0 || points.length >= count) return;
    const end: Point = [
      origin[0] + Math.cos(angle) * Math.cos(tilt) * length,
      origin[1] + Math.sin(tilt) * length,
      origin[2] + Math.sin(angle) * Math.cos(tilt) * length,
    ];
    line(origin, end, Math.max(18, Math.floor(length * 70)), points);
    const forks = depth > 3 ? 3 : 2;
    for (let i = 0; i < forks; i += 1) {
      branch(end, angle + (rand() - 0.5) * 1.35, tilt + (rand() - 0.25) * 0.9, length * (0.58 + rand() * 0.12), depth - 1);
    }
  }
  branch([0, -1.1, 0], Math.PI / 2, 0.75, 1.05, 9);
  return pack(points, count, 1.52);
}

function skull(count: number): Float32Array {
  const points: Point[] = [];
  const rand = mulberry32(666);
  const cranium = Math.floor(count * 0.45);
  for (let i = 0; i < cranium; i += 1) {
    const t = rand() * TAU;
    const y = Math.max(-0.28, rand() * 1.55 - 0.45);
    const r = Math.sqrt(Math.max(0, 1 - y * y * 0.55)) * (0.74 + rand() * 0.18);
    points.push([Math.cos(t) * r * 0.85, y, Math.sin(t) * r * 0.72]);
  }
  for (let side of [-1, 1]) {
    for (let i = 0; i < count * 0.08; i += 1) {
      const a = rand() * TAU;
      const rr = Math.sqrt(rand()) * 0.22;
      points.push([side * 0.34 + Math.cos(a) * rr, 0.12 + Math.sin(a) * rr, 0.6 + (rand() - 0.5) * 0.09]);
    }
  }
  for (let i = 0; i < count * 0.14; i += 1) {
    const x = (rand() - 0.5) * 0.72;
    const y = -0.42 - rand() * 0.33;
    const z = 0.45 + (rand() - 0.5) * 0.28;
    points.push([x, y, z]);
  }
  for (let i = 0; i < count * 0.15; i += 1) {
    const x = (rand() - 0.5) * 0.7;
    const y = -0.56 + Math.sin(x * 45) * 0.04;
    points.push([x, y, 0.66 + (rand() - 0.5) * 0.05]);
  }
  return pack(points, count, 1.55);
}

function pcb(count: number): Float32Array {
  const points: Point[] = [];
  const rand = mulberry32(4096);
  const traces = 90;
  for (let t = 0; t < traces; t += 1) {
    let p: Point = [(rand() - 0.5) * 2.4, (rand() - 0.5) * 1.5, (rand() - 0.5) * 0.28];
    const steps = 5 + Math.floor(rand() * 7);
    for (let s = 0; s < steps; s += 1) {
      const next: Point = [
        p[0] + (rand() > 0.5 ? 1 : -1) * (0.12 + rand() * 0.34),
        p[1] + (rand() > 0.5 ? 1 : -1) * (0.08 + rand() * 0.22),
        p[2],
      ];
      line(p, next, 20, points);
      p = next;
    }
  }
  for (let i = 0; i < count * 0.2; i += 1) {
    const x = Math.round((rand() - 0.5) * 18) / 7;
    const y = Math.round((rand() - 0.5) * 12) / 7;
    const z = (rand() - 0.5) * 0.3;
    points.push([x, y, z]);
  }
  return pack(points, count, 1.55);
}

function binaryRain(count: number): Float32Array {
  const points: Point[] = [];
  const rand = mulberry32(10101);
  const columns = 120;
  const per = Math.ceil(count / columns);
  for (let c = 0; c < columns; c += 1) {
    const x = (c / columns - 0.5) * 2.4 + (rand() - 0.5) * 0.02;
    const z = (rand() - 0.5) * 0.9;
    for (let i = 0; i < per; i += 1) {
      const y = 1.2 - (i / per) * 2.4;
      points.push([x + Math.sin(i * 0.7) * 0.02, y, z + Math.cos(i * 0.4) * 0.025]);
    }
  }
  return pack(points, count, 1.58);
}

function keycaps(count: number): Float32Array {
  const points: Point[] = [];
  const cols = 14;
  const rows = 6;
  const perKey = Math.ceil(count / (cols * rows));
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cx = (x - cols / 2) * 0.18 + (y % 2) * 0.04;
      const cz = (y - rows / 2) * 0.18;
      for (let i = 0; i < perKey; i += 1) {
        const edge = i % 4;
        const t = (i / perKey) % 1;
        const px = cx + (edge < 2 ? t - 0.5 : edge === 2 ? -0.5 : 0.5) * 0.12;
        const pz = cz + (edge >= 2 ? t - 0.5 : edge === 0 ? -0.5 : 0.5) * 0.12;
        points.push([px, Math.sin((x + y) * 0.55) * 0.08, pz]);
      }
    }
  }
  return pack(points, count, 1.62);
}

function terminalCube(count: number): Float32Array {
  const points: Point[] = [];
  const vertices: Point[] = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  const per = Math.ceil(count * 0.6 / edges.length);
  for (const [a, b] of edges) line(vertices[a], vertices[b], per, points);
  for (let z = -0.8; z <= 0.8; z += 0.18) {
    line([-0.7, z, 1.02], [0.7, z, 1.02], 90, points);
  }
  return pack(points, count, 1.45);
}

function cameraRig(count: number): Float32Array {
  const points: Point[] = [];
  for (let i = 0; i < count * 0.35; i += 1) {
    const a = (i / (count * 0.35)) * TAU;
    points.push([Math.cos(a) * 0.72, Math.sin(a) * 0.42, 0.12]);
    points.push([Math.cos(a) * 0.28, Math.sin(a) * 0.18, 0.46]);
  }
  line([-0.95, -0.55, 0], [0.95, -0.55, 0], 1000, points);
  line([-0.9, 0.55, 0], [0.9, 0.55, 0], 1000, points);
  line([-0.95, -0.55, 0], [-0.9, 0.55, 0], 600, points);
  line([0.95, -0.55, 0], [0.9, 0.55, 0], 600, points);
  line([0.25, 0.55, 0], [0.55, 0.98, 0.18], 700, points);
  line([-0.25, 0.55, 0], [-0.55, 0.98, 0.18], 700, points);
  return pack(points, count, 1.55);
}

function asciiText(count: number): Float32Array {
  const glyphs: Record<string, string[]> = {
    H: ['1...1', '1...1', '1...1', '11111', '1...1', '1...1', '1...1'],
    A: ['.111.', '1...1', '1...1', '11111', '1...1', '1...1', '1...1'],
    C: ['.1111', '1....', '1....', '1....', '1....', '1....', '.1111'],
    K: ['1...1', '1..1.', '1.1..', '11...', '1.1..', '1..1.', '1...1'],
    O: ['.111.', '1...1', '1...1', '1...1', '1...1', '1...1', '.111.'],
    S: ['11111', '1....', '1....', '.111.', '....1', '....1', '1111.'],
  };
  const text = 'HACKOS';
  const points: Point[] = [];
  const perCell = Math.ceil(count / 160);
  for (let g = 0; g < text.length; g += 1) {
    const rows = glyphs[text[g]];
    for (let y = 0; y < rows.length; y += 1) {
      for (let x = 0; x < rows[y].length; x += 1) {
        if (rows[y][x] !== '1') continue;
        for (let i = 0; i < perCell; i += 1) {
          points.push([(g * 6 + x) * 0.09 - 1.55, (3 - y) * 0.12, (i / perCell - 0.5) * 0.18]);
        }
      }
    }
  }
  return pack(points, count, 1.72);
}

function sphereGrid(count: number): Float32Array {
  const points: Point[] = [];
  const surface = Math.floor(count * 0.52);
  for (let i = 0; i < surface; i += 1) {
    const y = 1 - (i / Math.max(1, surface - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = Math.PI * (3 - Math.sqrt(5)) * i;
    points.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  const circles = 18;
  const perCircle = Math.ceil((count - points.length) / circles);
  for (let c = 0; c < circles; c += 1) {
    const a = (c / circles) * Math.PI;
    for (let i = 0; i < perCircle; i += 1) {
      const t = (i / perCircle) * TAU;
      points.push([Math.cos(t) * Math.cos(a), Math.sin(t), Math.cos(t) * Math.sin(a)]);
    }
  }
  return pack(points, count, 1.5);
}

function cubeLattice(count: number): Float32Array {
  const points: Point[] = [];
  const vertices: Point[] = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
    [0, 6],
    [1, 7],
    [2, 4],
    [3, 5],
  ];
  const per = Math.ceil(count * 0.62 / edges.length);
  for (const [a, b] of edges) line(vertices[a], vertices[b], per, points);
  const grid = 7;
  for (let x = 0; x < grid; x += 1) {
    for (let y = 0; y < grid; y += 1) {
      for (let z = 0; z < grid; z += 1) {
        points.push([(x / (grid - 1) - 0.5) * 2, (y / (grid - 1) - 0.5) * 2, (z / (grid - 1) - 0.5) * 2]);
      }
    }
  }
  return pack(points, count, 1.42);
}

function torusLink(count: number): Float32Array {
  const points: Point[] = [];
  const torus = (n: number, axis: 'x' | 'y' | 'z') => {
    for (let i = 0; i < n; i += 1) {
      const u = (i / n) * TAU * 2;
      const v = ((i * 13) / n) * TAU;
      const x = (0.8 + 0.23 * Math.cos(v)) * Math.cos(u);
      const y = 0.23 * Math.sin(v);
      const z = (0.8 + 0.23 * Math.cos(v)) * Math.sin(u);
      if (axis === 'x') points.push([x, z, y]);
      else if (axis === 'z') points.push([z, y, x]);
      else points.push([x, y, z]);
    }
  };
  torus(Math.floor(count / 3), 'y');
  torus(Math.floor(count / 3), 'x');
  torus(count - points.length, 'z');
  return pack(points, count, 1.48);
}

function tripleHelix(count: number): Float32Array {
  const points: Point[] = [];
  const strands = 3;
  const turns = 5.5;
  const strandCount = Math.floor(count * 0.68 / strands);
  for (let s = 0; s < strands; s += 1) {
    const phase = (s * TAU) / strands;
    for (let i = 0; i < strandCount; i += 1) {
      const t = i / strandCount;
      const a = t * turns * TAU + phase;
      points.push([Math.cos(a) * 0.58, t * 1.9 - 0.95, Math.sin(a) * 0.58]);
    }
  }
  const rungs = 90;
  const per = Math.ceil((count - points.length) / rungs);
  for (let r = 0; r < rungs; r += 1) {
    const t = r / rungs;
    const a = t * turns * TAU;
    const p1: Point = [Math.cos(a) * 0.58, t * 1.9 - 0.95, Math.sin(a) * 0.58];
    const p2: Point = [Math.cos(a + TAU / 3) * 0.58, t * 1.9 - 0.95, Math.sin(a + TAU / 3) * 0.58];
    line(p1, p2, per, points);
  }
  return pack(points, count, 1.55);
}

function octaNet(count: number): Float32Array {
  const points: Point[] = [];
  const vertices: Point[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const edges: Array<[Point, Point]> = [];
  for (let i = 0; i < vertices.length; i += 1) {
    for (let j = i + 1; j < vertices.length; j += 1) {
      if (vertices[i][0] + vertices[j][0] === 0 && vertices[i][1] + vertices[j][1] === 0 && vertices[i][2] + vertices[j][2] === 0) continue;
      edges.push([vertices[i], vertices[j]]);
    }
    edges.push([[0, 0, 0], vertices[i]]);
  }
  const per = Math.ceil(count / edges.length);
  for (const [a, b] of edges) line(a, b, per, points);
  return pack(points, count, 1.5);
}

function galaxy(count: number): Float32Array {
  const points: Point[] = [];
  const rand = mulberry32(614);
  const arms = 6;
  for (let i = 0; i < count; i += 1) {
    const arm = i % arms;
    const t = Math.floor(i / arms) / Math.ceil(count / arms);
    const angle = t * 6.4 * TAU + (arm * TAU) / arms;
    const r = 0.14 + Math.pow(t, 0.68) * 1.18;
    points.push([
      Math.cos(angle) * r + (rand() - 0.5) * 0.18 * r,
      (rand() - 0.5) * 0.16,
      Math.sin(angle) * r + (rand() - 0.5) * 0.18 * r,
    ]);
  }
  return pack(points, count, 1.55);
}

function waveField(count: number): Float32Array {
  const points: Point[] = [];
  const grid = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < count; i += 1) {
    const gx = i % grid;
    const gz = Math.floor(i / grid);
    const x = (gx / (grid - 1) - 0.5) * 2.7;
    const z = (gz / (grid - 1) - 0.5) * 2.7;
    const y = (Math.sin(x * 4.1) * Math.cos(z * 3.4) + Math.sin((x + z) * 2.2) * 0.45) * 0.35;
    points.push([x, y, z]);
  }
  return pack(points, count, 1.38);
}

function vortex(count: number): Float32Array {
  const points: Point[] = [];
  const strands = 7;
  const per = Math.ceil(count / strands);
  for (let s = 0; s < strands; s += 1) {
    const phase = (s * TAU) / strands;
    for (let i = 0; i < per; i += 1) {
      const t = i / per;
      const a = t * TAU * 12 + phase;
      const r = 0.12 + (1 - t) * 1.05;
      points.push([Math.cos(a) * r, t * 2 - 1, Math.sin(a) * r]);
    }
  }
  return pack(points, count, 1.52);
}

function starburst(count: number): Float32Array {
  const points: Point[] = [];
  const spikes = 18;
  const per = Math.ceil(count / spikes);
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let s = 0; s < spikes; s += 1) {
    const y = 1 - (s / (spikes - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = phi * s;
    const dir: Point = [Math.cos(t) * r, y, Math.sin(t) * r];
    for (let i = 0; i < per; i += 1) {
      const u = (i / per) * 1.38;
      points.push([dir[0] * u, dir[1] * u, dir[2] * u]);
    }
  }
  return pack(points, count, 1.5);
}

function lissajous(count: number): Float32Array {
  const points: Point[] = [];
  const curves = 11;
  const per = Math.ceil(count / curves);
  for (let c = 0; c < curves; c += 1) {
    const ph = (c / curves) * 0.8;
    for (let i = 0; i < per; i += 1) {
      const t = (i / per) * TAU;
      points.push([Math.sin(3 * t + ph), Math.sin(2 * t + Math.PI / 4 + ph), Math.sin(7 * t + ph)]);
    }
  }
  return pack(points, count, 1.48);
}

function rose(count: number): Float32Array {
  const points: Point[] = [];
  const layers = 12;
  const per = Math.ceil(count / layers);
  for (let l = 0; l < layers; l += 1) {
    const tilt = (l / layers - 0.5) * 1.35;
    const phase = l * 0.34;
    for (let i = 0; i < per; i += 1) {
      const t = (i / per) * TAU;
      const r = Math.cos(7 * t + phase) * (0.9 + Math.sin(t * 3) * 0.08);
      points.push([Math.cos(t) * r, Math.sin(tilt) * r, Math.sin(t) * r * Math.cos(tilt)]);
    }
  }
  return pack(points, count, 1.52);
}

function fingerprint(count: number): Float32Array {
  const points: Point[] = [];
  const ridges = 18;
  const per = Math.ceil(count / ridges);
  for (let r = 0; r < ridges; r += 1) {
    const base = 0.12 + r * 0.052;
    for (let i = 0; i < per; i += 1) {
      const t = (i / per) * TAU * (0.72 + r * 0.018);
      const wobble = Math.sin(t * 3.0 + r) * 0.035 + Math.sin(t * 7.0) * 0.012;
      const x = Math.cos(t) * (base + wobble);
      const y = Math.sin(t) * (base * 1.25 + wobble);
      const z = Math.sin(t * 2.0 + r) * 0.12;
      if (Math.abs(x) < 0.92 && Math.abs(y) < 1.18) points.push([x, y, z]);
    }
  }
  return pack(points, count, 1.5);
}

function intelGraph(count: number): Float32Array {
  const points: Point[] = [];
  const rand = mulberry32(2407);
  const hubs = Array.from({ length: 42 }, (): Point => [(rand() - 0.5) * 2.1, (rand() - 0.5) * 1.55, (rand() - 0.5) * 0.9]);
  for (let i = 0; i < hubs.length; i += 1) {
    for (let j = i + 1; j < hubs.length; j += 1) {
      const dx = hubs[i][0] - hubs[j][0];
      const dy = hubs[i][1] - hubs[j][1];
      const dz = hubs[i][2] - hubs[j][2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 0.62 || rand() > 0.965) line(hubs[i], hubs[j], 28, points);
    }
  }
  for (const hub of hubs) {
    for (let i = 0; i < 90; i += 1) {
      const a = (i / 90) * TAU;
      points.push([hub[0] + Math.cos(a) * 0.035, hub[1] + Math.sin(a) * 0.035, hub[2]]);
    }
  }
  return pack(points, count, 1.55);
}

function satelliteArray(count: number): Float32Array {
  const points: Point[] = [];
  const rand = mulberry32(6174);
  const sats = 18;
  for (let s = 0; s < sats; s += 1) {
    const a = (s / sats) * TAU;
    const orbit = 0.45 + (s % 5) * 0.18;
    const center: Point = [Math.cos(a) * orbit, Math.sin(a * 1.7) * 0.42, Math.sin(a) * orbit];
    line([0, 0, 0], center, 80, points);
    for (let i = 0; i < 220; i += 1) {
      const u = (rand() - 0.5) * 0.24;
      const v = (rand() - 0.5) * 0.1;
      points.push([center[0] + u, center[1] + v, center[2] + (rand() - 0.5) * 0.18]);
      points.push([center[0] - u, center[1] + v, center[2] + (rand() - 0.5) * 0.18]);
    }
  }
  return pack(points, count, 1.55);
}

function radarDish(count: number): Float32Array {
  const points: Point[] = [];
  const rings = 34;
  const perRing = Math.ceil(count * 0.74 / rings);
  for (let r = 0; r < rings; r += 1) {
    const radius = (r / rings) * 1.1;
    for (let i = 0; i < perRing; i += 1) {
      const t = (i / perRing) * TAU;
      const y = -radius * radius * 0.48 + 0.42;
      points.push([Math.cos(t) * radius, y, Math.sin(t) * radius * 0.72]);
    }
  }
  for (let i = 0; i < count * 0.18; i += 1) {
    const t = (i / (count * 0.18)) * TAU * 2.4;
    const r = i / (count * 0.18);
    points.push([Math.cos(t) * r * 1.15, 0.18 + r * 0.2, Math.sin(t) * r * 0.8]);
  }
  return pack(points, count, 1.45);
}

function eyeScan(count: number): Float32Array {
  const points: Point[] = [];
  const rand = mulberry32(31337);
  for (let i = 0; i < count * 0.42; i += 1) {
    const t = (i / (count * 0.42)) * TAU;
    points.push([Math.cos(t) * 1.05, Math.sin(t) * 0.45, Math.sin(t * 2) * 0.1]);
  }
  for (let i = 0; i < count * 0.35; i += 1) {
    const t = rand() * TAU;
    const r = Math.sqrt(rand()) * 0.52;
    points.push([Math.cos(t) * r, Math.sin(t) * r, 0.34 + Math.sin(t * 5) * 0.08]);
  }
  for (let i = 0; i < count * 0.2; i += 1) {
    const y = (i / (count * 0.2) - 0.5) * 1.05;
    points.push([-1.1 + (i % 9) * 0.015, y, 0.18]);
    points.push([1.1 - (i % 9) * 0.015, y, 0.18]);
  }
  return pack(points, count, 1.5);
}

function cityGrid(count: number): Float32Array {
  const points: Point[] = [];
  const rand = mulberry32(8080);
  const size = 16;
  const perTower = Math.ceil(count / (size * size));
  for (let x = 0; x < size; x += 1) {
    for (let z = 0; z < size; z += 1) {
      const h = 0.12 + rand() * 1.1;
      const cx = (x / (size - 1) - 0.5) * 2.2;
      const cz = (z / (size - 1) - 0.5) * 2.2;
      for (let i = 0; i < perTower; i += 1) {
        const y = -0.75 + (i / perTower) * h;
        const edge = i % 4;
        points.push([cx + (edge < 2 ? (rand() - 0.5) * 0.04 : edge === 2 ? -0.045 : 0.045), y, cz + (edge >= 2 ? (rand() - 0.5) * 0.04 : edge === 0 ? -0.045 : 0.045)]);
      }
    }
  }
  return pack(points, count, 1.5);
}

function neuralMesh(count: number): Float32Array {
  const points: Point[] = [];
  const layers = 7;
  const perLayer = 20;
  const nodes: Point[] = [];
  for (let l = 0; l < layers; l += 1) {
    for (let n = 0; n < perLayer; n += 1) {
      const a = (n / perLayer) * TAU + l * 0.35;
      nodes.push([(l / (layers - 1) - 0.5) * 2.1, Math.cos(a) * (0.25 + l * 0.03), Math.sin(a) * (0.8 - l * 0.04)]);
    }
  }
  for (let l = 0; l < layers - 1; l += 1) {
    for (let n = 0; n < perLayer; n += 1) {
      const a = nodes[l * perLayer + n];
      line(a, nodes[(l + 1) * perLayer + n], 24, points);
      line(a, nodes[(l + 1) * perLayer + ((n + 5) % perLayer)], 18, points);
    }
  }
  return pack(points, count, 1.52);
}

function lockMatrix(count: number): Float32Array {
  const points: Point[] = [];
  const cols = 14;
  const rows = 10;
  const perCell = Math.ceil(count / (cols * rows));
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cx = (x / (cols - 1) - 0.5) * 2.1;
      const cy = (y / (rows - 1) - 0.5) * 1.35;
      for (let i = 0; i < perCell; i += 1) {
        const t = (i / perCell) * TAU;
        const shape = (x + y) % 3;
        if (shape === 0) points.push([cx + Math.cos(t) * 0.05, cy + Math.sin(t) * 0.05, Math.sin(t) * 0.08]);
        else if (shape === 1) points.push([cx + (i % 2 ? -0.06 : 0.06), cy + (i / perCell - 0.5) * 0.12, 0]);
        else points.push([cx + (i / perCell - 0.5) * 0.12, cy + (i % 2 ? -0.06 : 0.06), 0]);
      }
    }
  }
  return pack(points, count, 1.58);
}

function droneSwarm(count: number): Float32Array {
  const points: Point[] = [];
  const rand = mulberry32(9090);
  const drones = 90;
  const per = Math.ceil(count / drones);
  for (let d = 0; d < drones; d += 1) {
    const a = rand() * TAU;
    const r = Math.pow(rand(), 0.45) * 1.2;
    const center: Point = [Math.cos(a) * r, (rand() - 0.5) * 1.4, Math.sin(a) * r];
    for (let i = 0; i < per; i += 1) {
      const t = (i / per) * TAU;
      const arm = i % 4;
      points.push([
        center[0] + Math.cos((arm * TAU) / 4) * (0.035 + (i / per) * 0.08),
        center[1] + Math.sin(t) * 0.012,
        center[2] + Math.sin((arm * TAU) / 4) * (0.035 + (i / per) * 0.08),
      ]);
    }
  }
  return pack(points, count, 1.52);
}

function dataVault(count: number): Float32Array {
  const points: Point[] = [];
  const rings = 9;
  const perRing = Math.ceil(count / rings);
  for (let r = 0; r < rings; r += 1) {
    const y = (r / (rings - 1) - 0.5) * 1.7;
    const radius = 0.35 + (r % 3) * 0.18;
    for (let i = 0; i < perRing; i += 1) {
      const t = (i / perRing) * TAU;
      const notch = Math.floor((t / TAU) * 16) % 2 ? 0.08 : 0;
      points.push([Math.cos(t) * (radius + notch), y, Math.sin(t) * (radius + notch)]);
    }
  }
  return pack(points, count, 1.62);
}

function permutePacked(positions: Float32Array) {
  const count = positions.length / 3;
  const order = Array.from({ length: count }, (_, index) => index);
  order.sort((a, b) => {
    const ak = positions[a * 3 + 1] * 1.7 + positions[a * 3] * 0.9 + positions[a * 3 + 2] * 0.42;
    const bk = positions[b * 3 + 1] * 1.7 + positions[b * 3] * 0.9 + positions[b * 3 + 2] * 0.42;
    return ak - bk;
  });
  const out = new Float32Array(positions.length);
  order.forEach((source, index) => {
    out[index * 3] = positions[source * 3];
    out[index * 3 + 1] = positions[source * 3 + 1];
    out[index * 3 + 2] = positions[source * 3 + 2];
  });
  return out;
}

function shuffleColors(length: number) {
  const colors = Array.from({ length }, (_, index) => MODEL_PALETTE[index % MODEL_PALETTE.length]);
  for (let i = colors.length - 1; i > 0; i -= 1) {
    const j = (i * 7 + 3) % colors.length;
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }
  return colors;
}

export function createModelForms(count = 14000): ModelForm[] {
  const factories: Array<[string, (count: number) => Float32Array]> = [
    ['SPHERE GRID', sphereGrid],
    ['CUBE LATTICE', cubeLattice],
    ['TORUS LINK', torusLink],
    ['TRIPLE HELIX', tripleHelix],
    ['OCTA NET', octaNet],
    ['GALAXY ARM', galaxy],
    ['WAVE FIELD', waveField],
    ['VORTEX CONE', vortex],
    ['STARBURST', starburst],
    ['LISSAJOUS KNOT', lissajous],
    ['ROSE CURVE', rose],
    ['FINGERPRINT', fingerprint],
    ['INTEL GRAPH', intelGraph],
    ['SATELLITE ARRAY', satelliteArray],
    ['RADAR DISH', radarDish],
    ['EYE SCAN', eyeScan],
    ['CITY GRID', cityGrid],
    ['NEURAL MESH', neuralMesh],
    ['LOCK MATRIX', lockMatrix],
    ['DRONE SWARM', droneSwarm],
    ['DATA VAULT', dataVault],
    ['KLEIN BOTTLE', klein],
    ['MOBIUS STRIP', mobius],
    ['LORENZ ATTRACTOR', lorenz],
    ['TESSERACT', tesseract],
    ['PARAM SURFACE', paramSurface],
    ['MANDELBULB', mandelbulb],
    ['L-SYSTEM', lSystem],
    ['LOW-POLY SKULL', skull],
    ['PCB TRACE', pcb],
    ['BINARY RAIN', binaryRain],
    ['KEYCAP ARRAY', keycaps],
    ['TERMINAL CUBE', terminalCube],
    ['CAMERA RIG', cameraRig],
    ['ASCII TEXT', asciiText],
  ];
  const colors = shuffleColors(factories.length);
  return factories.map(([name, factory], index) => ({
    name,
    positions: permutePacked(factory(count)),
    color: colors[index],
  }));
}

export function createPhases(count: number) {
  const rand = mulberry32(98765);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i += 1) phases[i] = rand();
  return phases;
}
