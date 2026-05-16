import { Canvas, useFrame } from '@react-three/fiber';
import { motion } from 'framer-motion';
import { CheckCircle2, Cloud, Cpu, Database, Fingerprint, KeyRound, LockKeyhole, RadioTower, ScanLine, Server, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFlowStore } from '../store/useFlowStore';

const steps = ['Establishing handshake', 'Verifying credentials', 'Decrypting token', 'Granting access'];
const stepIcons = [Cloud, Fingerprint, KeyRound, ShieldCheck];
const orbitIcons = [Cloud, Cpu, Database, Fingerprint, KeyRound, LockKeyhole, RadioTower, ScanLine, Server, ShieldCheck];

const vertexShader = `
  attribute vec3 targetPosition;
  attribute float phase;
  uniform float uTime;
  uniform float uProgress;
  varying float vPulse;
  varying float vScan;
  void main() {
    float e = smoothstep(0.0, 1.0, uProgress);
    vec3 p = mix(position, targetPosition, e);
    float burst = sin(uTime * 5.2 + phase * 18.0);
    float scan = smoothstep(0.035, 0.0, abs(p.y - sin(uTime * 1.9) * 1.15));
    p += normalize(p + vec3(0.001)) * burst * (1.0 - e) * 0.2;
    p.z += scan * 0.28;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vPulse = burst * 0.5 + 0.5;
    vScan = scan;
    gl_PointSize = (4.0 + vPulse * 4.8 + vScan * 7.0) * (1.0 / max(0.45, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = `
  precision highp float;
  varying float vPulse;
  varying float vScan;
  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = dot(c, c);
    float a = smoothstep(0.24, 0.02, d);
    vec3 color = mix(vec3(0.0, 0.9, 1.0), vec3(0.22, 1.0, 0.49), vPulse);
    color = mix(color, vec3(1.0, 0.69, 0.13), vScan * 0.45);
    gl_FragColor = vec4(color, a * 0.92);
  }
`;

function AuthParticles({ duration }: { duration: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const startedRef = useRef(0);

  const { positions, targets, phases } = useMemo(() => {
    const count = 9800;
    const pos = new Float32Array(count * 3);
    const target = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const b = Math.acos(Math.random() * 2 - 1);
      const r = 1.9 + Math.random() * 1.8;
      pos[i * 3] = Math.sin(b) * Math.cos(a) * r;
      pos[i * 3 + 1] = Math.cos(b) * r;
      pos[i * 3 + 2] = Math.sin(b) * Math.sin(a) * r;

      const ring = 0.22 + Math.random() * 0.95;
      const t = (i / count) * Math.PI * 2 * 12;
      const lane = (i % 9) / 9;
      target[i * 3] = Math.cos(t) * ring;
      target[i * 3 + 1] = (lane - 0.5) * 0.72 + Math.sin(t * 0.7) * 0.16;
      target[i * 3 + 2] = Math.sin(t) * ring;
      ph[i] = Math.random();
    }
    return { positions: pos, targets: target, phases: ph };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (startedRef.current === 0) startedRef.current = clock.elapsedTime;
    const elapsed = clock.elapsedTime - startedRef.current;
    const progress = Math.min(1, elapsed / duration);
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
      materialRef.current.uniforms.uProgress.value = progress;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.015;
      groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.8) * 0.24;
      groupRef.current.rotation.z = Math.cos(clock.elapsedTime * 0.55) * 0.12;
    }
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-targetPosition" args={[targets, 3]} />
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

export default function AuthAnimation({ onComplete, onFailure }: { onComplete: () => void; onFailure: () => void }) {
  const duration = useMemo(() => 5 + Math.random() * 5, []);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const pendingAuth = useFlowStore((state) => state.pendingAuth);
  const setAuthError = useFlowStore((state) => state.setAuthError);
  const setPendingAuth = useFlowStore((state) => state.setPendingAuth);

  useEffect(() => {
    const started = performance.now();
    const ticker = window.setInterval(() => {
      setProgress(Math.min(1, (performance.now() - started) / (duration * 1000)));
    }, 80);
    const timers = steps.map((_, index) => window.setTimeout(() => setActiveStep(index), (duration * 1000 * index) / steps.length));
    const done = window.setTimeout(() => {
      if (pendingAuth?.ok) {
        setPendingAuth(null);
        onComplete();
        return;
      }
      setAuthError(pendingAuth?.message ?? '输入错误，请联系管理员', pendingAuth?.field);
      setPendingAuth(null);
      onFailure();
    }, duration * 1000 + 360);
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearInterval(ticker);
      window.clearTimeout(done);
    };
  }, [duration, onComplete, onFailure, pendingAuth, setAuthError, setPendingAuth]);

  return (
    <main className="relative z-10 h-full w-full overflow-hidden bg-black/35">
      <Canvas gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }} dpr={[1, 1.25]} camera={{ position: [0, 0, 4.8], fov: 48 }}>
        <AuthParticles duration={duration} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,229,255,0.12),transparent_40%),linear-gradient(180deg,rgba(58,255,124,0.07),transparent_32%,rgba(255,176,32,0.06))]" />

      <section className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="grid w-[min(980px,84vw)] grid-cols-[1fr_260px] gap-5">
          <div className="panel terminal-border p-8">
            <div className="mono mb-6 text-[11px] uppercase tracking-[0.28em] text-[var(--fg-muted)]">
              CLOUD VERIFICATION PIPELINE // <span className="glow">{Math.round(duration)}S WINDOW</span>
            </div>
            <div className="mb-6 h-2 border border-[var(--border-default)] bg-black/45">
              <div className="h-full bg-[linear-gradient(90deg,var(--cyan),var(--accent),var(--warn))]" style={{ width: `${Math.floor(progress * 100)}%` }} />
            </div>
            <div className="grid gap-4">
              {steps.map((step, index) => {
                const Icon = stepIcons[index];
                const complete = index < activeStep;
                const active = index === activeStep;
                return (
                  <motion.div
                    key={step}
                    className={`flex items-center justify-between border px-4 py-3 mono text-sm tracking-[0.08em] ${
                      active || complete ? 'border-[var(--accent)] text-[var(--accent)] shadow-[0_0_16px_rgba(58,255,124,0.18)]' : 'border-[var(--border-default)] text-[var(--fg-muted)]'
                    }`}
                    animate={{ opacity: active || complete ? 1 : 0.45, x: active ? [0, 6, 0] : 0 }}
                    transition={{ duration: 0.35, repeat: active ? Infinity : 0, repeatDelay: 0.55 }}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={18} className={active ? 'text-[var(--warn)]' : ''} />
                      {step}
                    </span>
                    {complete ? <CheckCircle2 size={17} /> : <span>{active ? '...' : '--'}</span>}
                  </motion.div>
                );
              })}
            </div>
          </div>

          <aside className="panel terminal-border grid grid-cols-2 gap-3 p-5">
            {orbitIcons.map((Icon, index) => (
              <motion.div
                key={index}
                className="grid place-items-center border border-[var(--border-subtle)] bg-black/35 text-[var(--accent)]"
                animate={{
                  opacity: [0.25, 1, 0.25],
                  scale: [0.94, 1.08, 0.94],
                  color: index % 3 === 0 ? ['#3AFF7C', '#00E5FF', '#3AFF7C'] : ['#3AFF7C', '#FFB020', '#3AFF7C'],
                }}
                transition={{ duration: 1.4 + index * 0.08, repeat: Infinity, delay: index * 0.06 }}
              >
                <Icon size={26} />
              </motion.div>
            ))}
          </aside>
        </div>
      </section>
    </main>
  );
}
