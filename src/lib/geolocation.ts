export type PublicGeo = {
  ip: string;
  cn: string;
  en: string;
  source: string;
};

type ProviderGeo = {
  ip?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  org?: string;
  source: string;
};

const countryCN: Record<string, string> = {
  CN: '中国',
  HK: '中国香港',
  MO: '中国澳门',
  TW: '中国台湾',
  US: '美国',
  JP: '日本',
  KR: '韩国',
  SG: '新加坡',
  GB: '英国',
  DE: '德国',
  FR: '法国',
  AU: '澳大利亚',
  CA: '加拿大',
};

const placeCN: Record<string, string> = {
  Beijing: '北京',
  Shanghai: '上海',
  Shenzhen: '深圳',
  Guangzhou: '广州',
  Hangzhou: '杭州',
  Nanjing: '南京',
  Chengdu: '成都',
  Wuhan: '武汉',
  Chongqing: '重庆',
  Tianjin: '天津',
  Suzhou: '苏州',
  Guangdong: '广东',
  Zhejiang: '浙江',
  Jiangsu: '江苏',
  Sichuan: '四川',
  Hubei: '湖北',
  California: '加利福尼亚',
  Tokyo: '东京',
  Seoul: '首尔',
  Singapore: '新加坡',
  London: '伦敦',
};

function cnName(value?: string) {
  if (!value) return '';
  return placeCN[value] ?? value;
}

function formatGeo(geo: ProviderGeo): PublicGeo | null {
  if (!geo.ip) return null;
  const countryCode = geo.countryCode?.toUpperCase() ?? '';
  const cnCountry = countryCN[countryCode] ?? geo.country ?? '未知国家';
  const cnRegion = cnName(geo.region);
  const cnCity = cnName(geo.city);
  const enCountry = geo.country ?? (countryCode || 'Unknown');
  const en = [enCountry, geo.region, geo.city].filter(Boolean).join(' / ');
  const cn = [cnCountry, cnRegion, cnCity].filter(Boolean).join(' / ');
  return {
    ip: geo.ip,
    cn: cn || '未知属地',
    en: en || 'Unknown location',
    source: geo.source,
  };
}

async function fetchJson(url: string, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

export async function resolvePublicGeo(): Promise<PublicGeo> {
  const providers: Array<() => Promise<ProviderGeo>> = [
    async () => {
      const data = await fetchJson('https://ipapi.co/json/');
      return {
        ip: data.ip,
        country: data.country_name,
        countryCode: data.country_code,
        region: data.region,
        city: data.city,
        org: data.org,
        source: 'ipapi.co',
      };
    },
    async () => {
      const data = await fetchJson('https://ipwho.is/');
      return {
        ip: data.ip,
        country: data.country,
        countryCode: data.country_code,
        region: data.region,
        city: data.city,
        org: data.connection?.org,
        source: 'ipwho.is',
      };
    },
    async () => {
      const data = await fetchJson('https://api.ip.sb/geoip');
      return {
        ip: data.ip,
        country: data.country,
        countryCode: data.country_code,
        region: data.region,
        city: data.city,
        org: data.organization,
        source: 'api.ip.sb',
      };
    },
    async () => {
      const data = await fetchJson('https://ipinfo.io/json');
      return {
        ip: data.ip,
        country: data.country,
        countryCode: data.country,
        region: data.region,
        city: data.city,
        org: data.org,
        source: 'ipinfo.io',
      };
    },
  ];

  for (const provider of providers) {
    try {
      const normalized = formatGeo(await provider());
      if (normalized) return normalized;
    } catch {
      // Try next provider.
    }
  }

  return {
    ip: 'detect-failed',
    cn: '公网 IP 属地检测失败',
    en: 'Public IP geolocation unavailable',
    source: 'fallback',
  };
}
