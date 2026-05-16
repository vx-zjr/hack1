import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { createModelForms, type ModelForm } from './models/generators';

const NODE_COUNT = 46000;
const HOLD_SECONDS = 3.2;
const TRANSITION_SECONDS = 4.8;
const TARGET_FORM_COUNT = 35;
const PALETTE = ['#3AFF7C', '#FFDC5A', '#6EC8FF', '#FF697E'] as const;

type Point = [number, number, number];

const ZERO_POSITIONS = new Float32Array(NODE_COUNT * 3);

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
  varying float vDepth;

  float easeInOut(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
  }

  void main() {
    float t = clamp(uTransition, 0.0, 1.0);
    float split = smoothstep(0.0, 0.5, t);
    float gather = smoothstep(0.5, 1.0, t);
    vec3 broken = scatterPosition;
    broken.xz += vec2(cos(uTime * 1.35 + phase * 18.0), sin(uTime * 1.15 + phase * 21.0)) * sin(t * 3.14159) * 0.34;
    broken.y += sin(uTime * 1.8 + phase * 16.0) * sin(t * 3.14159) * 0.18;
    vec3 disperse = mix(fromPosition, broken, easeInOut(split));
    vec3 p = mix(disperse, toPosition, easeInOut(gather));

    float pulse = sin(uTime * 2.15 + phase * 6.2831853);
    vec2 pointer = uPointer * vec2(1.8, 1.18);
    vec2 delta = p.xy - pointer;
    float field = exp(-dot(delta, delta) * 1.45) * uPointerActive;
    vec2 dir = normalize(delta + vec2(0.001));
    p.xy += dir * field * (0.28 + 0.13 * sin(uTime * 7.4 + phase * 20.0));
    p.z += field * sin(uTime * 5.1 + phase * 18.0) * 0.32;
    p += normalize(p + vec3(0.001)) * pulse * 0.012;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vPulse = pulse * 0.5 + 0.5;
    vPointer = field;
    vDepth = clamp((-mv.z - 1.0) / 5.5, 0.0, 1.0);
    gl_PointSize = uPointSize * (1.0 + vPulse * 0.25 + field * 1.2 + sin(t * 3.14159) * 0.18) * (1.0 / max(0.58, -mv.z));
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
    float alpha = smoothstep(0.24, 0.035, d) * uOpacity;
    vec3 color = uColor * (0.72 + vPulse * 0.22 + (1.0 - vDepth) * 0.16 + vPointer * 0.55);
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

function pack(points: Point[], count = NODE_COUNT, scale = 1.52) {
  while (points.length < count) points.push(points[points.length % Math.max(1, points.length)] ?? [0, 0, 0]);
  let max = 0.001;
  for (let i = 0; i < count; i += 1) {
    const p = points[i];
    max = Math.max(max, Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]));
  }
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const p = points[i];
    out[i * 3] = (p[0] / max) * scale;
    out[i * 3 + 1] = (p[1] / max) * scale;
    out[i * 3 + 2] = (p[2] / max) * scale;
  }
  return out;
}

function makeFirewallGate(): Float32Array {
  const rand = mulberry32(0xf17e);
  const points: Point[] = [];
  const cols = 17;
  const rows = 11;
  const perCell = 68;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cx = (x / (cols - 1) - 0.5) * 2.2;
      const cy = (y / (rows - 1) - 0.5) * 1.35;
      const hot = (x + y) % 4 === 0;
      for (let i = 0; i < perCell; i += 1) {
        const edge = i % 4;
        const t = (i / perCell) % 1;
        const w = hot ? 0.08 : 0.055;
        points.push([
          cx + (edge < 2 ? (t - 0.5) * 0.13 : edge === 2 ? -w : w),
          cy + (edge >= 2 ? (t - 0.5) * 0.13 : edge === 0 ? -w : w),
          (rand() - 0.5) * 0.24,
        ]);
      }
    }
  }
  const shield: Point[] = [
    [0, 1.06, 0.22],
    [0.82, 0.72, 0.18],
    [0.7, -0.25, 0.14],
    [0, -1.08, 0.22],
    [-0.7, -0.25, 0.14],
    [-0.82, 0.72, 0.18],
  ];
  for (let i = 0; i < shield.length; i += 1) line(shield[i], shield[(i + 1) % shield.length], 900, points);
  for (let r = 0; r < 12; r += 1) {
    const radius = 0.14 + r * 0.055;
    for (let i = 0; i < 420; i += 1) {
      const a = (i / 420) * Math.PI * 2;
      points.push([Math.cos(a) * radius, Math.sin(a) * radius * 0.72, 0.34 + Math.sin(a * 3 + r) * 0.04]);
    }
  }
  return pack(points);
}

