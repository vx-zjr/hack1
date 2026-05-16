import { useEffect, useMemo, useState } from 'react';

const TOTAL_FAKE_LINES = 1680;

const banner = String.raw`
 __     __ _____ _   _  ___  __  __
 \ \   / /|___ /| \ | |/ _ \|  \/  |
  \ \ / /   |_ \|  \| | | | | |\/| |
   \ V /   ___) | |\  | |_| | |  | |
    \_/   |____/|_| \_|\___/|_|  |_|

 GHOST_SHELL // RED TEAM REHEARSAL // LOCAL VISUAL SIMULATION
`;

const commands = [
  'nmap -sS -p- 10.0.0.0/24 --min-rate 10000',
  'masscan 10.0.0.0/24 -p1-65535 --rate 250000',
  'ssh root@target -i ./keys/master.pem',
  './exploit --payload reverse_tcp --lhost 10.0.0.66',
  'extracting shadow file',
  'cracking hashes --wordlist ./rockyou.txt',
  'establishing persistence --profile ghost_shell',
  'dumping memory ranges --segment auth-cache',
  'mounting secure volume /mnt/ops',
  'rendering tui telemetry --fast-refresh',
];

const fakePaths = ['/etc/shadow', '/var/log/auth.log', '/opt/edge/token.db', '/srv/panel/config.yml', '/tmp/stage/payload.bin', '/mnt/demo/session.cache'];
const levels = ['OK', 'OK', 'TRACE', 'WARN', 'OK', 'SCAN'];

