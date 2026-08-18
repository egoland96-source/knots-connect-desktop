export type BlockCategory = 'ads' | 'tracker' | 'malware' | 'phishing' | 'custom';
export type RuleSource = 'filter-list' | 'custom-blacklist' | 'whitelist' | 'observed';

/** ABP/AdGuard destekli resource type listesi (+ "other", "popup", "document", "frame"). */
export type ResourceType =
  | 'script'
  | 'image'
  | 'stylesheet'
  | 'object'
  | 'subdocument'
  | 'document'
  | 'frame'
  | 'xmlhttprequest'
  | 'xhr'
  | 'ping'
  | 'websocket'
  | 'media'
  | 'font'
  | 'popup'
  | 'other'
  | 'unknown';

export type ThirdParty = 'third' | 'first' | 'any';

export interface FilterRule {
  /** Normalize edilmiş host. Boş ise kural herhangi bir host için geçerlidir. */
  domain: string;
  category: BlockCategory;
  source: RuleSource;
  listId?: string;
  original: string;
  exception: boolean;
  isHosts: boolean;
  /** Resource type kısıtları (boş = her tip). */
  resourceTypes?: ResourceType[];
  /** Negatif resource type'lar (~image gibi). */
  negatedResourceTypes?: ResourceType[];
  /** $third-party / $first-party (boş = her tür ortam). */
  thirdParty?: ThirdParty;
  /** URL path deseni (glob → RegExp'e çevrilir), ör. "/ads/*". */
  pathPattern?: string;
  /** URL-anchor kuralı mı (|http://...) full URL'e karşı eşleşir. */
  urlAnchor?: boolean;
  /** $domain= referrer kısıtı (normalize host listesi). */
  referrerDomains?: string[];
  /** $important — isteka kısıtlarını güçlendirir. */
  important?: boolean;
  /** Listeye özgü sub-kategori etiketi (örn. 'cookie-notices', 'email-tracking'). */
  subCategory?: string;
}

const MAX_DOMAIN_LENGTH = 253;

export function normalizeDomain(domain: string): string {
  const d = (domain || '').trim().toLowerCase();
  if (!d) return '';
  let out = d
    .replace(/^\*\./, '')
    .replace(/^\./, '')
    .replace(/\.$/, '');
  if (out.startsWith('www.')) {
    out = out.slice(4);
  }
  if (out.length > MAX_DOMAIN_LENGTH) return '';
  if (!/^[a-z0-9._-]+$/.test(out)) return '';
  return out;
}

/** URL'den hostname + path + full URL bileşenlerini çıkarır. */
export function parseRequestUrl(urlOrDomain: string): {
  hostname: string;
  path: string;
  url: string;
} {
  const value = (urlOrDomain || '').trim();
  if (!value) return { hostname: '', path: '', url: '' };
  try {
    if (/^https?:\/\//i.test(value)) {
      const u = new URL(value);
      return {
        hostname: normalizeDomain(u.hostname),
        path: u.pathname || '/',
        url: value,
      };
    }
  } catch {
    // fallback: domain girdisi
  }
  // Saf domain veya "host/path" girişi
  const withoutScheme = value.replace(/^[a-z]+:\/\//i, '');
  const slash = withoutScheme.indexOf('/');
  if (slash === -1) {
    const host = normalizeDomain(withoutScheme);
    return { hostname: host || '', path: '', url: '' };
  }
  const host = normalizeDomain(withoutScheme.slice(0, slash));
  return { hostname: host || '', path: withoutScheme.slice(slash) || '/', url: value };
}

export function isProbablyDomain(value: string): boolean {
  const out = normalizeDomain(value);
  return out.includes('.') && !out.includes(' ') && out.length > 2;
}