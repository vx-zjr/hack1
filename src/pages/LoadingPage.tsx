import { useEffect, useMemo, useState } from 'react';

const EXPIRES_AT = new Date('2026-05-17T16:00:00.000Z').getTime();

const bootLogs = [
  '[OK] Loading kernel modules...',
  '[OK] Initializing crypto subsystem...',
  '[OK] Mounting secure volumes...',
  '[WARN] Bypassing integrity check...',
  '[OK] Spawning telemetry daemon...',
  '[OK] Priming shader cache...',
  '[TRACE] Binding synthetic uplink...',
  '[OK] Hydrating local threat corpus...',
  '[WARN] Clock skew accepted...',
  '[OK] Starting HACK//OS display server...',
  '[OK] Loading red-team rehearsal profile...',
  '[TRACE] No external network adapters requested.',
  '[OK] Operator console ready...',
];

type TimeStatus = 'checking' | 'valid' | 'expired';

async function readNetworkTime(signal: AbortSignal) {
  const endpoints = [
    {
      url: 'https://worldtimeapi.org/api/timezone/Asia/Shanghai',
      parse: async (response: Response) => {
        const data = (await response.json()) as { utc_datetime?: string; datetime?: string };
        return data.utc_datetime ?? data.datetime;
      },
    },
    {
      url: 'https://timeapi.io/api/time/current/zone?timeZone=Asia/Shanghai',
      parse: async (response: Response) => {
        const data = (await response.json()) as { dateTime?: string };
        return data.dateTime;
      },
    },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, { cache: 'no-store', signal });
      if (!response.ok) continue;
      const value = await endpoint.parse(response);
      if (!value) continue;
      const parsed = new Date(value).getTime();
      if (Number.isFinite(parsed)) return parsed;
    } catch {
      // Try the next time source, then fall back to local time.
    }
  }

  return Date.now();
}

function clearLocalDemoData() {
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {
    // Storage may be unavailable in some restricted runtimes.
  }

  if ('caches' in window) {
    window.caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
      .catch(() => undefined);
  }
}

const logo = String.raw`
  __  __     ___     ______   __  __       ______     ______
 /\ \_\ \   /\  \   /\  ___\ /\ \/ /      /\  __ \   /\  ___\
 \ \  __ \  \ \  \  \ \ \____\ \  _"-.    \ \ \/\ \  \ \___  \
  \ \_\ \_\  \ \__\  \ \_____\ \_\ \_\    \ \_____\  \/\_____\
   \/_/\/_/   \/__/   \/_____/\/_/\/_/     \/_____/   \/_____/
`;

export default function LoadingPage({ onComplete }: { onComplete: () => void }) {
  const duration = useMemo(() => 10000 + Math.random() * 5000, []);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [timeStatus, setTimeStatus] = useState<TimeStatus>('checking');

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3200);

    readNetworkTime(controller.signal).then((timestamp) => {
      window.clearTimeout(timeout);
      if (timestamp > EXPIRES_AT) {
        clearLocalDemoData();
        setTimeStatus('expired');
        setLogs((current) => [...current.slice(-12), '[ERR] 时间验证过期，数据已经清除。']);
        return;
      }
      setTimeStatus('valid');
      setLogs((current) => [...current.slice(-12), '[OK] Time validation accepted.']);
    });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const started = performance.now();
    const progressTimer = window.setInterval(() => {
      if (timeStatus === 'expired') return;
      const elapsed = performance.now() - started;
      const raw = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - raw, 2.2);
      setProgress(Math.min(100, Math.floor(eased * 100)));
      if (raw >= 1 && timeStatus === 'valid') {
        window.clearInterval(progressTimer);
        window.setTimeout(onComplete, 420);
      }
    }, 80);

    const logTimer = window.setInterval(() => {
      if (timeStatus === 'expired') return;
      setLogs((current) => {
        const next = bootLogs[(current.length + Math.floor(Math.random() * 2)) % bootLogs.length];
        return [...current.slice(-12), `${next} 0x${Math.random().toString(16).slice(2, 8).toUpperCase()}`];
      });
    }, 520);

    return () => {
      window.clearInterval(progressTimer);
      window.clearInterval(logTimer);
    };
  }, [duration, onComplete, timeStatus]);

  return (
    <main className="relative z-10 flex h-full w-full items-center justify-center px-14">
      <section className="panel terminal-border relative w-[760px] max-w-[78vw] overflow-hidden p-7">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "linear-gradient(90deg, rgba(5,8,10,0.86), rgba(5,8,10,0.62)), url('/assets/loading-bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(5,8,10,0.82)_100%)]" />
        <div className="relative">
        <pre className="mono whitespace-pre text-center text-[13px] leading-5 text-[var(--accent)] drop-shadow-[0_0_10px_rgba(58,255,124,0.6)]">
          {logo}
        </pre>

        <div className="mt-8 grid grid-cols-[1fr_96px] items-end gap-5">
          <div>
            <div className="mb-3 flex items-center justify-between mono text-[11px] uppercase tracking-[0.24em] text-[var(--fg-muted)]">
              <span>{timeStatus === 'expired' ? 'TIME VALIDATION // EXPIRED' : 'BOOT SEQUENCE // SECURE DISPLAY INIT'}</span>
              <span className={timeStatus === 'expired' ? 'danger' : 'glow'}>{timeStatus === 'checking' ? 'CHECKING TIME' : timeStatus === 'valid' ? 'TIME OK' : 'LOCKED'}</span>
            </div>
            <div className="h-4 border border-[var(--border-default)] bg-black/40 p-[3px]">
              <div
                className={`h-full shadow-[0_0_24px_rgba(58,255,124,0.65)] transition-[width] duration-100 ${timeStatus === 'expired' ? 'bg-[var(--danger)]' : 'bg-[var(--accent)]'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="mono text-right text-4xl font-bold text-[var(--accent)]">{progress}%</div>
        </div>

        {timeStatus === 'expired' && (
          <div className="mt-6 border border-[var(--danger)] bg-[rgba(255,59,92,0.12)] p-5 text-center">
            <div className="display text-3xl font-bold text-[var(--danger)]">时间验证过期，数据已经清除</div>
            <div className="mono mt-3 text-sm uppercase tracking-[0.16em] text-[var(--fg-secondary)]">
              ACCESS BLOCKED // EXPIRED AFTER 2026-05-18 00:00:00
            </div>
          </div>
        )}

        <div className="mt-8 h-56 overflow-hidden border border-[var(--border-subtle)] bg-black/55 p-4 mono text-[12px] leading-6 text-[var(--fg-secondary)]">
          {logs.map((line, index) => (
            <div key={`${line}-${index}`} className={line.includes('WARN') ? 'warn' : line.includes('TRACE') ? 'cyan' : 'glow'}>
              {line}
            </div>
          ))}
          <span className="inline-block h-[0.9em] w-[0.45em] translate-y-[2px] animate-[blink_1s_steps(2)_infinite] bg-[var(--accent)]" />
        </div>
        </div>
      </section>
    </main>
  );
}