function hex(bytes: number) {
  return Array.from({ length: bytes }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
}

function ip() {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 253)}`;
}

function bar(value: number, width = 18) {
  const filled = Math.floor((value / 100) * width);
  return `${'█'.repeat(filled)}${'░'.repeat(width - filled)} ${String(value).padStart(3, ' ')}%`;
}

function makeScript() {
  const lines: string[] = [];
  lines.push(banner);
  lines.push('[BOOT] attaching visual tty renderer :: no real shell is spawned');
  lines.push('[SAFE] all output below is synthetic rehearsal data');

  for (let i = 0; i < TOTAL_FAKE_LINES; i += 1) {
    const level = levels[i % levels.length];
    const cmd = commands[i % commands.length];
    const target = ip();
    const pct = Math.min(99, Math.floor((i / TOTAL_FAKE_LINES) * 100 + Math.random() * 9));
    const path = fakePaths[i % fakePaths.length];
    if (i % 19 === 0) {
      lines.push(`ghost@ops:~$ ${cmd}`);
    } else if (i % 17 === 0) {
      lines.push(`[${level}] ${target} hash=${hex(8)} digest=sha256:${hex(12)} route=SIM-${hex(2).toUpperCase()}`);
    } else if (i % 13 === 0) {
      lines.push(`[${level}] progress ${bar(pct)} :: ${path} :: synthetic buffer ${hex(3)}`);
    } else if (i % 7 === 0) {
      lines.push(`[TRACE] tui-pane=${String(i % 12).padStart(2, '0')} refresh=${Math.floor(80 + Math.random() * 420)}hz inode=${hex(4)} entropy=${(Math.random() * 8).toFixed(4)}`);
    } else {
      lines.push(`[${level}] packet=${hex(5)} src=${ip()} dst=${target} op=${cmd.split(' ')[0]} result=rendered`);
    }
  }

  lines.push('[OK] persistence marker rendered :: no system changes made');
  lines.push('[OK] wiping simulated logs...');
  lines.push('[+] ROOT ACCESS GRANTED');
  return lines;
}

function Metric({ label, value, tone = 'glow' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border border-[var(--border-subtle)] bg-black/45 p-2">
      <div className="mono text-[9px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">{label}</div>
      <div className={`mono mt-1 text-sm ${tone}`}>{value}</div>
    </div>
  );
}

export default function TerminalCutscene({ onComplete }: { onComplete: () => void }) {
  const duration = useMemo(() => 24_000 + Math.random() * 6_000, []);
  const script = useMemo(makeScript, []);
  const [lineIndex, setLineIndex] = useState(0);
  const [typedCommand, setTypedCommand] = useState('');
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const started = performance.now();
    let completed = false;
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - started;
      const progress = Math.min(1, elapsed / duration);
      const nextIndex = Math.min(script.length, Math.floor(progress * script.length));
      const command = commands[Math.floor((elapsed / 1300) % commands.length)];
      const chars = Math.floor(((elapsed % 1300) / 1300) * command.length);
      setLineIndex(nextIndex);
      setTypedCommand(command.slice(0, chars));
      setPulse((value) => value + 1);
      if (!completed && progress >= 1) {
        completed = true;
        window.clearInterval(timer);
        window.setTimeout(onComplete, 1400);
      }
    }, 26);
    return () => window.clearInterval(timer);
  }, [duration, onComplete, script]);

  const visible = script.slice(Math.max(0, lineIndex - 54), lineIndex);
  const progress = Math.min(100, Math.floor((lineIndex / script.length) * 100));
  const bandwidth = 820 + ((pulse * 37) % 620);
  const heap = 46 + ((pulse * 11) % 47);
  const threads = 180 + ((pulse * 17) % 720);

  return (
    <main className="crt-curve relative z-10 h-full w-full overflow-hidden bg-black p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_52%,rgba(58,255,124,0.08)_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background:linear-gradient(transparent_50%,rgba(58,255,124,0.08)_50%)] [background-size:100%_4px]" />

      <section className="grid h-full grid-cols-[1fr_360px] grid-rows-[72px_1fr_112px] gap-3">
        <header className="terminal-border col-span-2 flex items-center justify-between border border-[var(--border-default)] bg-black/70 px-5">
          <div>
            <div className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--fg-muted)]">GHOST_SHELL TUI // RAPID COMMAND REPLAY</div>
            <div className="mono mt-1 text-xl font-bold text-[var(--accent)]">LOCAL SIMULATION BUS</div>
          </div>
          <div className="mono text-right text-[12px] uppercase tracking-[0.18em] text-[var(--fg-secondary)]">
            <div>
              LINES <span className="glow">{lineIndex}</span> / {script.length}
            </div>
            <div>
              STATUS <span className="warn">FAST REFRESH</span>
            </div>
          </div>
        </header>

        <div className="terminal-border min-h-0 border border-[var(--border-default)] bg-black/82 p-4">
          <pre className="thin-scrollbar h-full overflow-hidden whitespace-pre-wrap font-mono text-[13px] leading-[18px] text-[var(--accent)] drop-shadow-[0_0_7px_rgba(58,255,124,0.55)]">
            {visible.join('\n')}
            <span className="inline-block h-[1em] w-[0.55em] translate-y-[2px] animate-[blink_1s_steps(2)_infinite] bg-[var(--accent)]" />
          </pre>
        </div>

        <aside className="grid min-h-0 grid-rows-[auto_1fr_auto] gap-3">
          <div className="terminal-border border border-[var(--border-default)] bg-black/70 p-3">
            <div className="mono mb-3 text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">TUI STATUS MATRIX</div>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="bandwidth" value={`${bandwidth} mbps`} tone="cyan" />
              <Metric label="heap noise" value={`${heap}%`} tone={heap > 78 ? 'warn' : 'glow'} />
              <Metric label="threads" value={String(threads)} />
              <Metric label="root phase" value={`${progress}%`} tone="warn" />
            </div>
          </div>

          <div className="terminal-border overflow-hidden border border-[var(--border-default)] bg-black/70 p-3">
            <div className="mono mb-3 text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">PANE REFRESH</div>
            <div className="grid h-[calc(100%-24px)] grid-cols-6 grid-rows-8 gap-1">
              {Array.from({ length: 48 }).map((_, index) => {
                const hot = (index * 11 + pulse) % 9 === 0;
                return (
                  <div
                    key={index}
                    className="border border-[var(--border-subtle)] bg-black/45"
                    style={{
                      opacity: hot ? 1 : 0.25 + ((index + pulse) % 6) * 0.08,
                      boxShadow: hot ? '0 0 16px rgba(58,255,124,0.42)' : 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="terminal-border border border-[var(--border-default)] bg-black/70 p-3">
            <div className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">INPUT STREAM</div>
            <div className="mono mt-2 min-h-[42px] text-[12px] leading-5 text-[var(--fg-secondary)]">
              ghost@ops:~$ <span className="glow">{typedCommand}</span>
              <span className="inline-block h-[1em] w-[0.55em] translate-y-[2px] animate-[blink_1s_steps(2)_infinite] bg-[var(--accent)]" />
            </div>
          </div>
        </aside>

        <footer className="terminal-border col-span-2 border border-[var(--border-default)] bg-black/75 p-4">
          <div className="mb-2 flex items-center justify-between mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            <span>ROOT ACCESS PIPELINE</span>
            <span className="glow">{progress}%</span>
          </div>
          <div className="h-3 border border-[var(--border-default)] bg-black/55">
            <div className="h-full bg-[linear-gradient(90deg,var(--accent),var(--cyan),var(--warn),var(--danger))]" style={{ width: `${progress}%` }} />
          </div>
        </footer>
      </section>
    </main>
  );
}
