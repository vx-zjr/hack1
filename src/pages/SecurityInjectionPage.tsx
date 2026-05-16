import { Canvas, useFrame } from '@react-three/fiber';
import { motion } from 'framer-motion';
import { Activity, Cpu, Database, Fingerprint, HardDrive, KeyRound, LockKeyhole, RadioTower, Server, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const DURATION = 30_000;

const modules = [
  'Inject safety module',
  'Isolate render sandbox',
  'Bind synthetic data bus',
  'Load visual telemetry',
  'Issue demo token',
  'Start permission shell',
];

const traceMessages = [
  'routing kernel-safe visual bus',
  'seeding encrypted frame cache',
  'mapping volatile memory window',
  'hydrating telemetry ring buffer',
  'validating operator capability flag',
  'rotating one-way display token',
  'probing synthetic syscall table',
  'mounting isolated render volume',
  'binding local audit semaphore',
  'normalizing packet entropy stream',
  'compacting transient route graph',
  'arming viewport watchdog',
  'indexing volatile event journal',
  'warming shader execution lane',
  'checking sandbox integrity marker',
  'pinning temporary access vector',
];

const icons = [ShieldCheck, LockKeyhole, Cpu, Server, Database, RadioTower, Fingerprint, KeyRound, HardDrive, Activity];

type TraceLog = {
  id: string;
  text: string;
  tone: 'normal' | 'cyan' | 'warn';
};

const vertexShader = `
  attribute float phase;
  uniform float uTime;
  uniform float uProgress;
  varying float vPulse;
  varying float vRing;

  void main() {
    vec3 p = position;
    float ring = sin(length(p.xz) * 7.0 - uTime * 5.5 + phase * 6.2831);
    float lift = smoothstep(0.0, 1.0, uProgress);
    p.y += ring * 0.08 + lift * sin(uTime * 1.8 + phase * 10.0) * 0.24;
    p.xz *= 0.75 + lift * 0.28 + sin(uTime * 0.9 + phase * 8.0) * 0.025;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vPulse = sin(uTime * 8.0 + phase * 24.0) * 0.5 + 0.5;
    vRing = ring * 0.5 + 0.5;
    gl_PointSize = (2.7 + vPulse * 4.4 + vRing * 2.0) * (1.0 / max(0.42, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = `
  precision highp float;
  varying float vPulse;
  varying float vRing;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = dot(c, c);
    float alpha = smoothstep(0.25, 0.02, d);
    vec3 a = vec3(0.22, 1.0, 0.49);
    vec3 b = vec3(0.0, 0.9, 1.0);
    vec3 c2 = vec3(1.0, 0.69, 0.13);
    vec3 color = mix(mix(a, b, vRing), c2, vPulse * 0.25);
    gl_FragColor = vec4(color, alpha * 0.88);
  }
