import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { createModelForms, createPhases } from './models/generators';

const NODE_COUNT = 42000;
const FORM_COUNT = 35;
const ZERO_POSITIONS = new Float32Array(NODE_COUNT * 3);
const HOLD_SECONDS = 2.2;
const MORPH_SECONDS = 4.6;
const CYCLE_SECONDS = HOLD_SECONDS + MORPH_SECONDS;

const vertexShader = `
  precision highp float;
  attribute vec3 fromPosition;
  attribute vec3 toPosition;
  attribute float phase;
  uniform float uTime;
  uniform float uMorph;
  uniform float uPointSize;
  uniform vec2 uPointer;
  uniform float uPointerActive;
  varying float vPulse;
  varying float vDepth;
  varying float vPointerGlow;

  float ease(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
  }

  void main() {
    float e = ease(clamp(uMorph, 0.0, 1.0));
    vec3 p = mix(fromPosition, toPosition, e);
    float pulse = sin(uTime * 2.4 + phase * 6.2831);
    float morphShock = sin(e * 3.14159);
    p *= 1.0 + morphShock * 0.18;

    vec2 pointer = uPointer * vec2(1.75, 1.2);
    vec2 delta = p.xy - pointer;
    float field = exp(-dot(delta, delta) * 1.55) * uPointerActive;
    vec2 dir = normalize(delta + vec2(0.001));
    p.xy += dir * field * (0.34 + 0.18 * sin(uTime * 7.0 + phase * 22.0));
    p.z += field * sin(uTime * 5.2 + phase * 18.0) * 0.42;

    p += normalize(p + vec3(0.001)) * pulse * 0.018;
    p.y += sin(uTime * 0.85 + phase * 11.0) * 0.012;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    vDepth = clamp((-mvPosition.z - 1.0) / 5.0, 0.0, 1.0);
    vPulse = pulse * 0.5 + 0.5;
    vPointerGlow = field;
    gl_PointSize = uPointSize * (1.0 + vPulse * 0.36 + morphShock * 0.38 + field * 1.45) * (1.0 / max(0.55, -mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vDepth;
  varying float vPulse;
  varying float vPointerGlow;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = dot(c, c);
    float alpha = smoothstep(0.25, 0.02, d) * uOpacity;
    vec3 color = uColor * (0.82 + vPulse * 0.34 + (1.0 - vDepth) * 0.24 + vPointerGlow * 0.92);
    gl_FragColor = vec4(color, alpha);
  }
`;

function colorFromHex(hex: string) {
  return new THREE.Color(hex);
}

