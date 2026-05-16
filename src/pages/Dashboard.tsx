import { Canvas, useFrame } from '@react-three/fiber';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  BellRing,
  BookOpen,
  Bug,
  Camera,
  Cpu,
  Database,
  Download,
  Fingerprint,
  Globe2,
  Hotel,
  IdCard,
  Loader2,
  LockKeyhole,
  Map,
  MessageCircle,
  Music2,
  Network,
  PackageSearch,
  Play,
  RadioTower,
  Search,
  Shield,
  ShieldAlert,
  Signal,
  Smartphone,
  TerminalSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as THREE from 'three';
import { makeChartData, makeFakeLog, makeRadarData } from '../lib/fakeData';
import { useFlowStore } from '../store/useFlowStore';

const VALID_API_KEY = 'r#kwgGY5*@)-!H>t37R@~#XkBP5gU^Z?4h~jcv!b#mv';
const SPECIAL_LOADING_MS = 120_000;

type ModuleKind = 'special' | 'locked';
type ModuleDef = {
  id: string;
  label: string;
  short: string;
  icon: LucideIcon;
  kind: ModuleKind;
  hint: string;
};

const specialModules: ModuleDef[] = [
  { id: 'douyin', label: '抖音', short: 'DYINT', icon: Music2, kind: 'special', hint: '短视频轨迹模拟' },
  { id: 'wechat', label: '微信', short: 'WXINT', icon: MessageCircle, kind: 'special', hint: '社交通讯模拟' },
  { id: 'rednote', label: '小红书', short: 'XHS', icon: BookOpen, kind: 'special', hint: '社区画像模拟' },
  { id: 'hotel', label: '酒店', short: 'HOTEL', icon: Hotel, kind: 'special', hint: '入住记录模拟' },
  { id: 'bigdata', label: '大数据', short: 'BIGDATA', icon: Database, kind: 'special', hint: '多源融合模拟' },
  { id: 'hukou', label: '户籍', short: 'CENSUS', icon: IdCard, kind: 'special', hint: '身份档案模拟' },
  { id: 'camera', label: '摄像头', short: 'CCTV', icon: Camera, kind: 'special', hint: '影像检索模拟' },
];

const lockedModules: ModuleDef[] = [
  { id: 'ip', label: 'IP 信息查询', short: 'IPINT', icon: Globe2, kind: 'locked', hint: '需要上级权限' },
  { id: 'whois', label: '域名 / WHOIS', short: 'WHOIS', icon: Search, kind: 'locked', hint: '需要上级权限' },
  { id: 'ports', label: '端口扫描', short: 'PORTS', icon: RadioTower, kind: 'locked', hint: '需要上级权限' },
  { id: 'hash', label: '哈希解析', short: 'HASH', icon: Fingerprint, kind: 'locked', hint: '需要上级权限' },
  { id: 'meta', label: '元数据分析', short: 'META', icon: PackageSearch, kind: 'locked', hint: '需要上级权限' },
  { id: 'darkweb', label: '暗网监控', short: 'DARK', icon: Database, kind: 'locked', hint: '需要上级权限' },
  { id: 'cve', label: '漏洞数据库', short: 'CVE', icon: Bug, kind: 'locked', hint: '需要上级权限' },
  { id: 'topology', label: '网络拓扑可视化', short: 'TOPO', icon: Map, kind: 'locked', hint: '需要上级权限' },
  { id: 'leak', label: '数据泄露查询', short: 'LEAK', icon: ShieldAlert, kind: 'locked', hint: '需要上级权限' },
  { id: 'crypto', label: '加解密工具箱', short: 'CRYPTO', icon: LockKeyhole, kind: 'locked', hint: '需要上级权限' },
  { id: 'packet', label: '数据包分析', short: 'PCAP', icon: Network, kind: 'locked', hint: '需要上级权限' },
];

const modules = [...specialModules, ...lockedModules];

type QueryStage = 'form' | 'loading' | 'download' | 'invalid' | 'locked';

