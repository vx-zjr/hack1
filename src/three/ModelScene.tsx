import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { memo, useEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';

const NODE_COUNT = 48000;
const HOLD_SECONDS = 3.0;
const TRANSITION_SECONDS = 5.4;
const FORM_COUNT = 35;
const PALETTE = ['#3AFF7C', '#FFDC5A', '#6EC8FF', '#FF697E'] as const;
const ZERO_POSITIONS = new Float32Array(NODE_COUNT * 3);
const TAU = Math.PI * 2;

type Point = [number, number, number];

type ModelForm = {
  index: number;
  name: string;
  color: string;
  positions: Float32Array;
};

type ModelStatus = {
  current: number;
  next: number;
  phase: 'hold' | 'scatter';
  name: string;
};

const FORM_NAMES = [
  'FIREWALL POLYTOPE',
  'MOBIUS CIPHER BAND',
  'KLEIN ROUTER SURFACE',
  'LORENZ PACKET TRACE',
  'TESSERACT RELAY CAGE',
  'MANDELBULB SHARD',
  'TORUS EXPLOIT RING',
  'NEURAL ACCESS MESH',
  'SATELLITE ORBIT STACK',
  'BIOMETRIC IRIS',
  'CIRCUIT WAFER',
  'BINARY RAIN SLAB',
  'KEY MATRIX',
  'CAMERA OPTIC RIG',
  'RADAR DISH',
  'TRIPLE TOKEN HELIX',
  'DATA CITY',
  'VAULT CYLINDER',
  'FINGERPRINT SEAL',
  'PROXY TUNNEL',
  'ZERO TRUST GATE',
  'DNS BLOOM',
  'SOCKET CONSTELLATION',
  'SERVER RACK ARRAY',
  'ANTENNA PHALANX',
  'WORMHOLE LATTICE',
  'QUANTUM WAVEFIELD',
  'BRANCHING TRACE TREE',
  'HONEYCOMB DEFENSE',
  'LOCK ARRAY',
  'PACKET CUBE CLOUD',
  'INTEL GEO GRID',
  'PRISM SWARM',
  'ACCESS SPIRAL',
  'SEK GLYPH CLOUD',
] as const;

const vertexShader = `
  precision highp float;
  attribute vec3 fromPosition;
  attribute vec3 toPosition;
  attribute vec3 scatterPosition;
  attribute float phase;
  uniform float uTime;
  uniform float uTransition;
  uniform float uPointSize;
  uniform vec2 uPointer;
  uniform float uPointerActive;
  varying float vPulse;
  varying float vPointer;
  varying float vScatter;

  float ease(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
  }

  void main() {
    float t = clamp(uTransition, 0.0, 1.0);
    float scatterStage = smoothstep(0.0, 0.52, t);
    float gatherStage = smoothstep(0.48, 1.0, t);
    float burst = sin(t * 3.14159265);

    vec3 debris = scatterPosition;
    debris.xz += vec2(cos(uTime * 1.45 + phase * 24.0), sin(uTime * 1.25 + phase * 29.0)) * burst * 0.42;
    debris.y += sin(uTime * 1.9 + phase * 18.0) * burst * 0.24;

    vec3 p = mix(fromPosition, debris, ease(scatterStage));
    p = mix(p, toPosition, ease(gatherStage));

    vec2 cursor = uPointer * vec2(1.75, 1.08);
    vec2 delta = p.xy - cursor;
    float field = exp(-dot(delta, delta) * 1.55) * uPointerActive;
    vec2 dir = normalize(delta + vec2(0.001));
    p.xy += dir * field * (0.34 + 0.12 * sin(uTime * 8.0 + phase * 21.0));
    p.z += field * cos(uTime * 6.0 + phase * 18.0) * 0.34;

    float pulse = sin(uTime * 2.0 + phase * 6.2831853);
    p += normalize(p + vec3(0.001)) * pulse * 0.01;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vPulse = pulse * 0.5 + 0.5;
    vPointer = field;
    vScatter = burst;
    gl_PointSize = uPointSize * (1.0 + vPulse * 0.22 + field * 1.1 + burst * 0.22) * (1.0 / max(0.6, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vPulse;
  varying float vPointer;
  varying float vScatter;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = dot(c, c);
    float alpha = smoothstep(0.24, 0.035, d) * uOpacity;
    vec3 color = uColor * (0.74 + vPulse * 0.2 + vPointer * 0.5 + vScatter * 0.14);
    gl_FragColor = vec4(color, alpha);
  }
`;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setPoint(out: Float32Array, index: number, x: number, y: number, z: number) {
  out[index * 3] = x;
  out[index * 3 + 1] = y;
  out[index * 3 + 2] = z;
}

function normalize(out: Float32Array, scale = 1.46) {
  let max = 0.001;
  for (let i = 0; i < out.length; i += 3) max = Math.max(max, Math.abs(out[i]), Math.abs(out[i + 1]), Math.abs(out[i + 2]));
  const k = scale / max;
  for (let i = 0; i < out.length; i += 1) out[i] *= k;
  return out;
}

function jitter(rand: () => number, amount: number) {
  return (rand() - 0.5) * amount;
}

function edgePoint(a: Point, b: Point, t: number, rand: () => number, spread = 0.035): Point {
  return [
    a[0] + (b[0] - a[0]) * t + jitter(rand, spread),
    a[1] + (b[1] - a[1]) * t + jitter(rand, spread),
    a[2] + (b[2] - a[2]) * t + jitter(rand, spread),
  ];
}

function glyphCells(text: string) {
  const glyphs: Record<string, string[]> = {
    S: ['1111', '1...', '111.', '...1', '1111'],
    E: ['1111', '1...', '111.', '1...', '1111'],
    K: ['1..1', '1.1.', '11..', '1.1.', '1..1'],
    O: ['.11.', '1..1', '1..1', '1..1', '.11.'],
    N: ['1..1', '11.1', '1.11', '1..1', '1..1'],
    X: ['1..1', '.11.', '.11.', '.11.', '1..1'],
  };
  const cells: Array<[number, number]> = [];
  let offset = 0;
  for (const char of text) {
    const rows = glyphs[char] ?? glyphs.X;
    rows.forEach((row, y) => {
      [...row].forEach((value, x) => {
        if (value === '1') cells.push([offset + x, y]);
      });
    });
    offset += 5;
  }
  return { cells, width: offset, height: 5 };
}

function generateFormPositions(formIndex: number) {
  const rand = mulberry32(0x5ec000 + formIndex * 977);
  const out = new Float32Array(NODE_COUNT * 3);
  const edges = [
    [[-1, -1, -1], [1, -1, -1]],
    [[1, -1, -1], [1, 1, -1]],
    [[1, 1, -1], [-1, 1, -1]],
    [[-1, 1, -1], [-1, -1, -1]],
    [[-1, -1, 1], [1, -1, 1]],
    [[1, -1, 1], [1, 1, 1]],
    [[1, 1, 1], [-1, 1, 1]],
    [[-1, 1, 1], [-1, -1, 1]],
    [[-1, -1, -1], [-1, -1, 1]],
    [[1, -1, -1], [1, -1, 1]],
    [[1, 1, -1], [1, 1, 1]],
    [[-1, 1, -1], [-1, 1, 1]],
  ] as Array<[Point, Point]>;

  let lx = 0.1;
  let ly = 0;
  let lz = 0;

  for (let i = 0; i < NODE_COUNT; i += 1) {
    const u = rand();
    const v = rand();
    const w = rand();
    const a = u * TAU;
    const b = v * TAU;
    let x = 0;
    let y = 0;
    let z = 0;

    switch (formIndex) {
      case 0: {
        const ring = Math.floor(w * 9);
        const r = 0.26 + ring * 0.085 + jitter(rand, 0.02);
        const shield = Math.abs(Math.sin(a * 3)) * 0.28;
        x = Math.cos(a) * (r + shield);
        y = Math.sin(a) * r * 0.76 + (ring - 4) * 0.035;
        z = Math.sin(b * 4) * 0.2 + jitter(rand, 0.12);
        break;
      }
      case 1: {
        const band = (v - 0.5) * 0.72;
        x = (1 + band * Math.cos(a / 2)) * Math.cos(a);
        y = band * Math.sin(a / 2);
        z = (1 + band * Math.cos(a / 2)) * Math.sin(a);
        break;
      }
      case 2: {
        const r = 2.2 + Math.cos(a / 2) * Math.sin(b) - Math.sin(a / 2) * Math.sin(2 * b);
        x = Math.cos(a) * r;
        y = Math.sin(a) * r;
        z = Math.sin(a / 2) * Math.sin(b) + Math.cos(a / 2) * Math.sin(2 * b);
        break;
      }
      case 3: {
        for (let step = 0; step < 3; step += 1) {
          const dx = 10 * (ly - lx);
          const dy = lx * (28 - lz) - ly;
          const dz = lx * ly - (8 / 3) * lz;
          lx += dx * 0.006;
          ly += dy * 0.006;
          lz += dz * 0.006;
        }
        x = lx;
        y = ly - 22;
        z = lz - 23;
        break;
      }
      case 4: {
        const edge = edges[Math.floor(rand() * edges.length)];
        [x, y, z] = edgePoint(edge[0], edge[1], rand(), rand, 0.055);
        const inner = rand() > 0.68 ? -0.48 : 0.48;
        x += inner * Math.sign(x || 1) * rand();
        z += inner * Math.sign(z || 1) * rand();
        break;
      }
      case 5: {
        const theta = a;
        const phi = Math.acos(rand() * 2 - 1);
        const shell = Math.pow(Math.abs(Math.sin(theta * 4) * Math.cos(phi * 5)), 0.16);
        const r = 0.3 + shell * (0.85 + rand() * 0.32);
        x = Math.sin(phi) * Math.cos(theta) * r;
        y = Math.cos(phi) * r;
        z = Math.sin(phi) * Math.sin(theta) * r;
        break;
      }
      case 6: {
        const q = 2 + (formIndex % 5);
        const r = 0.72 + 0.24 * Math.cos(q * a);
        x = r * Math.cos(3 * a) + jitter(rand, 0.045);
        y = 0.24 * Math.sin(q * a) + jitter(rand, 0.035);
        z = r * Math.sin(3 * a) + jitter(rand, 0.045);
        break;
      }
      case 7: {
        const layer = Math.floor(rand() * 8);
        const rr = 0.18 + layer * 0.11;
        x = (layer / 7 - 0.5) * 1.6 + Math.sin(a * 3) * 0.05;
        y = Math.cos(a) * rr + jitter(rand, 0.025);
        z = Math.sin(a) * rr * 1.6 + jitter(rand, 0.025);
        break;
      }
      case 8: {
        const orbit = 0.28 + Math.floor(rand() * 6) * 0.16;
        const tilt = Math.floor(rand() * 5) * 0.38;
        x = Math.cos(a) * orbit;
        y = Math.sin(a + tilt) * orbit * 0.4 + jitter(rand, 0.035);
        z = Math.sin(a) * orbit;
        if (rand() > 0.82) {
          x *= 0.25;
          z *= 0.25;
        }
        break;
      }
      case 9: {
        const rr = rand() > 0.45 ? 0.55 + Math.sin(a * 8) * 0.06 : Math.sqrt(rand()) * 0.42;
        x = Math.cos(a) * rr * 1.55;
        y = Math.sin(a) * rr * 0.72;
        z = Math.sin(a * 2 + b) * 0.18 + jitter(rand, 0.05);
        break;
      }
      case 10: {
        const gx = Math.round((u - 0.5) * 22) / 10;
        const gy = Math.round((v - 0.5) * 14) / 10;
        const lane = rand() > 0.5;
        x = lane ? gx + jitter(rand, 0.08) : (u - 0.5) * 2.4;
        y = lane ? (v - 0.5) * 1.5 : gy + jitter(rand, 0.08);
        z = Math.sin((gx + gy) * 8) * 0.08 + jitter(rand, 0.12);
        break;
      }
      case 11: {
        const col = Math.floor(rand() * 150);
        x = (col / 149 - 0.5) * 2.4 + jitter(rand, 0.025);
        y = 1.15 - rand() * 2.3;
        z = Math.sin(col * 0.37) * 0.45 + jitter(rand, 0.04);
        break;
      }
      case 12: {
        const col = Math.floor(rand() * 15);
        const row = Math.floor(rand() * 7);
        const side = Math.floor(rand() * 4);
        x = (col - 7) * 0.18 + (side < 2 ? jitter(rand, 0.11) : side === 2 ? -0.065 : 0.065);
        y = Math.sin((col + row) * 0.5) * 0.08 + jitter(rand, 0.025);
        z = (row - 3) * 0.2 + (side >= 2 ? jitter(rand, 0.11) : side === 0 ? -0.065 : 0.065);
        break;
      }
      case 13: {
        const rr = rand() > 0.35 ? 0.72 : 0.3;
        x = Math.cos(a) * rr * 1.15 + jitter(rand, 0.035);
        y = Math.sin(a) * rr * 0.66 + jitter(rand, 0.035);
        z = rand() > 0.5 ? 0.28 + jitter(rand, 0.1) : -0.18 + jitter(rand, 0.05);
        break;
      }
      case 14: {
        const rr = Math.sqrt(rand()) * 1.05;
        x = Math.cos(a) * rr;
        y = -rr * rr * 0.5 + 0.45 + jitter(rand, 0.025);
        z = Math.sin(a) * rr * 0.72;
        break;
      }
      case 15: {
        const strand = Math.floor(rand() * 3);
        const t = rand();
        const ang = t * TAU * 6.5 + (strand * TAU) / 3;
        x = Math.cos(ang) * 0.52 + jitter(rand, 0.025);
        y = t * 2 - 1;
        z = Math.sin(ang) * 0.52 + jitter(rand, 0.025);
        break;
      }
      case 16: {
        const gx = Math.floor(rand() * 17);
        const gz = Math.floor(rand() * 17);
        const h = 0.12 + Math.pow(rand(), 0.35) * 1.2;
        x = (gx / 16 - 0.5) * 2.1 + jitter(rand, 0.06);
        y = -0.72 + rand() * h;
        z = (gz / 16 - 0.5) * 2.1 + jitter(rand, 0.06);
        break;
      }
      case 17: {
        const ring = Math.floor(rand() * 10);
        const radius = 0.3 + (ring % 3) * 0.18 + Math.sin(a * 12) * 0.035;
        x = Math.cos(a) * radius;
        y = (ring / 9 - 0.5) * 1.7 + jitter(rand, 0.02);
        z = Math.sin(a) * radius;
        break;
      }
      case 18: {
        const ridge = Math.floor(rand() * 18);
        const rr = 0.12 + ridge * 0.048 + Math.sin(a * 5 + ridge) * 0.025;
        x = Math.cos(a) * rr * 1.1;
        y = Math.sin(a) * rr * 1.38;
        z = Math.sin(a * 2 + ridge) * 0.13;
        break;
      }
      case 19: {
        const t = rand();
        const radius = 0.18 + t * 1.0;
        const spin = a + t * 12;
        x = Math.cos(spin) * radius;
        y = (t - 0.5) * 1.8;
        z = Math.sin(spin) * radius;
        break;
      }
      case 20: {
        const cellX = Math.floor(rand() * 15);
        const cellY = Math.floor(rand() * 10);
        const local = rand() * TAU;
        const gate = (cellX + cellY) % 3;
        x = (cellX / 14 - 0.5) * 2.1 + Math.cos(local) * (gate ? 0.055 : 0.03);
        y = (cellY / 9 - 0.5) * 1.35 + Math.sin(local) * (gate ? 0.055 : 0.03);
        z = Math.sin(local * 3 + cellX) * 0.14;
        break;
      }
      case 21: {
        const petal = Math.floor(rand() * 9);
        const rr = Math.sin(a * 4 + petal) * 0.36 + 0.72;
        x = Math.cos(a + petal * 0.11) * rr;
        y = Math.sin(a) * rr * 0.55 + Math.sin(petal) * 0.18;
        z = Math.cos(a * 2 + petal) * 0.4;
        break;
      }
      case 22: {
        const hub = Math.floor(rand() * 28);
        const t = rand();
        const ha = hub * 2.399963;
        const hx = Math.cos(ha) * Math.sqrt(hub / 28) * 1.1;
        const hz = Math.sin(ha) * Math.sqrt(hub / 28) * 0.9;
        x = hx * t + jitter(rand, 0.08);
        y = (rand() - 0.5) * 1.3;
        z = hz * t + jitter(rand, 0.08);
        break;
      }
      case 23: {
        const rack = Math.floor(rand() * 9);
        const blade = Math.floor(rand() * 11);
        x = (rack / 8 - 0.5) * 1.8 + jitter(rand, 0.06);
        y = (blade / 10 - 0.5) * 1.5 + jitter(rand, 0.025);
        z = (rand() > 0.5 ? -0.5 : 0.5) + jitter(rand, 0.05);
        break;
      }
      case 24: {
        const mast = Math.floor(rand() * 13);
        const t = rand();
        x = (mast / 12 - 0.5) * 2.2 + Math.sin(t * TAU * 5) * 0.06;
        y = t * 1.8 - 0.9;
        z = Math.cos(t * TAU * 3 + mast) * 0.35;
        break;
      }
      case 25: {
        const rr = 0.32 + 0.6 * Math.sin(a * 2.0) * Math.sin(b * 3.0);
        x = Math.cos(a) * (0.72 + rr * 0.28);
        y = Math.sin(b) * rr * 0.7;
        z = Math.sin(a) * (0.72 + rr * 0.28);
        break;
      }
      case 26: {
        x = (u - 0.5) * 2.5;
        z = (v - 0.5) * 2.5;
        y = (Math.sin(x * 4.2) * Math.cos(z * 3.7) + Math.sin((x + z) * 2.1) * 0.5) * 0.32;
        break;
      }
      case 27: {
        const depth = Math.floor(rand() * 9);
        const branch = Math.floor(rand() * Math.pow(2, Math.min(depth, 6)));
        const t = rand();
        const angle = -Math.PI / 2 + (branch - Math.pow(2, Math.min(depth, 6)) / 2) * 0.04 + Math.sin(depth) * 0.35;
        const length = 1.1 * Math.pow(0.76, depth * 0.45);
        x = Math.cos(angle) * length * t + jitter(rand, 0.05);
        y = -0.9 + depth * 0.18 + t * 0.24;
        z = Math.sin(angle) * length * t + jitter(rand, 0.05);
        break;
      }
      case 28: {
        const col = Math.floor(rand() * 18);
        const row = Math.floor(rand() * 12);
        const aa = Math.floor(rand() * 6) * (TAU / 6) + rand() * 0.22;
        x = (col / 17 - 0.5) * 2.2 + Math.cos(aa) * 0.06;
        y = (row / 11 - 0.5) * 1.4 + Math.sin(aa) * 0.06;
        z = Math.sin((col + row) * 0.7) * 0.22;
        break;
      }
      case 29: {
        const col = Math.floor(rand() * 14);
        const row = Math.floor(rand() * 10);
        const rr = rand() > 0.45 ? 0.055 : 0.025;
        x = (col / 13 - 0.5) * 2.0 + Math.cos(a) * rr;
        y = (row / 9 - 0.5) * 1.35 + Math.sin(a) * rr;
        z = (rand() - 0.5) * 0.28;
        break;
      }
      case 30: {
        const edge = edges[Math.floor(rand() * edges.length)];
        [x, y, z] = edgePoint(edge[0], edge[1], rand(), rand, 0.13);
        x += Math.sin(y * 8 + z * 3) * 0.08;
        break;
      }
      case 31: {
        const lat = Math.floor(rand() * 18);
        const phi = (lat / 17 - 0.5) * Math.PI;
        const rr = Math.cos(phi);
        x = Math.cos(a) * rr;
        y = Math.sin(phi);
        z = Math.sin(a) * rr;
        if (rand() > 0.82) z *= 0.2;
        break;
      }
      case 32: {
        const tri = Math.floor(rand() * 12);
        const t = rand();
        const r = 0.2 + (tri % 4) * 0.22 + t * 0.24;
        x = Math.cos(a + tri * 0.4) * r;
        y = Math.sin(a * 1.5) * (0.4 + t * 0.5);
        z = Math.sin(a + tri * 0.4) * r;
        break;
      }
      case 33: {
        const t = rand();
        const turns = 9.0;
        const radius = 0.16 + t * 0.95;
        const angle = t * turns * TAU;
        x = Math.cos(angle) * radius;
        y = t * 2 - 1;
        z = Math.sin(angle) * radius;
        break;
      }
      case 34: {
        const { cells, width, height } = glyphCells('SEK');
        const cell = cells[Math.floor(rand() * cells.length)];
        x = (cell[0] / width - 0.5) * 2.2 + jitter(rand, 0.08);
        y = (0.5 - cell[1] / height) * 1.0 + jitter(rand, 0.08);
        z = Math.sin((cell[0] + cell[1]) * 0.8) * 0.22 + jitter(rand, 0.18);
        break;
      }
      default:
        break;
    }

    setPoint(out, i, x, y, z);
  }

  return normalize(out);
}

function makeForms() {
  return Array.from({ length: FORM_COUNT }, (_, index): ModelForm => ({
    index,
    name: FORM_NAMES[index],
    color: PALETTE[(index * 5 + 1) % PALETTE.length],
    positions: generateFormPositions(index),
  }));
}

function makeScatter(seed: number) {
  const rand = mulberry32(seed);
  const out = new Float32Array(NODE_COUNT * 3);
  for (let i = 0; i < NODE_COUNT; i += 1) {
    const a = rand() * TAU;
    const b = Math.acos(rand() * 2 - 1);
    const shell = 1.85 + Math.pow(rand(), 0.38) * 1.5;
    setPoint(out, i, Math.sin(b) * Math.cos(a) * shell, Math.cos(b) * shell * 0.82 + jitter(rand, 0.9), Math.sin(b) * Math.sin(a) * shell);
  }
  return out;
}

function makePhases() {
  const rand = mulberry32(0x51a7);
  const out = new Float32Array(NODE_COUNT);
  for (let i = 0; i < NODE_COUNT; i += 1) out[i] = rand();
  return out;
}

type HudRefs = {
  formRef: RefObject<HTMLSpanElement | null>;
  stateRef: RefObject<HTMLSpanElement | null>;
  nameRef: RefObject<HTMLSpanElement | null>;
  nextRef: RefObject<HTMLSpanElement | null>;
  fpsRef: RefObject<HTMLSpanElement | null>;
};

function EntityPoints({ hud }: { hud: HudRefs }) {
  const forms = useMemo(makeForms, []);
  const phases = useMemo(makePhases, []);
  const scatters = useMemo(() => forms.map((_, index) => makeScatter(0x9000 + index * 137)), [forms]);
  const initialFrom = useMemo(() => forms[0].positions.slice(), [forms]);
  const initialTo = useMemo(() => forms[1].positions.slice(), [forms]);
  const initialScatter = useMemo(() => scatters[0].slice(), [scatters]);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const groupRef = useRef<THREE.Group>(null);
  const stateRef = useRef({
    current: 0,
    next: 1,
    phase: 'hold' as 'hold' | 'transition',
    phaseStartedAt: 0,
    frames: 0,
    fpsStartedAt: 0,
  });
  const color = useMemo(() => new THREE.Color(forms[0].color), [forms]);
  const fromColor = useMemo(() => new THREE.Color(forms[0].color), [forms]);
  const toColor = useMemo(() => new THREE.Color(forms[1].color), [forms]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTransition: { value: 0 },
      uPointSize: { value: 3.8 },
      uColor: { value: new THREE.Color(forms[0].color) },
      uOpacity: { value: 0.78 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPointerActive: { value: 0 },
    }),
    [forms],
  );

  function publishStatus(phase: ModelStatus['phase']) {
    const state = stateRef.current;
    if (hud.formRef.current) hud.formRef.current.textContent = `${String(state.current + 1).padStart(2, '0')}/35`;
    if (hud.stateRef.current) hud.stateRef.current.textContent = phase === 'scatter' ? 'DISPERSE' : 'HOLD';
    if (hud.nameRef.current) hud.nameRef.current.textContent = forms[state.current].name;
    if (hud.nextRef.current) hud.nextRef.current.textContent = String(state.next + 1).padStart(2, '0');
  }

  function writeAttributes(current: number, next: number) {
    const geometry = geometryRef.current;
    if (!geometry) return;
    const from = geometry.getAttribute('fromPosition') as THREE.BufferAttribute;
    const to = geometry.getAttribute('toPosition') as THREE.BufferAttribute;
    const scatter = geometry.getAttribute('scatterPosition') as THREE.BufferAttribute;
    from.array.set(forms[current].positions);
    to.array.set(forms[next].positions);
    scatter.array.set(scatters[current]);
    from.needsUpdate = true;
    to.needsUpdate = true;
    scatter.needsUpdate = true;
  }

  useEffect(() => {
    const geometry = geometryRef.current;
    if (!geometry) return;
    ['fromPosition', 'toPosition', 'scatterPosition'].forEach((name) => {
      const attribute = geometry.getAttribute(name) as THREE.BufferAttribute;
      attribute.setUsage(THREE.DynamicDrawUsage);
    });
    writeAttributes(0, 1);
    publishStatus('hold');
  }, []);

  useFrame(({ clock, pointer }) => {
    const state = stateRef.current;
    if (state.phaseStartedAt === 0) {
      state.phaseStartedAt = clock.elapsedTime;
      state.fpsStartedAt = clock.elapsedTime;
    }

    const elapsed = clock.elapsedTime - state.phaseStartedAt;
    let transition = 0;

    if (state.phase === 'hold' && elapsed >= HOLD_SECONDS) {
      state.phase = 'transition';
      state.phaseStartedAt = clock.elapsedTime;
      writeAttributes(state.current, state.next);
      publishStatus('scatter');
    } else if (state.phase === 'transition') {
      transition = Math.min(1, elapsed / TRANSITION_SECONDS);
      if (transition >= 1) {
        state.current = state.next;
        state.next = (state.current + 1) % forms.length;
        state.phase = 'hold';
        state.phaseStartedAt = clock.elapsedTime;
        transition = 0;
        writeAttributes(state.current, state.next);
        publishStatus('hold');
      }
    }

    if (materialRef.current) {
      const currentUniforms = materialRef.current.uniforms;
      currentUniforms.uTime.value = clock.elapsedTime;
      currentUniforms.uTransition.value = transition;
      currentUniforms.uPointer.value.set(pointer.x, pointer.y);
      currentUniforms.uPointerActive.value += ((Math.abs(pointer.x) + Math.abs(pointer.y) > 0.002 ? 1 : 0) - currentUniforms.uPointerActive.value) * 0.1;
      fromColor.set(forms[state.current].color);
      toColor.set(forms[state.next].color);
      color.lerpColors(fromColor, toColor, transition);
      currentUniforms.uColor.value.copy(color);
    }

    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0038 + Math.abs(pointer.x) * 0.0017;
      groupRef.current.rotation.x += (pointer.y * 0.32 + 0.1 - groupRef.current.rotation.x) * 0.05;
      groupRef.current.rotation.z += (pointer.x * 0.24 - groupRef.current.rotation.z) * 0.04;
      const scale = 0.66 + Math.min(0.1, Math.hypot(pointer.x, pointer.y) * 0.048);
      groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, scale, 0.045));
    }

    state.frames += 1;
    if (clock.elapsedTime - state.fpsStartedAt >= 0.75) {
      if (hud.fpsRef.current) hud.fpsRef.current.textContent = Math.round(state.frames / (clock.elapsedTime - state.fpsStartedAt)).toFixed(1);
      state.frames = 0;
      state.fpsStartedAt = clock.elapsedTime;
    }
  });

  return (
    <group ref={groupRef} frustumCulled={false} scale={0.66}>
      <points frustumCulled={false}>
        <bufferGeometry ref={geometryRef}>
          <bufferAttribute attach="attributes-position" args={[ZERO_POSITIONS, 3]} />
          <bufferAttribute attach="attributes-fromPosition" args={[initialFrom, 3]} />
          <bufferAttribute attach="attributes-toPosition" args={[initialTo, 3]} />
          <bufferAttribute attach="attributes-scatterPosition" args={[initialScatter, 3]} />
          <bufferAttribute attach="attributes-phase" args={[phases, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>
    </group>
  );
}

export const ModelScene = memo(function ModelScene() {
  const formRef = useRef<HTMLSpanElement>(null);
  const stateTextRef = useRef<HTMLSpanElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const nextRef = useRef<HTMLSpanElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const hud = useMemo(
    () => ({
      formRef,
      stateRef: stateTextRef,
      nameRef,
      nextRef,
      fpsRef,
    }),
    [],
  );

  return (
    <div className="relative h-full w-full overflow-visible">
      <Canvas
        style={{ position: 'absolute', inset: '-10%', width: '120%', height: '120%' }}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.25]}
        performance={{ min: 0.75 }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 6.45]} fov={42} />
        <ambientLight intensity={0.45} />
        <EntityPoints hud={hud} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 z-10 mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
        <div className="terminal-border absolute left-5 top-5 p-3 leading-5">
          ENTITY // ROUTE
          <br />
          <b className="text-[var(--fg-primary)]">ID</b> <span className="glow">0xSEK-09A</span>
          <br />
          <b className="text-[var(--fg-primary)]">FORM</b> <span ref={formRef} className="glow">01/35</span>
          <br />
          <b className="text-[var(--fg-primary)]">STATE</b> <span ref={stateTextRef} className="cyan">HOLD</span>
        </div>
        <div className="terminal-border absolute right-5 top-5 p-3 text-right leading-5">
          MODEL //
          <br />
          <b className="text-[var(--fg-primary)]">NAME</b> <span ref={nameRef} className="glow">{FORM_NAMES[0]}</span>
          <br />
          <b className="text-[var(--fg-primary)]">NEXT</b> <span ref={nextRef} className="cyan">02</span>
          <br />
          <b className="text-[var(--fg-primary)]">LINES</b> <span className="cyan">NONE</span>
        </div>
        <div className="terminal-border absolute bottom-5 left-5 p-3 leading-5">
          TELEMETRY //
          <br />
          <b className="text-[var(--fg-primary)]">NODES</b> <span className="glow">{NODE_COUNT}</span>
          <br />
          <b className="text-[var(--fg-primary)]">FLOW</b> <span className="cyan">SCATTER/GATHER</span>
        </div>
        <div className="terminal-border absolute bottom-5 right-5 p-3 text-right leading-5">
          SIGNATURE //
          <br />
          <b className="text-[var(--fg-primary)]">HZ</b> <span ref={fpsRef} className="glow">60.0</span>
          <br />
          <b className="text-[var(--fg-primary)]">SRC</b> <span className="cyan">REBUILT</span>
        </div>
      </div>
    </div>
  );
});
