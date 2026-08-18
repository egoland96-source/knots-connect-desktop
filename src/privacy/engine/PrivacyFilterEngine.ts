import type { FilterRule } from './FilterRule';
import type { BlockCategory, ResourceType, ThirdParty } from './FilterRule';
import { parseRequestUrl } from './FilterRule';
import type { FilterDecisionResult } from './FilterDecision';
import { ALLOW_DECISION } from './FilterDecision';
import type { PrivacyEvent, FilterEngineStats } from './FilterEngineStats';
import { emptyStats, statsForEvent } from './FilterEngineStats';
import { FilterMatcher } from './FilterMatcher';
import type { MatchRequest } from './FilterMatcher';
import { computeSuspicionScore, suspicionLevel } from './SuspicionScore';
import { FilterListManager } from '../lists/FilterListManager';
import { CustomBlacklist } from '../custom/CustomBlacklist';
import { Whitelist } from '../custom/Whitelist';
import { AdBlocker } from '../categories/AdBlocker';
import { TrackerBlocker } from '../categories/TrackerBlocker';
import { MalwareBlocker } from '../categories/MalwareBlocker';

export interface QueryContext {
  isThirdParty?: boolean;
  requestCount?: number;
  knownGood?: boolean;
  /** Hangi kategoriler etkin? Kapalı kategori asla blok kaydetmez (kullanıcı toggle). */
  enabledCategories?: BlockCategory[];
}

export interface RequestContext extends QueryContext {
  /** İstek URL'i (path eşleştirmesi için). Boşsa hostname bazlı gider. */
  url?: string;
  /** URL'den ayrıştırılamıyorsa doğrudan hostname verebilirsin. */
  hostname?: string;
  /** İsteğin resource tipi (script/image/xhr…). */
  resourceType?: ResourceType;
  /** $third-party bağlamı. */
  thirdParty?: ThirdParty;
  /** Referrer / sayfa hostu ($domain= kısıtı için). */
  referrerHost?: string;
}

const OBSERVED_CAP = 500;

interface ObservedEntry {
  domain: string;
  count: number;
  lastSeen: number;
  firstSeen: number;
}

/**
 * PRIVACY FILTER ENGINE
 * request/domain -> decision (ALLOW / BLOCK / OBSERVE)
 *
 * Karar sırası (Kesin):
 *   1) Whitelist            -> ALLOW (her zaman)
 *   2) Custom Blacklist     -> BLOCK (custom)
 *   3) Malware/Phishing     -> BLOCK (malware/phishing)
 *   4) Tracker              -> BLOCK (tracker)
 *   5) Ad                   -> BLOCK (ads)
 *   6) Observed / Allow     -> OBSERVE (öğrenme modunda) veya ALLOW
 *
 * VPN/DPI'dan tamamen bağımsızdır; yalnızca uygun gördüğünde network katmanına
 * bir karar VERİR, onu kontrol ETMEZ.
 */
export class PrivacyFilterEngine {
  readonly whitelist: Whitelist;
  readonly customBlacklist: CustomBlacklist;
  readonly adBlocker: AdBlocker;
  readonly trackerBlocker: TrackerBlocker;
  readonly malwareBlocker: MalwareBlocker;

  private stats: FilterEngineStats = emptyStats();
  private events: PrivacyEvent[] = [];
  private observed = new Map<string, ObservedEntry>();
  private learningEnabled = true;
  private listManagerCache: FilterListManager | null = null;

  constructor(listManager?: FilterListManager) {
    this.listManagerCache = listManager ?? null;
    this.adBlocker = new AdBlocker(listManager ?? this.emptyManager());
    this.trackerBlocker = new TrackerBlocker(listManager ?? this.emptyManager());
    this.malwareBlocker = new MalwareBlocker(listManager ?? this.emptyManager());
    this.whitelist = new Whitelist();
    this.customBlacklist = new CustomBlacklist();
  }

  private emptyManager(): FilterListManager {
    // listManager verilmediyse boş (bridge'siz) manager kurulur; listeler boş
    // olduğu için hiçbir eşleşme olmaz, setListManager ile bağlanır.
    if (!this._emptyManager) {
      this._emptyManager = new FilterListManager({});
    }
    return this._emptyManager;
  }

