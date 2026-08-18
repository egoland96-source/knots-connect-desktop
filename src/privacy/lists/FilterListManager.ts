import type { BlockCategory } from '../engine/FilterRule';
import { FilterMatcher, type MatchRequest } from '../engine/FilterMatcher';
import type { FilterRule } from '../engine/FilterRule';
import { FilterListParser, parseAbpRuleToken } from './FilterListParser';
import { FilterListCache, type PrivacyBridge } from './FilterListCache';
import { DEFAULT_FILTER_LISTS, type FilterListMeta } from './FilterListCatalog';
import { CosmeticRules } from './CosmeticRules';

const MAX_LIST_BYTES = 20 * 1024 * 1024;

export interface ManagedFilterList {
  meta: FilterListMeta;
  matcher: FilterMatcher;
  cosmetic: CosmeticRules;
  ready: boolean;
}

export interface MatchTypesResult {
  rule: FilterRule;
  listId: string;
}

/**
 * Filtre listelerini yönetir: yükle, indir, doğrula, cache'le, etkinleştir/kapat.
 * Bozuk indirme asla çalışan cache'in yerini almaz (offline + fail-open).
 * Pro listeleri yalnızca 'pro' planında etkinleştirilebilir.
 */
export class FilterListManager {
  private lists = new Map<string, ManagedFilterList>();
  private cache: FilterListCache;
  private onMetaChange?: (lists: FilterListMeta[]) => void;
  private plan: 'free' | 'pro' = 'free';

  constructor(bridge: PrivacyBridge) {
    this.cache = new FilterListCache(bridge);
  }

  setOnMetaChange(cb: (lists: FilterListMeta[]) => void): void {
    this.onMetaChange = cb;
  }

  setPlan(plan: 'free' | 'pro'): void {
    this.plan = plan;
    for (const entry of this.lists.values()) {
      if (entry.meta.pro) {
        entry.meta.enabled = plan === 'pro';
      }
    }
    this.emit();
  }

  isPro(): boolean {
    return this.plan === 'pro';
  }

  /** Sunucudan gelen katalog girişini listeye ekler (varsa üzerine yazar). */
  addRemoteList(meta: FilterListMeta): void {
    const existing = this.lists.get(meta.id);
    if (existing) {
      existing.meta = { ...existing.meta, ...meta, enabled: existing.meta.enabled };
      if (meta.pro && this.plan !== 'pro') existing.meta.enabled = false;
      return;
    }
    this.lists.set(meta.id, {
      meta: { ...meta, enabled: meta.pro ? this.plan === 'pro' : meta.enabled },
      matcher: new FilterMatcher(),
      cosmetic: new CosmeticRules(),
      ready: false,
    });
    this.emit();
  }

