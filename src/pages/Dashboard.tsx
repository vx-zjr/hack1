import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BellRing,
  BookOpen,
  Bug,
  Camera,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  FileDown,
  Fingerprint,
  FolderOpen,
  Globe2,
  Hotel,
  IdCard,
  LockKeyhole,
  Map,
  MessageCircle,
  Music2,
  Network,
  PackageSearch,
  Play,
  RadioTower,
  Search,
  ShieldAlert,
  Signal,
  Smartphone,
  TerminalSquare,
  Volume2,
  VolumeX,
  type LucideIcon,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { makeChartData, makeFakeLog } from '../lib/fakeData';
import { useFlowStore } from '../store/useFlowStore';

const VALID_API_KEY = 'r#kwgGY5*@)-!H>t37R@~#XkBP5gU^Z?4h~jcv!b#mv';
const SPECIAL_LOADING_MS = 130_000;

type QueryStage = 'form' | 'loading' | 'folder' | 'download' | 'invalid' | 'locked';

type ModuleItem = {
  id: string;
  label: string;
  short: string;
  icon: LucideIcon;
  special?: boolean;
};

type ChartSize = {
  width: number;
  height: number;
};

const specialModules: ModuleItem[] = [
  { id: 'douyin', label: '抖音', short: 'DY', icon: Music2, special: true },
  { id: 'wechat', label: '微信', short: 'WX', icon: MessageCircle, special: true },
  { id: 'redbook', label: '小红书', short: 'XHS', icon: BookOpen, special: true },
  { id: 'hotel', label: '酒店开房同住', short: 'HOTEL', icon: Hotel, special: true },
  { id: 'bigdata', label: '大数据关联', short: 'BDATA', icon: Database, special: true },
  { id: 'registry', label: '户籍', short: 'REG', icon: IdCard, special: true },
  { id: 'camera', label: '摄像头', short: 'CAM', icon: Camera, special: true },
];

const lockedModules: ModuleItem[] = [
  { id: 'ip', label: 'IP 信息查询', short: 'IPINT', icon: Globe2 },
  { id: 'whois', label: '域名 / WHOIS', short: 'WHOIS', icon: Search },
  { id: 'ports', label: '端口扫描', short: 'PORTS', icon: RadioTower },
  { id: 'hash', label: '哈希解析', short: 'HASH', icon: Fingerprint },
  { id: 'meta', label: '元数据分析', short: 'META', icon: PackageSearch },
  { id: 'darkweb', label: '暗网监控', short: 'DARK', icon: ShieldAlert },
  { id: 'cve', label: '漏洞数据库', short: 'CVE', icon: Bug },
  { id: 'topology', label: '网络拓扑', short: 'TOPO', icon: Map },
  { id: 'leak', label: '数据泄露', short: 'LEAK', icon: LockKeyhole },
  { id: 'crypto', label: '加解密工具箱', short: 'CRYPTO', icon: Cpu },
  { id: 'packet', label: '数据包分析', short: 'PCAP', icon: Network },
];

const modules = [...specialModules, ...lockedModules];

const loadingEffects = [
  {
    id: 'handshake',
    title: 'REMOTE SESSION NEGOTIATION',
    icon: Signal,
    accent: '#3AFF7C',
    metrics: ['SYN/ACK', 'TLS MASK', 'EDGE ROUTE', 'NODE TRUST'],
  },
  {
    id: 'tunnel',
    title: 'ROUTE TABLE RECONCILE',
    icon: RadioTower,
    accent: '#00E5FF',
    metrics: ['LATENCY', 'JITTER', 'RELAY HOPS', 'CHANNEL'],
  },
  {
    id: 'token',
    title: 'KEYSTORE HANDSHAKE',
    icon: LockKeyhole,
    accent: '#FFDC5A',
    metrics: ['NONCE', 'SALT', 'VAULT', 'TTL'],
  },
  {
    id: 'pivot',
    title: 'EDGE RELAY MAPPING',
    icon: Network,
    accent: '#FF697E',
    metrics: ['PIVOT', 'ACL', 'ROUTE', 'SCOPE'],
  },
  {
    id: 'packet',
    title: 'PACKET BUFFER INDEX',
    icon: Activity,
    accent: '#6EC8FF',
    metrics: ['BURST', 'WINDOW', 'DROPS', 'SEQ'],
  },
  {
    id: 'vault',
    title: 'ACCESS TOKEN AUDIT',
    icon: Fingerprint,
    accent: '#3AFF7C',
    metrics: ['HASH', 'PEPPER', 'REALM', 'LOCK'],
  },
  {
    id: 'dns',
    title: 'DNS CACHE TRACE',
    icon: Globe2,
    accent: '#00E5FF',
    metrics: ['CNAME', 'ASN', 'CACHE', 'ZONE'],
  },
  {
    id: 'socket',
    title: 'SOCKET STATE CHECK',
    icon: TerminalSquare,
    accent: '#FFDC5A',
    metrics: ['FD', 'QUEUE', 'RX/TX', 'KEEPALIVE'],
  },
  {
    id: 'firewall',
    title: 'FIREWALL RULE MIRROR',
    icon: ShieldAlert,
    accent: '#FF697E',
    metrics: ['RULESET', 'NAT', 'DROP', 'ALLOW'],
  },
  {
    id: 'export',
    title: 'EXPORT MANIFEST DRY-RUN',
    icon: FileDown,
    accent: '#6EC8FF',
    metrics: ['CHUNK', 'INDEX', 'BUFFER', 'CHECKSUM'],
  },
] as const;

