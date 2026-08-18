import type { BlockCategory } from '../engine/FilterRule';
import {
  normalizeDomain,
  type ResourceType,
  type ThirdParty,
} from '../engine/FilterRule';

export const ABP_HEADER = '[Adblock Plus 2.0]';

export interface ParsedList {
  /** Ağ kuralları (||… / JSON token'ları). */
  rules: string[];
  /** Cosmetic (element-hiding) kuralları, her biri ham satır. */
  cosmetics: string[];
  /** Cosmetic kural sayısı (network kurallarından ayrı). */
  cosmeticCount: number;
  version: string | null;
  checksum: string | null;
  valid: boolean;
}

/**
 * EasyList / AdGuard / Adblock Plus formatındaki filtre listesi dosyalarını ve
 * hosts dosyalarını ayrıştırır. Desteklenen kurallar:
 *
 *   - hosts:      0.0.0.0 / 127.0.0.1 / ::1 / localhost  domain
 *   - ABP-temel:  ||domain^ , ||domain/path , ||domain^$options
 *                 URL-anchor:    |http://domain^ , |https://domain/path
 *                 Exception:     @@||domain^ …
 *   - options:    $script,$image,$stylesheet,$xhr,$ping,$media,$font,$websocket,
 *                 $popup,$object,$document,$subdocument,$other + ~önek (negasyon)
 *                 $third-party / $first-party / $1p / $3p
 *                 $domain=a.com,b.net , $important , $denyallow=
 *   - cosmetic:   ##selector , domain##selector , #@# , domain#@#selector ,
 *                 #?# (AdGuard extended CSS), listelerin kosmetik satırları
 *
 * Tam olarak anlaşılamayan satırlar TEHLİKELİ olabileceği için atlanır (saf
 * domain'e "uyarlanarak" aşırı bloklama yaratılmaz).
 */
export class FilterListParser {
  static parse(raw: string, category: BlockCategory): ParsedList {
    const rules: string[] = [];
    const cosmetics: string[] = [];
    let version: string | null = null;
    let checksum: string | null = null;
    let ruleCount = 0;
    let cosmeticCount = 0;

    if (!raw || raw.trim().length === 0) {
      return { rules, cosmetics, cosmeticCount, version, checksum, valid: false };
    }

    const lines = raw.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith('! Version:')) {
        version = line.replace('! Version:', '').trim();
        continue;
      }
      if (line.startsWith('! Checksum:')) {
        checksum = line.replace('! Checksum:', '').trim();
        continue;
      }

      if (line.startsWith('!') || line.startsWith('#')) continue;
      if (line.startsWith('[')) continue;

      // Cosmic: ## / #@# / #?# — network kuralı değil, ayrı saklanır.
      if (isCosmeticLine(line)) {
        cosmetics.push(line);
        cosmeticCount++;
        continue;
      }