  getLists(): FilterListMeta[] {
    return [...this.lists.values()]
      .map((l) => ({ ...l.meta }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  getList(id: string): ManagedFilterList | undefined {
    return this.lists.get(id);
  }

  exists(id: string): boolean {
    return this.lists.has(id);
  }

  /** Varsayılan kataloğu hafızaya kurar (cache'i yeniden yükler, metadata'yı korur). */
  async initAll(): Promise<void> {
    for (const meta of DEFAULT_FILTER_LISTS) {
      if (!this.lists.has(meta.id)) {
        this.lists.set(meta.id, {
          meta: { ...meta },
          matcher: new FilterMatcher(),
          cosmetic: new CosmeticRules(),
          ready: false,
        });
      }
    }
    await Promise.all(
      [...this.lists.values()].map((l) => this.loadCache(l.meta.id)),
    );
    this.emit();
  }

  async loadCache(listId: string): Promise<ManagedFilterList | null> {
    const entry = this.lists.get(listId);
    if (!entry) return null;
    entry.matcher.clear();
    entry.cosmetic.clear();
    entry.ready = false;

    const cached = await this.cache.read(listId);
    if (cached && cached.content) {
      this.buildMatcher(entry, cached.content);
      entry.meta.sizeBytes = cached.sizeBytes;
      entry.meta.lastUpdated = entry.meta.lastUpdated || new Date(cached.content.length ? Date.now() : 0).toISOString();
    }
    entry.ready = this.safeRuleCount(entry) > 0;
    this.emit();
    return entry;
  }

  async updateList(listId: string): Promise<FilterListMeta | null> {
    const entry = this.lists.get(listId);
    if (!entry) return null;

    const downloaded = await this.cache.download(entry.meta.url);
    if (!downloaded || !downloaded.content || downloaded.sizeBytes > MAX_LIST_BYTES) {
      return entry.meta;
    }

    const parsed = FilterListParser.parse(downloaded.content, entry.meta.category);
    if (!parsed.valid || parsed.rules.length <= 0) {
      return entry.meta;
    }

    await this.cache.write(listId, downloaded.content);
    this.buildMatcher(entry, downloaded.content);
    entry.meta.sizeBytes = downloaded.sizeBytes;
    entry.meta.lastUpdated = new Date().toISOString();
    entry.meta.version = parsed.version;
    entry.meta.checksum = parsed.checksum;
    entry.ready = true;
    this.emit();
    return entry.meta;
  }

  async updateAll(): Promise<void> {
    await Promise.all([...this.lists.values()].map((l) => this.updateList(l.meta.id)));
  }

  async enableList(listId: string): Promise<void> {
    const entry = this.lists.get(listId);
    if (!entry) return;
    if (entry.meta.pro && this.plan !== 'pro') return;
    entry.meta.enabled = true;
    this.emit();
  }

  async disableList(listId: string): Promise<void> {
    const entry = this.lists.get(listId);
    if (!entry) return;
    entry.meta.enabled = false;
    this.emit();
  }

  async removeList(listId: string): Promise<void> {
    const entry = this.lists.get(listId);
    if (!entry) return;
    await this.cache.remove(listId);
    entry.matcher.clear();
    entry.cosmetic.clear();
    entry.meta.enabled = false;
    entry.meta.ruleCount = 0;
    entry.meta.sizeBytes = 0;
    entry.ready = false;
    this.emit();
  }

  validate(listId: string): boolean {
    const entry = this.lists.get(listId);
    return !!entry && entry.ready && entry.meta.ruleCount > 0;
  }

  /** Kategori eşleşmesi — request bağlamıyla (URL path, resource type, 3rd party). */
  matchTypes(
    domain: string,
    categories: BlockCategory[],
    req?: Partial<MatchRequest>,
  ): MatchTypesResult | null {
    const request: MatchRequest = {
      hostname: domain,
      path: req?.path ?? '/',
      url: req?.url ?? '',
      resourceType: req?.resourceType,
      thirdParty: req?.thirdParty,
      referrerHost: req?.referrerHost,
    };
    for (const [id, entry] of this.lists) {
      if (!entry.meta.enabled || !entry.ready || !categories.includes(entry.meta.category)) continue;
      const { rule, exception } = entry.matcher.matchRequest(request);
      if (rule && !exception) {
        return { rule, listId: id };
      }
    }
    return null;
  }

  /** Bir domain için cosmetic seçicileri döndürür. */
  getCosmeticSelectors(domain: string): string[] {
    const out: string[] = [];
    for (const entry of this.lists.values()) {
      if (!entry.meta.enabled || !entry.ready) continue;
      out.push(...entry.cosmetic.getSelectors(domain));
    }
    return [...new Set(out)];
  }

  /** Cosmetic kural toplamı (tüm listeler). */
  cosmeticCount(): number {
    let n = 0;
    for (const entry of this.lists.values()) n += entry.cosmetic.count();
    return n;
  }

  private buildMatcher(entry: ManagedFilterList, raw: string): void {
    entry.matcher.clear();
    entry.cosmetic.clear();
    const parsed = FilterListParser.parse(raw, entry.meta.category);
    let ruleCount = 0;
    for (const token of parsed.rules) {
      const parsedRule = parseAbpRuleToken(token);
      if (!parsedRule) continue;
      const rule: FilterRule = {
        domain: parsedRule.domain,
        category: entry.meta.category,
        source: 'filter-list',
        listId: entry.meta.id,
        original: token,
        exception: parsedRule.exception,
        isHosts: parsedRule.isHosts,
        resourceTypes: parsedRule.resourceTypes,
        negatedResourceTypes: parsedRule.negatedResourceTypes,
        thirdParty: parsedRule.thirdParty,
        pathPattern: parsedRule.pathPattern,
        urlAnchor: parsedRule.urlAnchor,
        referrerDomains: parsedRule.referrerDomains,
        important: parsedRule.important,
        subCategory: entry.meta.subCategory,
      };
      entry.matcher.add(rule);
      ruleCount++;
    }
    const cosmeticAdded = entry.cosmetic.loadFromList(entry.meta.id, parsed.cosmetics, linkSource(entry.meta.id));
    entry.meta.ruleCount = ruleCount;
    entry.meta.cosmeticCount = (entry.meta.cosmeticCount ?? 0) + cosmeticAdded;
    entry.meta.version = parsed.version;
    entry.meta.checksum = parsed.checksum;
    entry.ready = ruleCount > 0;
  }

  private safeRuleCount(entry: ManagedFilterList): number {
    return typeof entry.meta.ruleCount === 'number' ? entry.meta.ruleCount : 0;
  }

  private emit(): void {
    if (this.onMetaChange) this.onMetaChange(this.getLists());
  }
}

function linkSource(listId: string): string {
  return `list:${listId}`;
}