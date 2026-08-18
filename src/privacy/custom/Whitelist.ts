import { normalizeDomain } from '../engine/FilterRule';

export interface WhitelistEntry {
  domain: string;
  addedAt: number;
}

/**
 * Whitelist — HER ZAMAN önceliklidir. Whitelist'te eşleşen bir domain asla
 * engellenmez (custom blacklist dahil). Kalıcılık localStorage üzerinden sağlanır.
 */
export class Whitelist {
  private entries = new Map<string, WhitelistEntry>();
  private readonly storageKey = 'knots.privacy.whitelist';

  async init(): Promise<void> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as WhitelistEntry[];
      if (!Array.isArray(parsed)) return;
      this.entries.clear();
      for (const item of parsed) {
        const d = normalizeDomain(item?.domain);
        if (d) this.entries.set(d, { domain: d, addedAt: item?.addedAt ?? Date.now() });
      }
    } catch {
      this.entries.clear();
    }
  }

  async add(domain: string): Promise<boolean> {
    const d = normalizeDomain(domain);
    if (!d || this.entries.has(d)) return false;
    this.entries.set(d, { domain: d, addedAt: Date.now() });
    await this.persist();
    return true;
  }

  async remove(domain: string): Promise<boolean> {
    const d = normalizeDomain(domain);
    if (!d) return false;
    const removed = this.entries.delete(d);
    if (removed) await this.persist();
    return removed;
  }

  contains(domain: string): boolean {
    const d = normalizeDomain(domain);
    if (!d) return false;
    const labels = d.split('.');
    let suffix = '';
    for (let i = labels.length - 1; i >= 0; i--) {
      suffix = suffix ? `${labels[i]}.${suffix}` : labels[i];
      if (this.entries.has(suffix)) return true;
    }
    return false;
  }

  getAll(): WhitelistEntry[] {
    return [...this.entries.values()].sort((a, b) => b.addedAt - a.addedAt);
  }

  /** Domain bir whitelist öğesinin kendisi mi (suffix eşleşmesi lazım mı) kontrolü. */
  async removeExact(domain: string): Promise<boolean> {
    const d = normalizeDomain(domain);
    if (!d) return false;
    const removed = this.entries.delete(d);
    if (removed) await this.persist();
    return removed;
  }

  async clear(): Promise<void> {
    this.entries.clear();
    await this.persist();
  }

  get size(): number {
    return this.entries.size;
  }

  private async persist(): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify([...this.entries.values()]));
    } catch {
      // sessizce geç
    }
  }
}