# SEK内部版 Electron UI Demo

Electron desktop demo for internal UI/UX rehearsal. All query, scan,
attack, hash, map, chart, and log content is generated locally from fake data.
The only real external lookup is the welcome-page public IP geolocation display.
The app does not run system commands, scanning, exploitation, packet capture, or
real threat-intelligence lookups.

## Key Dependencies

- Electron `^42.1.0`
- Vite `^8.0.13`
- React `^19.2.6`
- TypeScript `^6.0.3`
- Three.js `^0.184.0`
- `@react-three/fiber` `^9.6.1`
- `@react-three/drei` `^10.7.7`
- Tailwind CSS `^4.3.0`
- Framer Motion `^12.38.0`
- Zustand `^5.0.13`
- lucide-react `^1.16.0`
- Recharts `^3.8.1`
- `@playwright/test` `^1.60.0` and `pngjs` `^7.0.0` for visual smoke checks

## Project Structure

```text
Y:\hack1
|-- electron/
|   |-- main.ts
|   `-- preload.ts
|-- public/
|   `-- assets/
|-- src/
|   |-- App.tsx
|   |-- main.tsx
|   |-- lib/
|   |-- pages/
|   |-- store/
|   |-- styles/
|   `-- three/
|-- welcomeweb/
|-- package.json
|-- vite.config.ts
|-- tsconfig.json
`-- tsconfig.node.json
```

## Implemented Stages

- Loading page: random 10-15 second boot sequence contained inside a centered
  loading panel. The panel uses `public/assets/loading-bg.png` as its background
  image, instead of making the loading treatment fill the whole screen. Startup
  also performs time validation using public network time when available, then
  local time as fallback. After `2026-05-18 00:00:00` China time, the app shows
  `时间验证过期，数据已经清除`, clears local browser storage, and does not enter the
  welcome page.
- Welcome page: React/TypeScript rebuild of the original `welcomeweb` hacker layout,
  including glitch typography, terminal input styling, scanlines, status strip, and
  the right-side 3D entity. Removed the requested `tribe`, model name/index, `form`,
  and `tribes` UI labels.
- Welcome footer: best-effort public IP geolocation using `ipapi.co`, `ipwho.is`,
  `api.ip.sb`, and `ipinfo.io`, displayed in Chinese and English. By default this
  uses the machine's direct public egress IP; set `HACKOS_PROXY_SERVER=http://127.0.0.1:7890`
  only if the app itself should use the local Clash proxy.
- Login: required-field validation plus the specified demo credentials:
  username `}Ne2@rs=tC`, password `i32+.NfiqrPQ?_`. Every submission enters the
  cloud verification page for a random 5-10 seconds before success or failure is
  resolved; empty fields return to the welcome page with inline required-field
  messages after that verification sequence.
- 3D visuals: the welcome model panel was fully rewritten as an independent
  crossfade renderer. It no longer reuses the old morph state machine or model
  generator path. Twelve standalone high-density point-cloud forms rotate in
  sequence, with only the current and previous forms mounted during transitions.
- Background: faster, stronger fullscreen WebGL shader smoke, grid, scanline, and
  terminal chrome.
- Auth animation: 5-10 second cloud verification particle aggregation with denser
  icon/status effects and four authentication steps.
- Security injection: fixed 30 second `注入安全模块` stage with local trace logs,
  WebGL particles, icon matrix, and progress telemetry before the terminal cutscene.
  The trace panel is fixed-height; random English trace lines push upward from
  the bottom instead of refreshing the whole list.
- TTY cutscene: 24-30 second CRT/TUI terminal replay with 1,500+ generated fake
  command/output lines, rapid pane refresh, typed input stream, and final
  `[+] ROOT ACCESS GRANTED`.
- Global close control: every post-loading phase has a top-right close button. It
  opens a confirmation dialog and unlocks `确定关闭` after a 5 second countdown,
  then closes the Electron app through preload IPC.
- Dashboard: dense command-center UI with sidebar modules, professional TTY-style
  operations panel, live logs, packet waveform, auth event queue, filesystem I/O
  chart, threat level, and strict permission behavior. Dedicated simulated pages
  are available for `抖音`, `微信`, `小红书`, `酒店开房同住`, `大数据关联`, `户籍`, and
  `摄像头`; each asks for `手机号` and `APIKEY`, then runs a 130 second local
  loading animation with 10+ visible status/effect groups. The specified API key
  opens a local folder selection step recommending 100GB free space, then a
  simulated download page with dynamic 100-300 mbps speed and about two hours
  remaining. Empty APIKEY submissions show `请输入APIKEY`. All other legacy modules
  show only `无权限`.
- Export control: the download page includes `数据格式导出`; clicking it reports
  `数据尚未下载完成，无法导出`.
- Branding: in-app branding and packaged application name are `SEK//OS` /
  `SEK内部版`. Windows builds use `build/icon.ico` instead of the default Electron
  icon.

## Commands

```powershell
npm run dev
npm run build
npm run visual:smoke
npm run dist
```

`npm run dev` starts Vite HMR and opens the frameless fullscreen Electron window.
DevTools open automatically in development and can also be toggled with
`Ctrl+Shift+I`.

The dev command launches Electron through `scripts/start-electron.mjs`, which removes
`ELECTRON_RUN_AS_NODE` from the child environment before starting Electron. This keeps
the app launch stable even when that variable is set globally in the shell.

## Known Limits

- This is a UI demo only. No real WHOIS, scanning, port probing, CVE lookup, hash
  cracking, packet capture, or shell execution is present. The public IP geolocation
  footer is the only real external network lookup.
- The first complete path to the dashboard intentionally takes about 69-85 seconds
  because the requested loading, auth, 30 second injection, and TTY timings are
  preserved.
- The app expires after `2026-05-18 00:00:00` China time. If public time APIs are
  unavailable, expiration uses the local machine clock.
- The two-minute special-module loading and long download page are simulated UI
  states only. They do not create files, call external APIs, query accounts, or
  download data.
- Production build currently emits a large chunk warning due to Three.js, Recharts,
  and React ecosystem code. This is acceptable for the desktop demo.
- Electron defaults to frameless fullscreen mode.

## Verification

- `npm run build` completed successfully after the latest revisions.
- Electron binary verified as `v42.1.0` after clearing `ELECTRON_RUN_AS_NODE`.
- `npm run visual:smoke` completed successfully after the latest revisions and wrote `visual-welcome.png`,
  `visual-dashboard.png`, and `visual-report.json`.
- Welcome footer geolocation was verified in Chromium and rendered `GEO // ...`
  with Chinese and English location text.
