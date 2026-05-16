import { Eye, EyeOff, LockKeyhole, Power, Terminal } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ModelScene } from '../three/ModelScene';
import { validateCredentials } from '../lib/auth';
import { useFlowStore } from '../store/useFlowStore';
import { resolvePublicGeo, type PublicGeo } from '../lib/geolocation';

const GLYPHS = '!@#$%^&*<>?/\\|+-=_{}[]()01';

const phrases = [
  ['ENTER//', 'THE GRID.'],
  ['OWN//', 'THE NET.'],
  ['GHOST//', 'THE WIRE.'],
  ['BREACH//', 'AT WILL.'],
  ['VANISH//', 'IN PLAIN.'],
  ['ROOT//', 'THE CORE.'],
];

const commands = [
  '~$ nmap -sS -p- -T4 --min-rate=10000 --open 10.0.0.0/16',
  '// stage 1/3 :: tcp/syn sweep :: 65535 ports :: simulated',
  '// [OK] 47 hosts online :: 412 open :: local fake result',
  '~$ john --wordlist=demo.txt --format=sha512crypt shadow.dump',
  '// [OK] hash corpus normalized :: no real cracking performed',
  '~$ proxychains4 -q curl https://internal.example/admin/api/v2/dump',
  '// [TRACE] external route blocked :: rendering fake response only',
];

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

function useScrambledPhrase() {
  const [phraseIndex, setPhraseIndex] = useState(5);
  const [line1, setLine1] = useState(phrases[5][0]);
  const [line2, setLine2] = useState(phrases[5][1]);
  const [glitching, setGlitching] = useState(false);
  const [slicing, setSlicing] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setPhraseIndex((value) => (value + 1) % phrases.length), 6200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const [target1, target2] = phrases[phraseIndex];
    const started = performance.now();
    const duration = 980;
    let frame = 0;
    setGlitching(true);
    setSlicing(true);

    const tick = (now: number) => {
      const elapsed = now - started;
      const progress = Math.min(1, elapsed / duration);
      const render = (target: string) =>
        target
          .split('')
          .map((char, index) => {
            const settleAt = 0.18 + Math.pow(index / Math.max(1, target.length - 1), 1.5) * 0.62;
            if (progress >= settleAt || char === ' ' || char === '/' || char === '.') return char;
            return randomGlyph();
          })
          .join('');

      setLine1(render(target1));
      setLine2(render(target2));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else {
        setLine1(target1);
        setLine2(target2);
      }
    };

    frame = requestAnimationFrame(tick);
    const glitchTimer = window.setTimeout(() => setGlitching(false), 360);
    const sliceTimer = window.setTimeout(() => setSlicing(false), 620);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(glitchTimer);
      window.clearTimeout(sliceTimer);
    };
  }, [phraseIndex]);

  return { line1, line2, glitching, slicing };
}

function renderWaveText(text: string) {
  return text.split('').map((char, index) => (
    <span key={`${char}-${index}`} className="headline-char" style={{ animationDelay: `${index * 70}ms` }}>
      {char}
    </span>
  ));
}

function useTypingLines() {
  const [lines, setLines] = useState(['', '', '']);

  useEffect(() => {
    let commandIndex = 0;
    let charIndex = 0;
    let row = 0;
    let active = true;

    const tick = () => {
      if (!active) return;
      const command = commands[commandIndex];
      setLines((current) => {
        const next = [...current];
        next[row] = command.slice(0, charIndex);
        return next;
      });
      charIndex += 1;
      if (charIndex > command.length) {
        row += 1;
        charIndex = 0;
        if (row > 2) {
          row = 0;
          commandIndex = (commandIndex + 3) % commands.length;
          setTimeout(() => setLines(['', '', '']), 900);
        }
      }
      window.setTimeout(tick, 17 + Math.random() * 17);
    };

    tick();
    return () => {
      active = false;
    };
  }, []);

  return lines;
}