      // Hosts dosyası
      const hostsMatch = line.match(/^\s*(?:0\.0\.0\.0|127\.0\.0\.1|::1|localhost)\s+([^\s#]+)/);
      if (hostsMatch) {
        const domain = normalizeDomain(hostsMatch[1]);
        if (domain && domain !== 'localhost') {
          rules.push(`HOSTS:${domain}`);
          ruleCount++;
        }
        continue;
      }

      const parsed = parseAbpLine(line);
      if (!parsed) continue;

      rules.push(serializeToken(parsed));
      ruleCount++;
    }

    return {
      rules,
      cosmetics,
      cosmeticCount,
      version,
      checksum,
      valid: ruleCount + cosmeticCount > 0,
    };
  }
}

function isCosmeticLine(line: string): boolean {
  if (line.includes('##')) return true;
  if (line.includes('#@#')) return true;
  if (line.includes('#?#')) return true;
  if (line.includes('$removeparam')) return false;
  return false;
}

export interface AbpRule {
  domain: string;
  exception: boolean;
  isHosts: boolean;
  /** resource type kısıtları ($script gibi). */
  resourceTypes?: ResourceType[];
  negatedResourceTypes?: ResourceType[];
  /** $third-party / $first-party (boş = her tür ortam). */
  thirdParty?: ThirdParty;
  /** URL path deseni (glob), ör. "/ads/*". */
  pathPattern?: string;
  /** URL-anchor kuralı (|http://…). */
  urlAnchor?: boolean;
  /** $domain= referrer kısıtı — normalize edilmiş host listesi. */
  referrerDomains?: string[];
  important?: boolean;
}

const RESOURCE_TYPES = new Set<string>([
  'script', 'image', 'stylesheet', 'object', 'subdocument', 'document',
  'frame', 'xmlhttprequest', 'xhr', 'ping', 'websocket', 'media', 'font',
  'popup', 'other',
]);

const TOKEN_PREFIX = 'C:';

function serializeToken(rule: AbpRule): string {
  return TOKEN_PREFIX + JSON.stringify({
    d: rule.domain,
    e: rule.exception ? 1 : 0,
    h: rule.isHosts ? 1 : 0,
    t: rule.resourceTypes,
    n: rule.negatedResourceTypes,
    p: rule.pathPattern,
    u: rule.urlAnchor ? 1 : 0,
    tp: rule.thirdParty,
    r: rule.referrerDomains,
    i: rule.important ? 1 : 0,
  });
}

export function parseAbpRuleToken(token: string): AbpRule | null {
  if (token.startsWith(TOKEN_PREFIX)) {
    try {
      const data = JSON.parse(token.slice(TOKEN_PREFIX.length));
      const domain = normalizeDomain(String(data.d || ''));
      return {
        domain,
        exception: !!data.e,
        isHosts: !!data.h,
        resourceTypes: data.t as ResourceType[] | undefined,
        negatedResourceTypes: data.n as ResourceType[] | undefined,
        thirdParty: data.tp as ThirdParty | undefined,
        pathPattern: data.p as string | undefined,
        urlAnchor: !!data.u,
        referrerDomains: data.r as string[] | undefined,
        important: !!data.i,
      };
    } catch {
      return null;
    }
  }
  if (token.startsWith('HOSTS:')) {
    const domain = normalizeDomain(token.slice(6));
    return domain ? { domain, exception: false, isHosts: true } : null;
  }
  if (token.startsWith('@@||')) {
    const domain = normalizeDomain(token.slice(4).replace(/\^$/, ''));
    return domain ? { domain, exception: true, isHosts: false } : null;
  }
  if (token.startsWith('||')) {
    const domain = normalizeDomain(token.slice(2).replace(/\^$/, ''));
    return domain ? { domain, exception: false, isHosts: false } : null;
  }
  return null;
}

/**
 * ABP satırını ayrıştırır. Anlaşılamayan satırlar için null döner.
 * Dönen kural `domain` anahtar olarak normalize edilmiş host içerir;
 * path/type/3p kısıtları metadata olarak eklenir.
 */
export function parseAbpLine(line: string): AbpRule | null {
  if (!line || line.startsWith('#')) return null;

  let rest = line;
  let exception = false;
  if (rest.startsWith('@@')) {
    exception = true;
    rest = rest.slice(2);
  }

  const optionsSplit = splitOptions(rest);
  if (!optionsSplit) return null;
  let pattern = optionsSplit.pattern;
  const optionsStr = optionsSplit.options;

  const options = parseOptions(optionsStr);
  if (options.invalid) return null;

  // Exception'lar zaten saklanır; $-li kurallar domain anahtarıyla kaydedilir.
  const anchored = pattern.startsWith('|http://') || pattern.startsWith('|https://') || pattern.startsWith('|wss://') || pattern.startsWith('|ws://');
  let urlAnchor = false;
  if (anchored) {
    urlAnchor = true;
    pattern = pattern.slice(1);
  }

  if (!urlAnchor && !pattern.startsWith('||')) {
    // Düz domain (hosts-tarzı) — path bulunmamalı.
    if (pattern.includes('/')) return null;
    const domain = normalizeDomain(pattern);
    if (!domain) return null;
    return {
      domain,
      exception,
      isHosts: false,
      ...options.ruleFields,
    };
  }

  let rest2 = urlAnchor ? pattern : pattern.slice(2);
  const viaHttp = urlAnchor;

  // path ayrımı
  let path: string | null = null;
  const slashIdx = rest2.indexOf('/');
  if (slashIdx !== -1) {
    path = rest2.slice(slashIdx);
    rest2 = rest2.slice(0, slashIdx);
  }

  // domain + trailing ^
  let domainPart = rest2.replace(/\^$/, '');
  if (viaHttp) {
    domainPart = domainPart.replace(/^https?:\/\//, '');
  }
  domainPart = domainPart.split('^')[0];

  if (!path && domainPart.includes('*')) {
    // ||*.example.com gibi wildcard host'lar — normalize edemiyoruz, atla.
    return null;
  }

  const domain = normalizeDomain(domainPart);
  if (!domain) return null;

  // pathPattern normalize
  let pathPattern: string | null = null;
  if (path && path.length > 0) {
    if (path === '^' ) pathPattern = null;
    else if (path === '/' || path === '/*') pathPattern = null;
    else pathPattern = path;
  }
  if (pathPattern && pathPattern.includes('^')) {
    // trailing ^ kalırsa glob'e dahil edilir; matcher ^ ayracını separator olarak işler.
  }

  return {
    domain,
    exception,
    isHosts: false,
    pathPattern: pathPattern ?? undefined,
    urlAnchor: viaHttp ? true : undefined,
    ...options.ruleFields,
  };
}

function splitOptions(line: string): { pattern: string; options: string } | null {
  // $ sembolünün kuralın sonunda olması beklenir. Güvenli kesim:
  const idx = line.indexOf('$');
  if (idx === -1) return { pattern: line, options: '' };
  const pattern = line.slice(0, idx);
  const options = line.slice(idx + 1);
  if (!pattern) return null;
  return { pattern, options };
}

function parseOptions(raw: string): { invalid: boolean; ruleFields: Partial<AbpRule> } {
  const fields: Partial<AbpRule> = {};
  if (!raw) return { invalid: false, ruleFields: fields };

  const items = raw.split(',');
  const resourceTypes: ResourceType[] = [];
  const negatedResourceTypes: ResourceType[] = [];
  let thirdParty: ThirdParty | undefined;
  let referrerDomains: string[] | undefined;
  let important = false;

  for (const item of items) {
    const t = item.trim();
    if (!t) continue;
    const neg = t.startsWith('~');
    const name = neg ? t.slice(1) : t;

    if (name === 'third-party' || name === '3p' || name === 'third_party') {
      thirdParty = 'third';
      continue;
    }
    if (name === 'first-party' || name === '1p' || name === 'first_party') {
      thirdParty = 'first';
      continue;
    }
    if (name === 'important') {
      important = true;
      continue;
    }
    if (name === 'match-case') continue;
    if (name === 'removeparam' || name.startsWith('removeparam=')) {
      // URL parametre kuralı — ağ engeli değil; güvenli tarafta atılır.
      continue;
    }
    if (name.startsWith('domain=')) {
      const list = name.slice(7).split('|').map(normalizeDomain).filter(Boolean);
      referrerDomains = list.length ? list : undefined;
      continue;
    }
    if (name.startsWith('denyallow=')) continue;
    if (name.startsWith('redirect') || name.startsWith('replace')) continue;
    if (name === 'genericblock' || name === 'generichide' || name === 'elemhide' || name === 'specifichide') {
      continue;
    }
    if (name === 'popup') {
      resourceTypes.push('popup');
      continue;
    }
    if (name === 'document' || name === 'subdocument') {
      resourceTypes.push(name);
      continue;
    }
    if (RESOURCE_TYPES.has(name)) {
      if (neg) negatedResourceTypes.push(name as ResourceType);
      else resourceTypes.push(name as ResourceType);
      continue;
    }
    // Bilinmeyen option — kuralı körü körüne yorumlayamayız; tehlikeli.
    return { invalid: true, ruleFields: {} };
  }

  if (resourceTypes.length) fields.resourceTypes = [...new Set(resourceTypes)];
  if (negatedResourceTypes.length) fields.negatedResourceTypes = [...new Set(negatedResourceTypes)];
  if (thirdParty) fields.thirdParty = thirdParty;
  if (referrerDomains?.length) fields.referrerDomains = referrerDomains;
  if (important) fields.important = true;

  return { invalid: false, ruleFields: fields };
}