function makeScatter(seed: number) {
  const rand = mulberry32(seed);
  const out = new Float32Array(NODE_COUNT * 3);
  for (let i = 0; i < NODE_COUNT; i += 1) {
    const a = rand() * Math.PI * 2;
    const b = Math.acos(rand() * 2 - 1);
    const shell = 1.85 + Math.pow(rand(), 0.35) * 1.4;
    out[i * 3] = Math.sin(b) * Math.cos(a) * shell;
    out[i * 3 + 1] = Math.cos(b) * shell * 0.82 + (rand() - 0.5) * 0.9;
    out[i * 3 + 2] = Math.sin(b) * Math.sin(a) * shell;
  }
  return out;
}

function makePhases(seed: number) {
  const rand = mulberry32(seed);
  const out = new Float32Array(NODE_COUNT);
  for (let i = 0; i < NODE_COUNT; i += 1) out[i] = rand();
  return out;
}

function makeForms() {
  const base = createModelForms(NODE_COUNT).filter((form) => !form.name.toLowerCase().includes('skull'));
  const forms: ModelForm[] = [
    ...base,
    {
      name: 'FIREWALL GATE',
      color: PALETTE[base.length % PALETTE.length],
      positions: makeFirewallGate(),
    },
  ];
  return forms.slice(0, TARGET_FORM_COUNT);
}

