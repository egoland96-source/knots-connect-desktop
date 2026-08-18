import { PrivacyFilterEngine, RequestContext } from '../engine/PrivacyFilterEngine';
import { FilterDecisionResult } from '../engine/FilterDecision';
import { BlockCategory } from '../engine/FilterRule';

export interface BenchmarkSample {
  /** Kuralın ait olduğu kategori: 'error-tracking' | 'cookie-notices' | 'a-b-testing' | … */
  category: string;
  /** Request hostname (URL verilirse path eşleşmesi de yapılır). */
  hostname: string;
  /** İsteğe bağlı full URL. */
  url?: string;
  /** Varsayılan beklenen sonuç: block. Engellenmemesi GEREKEN sample'larda 'allow'. */
  expected?: 'block' | 'allow';
  resourceType?: string;
}

export interface BenchmarkLabel {
  id: string;
  label: string;
}

export const BENCHMARK_CATEGORIES: BenchmarkLabel[] = [
  { id: 'error-tracking', label: 'Error Tracking' },
  { id: 'cookie-notices', label: 'Cookie Notices' },
  { id: 'a-b-testing', label: 'A/B Testing' },
  { id: 'email-tracking', label: 'Email Tracking' },
  { id: 'social-trackers', label: 'Social Trackers' },
  { id: 'oem-trackers', label: 'OEM Trackers' },
  { id: 'cryptominers', label: 'Cryptominers' },
  { id: 'video-ads', label: 'Video Ads' },
  { id: 'affiliate-networks', label: 'Affiliate Networks' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'ads', label: 'Ads' },
];

export interface BenchmarkResult {
  sample: BenchmarkSample;
  decision: FilterDecisionResult;
  blocked: boolean;
  blockedByList: boolean;
  blockedByHeuristic: boolean;
  allowed: boolean;
  falsePositive: boolean;
  falseNegative: boolean;
  matchedRule: string;
  reason: string;
}

export interface BenchmarkSummary {
  total: number;
  blocked: number;
  blockedByList: number;
  blockedByHeuristic: number;
  allowed: number;
  falsePositive: number;
  falseNegative: number;
  /** Kategori — sample adedine göre ayrışmış. */
  byCategory: Record<string, { total: number; blocked: number; protected: number; missed: number }>;
}

/**
 * Geliştirme-only benchmark çalıştırıcı.
 *
 * Bir örnek uzayı (hostname + kategori + beklenen) alır, her örneği engine'e
 * sorar ve karar gerekçesini raporlar:
 *   blockedByList      -> listelerden kural eşleşti
 *   blockedByHeuristic -> heuristic (OBSERVE) sonucu
 *   allowed            -> hiçbir kural yok
 *   falsePositive      -> engellenmemesi gereken (expected allow) ama BLOCK oldu
 *   falseNegative      -> engellenmesi gereken (expected block) ama ALLOW oldu
 */
export class BenchmarkRunner {
  constructor(
    private readonly engine: PrivacyFilterEngine,
    private readonly getCategoryForRule: (listId: string | undefined, category: BlockCategory | undefined) => string = () => 'other',
  ) {}

  run(samples: BenchmarkSample[]): BenchmarkResult[] {
    return samples.map((s) => this.runOne(s));
  }

  summarize(results: BenchmarkResult[]): BenchmarkSummary {
    const total = results.length;
    let blocked = 0;
    let blockedByList = 0;
    let blockedByHeuristic = 0;
    let allowed = 0;
    let falsePositive = 0;
    let falseNegative = 0;
    const byCategory: BenchmarkSummary['byCategory'] = {};

    for (const r of results) {
      const cat = r.sample.category;
      const agg = byCategory[cat] || { total: 0, blocked: 0, protected: 0, missed: 0 };
      agg.total += 1;
      if (r.blocked) {
        blocked += 1;
        if (r.blockedByList) blockedByList += 1;
        if (r.blockedByHeuristic) blockedByHeuristic += 1;
        agg.blocked += 1;
        agg.protected += 1;
        if (r.falsePositive) falsePositive += 1;
      } else {
        allowed += 1;
        agg.missed += 1;
        if (r.falseNegative) falseNegative += 1;
      }
      byCategory[cat] = agg;
    }

    return {
      total,
      blocked,
      blockedByList,
      blockedByHeuristic,
      allowed,
      falsePositive,
      falseNegative,
      byCategory,
    };
  }

  private runOne(sample: BenchmarkSample): BenchmarkResult {
    const input: RequestContext = {
      hostname: sample.hostname,
      url: sample.url,
      resourceType: sample.resourceType as RequestContext['resourceType'],
      enabledCategories: ['ads', 'tracker', 'malware', 'phishing'],
    };
    const decision = this.engine.decideRequest(input);

    const blocked = decision.decision === 'block';
    const blockedByList = blocked && decision.source === 'filter-list';
    const blockedByHeuristic = blocked && decision.source === 'observed';
    const allowed = decision.decision === 'allow' || decision.decision === 'observe';
    const expected = sample.expected ?? 'block';

    const falsePositive = blocked && expected === 'allow';
    const falseNegative = !blocked && expected === 'block';

    const category = this.getCategoryForRule(decision.listId, decision.category);

    return {
      sample,
      decision,
      blocked,
      blockedByList,
      blockedByHeuristic,
      allowed,
      falsePositive,
      falseNegative,
      matchedRule: decision.rule ?? '',
      reason: this.reasonFor(decision, category),
    };
  }

  private reasonFor(decision: FilterDecisionResult, category: string): string {
    switch (decision.source) {
      case 'filter-list':
        return `list:` + (decision.listId ?? '?') + (category ? ` (${category})` : '');
      case 'custom-blacklist':
        return 'custom-blacklist';
      case 'whitelist':
        return 'whitelist';
      case 'observed':
        return `observed (${decision.suspicionScore ?? 0}/100)`;
      default:
        return 'allow';
    }
  }
}