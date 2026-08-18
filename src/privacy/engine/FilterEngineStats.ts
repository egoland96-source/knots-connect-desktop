import type { BlockCategory, RuleSource } from './FilterRule';
import type { FilterDecision } from './FilterDecision';

/**
 * Engellenen her istek için tahmini veri tasarrufu (bytes).
 * Reklam 25 KB, tracker 35 KB, malware 60 KB (kullanıcı kontratı).
 */
export const BLOCK_ESTIMATED_BYTES: Record<BlockCategory, number> = {
  ads: 25 * 1024,
  tracker: 35 * 1024,
  malware: 60 * 1024,
  phishing: 35 * 1024,
  custom: 35 * 1024,
};

export function bytesSavedForCategory(category: BlockCategory): number {
  return BLOCK_ESTIMATED_BYTES[category] ?? 35 * 1024;
}

export interface PrivacyEvent {
  timestamp: number;
  domain: string;
  decision: FilterDecision;
  category: BlockCategory;
  rule: string;
  listId: string;
  source: RuleSource;
}

export interface FilterEngineStats {
  adsBlocked: number;
  trackersBlocked: number;
  malwareBlocked: number;
  phishingBlocked: number;
  scamBlocked: number;
  requestsBlocked: number;
  requestsAllowed: number;
  requestsObserved: number;
  /** Tahmini kazanılan veri (engellenen istek başına kategori sabitleri). */
  dataSavedBytes: number;
  lastBlockedDomain: string | null;
  lastBlockedCategory: BlockCategory | null;
  lastBlockedTimestamp: number | null;
}

export const emptyStats = (): FilterEngineStats => ({
  adsBlocked: 0,
  trackersBlocked: 0,
  malwareBlocked: 0,
  phishingBlocked: 0,
  scamBlocked: 0,
  requestsBlocked: 0,
  requestsAllowed: 0,
  requestsObserved: 0,
  dataSavedBytes: 0,
  lastBlockedDomain: null,
  lastBlockedCategory: null,
  lastBlockedTimestamp: null,
});

export function mergeStats(
  target: FilterEngineStats,
  category: BlockCategory,
): FilterEngineStats {
  const next = { ...target };
  next.requestsBlocked += 1;
  next.dataSavedBytes += bytesSavedForCategory(category);
  next.lastBlockedCategory = category;
  next.lastBlockedTimestamp = Date.now();
  switch (category) {
    case 'ads':
      next.adsBlocked += 1;
      break;
    case 'tracker':
    case 'custom':
      next.trackersBlocked += 1;
      break;
    case 'malware':
      next.malwareBlocked += 1;
      break;
    case 'phishing':
      next.phishingBlocked += 1;
      break;
  }
  return next;
}

export function statsForEvent(stats: FilterEngineStats, event: PrivacyEvent): FilterEngineStats {
  const next = { ...stats };
  if (event.decision === 'block') {
    next.requestsBlocked += 1;
    next.dataSavedBytes += bytesSavedForCategory(event.category);
    next.lastBlockedDomain = event.domain;
    next.lastBlockedCategory = event.category;
    next.lastBlockedTimestamp = event.timestamp;
    if (event.category === 'ads') next.adsBlocked += 1;
    else if (event.category === 'tracker' || event.category === 'custom') next.trackersBlocked += 1;
    else if (event.category === 'malware') {
      next.malwareBlocked += 1;
      next.scamBlocked += isScamDomain(event.domain) ? 1 : 0;
    } else if (event.category === 'phishing') next.phishingBlocked += 1;
  } else if (event.decision === 'allow') {
    next.requestsAllowed += 1;
  } else if (event.decision === 'observe') {
    next.requestsObserved += 1;
  }
  return next;
}

function isScamDomain(domain: string): boolean {
  return /(scam|fraud|fake|giveaway)/i.test(domain || '');
}