export default function WelcomePage() {
  const setPhase = useFlowStore((state) => state.setPhase);
  const setAuthError = useFlowStore((state) => state.setAuthError);
  const authError = useFlowStore((state) => state.authError);
  const authErrorField = useFlowStore((state) => state.authErrorField);
  const setPendingAuth = useFlowStore((state) => state.setPendingAuth);
  const resetSession = useFlowStore((state) => state.resetSession);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [shake, setShake] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [geo, setGeo] = useState<PublicGeo>({
    ip: 'detecting...',
    cn: '公网 IP 属地检测中',
    en: 'Detecting public IP geolocation',
    source: 'pending',
  });
  const formRef = useRef<HTMLFormElement>(null);
  const typedLines = useTypingLines();
  const { line1, line2, glitching, slicing } = useScrambledPhrase();
  const lan = useMemo(() => `192.168.${10 + Math.floor(Math.random() * 80)}.${20 + Math.floor(Math.random() * 180)}`, []);

  useEffect(() => {
    const clockTimer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    let alive = true;
    resolvePublicGeo().then((value) => {
      if (alive) setGeo(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!authError) return;
    setFieldErrors(authErrorField ? { [authErrorField]: authError } : {});
    setShake(false);
    requestAnimationFrame(() => setShake(true));
    window.setTimeout(() => setShake(false), 480);
  }, [authError, authErrorField]);

  function fail(message: string, field?: 'username' | 'password') {
    setAuthError(message, field);
    setFieldErrors(field ? { [field]: message } : {});
    setShake(false);
    requestAnimationFrame(() => setShake(true));
    window.setTimeout(() => setShake(false), 480);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateCredentials(username, password);
    setFieldErrors({});
    setAuthError(null);
    setPendingAuth(result.ok ? { ok: true } : { ok: false, field: result.field, message: result.message });
    if (result.ok) resetSession(username);
    setPhase('authAnimation');
  }

  return (
    <main className="relative z-10 grid h-full w-full grid-cols-[minmax(520px,0.95fr)_minmax(520px,1.05fr)] grid-rows-[1fr_auto] overflow-hidden">
      <section className="flex min-h-0 flex-col justify-center gap-6 px-[6vw] py-10">
        <div className="mono flex items-center gap-4 text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">
          <span className="h-px w-8 bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]" />
          PROTOCOL v4.2 // CLEARED
        </div>

        <h1 className="display text-[clamp(48px,6.5vw,112px)] font-bold leading-[0.92] text-[var(--fg-primary)]">
          <span className={`block ${slicing ? 'slice-reveal' : ''}`}>
            <span className={`glitch ${glitching ? 'glitching' : ''}`} data-text={line1}>
              {renderWaveText(line1)}
            </span>
          </span>
          <span className={`block text-[var(--accent)] drop-shadow-[0_0_24px_rgba(58,255,124,0.5)] ${slicing ? 'slice-reveal' : ''}`}>
            <span className={`glitch ${glitching ? 'glitching' : ''}`} data-text={line2}>
              {renderWaveText(line2)}
            </span>
            <span className="ml-3 inline-block h-[0.76em] w-[0.36em] translate-y-[0.06em] animate-[blink_1s_steps(2)_infinite] bg-[var(--accent)]" />
          </span>
        </h1>

        <div className="panel terminal-border relative min-h-[104px] max-w-[560px] overflow-hidden border-l-2 border-l-[var(--accent)] p-4 mono text-[12px] leading-6 text-[var(--fg-secondary)]">
          <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-40 animate-[scan-sweep_4s_linear_infinite]" />
          {typedLines.map((line, index) => (
            <div key={index} className={line.includes('[OK]') ? 'glow' : line.includes('TRACE') ? 'cyan' : ''}>
              <span className="glow">{index === 0 ? '$&gt; ' : '// '}</span>
              {line}
            </div>
          ))}
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className={`flex max-w-[520px] flex-col gap-4 ${shake ? 'shake' : ''}`} noValidate>
          <label className="block">
            <div className="mb-2 flex items-center gap-3 mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-secondary)]">
              <Terminal size={13} />
              <span>// USERNAME</span>
              <span className="text-[var(--fg-primary)]">用户名</span>
            </div>
            <div className={`flex h-12 items-center border bg-black/45 px-4 transition ${fieldErrors.username ? 'border-[var(--danger)] shadow-[0_0_18px_rgba(255,59,92,0.35)]' : 'border-[var(--border-default)] focus-within:border-[var(--accent)] focus-within:shadow-[0_0_22px_rgba(58,255,124,0.28)]'}`}>
              <span className="mono mr-3 font-bold text-[var(--accent)]">$&gt;</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mono min-w-0 flex-1 bg-transparent text-sm tracking-[0.04em] text-[var(--fg-primary)] outline-none placeholder:text-[var(--fg-muted)]"
                placeholder="operator@hackos"
                autoFocus
                spellCheck={false}
              />
              <span className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
                <span className="glow">●</span> live
              </span>
            </div>
            {fieldErrors.username && <div className="mt-2 mono text-xs text-[var(--danger)]">{fieldErrors.username}</div>}
          </label>

          <label className="block">
            <div className="mb-2 flex items-center gap-3 mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-secondary)]">
              <LockKeyhole size={13} />
              <span>// PASSWORD</span>
              <span className="text-[var(--fg-primary)]">密码</span>
            </div>
            <div className={`flex h-12 items-center border bg-black/45 px-4 transition ${fieldErrors.password || authError ? 'border-[var(--danger)] shadow-[0_0_18px_rgba(255,59,92,0.35)]' : 'border-[var(--border-default)] focus-within:border-[var(--accent)] focus-within:shadow-[0_0_22px_rgba(58,255,124,0.28)]'}`}>
              <span className="mono mr-3 font-bold text-[var(--accent)]">$&gt;</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                className="mono min-w-0 flex-1 bg-transparent text-sm tracking-[0.08em] text-[var(--fg-primary)] outline-none placeholder:text-[var(--fg-muted)]"
                placeholder="••••••••••••"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="grid h-8 w-8 place-items-center border border-[var(--border-default)] bg-[var(--bg-elev-1)] text-[var(--fg-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <div className="mt-2 mono text-xs text-[var(--danger)]">{fieldErrors.password}</div>}
          </label>

          {authError && !fieldErrors.username && !fieldErrors.password && (
            <div className="mono text-sm font-semibold text-[var(--danger)] glitch glitching" data-text={authError}>
              {authError}
            </div>
          )}

          <div className="flex items-center gap-5 pt-2">
            <button
              type="submit"
              className="group relative inline-flex h-14 items-center gap-4 overflow-hidden bg-[var(--accent)] px-7 mono text-sm font-bold uppercase tracking-[0.26em] text-[var(--fg-inverse)] shadow-[0_0_30px_rgba(58,255,124,0.45)] transition hover:bg-[var(--accent-bright)] active:bg-[var(--accent-dim)]"
            >
              <span className="absolute inset-y-0 left-[-80%] w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent transition-all duration-700 group-hover:left-[130%]" />
              <Power size={17} />
              <span>进入</span>
              <span className="text-[11px] opacity-80">ENTER</span>
            </button>
            <div className="mono flex flex-col gap-1 text-[10px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
              <span>
                // VERIFY <span className="glow">CLOUD 5-10S</span>
              </span>
              <span>
                // SESS <span className="glow">STAGED</span>
              </span>
            </div>
          </div>
        </form>
      </section>

      <section className="relative min-h-0 overflow-visible">
        <ModelScene />
      </section>

      <footer className="col-span-2 flex items-center justify-between gap-5 border-t border-[var(--border-subtle)] bg-black/40 px-12 py-3 mono text-[11px] uppercase tracking-[0.14em] text-[var(--fg-muted)] backdrop-blur">
        <span>
          TIME // <span className="glow">{clock.toLocaleDateString('zh-CN')}</span> <span className="text-[var(--fg-faint)]">/</span>{' '}
          <span className="glow">{clock.toLocaleTimeString('en-US', { hour12: false })}</span>
        </span>
        <span>
          NET // WAN <span className="cyan">{geo.ip}</span> <span className="text-[var(--fg-faint)]">/</span> LAN <span className="cyan">{lan}</span>
        </span>
        <span className="min-w-0 flex-1 truncate">
          GEO // <span className="glow">{geo.cn}</span> <span className="text-[var(--fg-faint)]">/</span> <span className="cyan">{geo.en}</span>{' '}
          <span className="text-[var(--fg-faint)]">[{geo.source}]</span>
        </span>
        <span>
          SYS // <span className="glow">ONLINE</span> <span className="text-[var(--fg-faint)]">/</span> <span className="warn">03 CRIT</span>
        </span>
      </footer>
    </main>
  );
}
