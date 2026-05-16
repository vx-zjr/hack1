import {
  Activity,
  Binary,
  Box,
  Bug,
  Database,
  Fingerprint,
  Globe2,
  KeyRound,
  LockKeyhole,
  Map,
  PackageSearch,
  Radar,
  RadioTower,
  Search,
  ShieldAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type QueryModule = {
  id: string;
  label: string;
  short: string;
  icon: LucideIcon;
  seed: string;
};

export type QueryResult = {
  title: string;
  severity: 'LOW' | 'MED' | 'HIGH' | 'CRIT';
  rows: Array<[string, string]>;
  notes: string[];
};

export const queryModules: QueryModule[] = [
  { id: 'ip', label: 'IP 信息查询', short: 'IPINT', icon: Globe2, seed: '203.0.113.42' },
  { id: 'whois', label: '域名 / WHOIS', short: 'WHOIS', icon: Search, seed: 'ghost-shell.example' },
  { id: 'ports', label: '端口扫描', short: 'PORTS', icon: Radar, seed: '10.0.4.17' },
  { id: 'hash', label: '哈希解析', short: 'HASH', icon: Fingerprint, seed: 'e99a18c428cb38d5f260853678922e03' },
  { id: 'meta', label: '元数据分析', short: 'META', icon: PackageSearch, seed: 'payload_archive.zip' },
  { id: 'darkweb', label: '暗网监控', short: 'DARK', icon: Database, seed: 'credential paste' },
  { id: 'cve', label: '漏洞数据库', short: 'CVE', icon: Bug, seed: 'CVE-2026-0481' },
  { id: 'topology', label: '网络拓扑可视化', short: 'TOPO', icon: Map, seed: 'corp-east' },
  { id: 'leak', label: '数据泄露查询', short: 'LEAK', icon: ShieldAlert, seed: 'finance@corp.example' },
  { id: 'crypto', label: '加解密工具箱', short: 'CRYPTO', icon: LockKeyhole, seed: 'AES-256-GCM' },
  { id: 'packet', label: '数据包分析', short: 'PCAP', icon: RadioTower, seed: 'capture_0842.pcap' },
  { id: 'binary', label: '二进制画像', short: 'BIN', icon: Binary, seed: 'agent.exe' },
  { id: 'asset', label: '资产指纹', short: 'ASSET', icon: Box, seed: 'web farm' },
  { id: 'keys', label: '密钥审计', short: 'KEYS', icon: KeyRound, seed: 'vault bundle' },
  { id: 'ops', label: '行动态势', short: 'OPS', icon: Activity, seed: 'night shift' },
];

const severities: QueryResult['severity'][] = ['LOW', 'MED', 'HIGH', 'CRIT'];
const cities = ['Tokyo', 'Seoul', 'Singapore', 'Frankfurt', 'Ashburn', 'London', 'Sydney', 'Shanghai'];
const tags = ['sandboxed', 'simulated', 'no-network', 'local-only', 'training-data'];

export function randomHex(bytes = 8) {
  return Array.from({ length: bytes }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
}

export function fakeIp() {
  return `${10 + Math.floor(Math.random() * 213)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 253)}`;
}

export function makeFakeLog(level?: 'OK' | 'WARN' | 'TRACE' | 'ERR') {
  const picked = level ?? (['OK', 'OK', 'TRACE', 'WARN'] as const)[Math.floor(Math.random() * 4)];
  const verbs = [
    'rotating decoy route',
    'refreshing telemetry buffer',
    'sampling packet entropy',
    'indexing synthetic asset',
    'binding display probe',
    'mirroring fake event stream',
    'normalizing hash corpus',
    'updating threat score',
  ];
  return `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] [${picked}] ${verbs[Math.floor(Math.random() * verbs.length)]} :: ${randomHex(3)}`;
}

export function generateQueryResult(moduleId: string): QueryResult {
  const module = queryModules.find((item) => item.id === moduleId) ?? queryModules[0];
  const sev = severities[Math.floor(Math.random() * severities.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const tag = tags[Math.floor(Math.random() * tags.length)];

  const commonRows: Array<[string, string]> = [
    ['MODULE', module.short],
    ['INPUT', module.seed],
    ['RUN ID', `sim-${randomHex(4)}`],
    ['ROUTE', `${city.toUpperCase()} / ${fakeIp()}`],
    ['SOURCE', 'LOCAL FAKE DATA'],
    ['MODE', 'DEMO ONLY'],
  ];

  const special: Record<string, Array<[string, string]>> = {
    ip: [
      ['ASN', `AS${1000 + Math.floor(Math.random() * 80000)}`],
      ['COUNTRY', city],
      ['RISK', `${30 + Math.floor(Math.random() * 67)} / 100`],
    ],
    ports: [
      ['OPEN', '22, 80, 443, 8080, 8443'],
      ['FILTERED', String(12 + Math.floor(Math.random() * 60))],
      ['PROFILE', 'edge-service-honeypot'],
    ],
    hash: [
      ['TYPE', Math.random() > 0.5 ? 'MD5' : 'SHA-256'],
      ['MATCH', `demo-word-${Math.floor(Math.random() * 9999)}`],
      ['CONF', `${82 + Math.floor(Math.random() * 17)}%`],
    ],
    cve: [
      ['CVE', `CVE-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`],
      ['CVSS', (6 + Math.random() * 3.8).toFixed(1)],
      ['STATUS', 'synthetic watchlist'],
    ],
  };

  return {
    title: `${module.short} RESULT`,
    severity: sev,
    rows: [...commonRows, ...(special[module.id] ?? [['SIGNATURE', `${tag}-${randomHex(2)}`], ['CONF', `${70 + Math.floor(Math.random() * 29)}%`]])],
    notes: [
      'All values are generated locally for UI rehearsal.',
      `Correlation window ${15 + Math.floor(Math.random() * 45)}m, confidence ${70 + Math.floor(Math.random() * 29)}%.`,
      `Synthetic indicator: ${tag}.`,
    ],
  };
}

export function makeChartData(points = 28) {
  return Array.from({ length: points }, (_, index) => ({
    tick: index,
    packets: 30 + Math.round(Math.sin(index * 0.55) * 18 + Math.random() * 28),
    entropy: 20 + Math.round(Math.cos(index * 0.32) * 14 + Math.random() * 24),
    risk: 45 + Math.round(Math.sin(index * 0.21 + 1.2) * 30 + Math.random() * 16),
  }));
}

export function makeRadarData() {
  return [
    { name: 'IDS', value: 70 + Math.random() * 25 },
    { name: 'WAF', value: 50 + Math.random() * 35 },
    { name: 'CVE', value: 60 + Math.random() * 30 },
    { name: 'LEAK', value: 40 + Math.random() * 45 },
    { name: 'BOT', value: 55 + Math.random() * 35 },
    { name: 'TOR', value: 45 + Math.random() * 40 },
  ];
}
