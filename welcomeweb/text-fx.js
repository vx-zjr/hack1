/* ============================================================
   HACK//OS — Text effects v2
   · Headline phrase carousel (effect A)
   · Per-character scramble (effect B)
   · Periodic RGB-split glitch (effect C)
   · Per-character color wave (CSS, effect D)
   · Slice-reveal on phrase change (effect E)
   · Long hacker command-line typing block
   · Local time / IP / location feed
   ============================================================ */
(function () {
  const GLYPHS = '!@#$%^&*<>?/\\|+-=_{}[]()01ΨΩαβγ';
  const rand = arr => arr[Math.floor(Math.random() * arr.length)];

  // -------- HEADLINE: phrase carousel + scramble + slice ----------
  // Phrases: each is [line1, line2]. Line2 is the accent line.
  const PHRASES = [
    ['ENTER//',  'THE GRID.'],
    ['OWN//',    'THE NET.'],
    ['GHOST//',  'THE WIRE.'],
    ['BREACH//', 'AT WILL.'],
    ['VANISH//', 'IN PLAIN.'],
    ['ROOT//',   'THE CORE.'],
  ];

  const line1 = document.getElementById('line1');
  const line2 = document.getElementById('line2');
  const glitch1 = document.querySelector('#row-1 .glitch');
  const glitch2 = document.querySelector('#row-2 .glitch');
  const row1 = document.getElementById('row-1');
  const row2 = document.getElementById('row-2');

  let phraseIdx = 0;

  function scrambleTo(el, finalText, opts = {}) {
    const { duration = 800, settleSkew = 1.6 } = opts;
    const chars = finalText.split('');
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const out = chars.map((c, i) => {
        const settleAt = (Math.pow(i / chars.length, settleSkew)) * (duration - 160) + 160;
        if (elapsed >= settleAt || c === ' ' || c === '/' || c === '.') return c;
        return rand(GLYPHS);
      }).join('');
      el.textContent = out;
      if (elapsed < duration) requestAnimationFrame(tick);
      else el.textContent = finalText;
    }
    requestAnimationFrame(tick);
  }

  function setRow(el, glitchEl, rowEl, text) {
    el.textContent = text;
    glitchEl.setAttribute('data-text', text);
    // slice-reveal effect on the row
    rowEl.classList.remove('slicing');
    void rowEl.offsetWidth;          // restart animation
    rowEl.classList.add('slicing');
    setTimeout(() => rowEl.classList.remove('slicing'), 600);
    scrambleTo(el, text, { duration: 880 });
  }

  function nextPhrase() {
    phraseIdx = (phraseIdx + 1) % PHRASES.length;
    const [a, b] = PHRASES[phraseIdx];
    // Quick glitch flash at change moment
    glitch1.classList.add('glitching');
    glitch2.classList.add('glitching');
    setTimeout(() => { glitch1.classList.remove('glitching'); glitch2.classList.remove('glitching'); }, 340);
    setRow(line1, glitch1, row1, a);
    setRow(line2, glitch2, row2, b);
  }

  // Initial scramble-in
  setTimeout(() => {
    scrambleTo(line1, PHRASES[0][0], { duration: 1000 });
    scrambleTo(line2, PHRASES[0][1], { duration: 1300, settleSkew: 1.2 });
  }, 200);

  // Carousel
  setInterval(nextPhrase, 6200);

  // Periodic glitch independent of phrase change
  function glitchPulse() {
    const el = Math.random() < 0.5 ? glitch1 : glitch2;
    el.classList.add('glitching');
    setTimeout(() => el.classList.remove('glitching'), 340);
  }
  setInterval(glitchPulse, 2700);
  setTimeout(glitchPulse, 1500);


  // -------- COMMAND TYPING BLOCK ---------
  // Long hacker commands with rich coloring. Each script is 3 lines (one shown per row).
  // Lines type out char-by-char; on completion the row clears and types the next line.
  const SCRIPTS = [
    [
      '<span class="p">~$</span> <span class="out">nmap -sS -p- -T4 --min-rate=<span class="num">10000</span> --open <span class="v">10.0.0.0/16</span> -oN <span class="mut">/tmp/scan.gnmap</span></span>',
      '<span class="mut">// stage 1/3 ::</span> <span class="y">tcp/syn</span> sweep · <span class="num">65535</span> ports · <span class="num">256</span> threads · randomized seed <span class="num">0xC0FFEE</span>',
      '<span class="mut">// </span><span class="ok">[✓]</span> <span class="num">47</span> hosts online · <span class="num">412</span> open · <span class="num">9</span> critical svc · <span class="num">8.4</span>s wall',
    ],
    [
      '<span class="p">~$</span> <span class="out">msfconsole -q -x "use exploit/multi/handler; set <span class="flag">PAYLOAD</span> linux/x64/meterpreter/reverse_tcp; run"</span>',
      '<span class="mut">// stage 2/3 ::</span> arming <span class="y">CVE-2026-0481</span> · target <span class="v">10.0.4.17:8080</span> · stager <span class="num">220</span>B encoded',
      '<span class="mut">// </span><span class="ok">[✓]</span> handshake captured <span class="num">412ms</span> · session <span class="v">sess_08f</span> opened · uid=<span class="r">0(root)</span>',
    ],
    [
      '<span class="p">~$</span> <span class="out">hydra -L <span class="mut">users.txt</span> -P <span class="mut">rockyou.txt</span> -t <span class="num">64</span> -f -V ssh://<span class="v">10.0.4.92</span>:22</span>',
      '<span class="mut">// </span>brute · <span class="num">14336</span> attempts · throttle adaptive · rate <span class="y">2.1k</span>/s · <span class="num">17%</span> dictionary',
      '<span class="mut">// </span><span class="ok">[✓]</span> credentials matched · <span class="y">admin</span>:<span class="r">P@ssw0rd!2026</span> · gate dropped',
    ],
    [
      '<span class="p">~$</span> <span class="out">tcpdump -i <span class="v">eth0</span> -nn -A -s0 <span class="flag">\'tcp port 443 and host 10.0.4.17\'</span> -w <span class="mut">/tmp/cap.pcap</span></span>',
      '<span class="mut">// </span>capture · TLS 1.3 fingerprint <span class="y">JA3</span>=771,4865-... · <span class="num">8412</span> pkts · <span class="num">412KiB</span>',
      '<span class="mut">// </span><span class="ok">[✓]</span> session keys exported · <span class="y">SSLKEYLOGFILE</span>=<span class="mut">/tmp/keys.log</span> · decrypt ready',
    ],
    [
      '<span class="p">~$</span> <span class="out">sqlmap -u <span class="flag">"http://10.0.4.17/login.php?id=1"</span> --dbs --threads=<span class="num">10</span> --random-agent --tamper=<span class="mut">space2comment</span></span>',
      '<span class="mut">// </span>injection · <span class="y">boolean-blind</span> · WAF <span class="r">CLOUDFLARE</span> bypassed · <span class="num">187</span>req/s',
      '<span class="mut">// </span><span class="ok">[✓]</span> <span class="num">7</span> databases · <span class="r">acme_prod</span> · <span class="r">acme_users</span> · <span class="r">acme_billing</span> · <span class="num">412k</span> rows',
    ],
    [
      '<span class="p">~$</span> <span class="out">john --wordlist=<span class="mut">rockyou.txt</span> --rules=<span class="y">KoreLogic</span> --format=<span class="v">sha512crypt</span> <span class="mut">/tmp/shadow.dump</span></span>',
      '<span class="mut">// </span>hashes <span class="num">412</span> · GPU <span class="y">RTX 4090</span> · <span class="num">8.2M</span>H/s · est. <span class="num">0:00:47</span>',
      '<span class="mut">// </span><span class="ok">[✓]</span> cracked <span class="num">38</span>/<span class="num">412</span> · root · admin · svc_ci · <span class="mut">writing to creds.txt</span>',
    ],
    [
      '<span class="p">~$</span> <span class="out">proxychains4 -q curl -sk <span class="flag">https://internal.acme.corp/admin/api/v2/dump</span> | jq <span class="flag">\'.users[] | .creds\'</span></span>',
      '<span class="mut">// </span>chain · <span class="v">tor</span> → <span class="v">socks5://10.0.0.5</span> → <span class="v">https</span> · <span class="num">3</span> hops · latency <span class="num">217ms</span>',
      '<span class="mut">// </span><span class="ok">[✓]</span> <span class="num">412</span> records exfiltrated · piped to <span class="mut">/dev/shm/.cache.bin</span>',
    ],
    [
      '<span class="p">~$</span> <span class="out">exfil --bundle <span class="y">creds+keys+logs</span> --route <span class="v">tor</span> --chunks <span class="num">16</span> --shred-source --aes256</span>',
      '<span class="mut">// stage 3/3 ::</span> uplink · <span class="num">412KiB</span> · pad noise <span class="y">RFC4949</span> · cover traffic <span class="ok">on</span>',
      '<span class="mut">// </span><span class="ok">[✓]</span> trace cleared · <span class="num">7</span> log files shredded (DoD <span class="num">5220.22-M</span>) · <span class="ok">detached</span>',
    ],
  ];

  const cmdEls = [document.getElementById('cmd-1'), document.getElementById('cmd-2'), document.getElementById('cmd-3')];

  function typeHTML(el, html, opts = {}) {
    const { speed = 11, jitter = 14, done } = opts;
    // Strip HTML to plain for char counting; then progressively reveal by indexing chars.
    // Simpler approach: build a string of "atoms" — each atom is either a tag (full chunk) or a single char.
    const atoms = [];
    let i = 0;
    while (i < html.length) {
      if (html[i] === '<') {
        const end = html.indexOf('>', i);
        atoms.push({ tag: true, str: html.slice(i, end + 1) });
        i = end + 1;
      } else if (html[i] === '&') {
        // entity like &gt;
        const end = html.indexOf(';', i);
        atoms.push({ tag: false, str: html.slice(i, end + 1) });
        i = end + 1;
      } else {
        atoms.push({ tag: false, str: html[i] });
        i++;
      }
    }

    let revealed = 0;
    function step() {
      // Find next non-tag atom to reveal
      while (revealed < atoms.length && atoms[revealed].tag) revealed++;
      if (revealed < atoms.length) revealed++;

      // Render: all tags + all revealed non-tag atoms; non-revealed non-tag → blank
      let html2 = '';
      let nonTagSeen = 0, nonTagRevealed = 0;
      for (const a of atoms) {
        if (a.tag) html2 += a.str;
        else {
          nonTagSeen++;
          if (nonTagSeen <= revealed) html2 += a.str;
        }
      }
      el.innerHTML = html2 + '<span class="cursor-blink" style="height:0.85em;width:0.42em;display:inline-block;vertical-align:-0.05em;margin-left:2px;"></span>';

      if (revealed < atoms.length) {
        setTimeout(step, speed + Math.random() * jitter);
      } else {
        el.innerHTML = html;
        if (done) done();
      }
    }
    el.innerHTML = '';
    step();
  }

  let scriptIdx = 0;
  function playScript() {
    const sc = SCRIPTS[scriptIdx];
    // Clear all rows
    cmdEls.forEach(e => e.innerHTML = '');
    let row = 0;
    function nextRow() {
      if (row >= sc.length) {
        // Hold then advance
        setTimeout(() => {
          scriptIdx = (scriptIdx + 1) % SCRIPTS.length;
          playScript();
        }, 1400);
        return;
      }
      typeHTML(cmdEls[row], sc[row], { speed: 9, jitter: 12, done: () => {
        row++;
        setTimeout(nextRow, 220);
      }});
    }
    nextRow();
  }
  setTimeout(playScript, 600);


  // -------- LOCAL TIME / DATE (CST UTC+8) ---------
  const $date = document.getElementById('local-date');
  const $time = document.getElementById('local-time');
  const $tz   = document.getElementById('tz');
  function clock() {
    const d = new Date();
    const z = n => String(n).padStart(2, '0');
    // Always show as UTC+8 (China Standard Time)
    const cst = new Date(d.getTime() + (d.getTimezoneOffset() + 8 * 60) * 60000);
    if ($date) $date.textContent = `${cst.getFullYear()}·${z(cst.getMonth()+1)}·${z(cst.getDate())}`;
    if ($time) $time.textContent = `${z(cst.getHours())}:${z(cst.getMinutes())}:${z(cst.getSeconds())}`;
    if ($tz)   $tz.textContent   = 'UTC+08 · CST';
  }
  clock(); setInterval(clock, 1000);


  // -------- IP / LOCATION (best-effort fetch with mock fallback) ---------
  // Locked-in defaults — render fast even if fetch is blocked.
  const MOCK_IPS = [
    { wan: '61.135.169.121', asn: 'AS4808', cn: '中国 · 北京市 · 朝阳区',     en: 'China · Beijing · Chaoyang',     lat: '39.92°N', lon: '116.40°E' },
    { wan: '101.226.4.17',   asn: 'AS4812', cn: '中国 · 上海市 · 浦东新区',   en: 'China · Shanghai · Pudong',      lat: '31.23°N', lon: '121.47°E' },
    { wan: '113.108.81.92',  asn: 'AS4134', cn: '中国 · 广东省 · 深圳市 南山区', en: 'China · Shenzhen · Nanshan',     lat: '22.54°N', lon: '113.94°E' },
    { wan: '120.55.137.6',   asn: 'AS37963',cn: '中国 · 浙江省 · 杭州市 西湖区', en: 'China · Hangzhou · West Lake',  lat: '30.27°N', lon: '120.16°E' },
  ];
  function applyGeo(g) {
    const $wan = document.getElementById('wan-ip');
    const $cn  = document.getElementById('geo-cn');
    const $en  = document.getElementById('geo-en');
    if ($wan && g.wan) $wan.textContent = g.wan;
    if ($cn  && g.cn)  $cn.textContent  = g.cn;
    if ($en  && g.en)  $en.textContent  = g.en;
  }
  // Cycle through mock locations every ~12s to feel "live"
  let mockIdx = Math.floor(Math.random() * MOCK_IPS.length);
  applyGeo(MOCK_IPS[mockIdx]);
  setInterval(() => {
    mockIdx = (mockIdx + 1) % MOCK_IPS.length;
    applyGeo(MOCK_IPS[mockIdx]);
  }, 12000);
  // LAN IP — fake plausible value, slightly cycling
  const $lan = document.getElementById('lan-ip');
  const LANS = ['192.168.1.108', '10.0.0.5', '172.16.4.42', '192.168.31.7'];
  let lanIdx = 0;
  if ($lan) {
    setInterval(() => {
      lanIdx = (lanIdx + 1) % LANS.length;
      $lan.textContent = LANS[lanIdx];
    }, 9000);
  }


  // -------- CAPS LOCK detection on password field ----------
  const $pwd  = document.getElementById('password');
  const $caps = document.getElementById('caps-hint');
  if ($pwd && $caps) {
    function checkCaps(e) {
      const on = e && typeof e.getModifierState === 'function' && e.getModifierState('CapsLock');
      $caps.textContent = on ? '[caps · ON]' : '[caps · off]';
      $caps.style.color = on ? 'var(--warn)' : '';
    }
    $pwd.addEventListener('keydown', checkCaps);
    $pwd.addEventListener('keyup', checkCaps);
  }

  // Cycle "key-pulse" indicator
  const $kp = document.getElementById('key-pulse');
  if ($kp) {
    const KP = ['▮▮▮', '▮▮▯', '▮▯▯', '▯▯▯', '▯▯▮', '▯▮▮'];
    let i = 0;
    setInterval(() => { i = (i + 1) % KP.length; $kp.innerHTML = `<span style="color:var(--accent);text-shadow:var(--text-glow)">${KP[i]}</span>`; }, 280);
  }

  // -------- FPS counter ---------
  const $fps = document.getElementById('tele-fps');
  if ($fps) {
    let last = performance.now(), frames = 0;
    function tickFps(now) {
      frames++;
      if (now - last >= 500) {
        const fps = Math.round((frames * 1000) / (now - last));
        $fps.textContent = (fps).toFixed(1);
        last = now; frames = 0;
      }
      requestAnimationFrame(tickFps);
    }
    requestAnimationFrame(tickFps);
  }


  // -------- Form submit — glitch the headline ---------
  const $form = document.getElementById('auth-form');
  if ($form) {
    $form.addEventListener('submit', (e) => {
      e.preventDefault();
      // Trigger glitch burst
      [glitch1, glitch2].forEach(el => {
        if (!el) return;
        el.classList.add('glitching');
        setTimeout(() => el.classList.remove('glitching'), 340);
      });
      const btn = $form.querySelector('.btn-enter');
      if (btn) {
        const cn = btn.querySelector('.cn');
        const en = btn.querySelector('.en');
        const ar = btn.querySelector('.arrow');
        if (cn) cn.textContent = '连接中';
        if (en) en.textContent = 'CONNECTING';
        if (ar) ar.textContent = '◌';
        btn.style.pointerEvents = 'none';
        setTimeout(() => {
          if (cn) cn.textContent = '进入';
          if (en) en.textContent = 'ENTER';
          if (ar) ar.textContent = '→';
          btn.style.pointerEvents = '';
        }, 2400);
      }
    });
  }
})();