function EntityPoints({ onFps }: { onFps: (fps: number) => void }) {
  const forms = useMemo(makeForms, []);
  const phases = useMemo(() => makePhases(0x51a7), []);
  const scatters = useMemo(() => forms.map((_, index) => makeScatter(0x9000 + index * 137)), [forms]);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const groupRef = useRef<THREE.Group>(null);
  const stateRef = useRef({
    current: 0,
    next: 1,
    phase: 'hold' as 'hold' | 'transition',
    startedAt: 0,
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
      uPointSize: { value: 4.0 },
      uColor: { value: new THREE.Color(forms[0].color) },
      uOpacity: { value: 0.7 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPointerActive: { value: 0 },
    }),
    [forms],
  );

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
    geometry.computeBoundingSphere();
  }

  useEffect(() => {
    writeAttributes(0, 1);
  }, []);

  useFrame(({ clock, pointer }) => {
    const state = stateRef.current;
    if (state.startedAt === 0) {
      state.startedAt = clock.elapsedTime;
      state.phaseStartedAt = clock.elapsedTime;
      state.fpsStartedAt = clock.elapsedTime;
    }

    const elapsed = clock.elapsedTime - state.phaseStartedAt;
    let transition = 0;

    if (state.phase === 'hold' && elapsed >= HOLD_SECONDS) {
      state.phase = 'transition';
      state.phaseStartedAt = clock.elapsedTime;
      writeAttributes(state.current, state.next);
    } else if (state.phase === 'transition') {
      transition = Math.min(1, elapsed / TRANSITION_SECONDS);
      if (transition >= 1) {
        state.current = state.next;
        state.next = (state.current + 1) % forms.length;
        state.phase = 'hold';
        state.phaseStartedAt = clock.elapsedTime;
        transition = 0;
        writeAttributes(state.current, state.next);
      }
    }

    if (materialRef.current) {
      const uniforms = materialRef.current.uniforms;
      uniforms.uTime.value = clock.elapsedTime;
      uniforms.uTransition.value = transition;
      uniforms.uPointer.value.set(pointer.x, pointer.y);
      uniforms.uPointerActive.value += ((Math.abs(pointer.x) + Math.abs(pointer.y) > 0.002 ? 1 : 0) - uniforms.uPointerActive.value) * 0.1;
      fromColor.set(forms[state.current].color);
      toColor.set(forms[state.next].color);
      color.lerpColors(fromColor, toColor, transition);
      uniforms.uColor.value.copy(color);
    }

    if (groupRef.current) {
      groupRef.current.rotation.y += 0.004 + Math.abs(pointer.x) * 0.0016;
      groupRef.current.rotation.x += (pointer.y * 0.3 + 0.12 - groupRef.current.rotation.x) * 0.045;
      groupRef.current.rotation.z += (pointer.x * 0.22 - groupRef.current.rotation.z) * 0.035;
      const scale = 0.68 + Math.min(0.09, Math.hypot(pointer.x, pointer.y) * 0.045);
      groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, scale, 0.045));
    }

    state.frames += 1;
    if (clock.elapsedTime - state.fpsStartedAt >= 0.75) {
      onFps(Math.round(state.frames / (clock.elapsedTime - state.fpsStartedAt)));
      state.frames = 0;
      state.fpsStartedAt = clock.elapsedTime;
    }
  });

  return (
    <group ref={groupRef} frustumCulled={false} scale={0.68}>
      <points frustumCulled={false}>
        <bufferGeometry ref={geometryRef}>
          <bufferAttribute attach="attributes-position" args={[ZERO_POSITIONS, 3]} />
          <bufferAttribute attach="attributes-fromPosition" args={[forms[0].positions.slice(), 3]} />
          <bufferAttribute attach="attributes-toPosition" args={[forms[1].positions.slice(), 3]} />
          <bufferAttribute attach="attributes-scatterPosition" args={[scatters[0].slice(), 3]} />
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

export function ModelScene() {
  const [fps, setFps] = useState(60);

  return (
    <div className="relative h-full w-full overflow-visible">
      <Canvas
        style={{ position: 'absolute', inset: '-10%', width: '120%', height: '120%' }}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.28]}
        performance={{ min: 0.75 }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 6.35]} fov={42} />
        <ambientLight intensity={0.5} />
        <EntityPoints onFps={setFps} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 z-10 mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
        <div className="terminal-border absolute left-5 top-5 p-3 leading-5">
          ENTITY // ROUTE
          <br />
          <b className="text-[var(--fg-primary)]">ID</b> <span className="glow">0xSEK-09A</span>
          <br />
          <b className="text-[var(--fg-primary)]">STATE</b> <span className="glow">LIVE</span>
          <br />
          <b className="text-[var(--fg-primary)]">FLOW</b> <span className="cyan">DISPERSE/GATHER</span>
        </div>
        <div className="terminal-border absolute right-5 top-5 p-3 text-right leading-5">
          TARGET LOCK //
          <br />
          <b className="text-[var(--fg-primary)]">NODES</b> <span className="glow">{NODE_COUNT}</span>
          <br />
          <b className="text-[var(--fg-primary)]">FORMS</b> <span className="cyan">{TARGET_FORM_COUNT}</span>
          <br />
          <b className="text-[var(--fg-primary)]">MODE</b> <span className="cyan">NO LINES</span>
        </div>
        <div className="terminal-border absolute bottom-5 left-5 p-3 leading-5">
          TELEMETRY //
          <br />
          <b className="text-[var(--fg-primary)]">SCATTER</b> <span className="glow">{TRANSITION_SECONDS}s</span>
          <br />
          <b className="text-[var(--fg-primary)]">BLEND</b> <span className="cyan">NORMAL</span>
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
