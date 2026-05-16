import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const NODE_COUNT = 38000;
const PALETTE = ['#3AFF7C', '#FFDC5A', '#6EC8FF', '#FF697E'] as const;
const SWITCH_MS = 7200;
const FADE_MS = 1800;

type Point = [number, number, number];
type ShapeForm = {
  name: string;
  color: string;
  positions: Float32Array;
  phases: Float32Array;
};

const vertexShader = `
  precision highp float;
  attribute float phase;
  uniform float uTime;
  uniform float uPointSize;
  uniform vec2 uPointer;
  uniform float uPointerActive;
  varying float vPulse;
  varying float vPointer;
  varying float vDepth;

  void main() {
    vec3 p = position;
    float pulse = sin(uTime * 2.2 + phase * 6.2831853);
    vec2 pointer = uPointer * vec2(1.8, 1.18);
    vec2 delta = p.xy - pointer;
    float field = exp(-dot(delta, delta) * 1.52) * uPointerActive;
    vec2 dir = normalize(delta + vec2(0.001));
    p.xy += dir * field * (0.36 + 0.16 * sin(uTime * 8.0 + phase * 20.0));
    p.z += field * sin(uTime * 5.5 + phase * 18.0) * 0.44;
    p += normalize(p + vec3(0.001)) * pulse * 0.018;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vPulse = pulse * 0.5 + 0.5;
    vPointer = field;
    vDepth = clamp((-mv.z - 1.0) / 5.5, 0.0, 1.0);
    gl_PointSize = uPointSize * (1.0 + vPulse * 0.34 + field * 1.5) * (1.0 / max(0.52, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vPulse;
  varying float vPointer;
  varying float vDepth;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = dot(c, c);
    float alpha = smoothstep(0.25, 0.02, d) * uOpacity;
    vec3 color = uColor * (0.78 + vPulse * 0.35 + (1.0 - vDepth) * 0.24 + vPointer * 0.95);
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

function line(a: Point, b: Point, steps: number, out: Point[]) {
  for (let i = 0; i < steps; i += 1) {
    const t = i / Math.max(1, steps - 1);
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
  }
}

function pack(points: Point[], count = NODE_COUNT, scale = 1.45) {
  while (points.length < count) points.push(points[points.length % Math.max(1, points.length)] ?? [0, 0, 0]);
  const out = new Float32Array(count * 3);
  let max = 0.001;
  for (let i = 0; i < count; i += 1) {
    const p = points[i];
    max = Math.max(max, Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]));
  }
  for (let i = 0; i < count; i += 1) {
    const p = points[i];
    out[i * 3] = (p[0] / max) * scale;
    out[i * 3 + 1] = (p[1] / max) * scale;
    out[i * 3 + 2] = (p[2] / max) * scale;
  }
  return out;
}

function phases(seed: number) {
  const rand = mulberry32(seed);
  const out = new Float32Array(NODE_COUNT);
  for (let i = 0; i < NODE_COUNT; i += 1) out[i] = rand();
  return out;
}

function skull(seed: number) {
  const rand = mulberry32(seed);
  const points: Point[] = [];
  for (let i = 0; i < NODE_COUNT * 0.48; i += 1) {
    const a = rand() * Math.PI * 2;
    const y = rand() * 1.35 - 0.18;
    const r = Math.sqrt(Math.max(0, 1 - y * y * 0.55)) * (0.74 + rand() * 0.16);
    points.push([Math.cos(a) * r * 0.86, y, Math.sin(a) * r * 0.72]);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < NODE_COUNT * 0.075; i += 1) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.24;
      points.push([side * 0.34 + Math.cos(a) * r, 0.2 + Math.sin(a) * r, 0.62 + (rand() - 0.5) * 0.08]);
    }
  }
  for (let i = 0; i < NODE_COUNT * 0.18; i += 1) points.push([(rand() - 0.5) * 0.74, -0.44 - rand() * 0.36, 0.48 + (rand() - 0.5) * 0.24]);
  for (let i = 0; i < NODE_COUNT * 0.14; i += 1) points.push([(rand() - 0.5) * 0.7, -0.62 + Math.sin(i * 0.45) * 0.04, 0.69 + (rand() - 0.5) * 0.045]);
  return pack(points, NODE_COUNT, 1.46);
}

function mobius() {
  const points: Point[] = [];
  const rows = Math.ceil(Math.sqrt(NODE_COUNT));
  for (let i = 0; i < rows; i += 1) {
    const u = (i / rows) * Math.PI * 2;
    for (let j = 0; j < rows && points.length < NODE_COUNT; j += 1) {
      const v = j / rows - 0.5;
      points.push([(1 + v * 0.65 * Math.cos(u / 2)) * Math.cos(u), v * 0.65 * Math.sin(u / 2), (1 + v * 0.65 * Math.cos(u / 2)) * Math.sin(u)]);
    }
  }
  return pack(points, NODE_COUNT, 1.55);
}

function pcb(seed: number) {
  const rand = mulberry32(seed);
  const points: Point[] = [];
  for (let t = 0; t < 120; t += 1) {
    let p: Point = [(rand() - 0.5) * 2.4, (rand() - 0.5) * 1.6, (rand() - 0.5) * 0.28];
    for (let s = 0; s < 8; s += 1) {
      const n: Point = [p[0] + (rand() > 0.5 ? 1 : -1) * (0.1 + rand() * 0.32), p[1] + (rand() > 0.5 ? 1 : -1) * (0.08 + rand() * 0.24), p[2]];
      line(p, n, 24, points);
      p = n;
    }
  }
  for (let i = 0; i < NODE_COUNT * 0.22; i += 1) points.push([Math.round((rand() - 0.5) * 18) / 7, Math.round((rand() - 0.5) * 12) / 7, (rand() - 0.5) * 0.3]);
  return pack(points, NODE_COUNT, 1.5);
}

function binaryRain(seed: number) {
  const rand = mulberry32(seed);
  const points: Point[] = [];
  const columns = 150;
  const per = Math.ceil(NODE_COUNT / columns);
  for (let c = 0; c < columns; c += 1) {
    const x = (c / columns - 0.5) * 2.5;
    const z = (rand() - 0.5) * 1.1;
    for (let i = 0; i < per; i += 1) points.push([x + Math.sin(i * 0.67) * 0.018, 1.25 - (i / per) * 2.5, z + Math.cos(i * 0.43) * 0.03]);
  }
  return pack(points, NODE_COUNT, 1.55);
}

function city(seed: number) {
  const rand = mulberry32(seed);
  const points: Point[] = [];
  const size = 18;
  const per = Math.ceil(NODE_COUNT / (size * size));
  for (let x = 0; x < size; x += 1) {
    for (let z = 0; z < size; z += 1) {
      const h = 0.16 + rand() * 1.15;
      const cx = (x / (size - 1) - 0.5) * 2.2;
      const cz = (z / (size - 1) - 0.5) * 2.2;
      for (let i = 0; i < per; i += 1) points.push([cx + (i % 2 ? -0.045 : 0.045), -0.75 + (i / per) * h, cz + (i % 3 ? -0.045 : 0.045)]);
    }
  }
  return pack(points, NODE_COUNT, 1.48);
}

function helix() {
  const points: Point[] = [];
  const strands = 5;
  const per = Math.ceil(NODE_COUNT * 0.72 / strands);
  for (let s = 0; s < strands; s += 1) {
    const ph = (s / strands) * Math.PI * 2;
    for (let i = 0; i < per; i += 1) {
      const t = i / per;
      const a = t * Math.PI * 2 * 7.5 + ph;
      points.push([Math.cos(a) * 0.58, t * 2.0 - 1.0, Math.sin(a) * 0.58]);
    }
  }
  for (let i = 0; points.length < NODE_COUNT; i += 1) {
    const t = (i % 120) / 120;
    line([Math.cos(t * 40) * 0.58, t * 2 - 1, Math.sin(t * 40) * 0.58], [Math.cos(t * 40 + 1.7) * 0.58, t * 2 - 1, Math.sin(t * 40 + 1.7) * 0.58], 12, points);
  }
  return pack(points, NODE_COUNT, 1.5);
}

function tesseract() {
  const points: Point[] = [];
  const verts: number[][] = [];
  for (let i = 0; i < 16; i += 1) verts.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1, (i & 8) ? 1 : -1]);
  const project = (v: number[]): Point => {
    const k = 1 / (2.25 - v[3] * 0.55);
    return [v[0] * k, v[1] * k, v[2] * k];
  };
  const edges: Array<[number[], number[]]> = [];
  for (let i = 0; i < verts.length; i += 1) {
    for (let j = i + 1; j < verts.length; j += 1) {
      if (verts[i].filter((v, k) => v !== verts[j][k]).length === 1) edges.push([verts[i], verts[j]]);
    }
  }
  const per = Math.ceil(NODE_COUNT / edges.length);
  for (const [a, b] of edges) {
    for (let i = 0; i < per; i += 1) {
      const t = i / Math.max(1, per - 1);
      line(project(a.map((v, k) => v + (b[k] - v) * t)), project(a.map((v, k) => v + (b[k] - v) * Math.min(1, t + 0.004))), 1, points);
    }
  }
  return pack(points, NODE_COUNT, 1.55);
}

function eye(seed: number) {
  const rand = mulberry32(seed);
  const points: Point[] = [];
  for (let i = 0; i < NODE_COUNT * 0.42; i += 1) {
    const t = (i / (NODE_COUNT * 0.42)) * Math.PI * 2;
    points.push([Math.cos(t) * 1.1, Math.sin(t) * 0.44, Math.sin(t * 2) * 0.12]);
  }
  for (let i = 0; i < NODE_COUNT * 0.38; i += 1) {
    const t = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 0.52;
    points.push([Math.cos(t) * r, Math.sin(t) * r, 0.36 + Math.sin(t * 5) * 0.08]);
  }
  for (let i = 0; i < NODE_COUNT * 0.2; i += 1) points.push([(i % 2 ? -1.08 : 1.08) + (rand() - 0.5) * 0.04, (rand() - 0.5) * 1.06, 0.18]);
  return pack(points, NODE_COUNT, 1.48);
}

function satellite(seed: number) {
  const rand = mulberry32(seed);
  const points: Point[] = [];
  for (let s = 0; s < 24; s += 1) {
    const a = (s / 24) * Math.PI * 2;
    const orbit = 0.45 + (s % 6) * 0.14;
    const center: Point = [Math.cos(a) * orbit, Math.sin(a * 1.7) * 0.42, Math.sin(a) * orbit];
    line([0, 0, 0], center, 92, points);
    for (let i = 0; i < 250; i += 1) points.push([center[0] + (rand() - 0.5) * 0.26, center[1] + (rand() - 0.5) * 0.12, center[2] + (rand() - 0.5) * 0.22]);
  }
  return pack(points, NODE_COUNT, 1.5);
}

function network(seed: number) {
  const rand = mulberry32(seed);
  const points: Point[] = [];
  const hubs = Array.from({ length: 58 }, (): Point => [(rand() - 0.5) * 2.1, (rand() - 0.5) * 1.55, (rand() - 0.5) * 1.0]);
  for (let i = 0; i < hubs.length; i += 1) {
    for (let j = i + 1; j < hubs.length; j += 1) {
      const d = Math.hypot(hubs[i][0] - hubs[j][0], hubs[i][1] - hubs[j][1], hubs[i][2] - hubs[j][2]);
      if (d < 0.55 || rand() > 0.972) line(hubs[i], hubs[j], 24, points);
    }
  }
  for (const hub of hubs) {
    for (let i = 0; i < 90; i += 1) {
      const a = (i / 90) * Math.PI * 2;
      points.push([hub[0] + Math.cos(a) * 0.035, hub[1] + Math.sin(a) * 0.035, hub[2]]);
    }
  }
  return pack(points, NODE_COUNT, 1.52);
}

function radar() {
  const points: Point[] = [];
  const rings = 34;
  const per = Math.ceil(NODE_COUNT * 0.78 / rings);
  for (let r = 0; r < rings; r += 1) {
    const radius = (r / rings) * 1.08;
    for (let i = 0; i < per; i += 1) {
      const t = (i / per) * Math.PI * 2;
      points.push([Math.cos(t) * radius, -radius * radius * 0.5 + 0.44, Math.sin(t) * radius * 0.72]);
    }
  }
  for (let i = 0; i < NODE_COUNT * 0.22; i += 1) {
    const t = (i / (NODE_COUNT * 0.22)) * Math.PI * 5.2;
    const r = i / (NODE_COUNT * 0.22);
    points.push([Math.cos(t) * r * 1.12, 0.16 + r * 0.2, Math.sin(t) * r * 0.78]);
  }
  return pack(points, NODE_COUNT, 1.46);
}

function cameraRig() {
  const points: Point[] = [];
  for (let i = 0; i < NODE_COUNT * 0.32; i += 1) {
    const a = (i / (NODE_COUNT * 0.32)) * Math.PI * 2;
    points.push([Math.cos(a) * 0.72, Math.sin(a) * 0.42, 0.12]);
    points.push([Math.cos(a) * 0.28, Math.sin(a) * 0.18, 0.46]);
  }
  line([-0.95, -0.55, 0], [0.95, -0.55, 0], 1200, points);
  line([-0.9, 0.55, 0], [0.9, 0.55, 0], 1200, points);
  line([-0.95, -0.55, 0], [-0.9, 0.55, 0], 760, points);
  line([0.95, -0.55, 0], [0.9, 0.55, 0], 760, points);
  line([0.25, 0.55, 0], [0.55, 0.98, 0.18], 820, points);
  line([-0.25, 0.55, 0], [-0.55, 0.98, 0.18], 820, points);
  return pack(points, NODE_COUNT, 1.52);
}

function makeForms(): ShapeForm[] {
  const factories: Array<[string, () => Float32Array]> = [
    ['SKULL NODE', () => skull(661)],
    ['MOBIUS TRACE', mobius],
    ['PCB ROUTER', () => pcb(4096)],
    ['BINARY RAIN', () => binaryRain(10101)],
    ['CITY GRID', () => city(8080)],
    ['DATA HELIX', helix],
    ['TESSERACT', tesseract],
    ['RETINA SCAN', () => eye(31337)],
    ['SATELLITE ARRAY', () => satellite(6174)],
    ['INTEL GRAPH', () => network(2407)],
    ['RADAR DISH', radar],
    ['CAMERA RIG', cameraRig],
  ];

  return factories.map(([name, factory], index) => ({
    name,
    color: PALETTE[index % PALETTE.length],
    positions: factory(),
    phases: phases(7000 + index * 113),
  }));
}

function ShapeLayer({ form, targetOpacity, initialOpacity, onFps }: { form: ShapeForm; targetOpacity: number; initialOpacity: number; onFps?: (fps: number) => void }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const metricsRef = useRef({ frames: 0, startedAt: 0 });
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointSize: { value: 5.2 },
      uColor: { value: new THREE.Color(form.color) },
      uOpacity: { value: initialOpacity },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPointerActive: { value: 0 },
    }),
    [form.color, initialOpacity],
  );

  useFrame(({ clock, pointer }) => {
    if (materialRef.current) {
      const uniforms = materialRef.current.uniforms;
      uniforms.uTime.value = clock.elapsedTime;
      uniforms.uOpacity.value = THREE.MathUtils.lerp(uniforms.uOpacity.value, targetOpacity, 0.06);
      uniforms.uPointer.value.set(pointer.x, pointer.y);
      uniforms.uPointerActive.value += ((Math.abs(pointer.x) + Math.abs(pointer.y) > 0.002 ? 1 : 0) - uniforms.uPointerActive.value) * 0.1;
    }

    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0045 + Math.abs(pointer.x) * 0.002;
      groupRef.current.rotation.x += (pointer.y * 0.3 + 0.12 - groupRef.current.rotation.x) * 0.045;
      groupRef.current.rotation.z += (pointer.x * 0.22 - groupRef.current.rotation.z) * 0.035;
      const scale = 0.72 + Math.min(0.1, Math.hypot(pointer.x, pointer.y) * 0.055);
      groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, scale, 0.045));
    }

    if (onFps) {
      const metrics = metricsRef.current;
      if (metrics.startedAt === 0) metrics.startedAt = clock.elapsedTime;
      metrics.frames += 1;
      if (clock.elapsedTime - metrics.startedAt >= 0.7) {
        onFps(Math.round(metrics.frames / (clock.elapsedTime - metrics.startedAt)));
        metrics.frames = 0;
        metrics.startedAt = clock.elapsedTime;
      }
    }
  });

  return (
    <group ref={groupRef} frustumCulled={false} scale={0.72}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[form.positions, 3]} />
          <bufferAttribute attach="attributes-phase" args={[form.phases, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

function EntityScene({ forms, onFps }: { forms: ShapeForm[]; onFps: (fps: number) => void }) {
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const activeRef = useRef(0);
  const transitionRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = (activeRef.current + 1) % forms.length;
      const transitionId = transitionRef.current + 1;
      transitionRef.current = transitionId;
      setPrevious(activeRef.current);
      activeRef.current = next;
      setActive(next);
      window.setTimeout(() => {
        if (transitionRef.current === transitionId) setPrevious(null);
      }, FADE_MS);
    }, SWITCH_MS);
    return () => window.clearInterval(timer);
  }, [forms.length]);

  return (
    <>
      {previous !== null && <ShapeLayer key={`previous-${previous}-${transitionRef.current}`} form={forms[previous]} targetOpacity={0} initialOpacity={0.9} />}
      <ShapeLayer key={`active-${active}-${transitionRef.current}`} form={forms[active]} targetOpacity={0.94} initialOpacity={previous === null ? 0.94 : 0} onFps={onFps} />
    </>
  );
}

export function ModelScene() {
  const forms = useMemo(makeForms, []);
  const [fps, setFps] = useState(60);

  return (
    <div className="relative h-full w-full overflow-visible">
      <Canvas
        style={{ position: 'absolute', inset: '-10%', width: '120%', height: '120%' }}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.35]}
        performance={{ min: 0.75 }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 6.35]} fov={42} />
        <ambientLight intensity={0.5} />
        <EntityScene forms={forms} onFps={setFps} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 z-10 mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
        <div className="terminal-border absolute left-5 top-5 p-3 leading-5">
          ENTITY // ROUTE
          <br />
          <b className="text-[var(--fg-primary)]">ID</b> <span className="glow">0xSEK-09A</span>
          <br />
          <b className="text-[var(--fg-primary)]">STATE</b> <span className="glow">LIVE</span>
          <br />
          <b className="text-[var(--fg-primary)]">SEED</b> <span className="cyan">0x5E-C0-RE</span>
        </div>
        <div className="terminal-border absolute right-5 top-5 p-3 text-right leading-5">
          TARGET LOCK //
          <br />
          <b className="text-[var(--fg-primary)]">NODES</b> <span className="glow">{NODE_COUNT}</span>
          <br />
          <b className="text-[var(--fg-primary)]">FORMS</b> <span className="cyan">{forms.length}</span>
          <br />
          <b className="text-[var(--fg-primary)]">MODE</b> <span className="cyan">CROSSFADE</span>
        </div>
        <div className="terminal-border absolute bottom-5 left-5 p-3 leading-5">
          TELEMETRY //
          <br />
          <b className="text-[var(--fg-primary)]">SWITCH</b> <span className="glow">{SWITCH_MS / 1000}s</span>
          <br />
          <b className="text-[var(--fg-primary)]">CACHE</b> <span className="cyan">INDEPENDENT</span>
        </div>
        <div className="terminal-border absolute bottom-5 right-5 p-3 text-right leading-5">
          SIGNATURE //
          <br />
          <b className="text-[var(--fg-primary)]">HZ</b> <span className="glow">{fps.toFixed(1)}</span>
          <br />
          <b className="text-[var(--fg-primary)]">SYNC</b> <span className="glow">OK</span>
        </div>
      </div>
    </div>
  );
}