function randomHex(bytes = 4) {
  return Array.from({ length: bytes }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
}

function AttackGlobe() {
  const groupRef = useRef<THREE.Group>(null);
  const points = useMemo(() => {
    const items: THREE.Vector3[] = [];
    for (let i = 0; i < 260; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const b = Math.acos(Math.random() * 2 - 1);
      items.push(new THREE.Vector3(Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)));
    }
    return items;
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.elapsedTime * 0.18;
    groupRef.current.rotation.x = -0.25 + Math.sin(clock.elapsedTime * 0.25) * 0.06;
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[1, 48, 24]} />
        <meshBasicMaterial color="#0A0F12" wireframe transparent opacity={0.7} />
      </mesh>
      {points.map((point, index) => (
        <mesh key={index} position={point.multiplyScalar(1.03)}>
          <sphereGeometry args={[index % 17 === 0 ? 0.02 : 0.01, 8, 8]} />
          <meshBasicMaterial color={index % 19 === 0 ? '#FF3B5C' : index % 7 === 0 ? '#00E5FF' : '#3AFF7C'} />
        </mesh>
      ))}
      {Array.from({ length: 18 }).map((_, index) => {
        const a = (index / 18) * Math.PI * 2;
        return (
          <mesh key={`arc-${index}`} rotation={[Math.PI / 2, 0, a]}>
            <torusGeometry args={[1.07, 0.002, 6, 80, Math.PI * (0.18 + (index % 4) * 0.08)]} />
            <meshBasicMaterial color={index % 3 === 0 ? '#FFB020' : '#3AFF7C'} transparent opacity={0.42} />
          </mesh>
        );
      })}
    </group>
  );
}