`;

function InjectionParticles({ progress }: { progress: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const { positions, phases } = useMemo(() => {
    const count = 14000;
    const pos = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const band = i % 18;
      const t = (i / count) * Math.PI * 2 * 56;
      const r = 0.18 + band * 0.055 + Math.sin(t * 0.17) * 0.018;
      pos[i * 3] = Math.cos(t) * r;
      pos[i * 3 + 1] = (band / 17 - 0.5) * 1.8 + Math.sin(t * 0.31) * 0.08;
      pos[i * 3 + 2] = Math.sin(t) * r;
      ph[i] = Math.random();
    }
    return { positions: pos, phases: ph };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
      materialRef.current.uniforms.uProgress.value = progress;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.42;
      groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.38) * 0.36;
      groupRef.current.rotation.z = Math.cos(clock.elapsedTime * 0.27) * 0.18;
    }
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
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

function percent(value: number) {
  return Math.min(100, Math.floor(value * 100));
}

export default function SecurityInjectionPage({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<TraceLog[]>([]);

  useEffect(() => {
    const started = performance.now();
    const progressTimer = window.setInterval(() => {
      const next = Math.min(1, (performance.now() - started) / DURATION);
      setProgress(next);
      if (next >= 1) {
        window.clearInterval(progressTimer);
        window.setTimeout(onComplete, 720);
      }
    }, 80);

    const logTimer = window.setInterval(() => {
      const message = traceMessages[Math.floor(Math.random() * traceMessages.length)];
      const code = Math.random().toString(16).slice(2, 10).toUpperCase();
      const tone = Math.random() > 0.82 ? 'warn' : Math.random() > 0.55 ? 'cyan' : 'normal';
      setLogs((current) => [
        ...current.slice(-18),
        {
          id: `${Date.now()}-${code}`,
          text: `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${message} :: ${code}`,
          tone,
        },
      ]);
    }, 420);

    return () => {
      window.clearInterval(progressTimer);
      window.clearInterval(logTimer);
    };
  }, [onComplete]);

  const activeModule = Math.min(modules.length - 1, Math.floor(progress * modules.length));

  return (
    <main className="relative z-10 h-full w-full overflow-hidden bg-black/45">
      <Canvas gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }} dpr={[1, 1.25]} camera={{ position: [0, 0, 4.5], fov: 50 }}>
        <InjectionParticles progress={progress} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(58,255,124,0.14),transparent_42%),linear-gradient(90deg,rgba(0,229,255,0.08),transparent_30%,rgba(255,59,92,0.06))]" />

      <section className="absolute inset-0 grid place-items-center p-8">
        <div className="grid h-[560px] w-[min(1120px,88vw)] grid-cols-[minmax(0,1fr)_360px] gap-5">
          <div className="panel terminal-border p-6">
            <div className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--fg-muted)]">SECURITY INJECTION // 30S MODULE</div>
            <h1 className="display mt-4 text-5xl font-bold text-[var(--fg-primary)]">
              注入安全模块 <span className="glow">/ SAFETY CORE</span>
            </h1>
            <div className="mt-5 h-3 border border-[var(--border-default)] bg-black/45">
              <motion.div className="h-full bg-[linear-gradient(90deg,var(--accent),var(--cyan),var(--warn))]" style={{ width: `${percent(progress)}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between mono text-xs uppercase tracking-[0.2em] text-[var(--fg-secondary)]">
              <span>PROGRESS {percent(progress)}%</span>
              <span className="cyan">ETA {Math.max(0, Math.ceil((1 - progress) * 30))}S</span>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              {modules.map((module, index) => {
                const Icon = icons[index % icons.length];
                const done = index < activeModule;
                const active = index === activeModule;
                return (
                  <motion.div
                    key={module}
                    className={`terminal-border flex items-center gap-3 border p-3 mono text-[12px] ${
                      done || active ? 'border-[var(--accent)] bg-[rgba(58,255,124,0.1)] text-[var(--fg-primary)]' : 'border-[var(--border-subtle)] bg-black/28 text-[var(--fg-muted)]'
                    }`}
                    animate={{ opacity: done || active ? 1 : 0.45, y: active ? [0, -3, 0] : 0 }}
                    transition={{ duration: 0.45, repeat: active ? Infinity : 0 }}
                  >
                    <Icon size={17} className={active ? 'text-[var(--warn)]' : done ? 'text-[var(--accent)]' : ''} />
                    <span>{module}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <aside className="panel terminal-border flex min-h-0 flex-col overflow-hidden p-5">
            <div className="mb-4 flex items-center justify-between mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              <span>INJECTION TRACE</span>
              <span className="glow">STREAM</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {icons.map((Icon, index) => (
                <motion.div
                  key={index}
                  className="grid h-12 place-items-center border border-[var(--border-subtle)] bg-black/35 text-[var(--accent)]"
                  animate={{ opacity: [0.35, 1, 0.35], boxShadow: ['0 0 0 rgba(58,255,124,0)', '0 0 18px rgba(58,255,124,0.28)', '0 0 0 rgba(58,255,124,0)'] }}
                  transition={{ duration: 1.2 + index * 0.07, repeat: Infinity, delay: index * 0.08 }}
                >
                  <Icon size={18} />
                </motion.div>
              ))}
            </div>
            <div className="thin-scrollbar mt-5 flex min-h-0 flex-1 flex-col justify-end overflow-hidden pr-1 mono text-[11px] leading-5">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  className={`truncate ${log.tone === 'cyan' ? 'cyan' : log.tone === 'warn' ? 'warn' : 'text-[var(--fg-secondary)]'}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  {log.text}
                </motion.div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