  private _emptyManager: FilterListManager | null = null;

  setListManager(manager: FilterListManager): void {
    this.listManagerCache = manager;
  }

  setLearning(enabled: boolean): void {
    this.learningEnabled = enabled;
  }

  getLearning(): boolean {
    return this.learningEnabled;
  }

  async initLocal(): Promise<void> {
    await Promise.all([this.whitelist.init(), this.customBlacklist.init(), this.loadPersistence()]);
  }

  // =========================================================================
  // KARAR
  // =========================================================================

  decide(domain: string, context?: QueryContext): FilterDecisionResult {
    if (!domain) return { ...ALLOW_DECISION };
    return this.decideRequest({ hostname: domain, ...context });
  }

  /**
   * URL / hostname / resource type / 3rd-party bağlamıyla karar verir.
   * Mevcut `decide()`'nin süper kümesidir; sıralama ve öncelikler aynıdır.
   */
  decideRequest(input: RequestContext): FilterDecisionResult {
    const parsed = input.url
      ? parseRequestUrl(input.url)
      : { hostname: input.hostname || '', path: '/', url: '' };
    const domain = parsed.hostname || input.hostname || '';
    const context: QueryContext = {
      isThirdParty: input.isThirdParty,
      requestCount: input.requestCount,
      knownGood: input.knownGood,
      enabledCategories: input.enabledCategories,
    };
    const request: Partial<MatchRequest> = {
      path: parsed.path || '/',
      url: parsed.url || input.url || '',
      resourceType: input.resourceType,
      thirdParty: input.thirdParty,
      referrerHost: input.referrerHost,
    };
    if (!domain) return { ...ALLOW_DECISION };

    // 1) WHITELIST — HER ZAMAN öncelikli
    if (this.whitelist.contains(domain)) {
      this.recordAllowed(domain);
      return { ...ALLOW_DECISION, category: 'custom', source: 'whitelist' };
    }

    // 2) CUSTOM BLACKLIST
    const customRule = this.customBlacklist.match(domain);
    if (customRule) {
      return this.recordBlock(domain, customRule);
    }

    // 3) MALWARE / PHISHING (reklam filtresinden bağımsız, en yüksek öncelik)
    if (this.isCategoryEnabled(context, 'malware') || this.isCategoryEnabled(context, 'phishing')) {
      const malwareHits = this.malwareBlocker.matches(domain, request);
      if (malwareHits.rule) {
        return this.recordBlock(domain, malwareHits.rule, malwareHits.listId);
      }
    }

    // 4) TRACKER
    if (this.isCategoryEnabled(context, 'tracker')) {
      const trackerHits = this.trackerBlocker.matches(domain, request);
      if (trackerHits.rule) {
        return this.recordBlock(domain, trackerHits.rule, trackerHits.listId);
      }
    }

    // 5) AD
    if (this.isCategoryEnabled(context, 'ads')) {
      const adHits = this.adBlocker.matches(domain, request);
      if (adHits.rule) {
        return this.recordBlock(domain, adHits.rule, adHits.listId);
      }
    }

    // 6) OBSERVE / ALLOW — asla otomatik engelleme yok
    if (this.learningEnabled) {
      const score = this.scoreSuspicion(domain, context);
      this.observe(domain, score);
      if (score >= 60) {
        const decision: FilterDecisionResult = {
          decision: 'observe',
          suspicionScore: score,
          category: 'tracker',
          source: 'observed',
        };
        this.stats = statsForEvent(this.stats, {
          timestamp: Date.now(),
          domain,
          decision: 'observe',
          category: 'tracker',
          rule: '',
          listId: 'observed',
          source: 'observed',
        });
        return decision;
      }
    }

    this.recordAllowed(domain);
    return { ...ALLOW_DECISION };
  }

  /** Bir domain için listelerden alınan cosmetic (element-hiding) seçicileri. */
  getCosmeticSelectors(domain: string): string[] {
    if (!this.listManagerCache) return [];
    return this.listManagerCache.getCosmeticSelectors(domain);
  }