function Stat({ label, value, tone = 'glow' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="panel terminal-border p-3">
      <div className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">{label}</div>
      <div className={`mono mt-2 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function ChartBox({ children }: { children: (size: { width: number; height: number }) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width > 8 && height > 8) setSize({ width, height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-[calc(100%-28px)] min-h-0 w-full">
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  );
}

function AccessDeniedPanel({ module }: { module: ModuleDef }) {
  return (
    <div className="panel terminal-border flex h-full min-h-0 flex-col items-center justify-center p-8 text-center">
      <AlertTriangle size={64} className="mb-5 text-[var(--danger)] drop-shadow-[0_0_24px_rgba(255,59,92,0.55)]" />
      <div className="display text-5xl font-bold text-[var(--danger)]">无权限</div>
      <div className="mono mt-4 text-sm uppercase tracking-[0.18em] text-[var(--fg-muted)]">
        {module.label} // ACCESS DENIED // {module.short}
      </div>
      <div className="mt-6 w-full max-w-xl border border-[var(--border-subtle)] bg-black/35 p-4 mono text-[12px] leading-6 text-[var(--fg-secondary)]">
        当前演示会话没有此模块授权。该提示只在本地 UI 中渲染，不会发起真实查询、扫描或外部请求。
      </div>
    </div>
  );
}

function SpecialQueryForm({
  module,
  phone,
  apiKey,
  setPhone,
  setApiKey,
  onSubmit,
  formError,
}: {
  module: ModuleDef;
  phone: string;
  apiKey: string;
  setPhone: (value: string) => void;
  setApiKey: (value: string) => void;
  onSubmit: () => void;
  formError: string | null;
}) {
  const Icon = module.icon;
  return (
    <div className="panel terminal-border grid h-full min-h-0 grid-cols-[1fr_300px] gap-5 p-5">
      <section className="flex min-h-0 flex-col">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center border border-[var(--accent)] bg-[rgba(58,255,124,0.1)] text-[var(--accent)]">
            <Icon size={24} />
          </div>
          <div>
            <div className="display text-3xl font-bold text-[var(--fg-primary)]">{module.label} 查询页</div>
            <div className="mono mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
              {module.short} // {module.hint} // LOCAL SIMULATION
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <label className="block">
            <span className="mono mb-2 block text-[11px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">手机号</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="请输入手机号"
              className="h-12 w-full border border-[var(--border-default)] bg-black/45 px-4 mono text-sm text-[var(--fg-primary)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_18px_rgba(58,255,124,0.18)]"
            />
          </label>
          <label className="block">
            <span className="mono mb-2 block text-[11px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">APIKEY</span>
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="请输入 APIKEY"
              className={`h-12 w-full border bg-black/45 px-4 mono text-sm text-[var(--fg-primary)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_18px_rgba(58,255,124,0.18)] ${formError ? 'border-[var(--danger)] shadow-[0_0_18px_rgba(255,59,92,0.18)]' : 'border-[var(--border-default)]'}`}
            />
            {formError && <span className="mt-2 block mono text-xs text-[var(--danger)]">{formError}</span>}
          </label>
          <button
            onClick={onSubmit}
            className="mt-2 inline-flex h-12 w-fit items-center gap-3 bg-[var(--accent)] px-6 mono text-sm font-bold uppercase tracking-[0.2em] text-[var(--fg-inverse)] shadow-[0_0_24px_rgba(58,255,124,0.42)] hover:bg-[var(--accent-bright)]"
          >
            <Play size={16} />
            确认查询
          </button>
        </div>

        <div className="mt-5 grid min-h-0 flex-1 grid-cols-3 gap-3">
          {['IDENTITY MAP', 'CLOUD TOKEN', 'LOCAL CACHE', 'RISK MODEL', 'TUI QUEUE', 'VISUAL BUS'].map((item, index) => (
            <div key={item} className="terminal-border border border-[var(--border-subtle)] bg-black/25 p-3">
              <div className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">{item}</div>
              <div className={index % 3 === 0 ? 'mono mt-2 text-xl glow' : index % 3 === 1 ? 'mono mt-2 text-xl cyan' : 'mono mt-2 text-xl warn'}>
                {index % 2 ? `${70 + index * 3}%` : `0x${randomHex(3).toUpperCase()}`}
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="terminal-border flex min-h-0 flex-col border border-[var(--border-subtle)] bg-black/35 p-4">
        <div className="mono mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">MODULE TRACE</div>
        <div className="thin-scrollbar min-h-0 flex-1 overflow-hidden mono text-[11px] leading-5 text-[var(--fg-secondary)]">
          {Array.from({ length: 22 }).map((_, index) => (
            <div key={index} className={index % 6 === 0 ? 'cyan' : index % 8 === 0 ? 'warn' : ''}>
              [{String(index).padStart(2, '0')}] {module.short} channel probe :: sim-{randomHex(2)}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function ComplexLoading({ module, apiKey, onDone }: { module: ModuleDef; apiKey: string; onDone: (valid: boolean) => void }) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const started = performance.now();
    const timer = window.setInterval(() => {
      const next = Math.min(1, (performance.now() - started) / SPECIAL_LOADING_MS);
      setProgress(next);
      if (next >= 1) {
        window.clearInterval(timer);
        window.setTimeout(() => onDone(apiKey === VALID_API_KEY), 600);
      }
    }, 180);
    const logTimer = window.setInterval(() => {
      const text = [
        'building persona index',
        'folding graph shards',
        'hydrating visual cache',
        'normalizing phone token',
        'checking api key signature',
        'rendering compliance gate',
        'aligning synthetic clusters',
      ][Math.floor(Math.random() * 7)];
      setLogs((current) => [`[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${module.short} ${text} :: ${randomHex(4)}`, ...current].slice(0, 32));
    }, 360);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(logTimer);
    };
  }, [apiKey, module.short, onDone]);

  const pct = Math.floor(progress * 100);
  return (
    <div className="panel terminal-border relative h-full min-h-0 overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(0,229,255,0.15),transparent_38%),radial-gradient(circle_at_22%_74%,rgba(58,255,124,0.13),transparent_34%)]" />
      <div className="relative z-10 grid h-full grid-cols-[1fr_320px] gap-5">
        <section className="flex min-h-0 flex-col justify-center">
          <div className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--fg-muted)]">TWO-MINUTE DATA FUSION // {module.short}</div>
          <div className="display mt-4 text-5xl font-bold text-[var(--fg-primary)]">{module.label} 模块加载中</div>
          <div className="mt-6 h-4 border border-[var(--border-default)] bg-black/55">
            <div className="h-full bg-[linear-gradient(90deg,var(--accent),var(--cyan),var(--warn),var(--danger))]" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between mono text-xs uppercase tracking-[0.2em] text-[var(--fg-secondary)]">
            <span>progress {pct}%</span>
            <span className="cyan">eta {Math.max(0, Math.ceil((1 - progress) * 120))}s</span>
          </div>

          <div className="mt-8 grid grid-cols-8 gap-2">
            {Array.from({ length: 64 }).map((_, index) => {
              const hot = (index + pct) % 11 === 0 || (index * 3 + pct) % 17 === 0;
              return (
                <div
                  key={index}
                  className="h-8 border border-[var(--border-subtle)] bg-black/35"
                  style={{
                    opacity: hot ? 1 : 0.22 + ((index + pct) % 6) * 0.08,
                    boxShadow: hot ? '0 0 20px rgba(58,255,124,0.36)' : 'none',
                  }}
                />
              );
            })}
          </div>
        </section>

        <aside className="terminal-border flex min-h-0 flex-col border border-[var(--border-subtle)] bg-black/45 p-4">
          <div className="mb-3 flex items-center justify-between mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            <span>ANALYTIC STREAM</span>
            <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
          </div>
          <div className="thin-scrollbar min-h-0 flex-1 overflow-hidden mono text-[11px] leading-5">
            {logs.map((log, index) => (
              <div key={`${log}-${index}`} className={index % 5 === 0 ? 'cyan' : index % 7 === 0 ? 'warn' : 'text-[var(--fg-secondary)]'}>
                {log}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function DownloadPanel({ module }: { module: ModuleDef }) {
  const [speed, setSpeed] = useState(180);
  const [progress, setProgress] = useState(1.8);
  const [etaSeconds, setEtaSeconds] = useState(2 * 3600 + Math.floor(Math.random() * 900 - 450));
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextSpeed = 100 + Math.floor(Math.random() * 201);
      setSpeed(nextSpeed);
      setProgress((value) => Math.min(99, value + nextSpeed / 72_000));
      setEtaSeconds((value) => Math.max(0, value - 1 - Math.floor(Math.random() * 3)));
      setLogs((current) => [`[${new Date().toLocaleTimeString('en-US', { hour12: false })}] writing ${module.short}_${randomHex(3)}.pack :: ${nextSpeed} mbps`, ...current].slice(0, 24));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [module.short]);

  const hours = Math.floor(etaSeconds / 3600);
  const minutes = Math.floor((etaSeconds % 3600) / 60);
  const seconds = etaSeconds % 60;

  return (
    <div className="panel terminal-border grid h-full min-h-0 grid-cols-[1fr_340px] gap-5 p-5">
      <section className="flex min-h-0 flex-col justify-center">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center border border-[var(--accent)] bg-[rgba(58,255,124,0.12)] text-[var(--accent)]">
            <Download size={34} />
          </div>
          <div>
            <div className="display text-5xl font-bold text-[var(--fg-primary)]">数据下载到本机中</div>
            <div className="mono mt-2 text-[12px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              {module.label} // encrypted local package // simulated
            </div>
          </div>
        </div>
        <div className="mt-8 h-5 border border-[var(--border-default)] bg-black/55">
          <div className="h-full bg-[linear-gradient(90deg,var(--accent),var(--cyan),var(--warn))]" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Download Progress" value={`${progress.toFixed(2)}%`} />
          <Stat label="Net Speed" value={`${speed} mbps`} tone={speed > 240 ? 'warn' : 'cyan'} />
          <Stat label="Time Left" value={`${hours}h ${minutes}m ${seconds}s`} tone="glow" />
        </div>
        <div className="mt-6 grid grid-cols-12 gap-1">
          {Array.from({ length: 96 }).map((_, index) => (
            <div
              key={index}
              className="h-4 border border-[var(--border-subtle)] bg-[rgba(58,255,124,0.08)]"
              style={{ opacity: index < progress ? 0.95 : 0.18 + ((index + speed) % 4) * 0.1 }}
            />
          ))}
        </div>
      </section>

      <aside className="terminal-border flex min-h-0 flex-col border border-[var(--border-subtle)] bg-black/45 p-4">
        <div className="mb-3 mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">LOCAL WRITE LOG</div>
        <div className="thin-scrollbar min-h-0 flex-1 overflow-hidden mono text-[11px] leading-5">
          {logs.map((log, index) => (
            <div key={`${log}-${index}`} className={index % 6 === 0 ? 'cyan' : 'text-[var(--fg-secondary)]'}>
              {log}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function InvalidKeyPanel({ module, onBack }: { module: ModuleDef; onBack: () => void }) {
  return (
    <div className="panel terminal-border flex h-full min-h-0 flex-col items-center justify-center p-8 text-center">
      <ShieldAlert size={64} className="mb-5 text-[var(--danger)] drop-shadow-[0_0_24px_rgba(255,59,92,0.55)]" />
      <div className="display text-4xl font-bold text-[var(--danger)]">APIKEY 校验失败</div>
      <div className="mono mt-4 text-sm uppercase tracking-[0.18em] text-[var(--fg-muted)]">{module.label} // TOKEN REJECTED</div>
      <button
        onClick={onBack}
        className="mt-8 h-11 border border-[var(--accent)] bg-[rgba(58,255,124,0.1)] px-5 mono text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)] hover:bg-[rgba(58,255,124,0.18)]"
      >
        返回查询页
      </button>
    </div>
  );
}

export default function Dashboard() {
  const session = useFlowStore((state) => state.session);
  const [activeModule, setActiveModule] = useState<ModuleDef>(specialModules[0]);
  const [stage, setStage] = useState<QueryStage>('form');
  const [phone, setPhone] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [logs, setLogs] = useState(() => Array.from({ length: 14 }, () => makeFakeLog()));
  const [chartData, setChartData] = useState(() => makeChartData());
  const [radarData, setRadarData] = useState(() => makeRadarData());
  const [threat, setThreat] = useState(72);
  const [statSeed, setStatSeed] = useState({ events: 1560, queries: 48 });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLogs((current) => [makeFakeLog(), ...current].slice(0, 30));
      setChartData(makeChartData());
      setRadarData(makeRadarData());
      setThreat(55 + Math.round(Math.random() * 38));
      setStatSeed({
        events: 1200 + Math.floor(Math.random() * 800),
        queries: 40 + Math.floor(Math.random() * 60),
      });
    }, 1800);
    return () => window.clearInterval(timer);
  }, []);

  function selectModule(module: ModuleDef) {
    setActiveModule(module);
    setPhone('');
    setApiKey('');
    setFormError(null);
    if (module.kind === 'locked') {
      setStage('locked');
      setLogs((current) => [`[${new Date().toLocaleTimeString('en-US', { hour12: false })}] [WARN] ${module.label} :: 无权限`, ...current].slice(0, 30));
      return;
    }
    setStage('form');
    setLogs((current) => [`[${new Date().toLocaleTimeString('en-US', { hour12: false })}] [OK] open ${module.short} query surface`, ...current].slice(0, 30));
  }

  function submitSpecialQuery() {
    if (activeModule.kind !== 'special') {
      setStage('locked');
      return;
    }
    if (!apiKey.trim()) {
      setFormError('请输入APIKEY');
      setLogs((current) => [`[${new Date().toLocaleTimeString('en-US', { hour12: false })}] [WARN] ${activeModule.short} APIKEY required`, ...current].slice(0, 30));
      return;
    }
    setFormError(null);
    setStage('loading');
  }

  const handleLoadingDone = useCallback((valid: boolean) => {
    setStage(valid ? 'download' : 'invalid');
  }, []);

  const updateApiKey = useCallback((value: string) => {
    setApiKey(value);
    if (value.trim()) setFormError(null);
  }, []);

  function renderWorkspace() {
    if (stage === 'locked') return <AccessDeniedPanel module={activeModule} />;
    if (stage === 'loading') return <ComplexLoading module={activeModule} apiKey={apiKey} onDone={handleLoadingDone} />;
    if (stage === 'download') return <DownloadPanel module={activeModule} />;
    if (stage === 'invalid') return <InvalidKeyPanel module={activeModule} onBack={() => setStage('form')} />;
    return <SpecialQueryForm module={activeModule} phone={phone} apiKey={apiKey} setPhone={setPhone} setApiKey={updateApiKey} onSubmit={submitSpecialQuery} formError={formError} />;
  }

  return (
    <main className="relative z-10 grid h-full w-full grid-cols-[268px_1fr] grid-rows-[64px_minmax(0,1fr)] gap-4 overflow-hidden p-4">
      <aside className="panel terminal-border row-span-2 flex min-h-0 flex-col p-4">
        <div className="mb-4 flex items-center gap-3 border-b border-[var(--border-subtle)] pb-4">
          <img src="/assets/logo-mark.svg" className="h-10 w-10" alt="" />
          <div>
            <div className="mono text-lg font-bold tracking-[0.12em] text-[var(--accent)]">HACK//OS</div>
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">ops dashboard</div>
          </div>
        </div>

        <div className="thin-scrollbar grid min-h-0 flex-1 content-start gap-2 overflow-auto pr-1">
          {modules.map((module) => {
            const Icon = module.icon;
            const selected = module.id === activeModule.id;
            return (
              <button
                key={module.id}
                onClick={() => selectModule(module)}
                className={`flex h-[50px] items-center gap-3 border px-3 text-left transition ${
                  selected
                    ? 'border-[var(--accent)] bg-[rgba(58,255,124,0.12)] text-[var(--accent)]'
                    : module.kind === 'locked'
                      ? 'border-[var(--border-subtle)] bg-black/20 text-[var(--fg-muted)] hover:border-[var(--danger)] hover:text-[var(--danger)]'
                      : 'border-[var(--border-subtle)] bg-black/25 text-[var(--fg-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--fg-primary)]'
                }`}
              >
                <Icon size={17} />
                <span className="min-w-0">
                  <span className="mono block truncate text-[12px]">{module.label}</span>
                  <span className="mono text-[9px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">{module.short}</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <header className="panel terminal-border flex items-center justify-between px-5">
        <div className="flex items-center gap-4 mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
          <TerminalSquare size={18} className="text-[var(--accent)]" />
          <span>
            SESSION <span className="glow">{session.id}</span>
          </span>
          <span>
            OPERATOR <span className="cyan">{session.operator}</span>
          </span>
          <span>
            MODE <span className="glow">SIMULATED</span>
          </span>
        </div>
        <div className="flex items-center gap-5 mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
          <span className="flex items-center gap-2">
            <Signal size={15} className="text-[var(--accent)]" /> LOCAL BUS
          </span>
          <span className="flex items-center gap-2">
            <BellRing size={15} className="text-[var(--warn)]" /> {Math.floor(threat / 8)} ALERTS
          </span>
        </div>
      </header>

      <section className="grid min-h-0 grid-cols-[minmax(0,1fr)_360px] grid-rows-[96px_minmax(0,1fr)_170px_72px] gap-4 overflow-hidden">
        <div className="grid min-h-0 grid-cols-3 gap-4">
          <Stat label="Threat Level" value={`${threat}%`} tone={threat > 82 ? 'danger' : threat > 68 ? 'warn' : 'glow'} />
          <Stat label="Synthetic Events" value={`${statSeed.events}`} tone="cyan" />
          <Stat label="Local Queries" value={`${statSeed.queries}`} tone="glow" />
        </div>

        <div className="panel terminal-border row-span-2 p-4">
          <div className="mb-2 flex items-center justify-between mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            <span>GLOBAL ATTACK MAP</span>
            <span className="glow">FAKE FEED</span>
          </div>
          <div className="h-[calc(100%-24px)]">
            <Canvas gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }} dpr={[1, 1.25]} camera={{ position: [0, 0, 3.2], fov: 48 }}>
              <AttackGlobe />
            </Canvas>
          </div>
        </div>

        <div className="min-h-0">{renderWorkspace()}</div>

        <div className="grid min-h-0 grid-cols-3 gap-4">
          <div className="panel terminal-border p-4">
            <div className="mb-3 flex items-center justify-between mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
              <span>PACKET WAVEFORM</span>
              <Activity size={15} className="text-[var(--accent)]" />
            </div>
            <ChartBox>
              {({ width, height }) => (
                <LineChart width={width} height={height} data={chartData}>
                  <CartesianGrid stroke="rgba(58,255,124,0.08)" />
                  <XAxis dataKey="tick" hide />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: '#0A0F12', border: '1px solid #253038', color: '#D7E3E9' }} />
                  <Line type="monotone" dataKey="packets" stroke="#3AFF7C" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="entropy" stroke="#00E5FF" strokeWidth={2} dot={false} />
                </LineChart>
              )}
            </ChartBox>
          </div>

          <div className="panel terminal-border p-4">
            <div className="mb-3 flex items-center justify-between mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
              <span>THREAT RADAR</span>
              <Shield size={15} className="text-[var(--accent)]" />
            </div>
            <ChartBox>
              {({ width, height }) => (
                <RadarChart width={width} height={height} data={radarData}>
                  <PolarGrid stroke="rgba(58,255,124,0.18)" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: '#8A9BA5', fontSize: 10 }} />
                  <Radar dataKey="value" stroke="#3AFF7C" fill="#3AFF7C" fillOpacity={0.22} />
                </RadarChart>
              )}
            </ChartBox>
          </div>

          <div className="panel terminal-border p-4">
            <div className="mb-3 flex items-center justify-between mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
              <span>RISK AREA</span>
              <Cpu size={15} className="text-[var(--cyan)]" />
            </div>
            <ChartBox>
              {({ width, height }) => (
                <AreaChart width={width} height={height} data={chartData}>
                  <defs>
                    <linearGradient id="risk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF3B5C" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#FF3B5C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="tick" hide />
                  <YAxis hide />
                  <Area type="monotone" dataKey="risk" stroke="#FF3B5C" fill="url(#risk)" />
                </AreaChart>
              )}
            </ChartBox>
          </div>
        </div>

        <div className="panel terminal-border flex min-h-0 flex-col p-4">
          <div className="mb-3 flex items-center justify-between mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            <span>LIVE LOG STREAM</span>
            <Database size={15} className="text-[var(--accent)]" />
          </div>
          <div className="thin-scrollbar min-h-0 flex-1 overflow-hidden pr-1 mono text-[11px] leading-5">
            {logs.map((log, index) => (
              <div key={`${log}-${index}`} className={log.includes('WARN') ? 'warn' : log.includes('ERR') ? 'danger' : log.includes('TRACE') ? 'cyan' : 'text-[var(--fg-secondary)]'}>
                {log}
              </div>
            ))}
          </div>
        </div>

        <div className="panel terminal-border col-span-2 flex min-h-0 items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <div className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">ACTIVE MODULE</div>
            <div className="mono mt-1 truncate text-xl font-bold text-[var(--fg-primary)]">
              {activeModule.label} <span className={activeModule.kind === 'locked' ? 'danger' : 'glow'}>// {activeModule.short}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            <Smartphone size={16} className="text-[var(--cyan)]" />
            <span>{stage === 'locked' ? '无权限' : stage === 'download' ? '下载中' : stage === 'loading' ? '加载中' : '等待输入'}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
