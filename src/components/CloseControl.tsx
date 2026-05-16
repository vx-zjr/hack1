import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function CloseControl() {
  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!open) return;
    setCountdown(5);
    const timer = window.setInterval(() => {
      setCountdown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  function closeApp() {
    window.hackos?.closeApp?.();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-5 top-5 z-[120] grid h-10 w-10 place-items-center border border-[var(--border-default)] bg-black/55 text-[var(--fg-secondary)] shadow-[0_0_18px_rgba(58,255,124,0.16)] backdrop-blur hover:border-[var(--danger)] hover:text-[var(--danger)]"
        aria-label="关闭应用"
      >
        <X size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-black/72 backdrop-blur-sm">
          <section className="panel terminal-border w-[460px] max-w-[calc(100vw-48px)] p-6">
            <div className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--danger)]">CLOSE SESSION // CONFIRM</div>
            <div className="mt-4 font-mono text-xl font-bold text-[var(--fg-primary)]">确认关闭应用？</div>
            <div className="mt-6 h-2 border border-[var(--border-default)] bg-black/45">
              <div className="h-full bg-[var(--danger)] transition-[width] duration-1000" style={{ width: `${((5 - countdown) / 5) * 100}%` }} />
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 border border-[var(--border-default)] bg-black/35 px-4 mono text-xs uppercase tracking-[0.18em] text-[var(--fg-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                取消
              </button>
              <button
                type="button"
                disabled={countdown > 0}
                onClick={closeApp}
                className="h-11 border border-[var(--danger)] bg-[var(--danger)] px-5 mono text-xs font-bold uppercase tracking-[0.18em] text-black disabled:cursor-not-allowed disabled:border-[var(--border-default)] disabled:bg-[var(--bg-elev-2)] disabled:text-[var(--fg-muted)]"
              >
                {countdown > 0 ? `${countdown}s 后可关闭` : '确定关闭'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