function randomHex(bytes = 4) {
  return Array.from({ length: bytes }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
}

function fmtPercent(value: number) {
  return Math.max(0, Math.min(100, value * 100)).toFixed(1);
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(total / 60);
  const sec = String(total % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

type SoundKind = 'click' | 'confirm' | 'deny' | 'complete' | 'toggle';

function playSound(enabled: boolean, kind: SoundKind) {
  if (!enabled) return;
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const tones: Record<SoundKind, [number, number, OscillatorType]> = {
    click: [420, 0.045, 'square'],
    confirm: [720, 0.075, 'triangle'],
    deny: [150, 0.12, 'sawtooth'],
    complete: [880, 0.16, 'sine'],
    toggle: [540, 0.06, 'square'],
  };
  const [frequency, duration, type] = tones[kind];
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.55), context.currentTime + duration);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
  window.setTimeout(() => void context.close(), Math.ceil(duration * 1000) + 80);
}

function speakAi(enabled: boolean, text: string) {
  if (!enabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.78;
  utterance.pitch = 0.45;
  utterance.volume = 0.72;
  window.speechSynthesis.speak(utterance);
}

const downloadBaseHours: Record<string, number> = {
  wechat: 5.05,
  bigdata: 4.15,
  hotel: 3.25,
  registry: 2.55,
  camera: 2.05,
  redbook: 1.55,
  douyin: 1.25,
};

function makeDownloadProfile(moduleId: string) {
  const base = downloadBaseHours[moduleId] ?? 1.8;
  const jitter = 0.88 + Math.random() * 0.24;
  return {
    targetHours: base * jitter,
    initialSpeed: 100 + Math.round(Math.random() * 200),
    initialProgress: 0.004 + Math.random() * 0.018,
  };
}

function formatEtaHours(hours: number) {
  const safe = Math.max(0, hours);
  const h = Math.floor(safe);
  const m = Math.max(1, Math.round((safe - h) * 60));
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

function StatusPill({ tone, children }: { tone: 'ok' | 'warn' | 'danger' | 'cyan'; children: ReactNode }) {
  const colors = {
    ok: 'border-[rgba(58,255,124,0.35)] text-[var(--accent)] bg-[rgba(58,255,124,0.08)]',
    warn: 'border-[rgba(255,176,32,0.35)] text-[var(--warn)] bg-[rgba(255,176,32,0.08)]',
    danger: 'border-[rgba(255,59,92,0.35)] text-[var(--danger)] bg-[rgba(255,59,92,0.08)]',
    cyan: 'border-[rgba(0,229,255,0.35)] text-[var(--cyan)] bg-[rgba(0,229,255,0.08)]',
  };
  return <span className={`mono inline-flex items-center border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${colors[tone]}`}>{children}</span>;
}

function Panel({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel terminal-border min-h-0 overflow-hidden p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-muted)]">SEK//OS</p>
          <h2 className="display text-sm font-semibold uppercase tracking-[0.08em] text-[var(--fg-primary)]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ChartBox({ children }: { children: (size: ChartSize) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartSize>({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)) });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className="h-full min-h-0 w-full overflow-hidden">{size.width > 10 && size.height > 10 ? children(size) : null}</div>;
}

function Sidebar({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (module: ModuleItem) => void;
}) {
  return (
    <aside className="panel terminal-border row-span-2 flex min-h-0 flex-col overflow-hidden p-4">
      <div className="mb-5 flex items-center gap-3 border-b border-[var(--border-default)] pb-4">
        <div className="grid h-10 w-10 place-items-center border border-[rgba(58,255,124,0.45)] bg-[rgba(58,255,124,0.08)] text-[var(--accent)]">
          <TerminalSquare size={22} />
        </div>
        <div>
          <h1 className="display text-lg font-bold tracking-[0.08em] text-[var(--accent)]">SEK//OS</h1>
          <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">internal console</p>
        </div>
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
        <p className="mono mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">licensed modules</p>
        <div className="space-y-2">
          {modules.map((module) => {
            const Icon = module.icon;
            const active = activeId === module.id;
            return (
              <button
                key={module.id}
                type="button"
                onClick={() => onSelect(module)}
                className={`group flex h-11 w-full items-center gap-3 border px-3 text-left transition ${
                  active
                    ? 'border-[rgba(58,255,124,0.7)] bg-[rgba(58,255,124,0.12)] text-[var(--accent)] shadow-[0_0_18px_rgba(58,255,124,0.12)]'
                    : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.025)] text-[var(--fg-secondary)] hover:border-[rgba(58,255,124,0.4)] hover:text-[var(--fg-primary)]'
                }`}
              >
                <Icon size={17} />
                <span className="min-w-0 flex-1 truncate text-sm">{module.label}</span>
                <span className="mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">{module.short}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function TopBar({ soundEnabled, onToggleSound }: { soundEnabled: boolean; onToggleSound: () => void }) {
  const session = useFlowStore((state) => state.session);
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="panel terminal-border flex items-center justify-between overflow-hidden px-4">
      <div className="flex items-center gap-3">
        <StatusPill tone="ok">OPERATOR {session.operator.toUpperCase()}</StatusPill>
        <StatusPill tone="cyan">SESSION {session.id}</StatusPill>
        <StatusPill tone="warn">LOCAL SIMULATION</StatusPill>
      </div>
      <div className="mono flex items-center gap-4 text-[11px] uppercase tracking-[0.18em] text-[var(--fg-secondary)]">
        <button
          type="button"
          onClick={onToggleSound}
          className={`flex h-9 items-center gap-2 border px-3 text-[10px] uppercase tracking-[0.16em] transition ${
            soundEnabled
              ? 'border-[rgba(58,255,124,0.45)] bg-[rgba(58,255,124,0.08)] text-[var(--accent)]'
              : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-[var(--fg-muted)]'
          }`}
        >
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          SOUND
        </button>
        <span>SEK//OS</span>
        <span className="glow">{time.toLocaleTimeString('en-US', { hour12: false })}</span>
      </div>
    </header>
  );
}

function SummaryStrip({ activeModule }: { activeModule: ModuleItem }) {
  const cards = [
    ['ACTIVE MODULE', activeModule.short, 'cyan'],
    ['TRACE BUFFER', `${3200 + Math.floor(Math.random() * 300)} MB`, 'ok'],
    ['LINK SCORE', `${84 + Math.floor(Math.random() * 12)}%`, 'ok'],
    ['ACCESS', activeModule.special ? 'AUTHORIZED' : 'DENIED', activeModule.special ? 'ok' : 'danger'],
  ] as const;

  return (
    <div className="contents">
      {cards.map(([label, value, tone]) => (
        <div key={label} className="panel terminal-border min-w-0 overflow-hidden p-3">
          <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">{label}</p>
          <p className={`mono mt-2 truncate text-xl font-semibold ${tone === 'danger' ? 'danger' : tone === 'cyan' ? 'cyan' : 'glow'}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function SpecialQueryForm({
  module,
  phone,
  apiKey,
  error,
  onPhone,
  onApiKey,
  onSubmit,
}: {
  module: ModuleItem;
  phone: string;
  apiKey: string;
  error: string;
  onPhone: (value: string) => void;
  onApiKey: (value: string) => void;
  onSubmit: () => void;
}) {
  const Icon = module.icon;
  return (
    <Panel title={`${module.label} // 查询控制台`} className="row-span-1">
      <div className="grid h-[calc(100%-40px)] grid-cols-[minmax(0,1fr)_250px] gap-4 overflow-hidden">
        <div className="flex min-h-0 flex-col justify-center gap-4">
          <label className="block">
            <span className="mono mb-2 block text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">手机号</span>
            <input
              value={phone}
              onChange={(event) => onPhone(event.target.value)}
              placeholder="请输入手机号"
              className="h-11 w-full border border-[var(--border-default)] bg-[rgba(5,8,10,0.75)] px-3 text-sm text-[var(--fg-primary)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="mono mb-2 block text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">APIKEY</span>
            <input
              value={apiKey}
              onChange={(event) => onApiKey(event.target.value)}
              placeholder="请输入APIKEY"
              className={`h-11 w-full border bg-[rgba(5,8,10,0.75)] px-3 text-sm text-[var(--fg-primary)] outline-none transition ${
                error ? 'border-[var(--danger)] shadow-[0_0_18px_rgba(255,59,92,0.14)]' : 'border-[var(--border-default)] focus:border-[var(--accent)]'
              }`}
            />
            {error && <span className="mono mt-2 block text-xs text-[var(--danger)]">{error}</span>}
          </label>
          <button
            type="button"
            onClick={onSubmit}
            className="mono flex h-12 w-fit items-center gap-2 border border-[rgba(58,255,124,0.6)] bg-[rgba(58,255,124,0.12)] px-5 text-xs uppercase tracking-[0.18em] text-[var(--accent)] transition hover:bg-[rgba(58,255,124,0.2)]"
          >
            <Play size={15} />
            确认查询
          </button>
        </div>
        <div className="terminal-border grid place-items-center border border-[rgba(58,255,124,0.18)] bg-[rgba(58,255,124,0.04)]">
          <div className="text-center">
            <Icon className="mx-auto mb-4 text-[var(--accent)]" size={54} />
            <p className="display text-2xl font-semibold text-[var(--fg-primary)]">{module.short}</p>
            <p className="mono mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">local demo gate</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function LockedPanel({ module }: { module: ModuleItem }) {
  const Icon = module.icon;
  return (
    <Panel title={`${module.label} // 权限状态`}>
      <div className="grid h-[calc(100%-40px)] place-items-center">
        <div className="text-center">
          <div className="mx-auto mb-5 grid h-20 w-20 place-items-center border border-[rgba(255,59,92,0.45)] bg-[rgba(255,59,92,0.08)] text-[var(--danger)]">
            <Icon size={38} />
          </div>
          <p className="display text-4xl font-bold tracking-[0.08em] text-[var(--danger)]">无权限</p>
          <p className="mono mt-4 text-[11px] uppercase tracking-[0.22em] text-[var(--fg-muted)]">{module.short} / ACCESS DENIED</p>
        </div>
      </div>
    </Panel>
  );
}

function LoadingEffectView({ index, progress, tick }: { index: number; progress: number; tick: number }) {
  const effect = loadingEffects[index];
  const Icon = effect.icon;
  const rows = useMemo(() => {
    const verbs = ['open relay channel', 'read route cache', 'verify token scope', 'mirror socket state', 'stage local buffer', 'audit response hash', 'sample packet window', 'seal manifest block'];
    return Array.from({ length: 11 }, (_, i) => {
      const code = 200 + ((tick * 17 + index * 23 + i * 7) % 80);
      const latency = 8 + ((tick * 11 + i * 13) % 42);
      return `[${String(i + 1).padStart(2, '0')}] ${verbs[(i + index + tick) % verbs.length]} :: status=${code} rtt=${latency}ms ref=${randomHex(3)}`;
    });
  }, [index, tick]);

  const bars = useMemo(
    () =>
      effect.metrics.map((metric, i) => ({
        metric,
        value: Math.min(99, Math.round(42 + progress * 48 + ((tick + i * 9) % 10))),
      })),
    [effect.metrics, progress, tick],
  );

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_260px] gap-4 overflow-hidden">
      <div className="terminal-border min-h-0 overflow-hidden border border-[rgba(255,255,255,0.08)] bg-black/45 p-4">
        <div className="mb-3 flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center border" style={{ borderColor: `${effect.accent}80`, color: effect.accent, background: `${effect.accent}12` }}>
              <Icon size={20} />
            </div>
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.18em]" style={{ color: effect.accent }}>{effect.title}</p>
              <p className="mono mt-1 text-[9px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">tty session / local simulation / no external query</p>
            </div>
          </div>
          <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-secondary)]">pid {3200 + index * 17 + (tick % 9)}</span>
        </div>

        <div className="grid h-[calc(100%-56px)] min-h-0 grid-cols-[minmax(0,1fr)_180px] gap-3 overflow-hidden">
          <div className="min-h-0 overflow-hidden bg-[rgba(0,0,0,0.24)] p-3">
            <div className="mono text-[10px] leading-5 text-[var(--fg-secondary)]">
              <p className="text-[var(--accent)]">$ sek-link --mode verify --profile {effect.id} --session {randomHex(2)}</p>
              {rows.map((row, i) => (
                <p key={`${row}-${i}`} className={i % 5 === 0 ? 'text-[var(--warn)]' : i % 3 === 0 ? 'text-[var(--cyan)]' : ''}>
                  {row}
                </p>
              ))}
              <p className="text-[var(--accent)]">$ checksum window {randomHex(8)} :: progress {fmtPercent(progress)}%</p>
            </div>
          </div>

          <div className="space-y-3 overflow-hidden">
            {bars.map((bar) => (
              <div key={bar.metric} className="border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.26)] p-2">
                <div className="mb-2 flex justify-between mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
                  <span>{bar.metric}</span>
                  <span style={{ color: effect.accent }}>{bar.value}%</span>
                </div>
                <div className="h-1.5 bg-[rgba(255,255,255,0.06)]">
                  <div className="h-full transition-[width] duration-300" style={{ width: `${bar.value}%`, backgroundColor: effect.accent }} />
                </div>
              </div>
            ))}
            <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.26)] p-2">
              <p className="mono mb-2 text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">socket table</p>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="grid grid-cols-[42px_1fr_34px] gap-2 mono text-[9px] leading-5 text-[var(--fg-secondary)]">
                  <span>tcp{i}</span>
                  <span className="truncate">10.{index + 8}.{(tick * 7 + i * 31) % 255}.{20 + i}</span>
                  <span className={i % 2 ? 'text-[var(--cyan)]' : 'text-[var(--accent)]'}>{i % 2 ? 'SYN' : 'EST'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComplexLoading({ module, onComplete }: { module: ModuleItem; onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>(() => Array.from({ length: 10 }, () => makeFakeLog('TRACE')));
  const [tick, setTick] = useState(0);
  const startRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    startRef.current = performance.now();
    completedRef.current = false;
    setProgress(0);
    setTick(0);
    setLogs(Array.from({ length: 10 }, () => makeFakeLog('TRACE')));

    const progressTimer = window.setInterval(() => {
      const next = Math.min(1, (performance.now() - startRef.current) / SPECIAL_LOADING_MS);
      setProgress((prev) => Math.max(prev, next));
      setTick((prev) => prev + 1);
      if (next >= 1 && !completedRef.current) {
        completedRef.current = true;
        window.clearInterval(progressTimer);
        window.clearInterval(logTimer);
        window.setTimeout(onComplete, 500);
      }
    }, 250);

    const logTimer = window.setInterval(() => {
      const verbs = ['remote handshake accepted', 'link tunnel heartbeat', 'token shard queued', 'route entropy normalized', 'socket graph sampled', 'export buffer sealed'];
      setLogs((prev) => [...prev.slice(-13), `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${verbs[Math.floor(Math.random() * verbs.length)]} :: ${randomHex(4)}`]);
    }, 900);

    return () => {
      window.clearInterval(progressTimer);
      window.clearInterval(logTimer);
    };
  }, [module.id, onComplete]);

  const effectIndex = Math.min(loadingEffects.length - 1, Math.floor(progress * loadingEffects.length));
  const remain = SPECIAL_LOADING_MS * (1 - progress);

  return (
    <Panel title={`${module.label} // 远程链路验证`} action={<StatusPill tone="cyan">effect {effectIndex + 1}/10</StatusPill>}>
      <div className="flex h-[calc(100%-40px)] min-h-0 flex-col overflow-hidden">
        <div className="mb-4 grid grid-cols-[1fr_110px_110px] items-end gap-4">
          <div>
            <div className="mb-2 flex items-center justify-between mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              <span>progress</span>
              <span className="glow">{fmtPercent(progress)}%</span>
            </div>
            <div className="h-3 overflow-hidden bg-[rgba(255,255,255,0.06)]">
              <div className="h-full bg-[linear-gradient(90deg,var(--accent),var(--cyan),var(--p-yellow))] transition-[width] duration-300" style={{ width: `${fmtPercent(progress)}%` }} />
            </div>
          </div>
          <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.22)] p-2">
            <p className="mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">ETA</p>
            <p className="mono mt-1 text-sm text-[var(--fg-primary)]">{formatDuration(remain)}</p>
          </div>
          <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.22)] p-2">
            <p className="mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">MODULE</p>
            <p className="mono mt-1 truncate text-sm text-[var(--accent)]">{module.short}</p>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-4 overflow-hidden">
          <LoadingEffectView key={effectIndex} index={effectIndex} progress={progress} tick={tick} />
          <div className="terminal-border min-h-0 overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(5,8,10,0.55)] p-3">
            <p className="mono mb-3 text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">live trace</p>
            <div className="thin-scrollbar flex h-[calc(100%-24px)] flex-col justify-end gap-1 overflow-hidden">
              {logs.map((log, index) => (
                <p key={`${log}-${index}`} className="mono truncate text-[10px] leading-5 text-[var(--fg-secondary)]">
                  <span className="text-[var(--accent)]">&gt;</span> {log}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function FolderSelectPanel({ module, onSelected }: { module: ModuleItem; onSelected: (folder: string) => void }) {
  const [notice, setNotice] = useState('');

  const selectFolder = async () => {
    const folder = await window.hackos?.selectFolder?.();
    if (folder) {
      onSelected(folder);
      return;
    }
    setNotice('未选择本地文件夹');
  };

  return (
    <Panel title={`${module.label} // 预下载目录`}>
      <div className="grid h-[calc(100%-40px)] place-items-center">
        <div className="max-w-xl text-center">
          <FolderOpen className="mx-auto mb-5 text-[var(--accent)]" size={60} />
          <p className="display text-2xl font-semibold text-[var(--fg-primary)]">请选择本地文件夹</p>
          <p className="mono mt-4 text-xs uppercase leading-6 tracking-[0.14em] text-[var(--fg-secondary)]">建议预留 100GB 空间，进行内存预下载与缓存索引。</p>
          <button
            type="button"
            onClick={selectFolder}
            className="mono mx-auto mt-6 flex h-12 items-center gap-2 border border-[rgba(58,255,124,0.6)] bg-[rgba(58,255,124,0.12)] px-5 text-xs uppercase tracking-[0.18em] text-[var(--accent)] transition hover:bg-[rgba(58,255,124,0.2)]"
          >
            <FolderOpen size={16} />
            选择文件夹
          </button>
          {notice && <p className="mono mt-4 text-xs text-[var(--danger)]">{notice}</p>}
        </div>
      </div>
    </Panel>
  );
}

function DownloadPanel({ module, folder, onSound }: { module: ModuleItem; folder: string; onSound: (kind: SoundKind, voice?: string) => void }) {
  const [profile] = useState(() => makeDownloadProfile(module.id));
  const [speed, setSpeed] = useState(profile.initialSpeed);
  const [progress, setProgress] = useState(profile.initialProgress);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    onSound('complete', `Download profile initialized. Estimated completion ${formatEtaHours(profile.targetHours)}.`);
    const timer = window.setInterval(() => {
      const nextSpeed = 100 + Math.round(Math.random() * 200);
      setSpeed(nextSpeed);
      setProgress((prev) => {
        const step = (1 / (profile.targetHours * 3600)) * (0.75 + Math.random() * 0.55) * (nextSpeed / 190);
        return Math.min(0.92, prev + step);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onSound, profile.targetHours]);

  const etaHours = profile.targetHours * (1 - progress);

  return (
    <Panel title={`${module.label} // 数据下载到本机`} action={<StatusPill tone="ok">download active</StatusPill>}>
      <div className="grid h-[calc(100%-40px)] min-h-0 grid-cols-[minmax(0,1fr)_260px] gap-4 overflow-hidden">
        <div className="flex min-h-0 flex-col justify-center">
          <div className="mb-3 flex justify-between mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            <span>target folder</span>
            <span className="truncate pl-4 text-[var(--fg-secondary)]">{folder}</span>
          </div>
          <div className="h-5 overflow-hidden bg-[rgba(255,255,255,0.06)]">
            <div className="h-full bg-[linear-gradient(90deg,var(--accent),var(--cyan),var(--p-yellow))] transition-[width] duration-500" style={{ width: `${fmtPercent(progress)}%` }} />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.24)] p-3">
              <p className="mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">progress</p>
              <p className="mono mt-2 text-xl text-[var(--accent)]">{fmtPercent(progress)}%</p>
            </div>
            <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.24)] p-3">
              <p className="mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">speed</p>
              <p className="mono mt-2 text-xl text-[var(--cyan)]">{speed} mbps</p>
            </div>
            <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.24)] p-3">
              <p className="mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">remaining</p>
              <p className="mono mt-2 text-xl text-[var(--warn)]">{formatEtaHours(etaHours)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setNotice('数据尚未下载完成，无法导出。');
              onSound('deny', 'Export denied. Data transfer is incomplete.');
            }}
            className="mono mt-6 flex h-11 w-fit items-center gap-2 border border-[rgba(0,229,255,0.45)] bg-[rgba(0,229,255,0.08)] px-4 text-xs uppercase tracking-[0.18em] text-[var(--cyan)]"
          >
            <Download size={15} />
            数据格式导出
          </button>
          {notice && <p className="mono mt-4 text-xs text-[var(--danger)]">{notice}</p>}
        </div>
        <div className="terminal-border min-h-0 overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(5,8,10,0.55)] p-3">
          <p className="mono mb-3 text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">chunk manifest</p>
          <div className="space-y-2">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="flex items-center gap-2 mono text-[10px] text-[var(--fg-secondary)]">
                <CheckCircle2 size={12} className={i / 12 < progress ? 'text-[var(--accent)]' : 'text-[var(--fg-faint)]'} />
                <span className="flex-1 truncate">seg_{String(i + 1).padStart(3, '0')}_{randomHex(2)}.bin</span>
                <span>{Math.round(4 + Math.random() * 8)}GB</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function InvalidKeyPanel({ module, onRetry }: { module: ModuleItem; onRetry: () => void }) {
  return (
    <Panel title={`${module.label} // APIKEY 状态`}>
      <div className="grid h-[calc(100%-40px)] place-items-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-5 text-[var(--danger)]" size={58} />
          <p className="display text-3xl font-semibold text-[var(--danger)]">APIKEY 验证失败</p>
          <button
            type="button"
            onClick={onRetry}
            className="mono mx-auto mt-6 flex h-11 items-center gap-2 border border-[rgba(255,59,92,0.45)] bg-[rgba(255,59,92,0.08)] px-4 text-xs uppercase tracking-[0.18em] text-[var(--danger)]"
          >
            返回输入
          </button>
        </div>
      </div>
    </Panel>
  );
}

function OpsIntelPanel() {
  const [tick, setTick] = useState(0);
  const services = ['edge-relay', 'vault-cache', 'ticket-broker', 'route-sentinel', 'audit-tail', 'packet-index'];

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1300);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Panel title="LIVE OPS INTEL" className="row-span-2">
      <div className="flex h-[calc(100%-40px)] min-h-0 flex-col gap-3 overflow-hidden">
        <div className="grid grid-cols-2 gap-2">
          {services.map((service, index) => (
            <div key={service} className="border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.22)] p-2">
              <div className="flex items-center justify-between">
                <p className="mono truncate text-[10px] uppercase tracking-[0.13em] text-[var(--fg-secondary)]">{service}</p>
                <span className={`h-2 w-2 ${((tick + index) % 5) === 0 ? 'bg-[var(--warn)]' : 'bg-[var(--accent)]'}`} />
              </div>
              <div className="mt-2 h-1 bg-[rgba(255,255,255,0.06)]">
                <div className="h-full bg-[var(--accent)]" style={{ width: `${58 + ((tick * 7 + index * 11) % 38)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.22)] p-3">
          <p className="mono mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">route table</p>
          <div className="space-y-2">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="grid grid-cols-[52px_1fr_48px] gap-2 mono text-[10px] text-[var(--fg-secondary)]">
                <span className="text-[var(--accent)]">r{i + 1}</span>
                <span className="truncate">10.{20 + i}.{(tick + i * 17) % 255}.0/24 - relay-{(tick + i) % 9}</span>
                <span className="text-right">{Math.round(8 + ((tick + i * 5) % 28))}ms</span>
              </div>
            ))}
          </div>
        </div>
        <div className="h-28 overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.22)] p-3">
          <p className="mono mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">hex stream</p>
          <p className="mono break-all text-[10px] leading-5 text-[var(--fg-secondary)]">
            {Array.from({ length: 32 }, (_, i) => randomHex(2 + ((tick + i) % 2))).join(' ')}
          </p>
        </div>
      </div>
    </Panel>
  );
}

function LiveLogPanel({ logs }: { logs: string[] }) {
  return (
    <Panel title="REALTIME EVENT STREAM">
      <div className="thin-scrollbar h-[calc(100%-40px)] min-h-0 overflow-hidden">
        <div className="flex h-full flex-col justify-end gap-1">
          {logs.map((log, index) => (
            <p key={`${log}-${index}`} className="mono truncate text-[10px] leading-5 text-[var(--fg-secondary)]">
              <span className="text-[var(--accent)]">&gt;</span> {log}
            </p>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function PacketWaveform({ data }: { data: ReturnType<typeof makeChartData> }) {
  return (
    <Panel title="PACKET WAVEFORM">
      <ChartBox>
        {({ width, height }) => (
          <LineChart width={width} height={height - 8} data={data} margin={{ left: -25, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="tick" hide />
            <YAxis hide />
            <Tooltip contentStyle={{ background: '#071013', border: '1px solid #253038', color: '#d7e3e9' }} />
            <Line type="monotone" dataKey="packets" stroke="#3AFF7C" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="entropy" stroke="#00E5FF" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        )}
      </ChartBox>
    </Panel>
  );
}

function AuthEventQueue() {
  const events = ['MFA cache sync', 'ticket rotate', 'nonce sweep', 'session bind', 'vault echo', 'audit commit'];
  return (
    <Panel title="AUTH EVENT QUEUE">
      <div className="grid h-[calc(100%-40px)] grid-cols-2 gap-2 overflow-hidden">
        {events.map((event, index) => (
          <div key={event} className="border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.22)] p-2">
            <div className="mb-2 flex items-center gap-2">
              <BellRing size={13} className={index % 3 === 0 ? 'text-[var(--warn)]' : 'text-[var(--accent)]'} />
              <p className="mono truncate text-[10px] uppercase tracking-[0.12em] text-[var(--fg-secondary)]">{event}</p>
            </div>
            <div className="h-1 bg-[rgba(255,255,255,0.06)]">
              <div className="h-full bg-[var(--accent)]" style={{ width: `${48 + index * 7}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FilesystemRisk({ data }: { data: ReturnType<typeof makeChartData> }) {
  return (
    <Panel title="FILESYSTEM I/O RISK">
      <ChartBox>
        {({ width, height }) => (
          <AreaChart width={width} height={height - 8} data={data} margin={{ left: -25, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="tick" hide />
            <YAxis hide />
            <Tooltip contentStyle={{ background: '#071013', border: '1px solid #253038', color: '#d7e3e9' }} />
            <Area type="monotone" dataKey="risk" stroke="#FFDC5A" fill="rgba(255,220,90,0.18)" isAnimationActive={false} />
          </AreaChart>
        )}
      </ChartBox>
    </Panel>
  );
}

function SwitchConfirmDialog({
  module,
  onCancel,
  onConfirm,
}: {
  module: ModuleItem;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm">
      <div className="panel terminal-border w-[460px] p-5">
        <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-muted)]">navigation warning</p>
        <h3 className="display mt-2 text-xl font-semibold text-[var(--fg-primary)]">切换页面将丧失已有进度</h3>
        <p className="mono mt-3 text-xs leading-6 text-[var(--fg-secondary)]">目标页面：{module.label} / {module.short}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="mono h-10 border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-4 text-xs uppercase tracking-[0.16em] text-[var(--fg-secondary)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="mono h-10 border border-[rgba(255,59,92,0.45)] bg-[rgba(255,59,92,0.1)] px-4 text-xs uppercase tracking-[0.16em] text-[var(--danger)]"
          >
            确认切换
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [activeModule, setActiveModule] = useState<ModuleItem>(modules[0]);
  const [pendingModule, setPendingModule] = useState<ModuleItem | null>(null);
  const [stage, setStage] = useState<QueryStage>('form');
  const [phone, setPhone] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiError, setApiError] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [logs, setLogs] = useState<string[]>(() => Array.from({ length: 18 }, () => makeFakeLog()));
  const [chartData, setChartData] = useState(() => makeChartData(36));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLogs((prev) => [...prev.slice(-20), makeFakeLog()]);
      setChartData(makeChartData(36));
    }, 1500);
    return () => window.clearInterval(timer);
  }, []);

  const emitSound = useCallback(
    (kind: SoundKind, voice?: string) => {
      playSound(soundEnabled, kind);
      if (voice) speakAi(soundEnabled, voice);
    },
    [soundEnabled],
  );

  const applyModule = useCallback((module: ModuleItem) => {
    setActiveModule(module);
    setStage(module.special ? 'form' : 'locked');
    setPhone('');
    setApiKey('');
    setApiError('');
    setSelectedFolder('');
  }, []);

  const requestModuleSwitch = useCallback(
    (module: ModuleItem) => {
      if (module.id === activeModule.id) return;
      emitSound('click', 'Navigation change requested.');
      setPendingModule(module);
    },
    [activeModule.id, emitSound],
  );

  const confirmModuleSwitch = useCallback(() => {
    if (!pendingModule) return;
    emitSound('confirm', 'Page switched. Previous progress discarded.');
    applyModule(pendingModule);
    setPendingModule(null);
  }, [applyModule, emitSound, pendingModule]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((enabled) => {
      const next = !enabled;
      playSound(true, 'toggle');
      if (next) speakAi(true, 'Audio channel online. Mechanical voice interface enabled.');
      else window.speechSynthesis?.cancel();
      return next;
    });
  }, []);

  const submitSpecial = useCallback(() => {
    if (!apiKey.trim()) {
      setApiError('请输入APIKEY');
      emitSound('deny', 'API key missing.');
      return;
    }
    setApiError('');
    emitSound('confirm', 'API key accepted for verification. Remote link analysis started.');
    setStage('loading');
  }, [apiKey, emitSound]);

  const finishLoading = useCallback(() => {
    if (apiKey === VALID_API_KEY) {
      emitSound('complete', 'Verification complete. Select a local storage folder.');
      setStage('folder');
    } else {
      emitSound('deny', 'Verification failed. Invalid API key.');
      setStage('invalid');
    }
  }, [apiKey, emitSound]);

  const mainContent = useMemo(() => {
    if (!activeModule.special || stage === 'locked') return <LockedPanel module={activeModule} />;
    if (stage === 'loading') return <ComplexLoading module={activeModule} onComplete={finishLoading} />;
    if (stage === 'folder') {
      return (
        <FolderSelectPanel
          module={activeModule}
          onSelected={(folder) => {
            setSelectedFolder(folder);
            emitSound('complete', 'Local folder selected. Download queue initialized.');
            setStage('download');
          }}
        />
      );
    }
    if (stage === 'download') return <DownloadPanel module={activeModule} folder={selectedFolder} onSound={emitSound} />;
    if (stage === 'invalid') return <InvalidKeyPanel module={activeModule} onRetry={() => setStage('form')} />;
    return (
      <SpecialQueryForm
        module={activeModule}
        phone={phone}
        apiKey={apiKey}
        error={apiError}
        onPhone={setPhone}
        onApiKey={setApiKey}
        onSubmit={submitSpecial}
      />
    );
  }, [activeModule, apiError, apiKey, emitSound, finishLoading, phone, selectedFolder, stage, submitSpecial]);

  return (
    <div className="screen bg-[var(--bg-void)]">
      <main className="relative z-10 grid h-full w-full grid-cols-[268px_1fr] grid-rows-[64px_minmax(0,1fr)] gap-4 overflow-hidden p-4">
        <Sidebar activeId={activeModule.id} onSelect={requestModuleSwitch} />
        <TopBar soundEnabled={soundEnabled} onToggleSound={toggleSound} />
        <section className="grid min-h-0 grid-cols-[minmax(0,1fr)_360px] grid-rows-[96px_minmax(0,1fr)_170px_72px] gap-4 overflow-hidden">
          <div className="col-span-2 grid min-h-0 grid-cols-4 gap-4 overflow-hidden">
            <SummaryStrip activeModule={activeModule} />
          </div>
          <div className="min-h-0 overflow-hidden">{mainContent}</div>
          <OpsIntelPanel />
          <div className="grid min-h-0 grid-cols-3 gap-4 overflow-hidden">
            <PacketWaveform data={chartData} />
            <AuthEventQueue />
            <FilesystemRisk data={chartData} />
          </div>
          <LiveLogPanel logs={logs} />
          <div className="panel terminal-border col-span-2 flex items-center justify-between overflow-hidden px-4">
            <div className="mono flex items-center gap-4 text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
              <span>NO EXTERNAL QUERY</span>
              <span>LOCAL UI SIMULATION</span>
              <span>RENDER TARGET 60FPS</span>
            </div>
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">SEK//OS INTERNAL BUILD</div>
          </div>
        </section>
      </main>
      {pendingModule && (
        <SwitchConfirmDialog
          module={pendingModule}
          onCancel={() => {
            emitSound('click');
            setPendingModule(null);
          }}
          onConfirm={confirmModuleSwitch}
        />
      )}
    </div>
  );
}