  private isCategoryEnabled(context: QueryContext | undefined, category: BlockCategory): boolean {
    const enabled = context?.enabledCategories;
    if (!enabled || enabled.length === 0) return true;
    return enabled.includes(category);
  }

  /** Şüphe skorunu (0-100) döndürür; karar vermez. */
  scoreSuspicion(domain: string, context?: QueryContext): number {
    const observed = this.observed.get(domain);
    return computeSuspicionScore({
      domain,
      frequency: context?.requestCount ?? observed?.count ?? 0,
      isThirdParty: context?.isThirdParty,
      resemblesFilterList: !!(observed && observed.count > 3),
      knownGood: context?.knownGood,
    });
  }

  private recordBlock(domain: string, rule: FilterRule, listId?: string | null): FilterDecisionResult {
    const event: PrivacyEvent = {
      timestamp: Date.now(),
      domain,
      decision: 'block',
      category: rule.category,
      rule: rule.original,
      listId: listId ?? rule.listId ?? 'custom',
      source: rule.source,
    };
    this.stats = statsForEvent(this.stats, event);
    this.events = [event, ...this.events].slice(0, 50);
    return {
      decision: 'block',
      category: rule.category,
      source: rule.source,
      rule: rule.original,
      listId: event.listId,
    };
  }

  private recordAllowed(domain: string): void {
    const event: PrivacyEvent = {
      timestamp: Date.now(),
      domain,
      decision: 'allow',
      category: 'custom',
      rule: '',
      listId: 'allow',
      source: 'whitelist',
    };
    this.stats = statsForEvent(this.stats, event);
  }

  private observe(domain: string, score: number): void {
    const now = Date.now();
    const existing = this.observed.get(domain);
    if (existing) {
      existing.count += 1;
      existing.lastSeen = now;
    } else if (this.observed.size >= OBSERVED_CAP) {
      const oldest = [...this.observed.entries()]
        .sort((a, b) => a[1].lastSeen - b[1].lastSeen)[0];
      if (oldest) this.observed.delete(oldest[0]);
      this.observed.set(domain, { domain, count: 1, firstSeen: now, lastSeen: now });
    } else {
      this.observed.set(domain, { domain, count: 1, firstSeen: now, lastSeen: now });
    }
    if (this.onObserved) {
      this.onObserved(domain, score, suspicionLevel(score));
    }
  }

  onObserved?: (domain: string, score: number, level: number) => void;

  // =========================================================================
  // KULLANICI KARARI (öğrenme)
  // =========================================================================

  async userDecision(domain: string, action: 'block' | 'allow' | 'ignore'): Promise<void> {
    if (action === 'block') {
      await this.customBlacklist.add(domain);
    } else if (action === 'allow') {
      await this.whitelist.add(domain);
    }
    // 'ignore' -> sadece gözlem kaydından düşer
    this.observed.delete(domain);
    if (action === 'block' || action === 'allow') {
      await this.persist();
    }
  }

  // =========================================================================
  // İSTATİSTİK
  // =========================================================================

  getStats(): FilterEngineStats {
    return { ...this.stats };
  }

  getEvents(): PrivacyEvent[] {
    return [...this.events];
  }

  getObserved(): ObservedEntry[] {
    return [...this.observed.values()].sort((a, b) => b.count - a.count).slice(0, 30);
  }

  resetStats(): void {
    this.stats = emptyStats();
    this.events = [];
  }

  async persist(): Promise<void> {
    try {
      localStorage.setItem('knots.privacy.stats', JSON.stringify(this.stats));
      localStorage.setItem('knots.privacy.events', JSON.stringify(this.events.slice(0, 50)));
    } catch {
      // sessizce geç
    }
  }

  private async loadPersistence(): Promise<void> {
    try {
      const rawStats = localStorage.getItem('knots.privacy.stats');
      if (rawStats) this.stats = { ...emptyStats(), ...JSON.parse(rawStats) };
      const rawEvents = localStorage.getItem('knots.privacy.events');
      if (rawEvents) this.events = JSON.parse(rawEvents) ?? [];
    } catch {
      // sessizce geç
    }
  }

  listenObserved(cb: (domain: string, score: number, level: number) => void): void {
    this.onObserved = cb;
  }
}

export type { ObservedEntry };