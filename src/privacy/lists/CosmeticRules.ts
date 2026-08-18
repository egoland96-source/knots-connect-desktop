import { normalizeDomain } from '../engine/FilterRule';

interface CosmeticEntry {
  /** Normalize edilmiş host (boş = genel, her domain'e uygulanır). */
  domain: string;
  /** ör. ".cookie-banner" / "#cc-window" / "#ccc[data-v]". */
  selector: string;
  source: string;
  listId?: string;
}

/**
 * Cosmetic (element-hiding) kural deposu.
 *
 * Kaynaklardan gelen güvenilir seçicileri saklar. ASLA heuristic üretmez —
 * yalnızca listeden gelen `##…`, `#@#…` kurallarını tutar. Kullanıcı arayüzü/
 * tarayıcı katmanı bu seçicileri istediğinde `getSelectors(domain)` ile alır.
 *
 * `#@#` (exception) seçiciler ayrı bir set'te tutulur; render katmanı bu
 * seçicileri ilgili domain'de uygulamaz.
 */
export class CosmeticRules {
  private rules: CosmeticEntry[] = [];
  private exceptionsByDomain = new Map<string, string[]>();

  constructor(initial: CosmeticEntry[] = []) {
    for (const entry of initial) this.add(...toEntryArgs(entry));
  }

  private add(domain: string, selector: string, source: string, listId?: string): void {
    if (!selector) return;
    this.rules.push({ domain, selector, source, listId });
  }

  addException(domain: string, selector: string, source: string, listId?: string): void {
    if (!selector) return;
    const key = domain;
    const arr = this.exceptionsByDomain.get(key) || [];
    arr.push(selector);
    this.exceptionsByDomain.set(key, arr);
  }

  /** Bir listeyi parse edip seçicileri depoya ekler (boş domaine sahip liste temizlenir). */
  loadFromList(listId: string, cosmeticLines: string[], source: string): number {
    let added = 0;
    for (const line of cosmeticLines) {
      const parts = parseCosmeticLine(line);
      if (!parts) continue;
      if (parts.exception) {
        if (parts.domain) this.addException(parts.domain, parts.selector, source, listId);
      } else {
        this.add(parts.domain || '', parts.selector, source, listId);
      }
      added++;
    }
    return added;
  }

  /** Bir domain için uygulanabilir seçiciler. */
  getSelectors(domain: string): string[] {
    const host = normalizeDomain(domain);
    const exceptions = new Set(
      (this.exceptionsByDomain.get(host) || [])
        .concat(this.exceptionsByDomain.get('') || []),
    );
    const out: string[] = [];
    for (const entry of this.rules) {
      if (!entry.domain || entry.domain === host || host.endsWith(`.${entry.domain}`)) {
        if (!exceptions.has(entry.selector)) out.push(entry.selector);
      }
    }
    // Sırayı korurken tekrarları önle
    return [...new Set(out)];
  }

  getAll(): CosmeticEntry[] {
    return [...this.rules];
  }

  count(): number {
    return this.rules.length;
  }

  clear(): void {
    this.rules = [];
    this.exceptionsByDomain.clear();
  }
}

function toEntryArgs(entry: CosmeticEntry): [string, string, string, string?] {
  return [entry.domain || '', entry.selector, entry.source, entry.listId];
}

/**
 * Cosmetic satırını ayrıştırır:
 *   domain##selector
 *   ##selector            (genel)
 *   domain#@#selector     (exception)
 *   #?# …  (AdGuard extended CSS — saklanır, yorumlanmaz)
 */
export function parseCosmeticLine(line: string): {
  domain: string | null;
  selector: string;
  exception: boolean;
} | null {
  if (!line) return null;
  let exception = false;
  const mEx = line.match(/^(.*?)#@#(.*)$/);
  if (mEx) {
    exception = true;
    const dom = normalizeDomain(mEx[1] || '');
    const sel = mEx[2].trim();
    return dom || sel ? { domain: dom || null, selector: sel, exception } : null;
  }
  const m = line.match(/^(.*?)##(.*)$/);
  if (m) {
    const dom = normalizeDomain(m[1] || '');
    const sel = m[2].trim();
    if (!sel) return null;
    return { domain: dom || null, selector: sel, exception: false };
  }
  const m2 = line.match(/^(.*?)#\?#(.*)$/);
  if (m2) {
    const dom = normalizeDomain(m2[1] || '');
    const sel = m2[2].trim();
    return dom || sel ? { domain: dom || null, selector: sel, exception: false } : null;
  }
  return null;
}