function EntityPoints({ onFps }: { onFps: (fps: number) => void }) {
  const forms = useMemo(() => createModelForms(NODE_COUNT), []);
  const phases = useMemo(() => createPhases(NODE_COUNT), []);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const groupRef = useRef<THREE.Group>(null);
  const timingRef = useRef({ startedAt: 0, lastForm: -1, frames: 0, fpsStarted: 0 });
  const currentColor = useMemo(() => new THREE.Color(forms[0].color), [forms]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uPointSize: { value: 5.3 },
      uOpacity: { value: 0.94 },
      uColor: { value: colorFromHex(forms[0].color) },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPointerActive: { value: 0 },
    }),
    [forms],
  );

  useEffect(() => {
    geometryRef.current?.computeBoundingSphere();
  }, []);

  function loadPair(fromIndex: number) {
    const geometry = geometryRef.current;
    if (!geometry) return;
    const toIndex = (fromIndex + 1) % forms.length;
    const from = geometry.getAttribute('fromPosition') as THREE.BufferAttribute;
    const to = geometry.getAttribute('toPosition') as THREE.BufferAttribute;
    from.array.set(forms[fromIndex].positions);
    to.array.set(forms[toIndex].positions);
    from.needsUpdate = true;
    to.needsUpdate = true;
    geometry.computeBoundingSphere();
    currentColor.set(forms[fromIndex].color);
  }

  useFrame(({ clock, pointer }) => {
    const timing = timingRef.current;
    if (timing.startedAt === 0) {
      timing.startedAt = clock.elapsedTime;
      timing.fpsStarted = clock.elapsedTime;
      loadPair(0);
    }

    const elapsed = Math.max(0, clock.elapsedTime - timing.startedAt);
    const formIndex = Math.floor(elapsed / CYCLE_SECONDS) % forms.length;
    const cycleElapsed = elapsed % CYCLE_SECONDS;
    const morph = cycleElapsed <= HOLD_SECONDS ? 0 : Math.min(1, (cycleElapsed - HOLD_SECONDS) / MORPH_SECONDS);

    if (formIndex !== timing.lastForm) {
      timing.lastForm = formIndex;
      loadPair(formIndex);
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
      materialRef.current.uniforms.uMorph.value = morph;
      materialRef.current.uniforms.uPointer.value.set(pointer.x, pointer.y);
      materialRef.current.uniforms.uPointerActive.value += ((Math.abs(pointer.x) + Math.abs(pointer.y) > 0.002 ? 1 : 0) - materialRef.current.uniforms.uPointerActive.value) * 0.1;
      materialRef.current.uniforms.uColor.value.copy(currentColor);
    }

    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0036 + Math.abs(pointer.x) * 0.002;
      groupRef.current.rotation.x += (pointer.y * 0.36 + 0.13 - groupRef.current.rotation.x) * 0.05;
      groupRef.current.rotation.z += (pointer.x * 0.25 - groupRef.current.rotation.z) * 0.04;
      const targetScale = 0.68 + Math.min(0.11, Math.hypot(pointer.x, pointer.y) * 0.06);
      groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.045));
    }

    timing.frames += 1;
    if (clock.elapsedTime - timing.fpsStarted >= 0.6) {
      onFps(Math.round(timing.frames / (clock.elapsedTime - timing.fpsStarted)));
      timing.frames = 0;
      timing.fpsStarted = clock.elapsedTime;
    }
  });

  return (
    <group ref={groupRef} frustumCulled={false} scale={0.68}>
      <points frustumCulled={false}>
        <bufferGeometry ref={geometryRef}>
          <bufferAttribute attach="attributes-position" args={[ZERO_POSITIONS, 3]} />
          <bufferAttribute attach="attributes-fromPosition" args={[forms[0].positions.slice(), 3]} />
          <bufferAttribute attach="attributes-toPosition" args={[forms[1].positions.slice(), 3]} />
          <bufferAttribute attach="attributes-phase" args={[phases, 1]} />
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

export function ModelScene() {
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
        <EntityPoints onFps={setFps} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 z-10 mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
        <div className="terminal-border absolute left-5 top-5 p-3 leading-5">
          ENTITY // ROUTE
          <br />
          <b className="text-[var(--fg-primary)]">ID</b> <span className="glow">0xE-08F</span>
          <br />
          <b className="text-[var(--fg-primary)]">STATE</b> <span className="glow">LIVE</span>
          <br />
          <b className="text-[var(--fg-primary)]">SEED</b> <span className="cyan">0xDE-AD-BE-EF</span>
        </div>
        <div className="terminal-border absolute right-5 top-5 p-3 text-right leading-5">
          TARGET LOCK //
          <br />
          <b className="text-[var(--fg-primary)]">NODES</b> <span className="glow">{NODE_COUNT}</span>
          <br />
          <b className="text-[var(--fg-primary)]">FORMS</b> <span className="cyan">{FORM_COUNT}</span>
          <br />
          <b className="text-[var(--fg-primary)]">LOOP</b> <span className="cyan">SEQUENTIAL</span>
        </div>
        <div className="terminal-border absolute bottom-5 left-5 p-3 leading-5">
          TELEMETRY //
          <br />
          <b className="text-[var(--fg-primary)]">DRIFT</b> <span className="glow">99.7%</span>
          <br />
          <b className="text-[var(--fg-primary)]">CULL</b> <span className="cyan">OFFSCREEN SAFE</span>
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
