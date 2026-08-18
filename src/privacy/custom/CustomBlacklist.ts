import type { FilterRule } from '../engine/FilterRule';
import { normalizeDomain } from '../engine/FilterRule';

export interface CustomRule {
  domain: string;
  addedAt: number;
}

/**
 * Kullanıcı tanımlı engelleme listesi. Whitelist'ten sonra, filtre
 * listelerinden ÖNCE kontrol edilir. Kalıcılık localStorage üzerinden sağlanır
 * (yalnızca cihazda).
 */
export class CustomBlacklist {
  private rules = new Map<string, CustomRule>();
  private readonly storageKey = 'knots.privacy.customBlacklist';

  async init(): Promise<void> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CustomRule[];
      if (!Array.isArray(parsed)) return;
      this.rules.clear();
      for (const item of parsed) {
        const d = normalizeDomain(item?.domain);
        if (d) this.rules.set(d, { domain: d, addedAt: item?.addedAt ?? Date.now() });
      }
    } catch {
      this.rules.clear();
    }
  }

  async add(domain: string): Promise<boolean> {
    const d = normalizeDomain(domain);
    if (!d || this.rules.has(d)) return false;
    this.rules.set(d, { domain: d, addedAt: Date.now() });
    await this.persist();
    return true;
  }

  async remove(domain: string): Promise<boolean> {
    const d = normalizeDomain(domain);
    if (!d) return false;
    const removed = this.rules.delete(d);
    if (removed) await this.persist();
    return removed;
  }

  contains(domain: string): boolean {
    const d = normalizeDomain(domain);
    if (!d) return false;
    if (this.rules.has(d)) return true;
    const labels = d.split('.');
    let suffix = '';
    for (let i = labels.length - 1; i >= 0; i--) {
      suffix = suffix ? `${labels[i]}.${suffix}` : labels[i];
      if (this.rules.has(suffix)) return true;
    }
    return false;
  }

  match(domain: string): FilterRule | null {
    const d = normalizeDomain(domain);
    if (!d) return null;
    const labels = d.split('.');
    let suffix = '';
    for (let i = labels.length - 1; i >= 0; i--) {
      suffix = suffix ? `${labels[i]}.${suffix}` : labels[i];
      const rule = this.rules.get(suffix);
      if (rule) {
        return {
          domain: rule.domain,
          category: 'custom',
          source: 'custom-blacklist',
          original: rule.domain,
          exception: false,
          isHosts: false,
        };
      }
    }
    return null;
  }

  getAll(): CustomRule[] {
    return [...this.rules.values()].sort((a, b) => b.addedAt - a.addedAt);
  }

  async clear(): Promise<void> {
    this.rules.clear();
    await this.persist();
  }

  get size(): number {
    return this.rules.size;
  }

  private async persist(): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify([...this.rules.values()]));
    } catch {
      // localStorage dolu olabilir — sessizce geç
    }
  }
}