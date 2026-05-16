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
    title: 'REMOTE HANDSHAKE',
    icon: Signal,
    accent: '#3AFF7C',
    metrics: ['SYN/ACK', 'TLS MASK', 'EDGE ROUTE', 'NODE TRUST'],
  },
  {
    id: 'tunnel',
    title: 'LINK TUNNELING',
    icon: RadioTower,
    accent: '#00E5FF',
    metrics: ['LATENCY', 'JITTER', 'RELAY HOPS', 'CHANNEL'],
  },
  {
    id: 'token',
    title: 'TOKEN EXCHANGE',
    icon: LockKeyhole,
    accent: '#FFDC5A',
    metrics: ['NONCE', 'SALT', 'VAULT', 'TTL'],
  },
  {
    id: 'pivot',
    title: 'SESSION PIVOT MAP',
    icon: Network,
    accent: '#FF697E',
    metrics: ['PIVOT', 'ACL', 'ROUTE', 'SCOPE'],
  },
  {
    id: 'packet',
    title: 'PACKET TIMELINE',
    icon: Activity,
    accent: '#6EC8FF',
    metrics: ['BURST', 'WINDOW', 'DROPS', 'SEQ'],
  },
  {
    id: 'vault',
    title: 'CREDENTIAL VAULT',
    icon: Fingerprint,
    accent: '#3AFF7C',
    metrics: ['HASH', 'PEPPER', 'REALM', 'LOCK'],
  },
  {
    id: 'dns',
    title: 'DNS TRACEBACK',
    icon: Globe2,
    accent: '#00E5FF',
    metrics: ['CNAME', 'ASN', 'CACHE', 'ZONE'],
  },
  {
    id: 'socket',
    title: 'SOCKET GRAPH',
    icon: TerminalSquare,
    accent: '#FFDC5A',
    metrics: ['FD', 'QUEUE', 'RX/TX', 'KEEPALIVE'],
  },
  {
    id: 'firewall',
    title: 'FIREWALL WINDOW',
    icon: ShieldAlert,
    accent: '#FF697E',
    metrics: ['RULESET', 'NAT', 'DROP', 'ALLOW'],
  },
  {
    id: 'export',
    title: 'EXPORT STAGING',
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

function TopBar() {
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
  const wave = useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => {
      const x = 10 + i * 10;
      const y = 76 - Math.sin(i * 0.55 + tick * 0.55 + index) * 26 - Math.cos(i * 0.18 + index * 0.7) * 12;
      return `${x},${Math.max(16, Math.min(134, y)).toFixed(1)}`;
    }).join(' ');
  }, [index, tick]);

  const nodes = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const angle = (i / 7) * Math.PI * 2 + tick * 0.08;
      const radius = 68 + (i % 3) * 16;
      return {
        x: 180 + Math.cos(angle) * radius,
        y: 80 + Math.sin(angle) * radius * 0.55,
        active: i <= Math.floor(progress * 7) || (tick + i) % 4 === 0,
      };
    });
  }, [progress, tick]);

  return (
    <div className="grid h-full min-h-0 grid-cols-[280px_minmax(0,1fr)] gap-4 overflow-hidden">
      <div className="terminal-border flex min-h-0 flex-col justify-between border border-[rgba(255,255,255,0.08)] bg-[rgba(5,8,10,0.55)] p-4">
        <div>
          <div className="mb-4 grid h-14 w-14 place-items-center border" style={{ borderColor: `${effect.accent}80`, color: effect.accent, background: `${effect.accent}14` }}>
            <Icon size={28} />
          </div>
          <p className="display text-xl font-semibold uppercase tracking-[0.08em]" style={{ color: effect.accent }}>{effect.title}</p>
          <p className="mono mt-3 text-[10px] uppercase leading-5 tracking-[0.16em] text-[var(--fg-muted)]">
            route-id {randomHex(3)}
            <br />
            remote-link {Math.floor(progress * 9999).toString().padStart(4, '0')}
            <br />
            cipher mask AES-GCM
          </p>
        </div>
        <div className="space-y-2">
          {effect.metrics.map((metric, i) => (
            <div key={metric}>
              <div className="mb-1 flex justify-between mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
                <span>{metric}</span>
                <span>{Math.round(50 + progress * 42 + ((tick + i * 13) % 8))}%</span>
              </div>
              <div className="h-1.5 bg-[rgba(255,255,255,0.06)]">
                <div className="h-full transition-[width] duration-300" style={{ width: `${Math.min(100, 48 + progress * 46 + ((tick + i) % 7))}%`, backgroundColor: effect.accent }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(5,8,10,0.45)]">
        <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'linear-gradient(rgba(58,255,124,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(58,255,124,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 380 160" preserveAspectRatio="none">
          <polyline points={wave} fill="none" stroke={effect.accent} strokeWidth="2.5" strokeLinejoin="round" opacity="0.9" />
          <polyline points={wave} fill="none" stroke={effect.accent} strokeWidth="9" strokeLinejoin="round" opacity="0.14" />
          {nodes.map((node, i) => (
            <g key={`${effect.id}-${i}`}>
              {nodes.slice(0, i).map((prev, j) => (
                <line key={`${i}-${j}`} x1={node.x} y1={node.y} x2={prev.x} y2={prev.y} stroke={effect.accent} strokeWidth="0.8" opacity="0.16" />
              ))}
              <circle cx={node.x} cy={node.y} r={node.active ? 5.5 : 3.2} fill={node.active ? effect.accent : 'transparent'} stroke={effect.accent} strokeWidth="1.5" opacity={node.active ? 0.95 : 0.45} />
            </g>
          ))}
          <rect x="12" y="12" width={Math.max(4, progress * 356)} height="4" fill={effect.accent} opacity="0.9" />
        </svg>
        <div className="absolute bottom-4 left-4 right-4 grid grid-cols-4 gap-2">
          {['RX', 'TX', 'RTT', 'AUTH'].map((item, i) => (
            <div key={item} className="border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.34)] p-2">
              <p className="mono text-[9px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">{item}</p>
              <p className="mono mt-1 text-sm" style={{ color: effect.accent }}>{Math.round(20 + progress * 70 + ((tick + i * 5) % 9))}</p>
            </div>
          ))}
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

function DownloadPanel({ module, folder }: { module: ModuleItem; folder: string }) {
  const [speed, setSpeed] = useState(160);
  const [progress, setProgress] = useState(0.08);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSpeed(100 + Math.round(Math.random() * 200));
      setProgress((prev) => Math.min(0.92, prev + Math.random() * 0.0017));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const etaHours = 1.8 + (1 - progress) * 0.45;

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
              <p className="mono mt-2 text-xl text-[var(--warn)]">{etaHours.toFixed(1)}h</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotice('数据尚未下载完成，无法导出。')}
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

export default function Dashboard() {
  const [activeModule, setActiveModule] = useState<ModuleItem>(modules[0]);
  const [stage, setStage] = useState<QueryStage>('form');
  const [phone, setPhone] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiError, setApiError] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [logs, setLogs] = useState<string[]>(() => Array.from({ length: 18 }, () => makeFakeLog()));
  const [chartData, setChartData] = useState(() => makeChartData(36));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLogs((prev) => [...prev.slice(-20), makeFakeLog()]);
      setChartData(makeChartData(36));
    }, 1500);
    return () => window.clearInterval(timer);
  }, []);

  const selectModule = useCallback((module: ModuleItem) => {
    setActiveModule(module);
    setStage(module.special ? 'form' : 'locked');
    setPhone('');
    setApiKey('');
    setApiError('');
    setSelectedFolder('');
  }, []);

  const submitSpecial = useCallback(() => {
    if (!apiKey.trim()) {
      setApiError('请输入APIKEY');
      return;
    }
    setApiError('');
    setStage('loading');
  }, [apiKey]);

  const finishLoading = useCallback(() => {
    setStage(apiKey === VALID_API_KEY ? 'folder' : 'invalid');
  }, [apiKey]);

  const mainContent = useMemo(() => {
    if (!activeModule.special || stage === 'locked') return <LockedPanel module={activeModule} />;
    if (stage === 'loading') return <ComplexLoading module={activeModule} onComplete={finishLoading} />;
    if (stage === 'folder') {
      return (
        <FolderSelectPanel
          module={activeModule}
          onSelected={(folder) => {
            setSelectedFolder(folder);
            setStage('download');
          }}
        />
      );
    }
    if (stage === 'download') return <DownloadPanel module={activeModule} folder={selectedFolder} />;
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
  }, [activeModule, apiError, apiKey, finishLoading, phone, selectedFolder, stage, submitSpecial]);

  return (
    <div className="screen bg-[var(--bg-void)]">
      <main className="relative z-10 grid h-full w-full grid-cols-[268px_1fr] grid-rows-[64px_minmax(0,1fr)] gap-4 overflow-hidden p-4">
        <Sidebar activeId={activeModule.id} onSelect={selectModule} />
        <TopBar />
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
    </div>
  );
}
