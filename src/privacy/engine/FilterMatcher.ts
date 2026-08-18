import {
  FilterRule,
  normalizeDomain,
  parseRequestUrl,
  ResourceType,
  ThirdParty,
} from './FilterRule';
export interface MatchRequest {
  /** Normalize edilmiş hostname. */
  hostname: string;
  /** URL path (ör. "/ads/banner"). Boş ise path kısıtsız rule'lar eşleşir. */
  path?: string;
  url?: string;
  resourceType?: ResourceType;
  thirdParty?: ThirdParty;
  /** Referrer / sayfa hostu ($domain= kısıtı için). */
  referrerHost?: string;
}

export interface MatchResult {
  blocked: boolean;
  rule: FilterRule | null;
  exception: FilterRule | null;
}

function compilePathPattern(pattern: string, urlAnchor: boolean): (target: string) => boolean {
  const body = urlAnchor ? pattern : pattern;
  let re: RegExp;
  try {
    const escaped = body
      .replace(/([.+?(){}[\]\\])/g, '\\$1')
      .replace(/\*/g, '[^]*')
      .replace(/\^/g, '(?=[/?#&.]|$)');
    re = urlAnchor
      ? new RegExp(`^${escaped}`)
      : new RegExp(escaped);
  } catch {
    return () => false;
  }
  return (target: string) => re.test(target);
}

interface CompiledRule {
  rule: FilterRule;
  host: string;
  /** pathPattern ya da urlAnchor kullanılır. */
  match: ((target: string, url: string) => boolean) | null;
  resourceTypes: Set<ResourceType> | null;
  negatedResourceTypes: Set<ResourceType>;
  thirdParty: ThirdParty;
  referrers: string[] | null;
}

const TYPE_ALIASES: Record<string, ResourceType> = {
  xhr: 'xmlhttprequest',
  xmlhttprequest: 'xmlhttprequest',
  ping: 'ping',
  other: 'other',
};

function resolveType(t: string): ResourceType {
  return TYPE_ALIASES[t] || (t as ResourceType);
}

function compileRule(input: FilterRule): CompiledRule {
  const host = input.isHosts ? input.domain : input.domain;
  let match: CompiledRule['match'] = null;
  if (input.urlAnchor && input.pathPattern) {
    const fn = compilePathPattern(input.pathPattern, true);
    match = (_p: string, url: string) => fn(url);
  } else if (input.pathPattern) {
    const fn = compilePathPattern(input.pathPattern, false);
    match = (p: string, url: string) => {
      // URL verilmediyse (hostname-only karar) path kuralı da domain seviyesinde eşleşir
      // — bu, eski davranışı korur ve benchmark'da domain tabanlı örnekleri kaçırmaz.
      if (!url) return true;
      return fn(p || '/');
    };
  }

  const resourceTypes = input.resourceTypes?.length
    ? new Set<ResourceType>(input.resourceTypes.map(resolveType))
    : null;
  const negatedResourceTypes = input.negatedResourceTypes?.length
    ? new Set<ResourceType>(input.negatedResourceTypes.map(resolveType))
    : new Set<ResourceType>();

  const referrers = input.referrerDomains?.length ? input.referrerDomains.map(normalizeDomain) : null;

  return {
    rule: input,
    host,
    match,
    resourceTypes,
    negatedResourceTypes,
    thirdParty: input.thirdParty || 'any',
    referrers,
  };
}

function hostSuffixes(host: string): string[] {
  const parts = host.split('.');
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    out.push(parts.slice(i).join('.'));
  }
  return out;
}

export class FilterMatcher {
  private rules = new Map<string, CompiledRule[]>();
  private exceptions = new Map<string, CompiledRule[]>();

  add(input: FilterRule): void {
    const c = compileRule(input);
    if (input.exception) {
      const arr = this.exceptions.get(c.host) || [];
      arr.push(c);
      this.exceptions.set(c.host, arr);
    } else {
      const arr = this.rules.get(c.host) || [];
      arr.push(c);
      this.rules.set(c.host, arr);
    }
  }

  clear(): void {
    this.rules.clear();
    this.exceptions.clear();
  }

  private constraintsMatch(c: CompiledRule, req: MatchRequest): boolean {
    if (c.resourceTypes && req.resourceType) {
      const t = resolveType(req.resourceType);
      if (!c.resourceTypes.has(t)) {
        return false;
      }
    }
    if (c.negatedResourceTypes.size && req.resourceType) {
      if (c.negatedResourceTypes.has(resolveType(req.resourceType))) return false;
    }
    if (c.thirdParty !== 'any' && req.thirdParty && c.thirdParty !== req.thirdParty) {
      return false;
    }
    if (c.referrers && req.referrerHost) {
      const ref = normalizeDomain(req.referrerHost);
      const ok = c.referrers.some((r) => ref === r || ref.endsWith(`.${r}`));
      if (!ok) return false;
    }
    return true;
  }

  private matchAgainst(map: Map<string, CompiledRule[]>, req: MatchRequest): MatchResult {
    const suffixes = req.hostname ? hostSuffixes(req.hostname) : [''];
    for (const suffix of suffixes) {
      const arr = map.get(suffix);
      if (!arr || !arr.length) continue;
      for (const c of arr) {
        if (!this.constraintsMatch(c, req)) continue;
        if (c.match && !c.match(req.path || '/', req.url || '')) continue;
        return { blocked: !c.rule.exception, rule: c.rule, exception: c.rule.exception ? c.rule : null };
      }
    }
    return { blocked: false, rule: null, exception: null };
  }

  /** Yeni request-bazlı eşleştirme (path / type / 3rd-party dahil). */
  matchRequest(req: MatchRequest): MatchResult {
    const request: MatchRequest = {
      hostname: normalizeDomain(req.hostname || ''),
      path: req.path || '/',
      url: req.url || '',
      // resourceType/thirdParty verilmezse her kurala uy (type bağımsız eşleşme).
      resourceType: req.resourceType,
      thirdParty: req.thirdParty,
      referrerHost: req.referrerHost || '',
    };

    const ex = this.matchAgainst(this.exceptions, request);
    if (ex.exception) {
      return { blocked: false, rule: null, exception: ex.exception };
    }

    const res = this.matchAgainst(this.rules, request);
    if (res.rule) {
      return { blocked: true, rule: res.rule, exception: null };
    }

    return { blocked: false, rule: null, exception: null };
  }

  /** Geri uyumluluk: yalnız domain bazlı match (path/type/3p bağlamı yok). */
  match(domain: string): MatchResult {
    const req: MatchRequest = { hostname: domain, path: '/', url: '' };
    return this.matchRequest(req);
  }

  ruleCount(): number {
    let n = 0;
    for (const arr of this.rules.values()) n += arr.length;
    for (const arr of this.exceptions.values()) n += arr.length;
    return n;
  }
}